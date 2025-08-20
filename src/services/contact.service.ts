import { Contact as PrismaContact } from "@prisma/client";
import { prisma } from "../config/database";
import {
  Contact,
  ConsolidatedContact,
  IdentifyRequest,
} from "../types/contact.types";

export class ContactService {
  /**
   * Main identify method that handles the business logic for identity reconciliation
   */
  async identify(request: IdentifyRequest): Promise<ConsolidatedContact> {
    const { email, phoneNumber } = request;

    // Find existing contacts that match either email or phone number
    const existingContacts = await this.findMatchingContacts(
      email,
      phoneNumber
    );

    if (existingContacts.length === 0) {
      // No existing contacts found - create a new primary contact
      return this.createNewPrimaryContact(email, phoneNumber);
    }

    // Get all related contacts (primary and secondary)
    const allRelatedContacts = await this.getAllRelatedContacts(
      existingContacts
    );

    // Check if we need to create a new secondary contact
    const needsNewContact = this.shouldCreateNewContact(
      allRelatedContacts,
      email,
      phoneNumber
    );

    if (needsNewContact) {
      // Create new secondary contact linked to the primary
      const primaryContact = this.findPrimaryContact(allRelatedContacts);
      await this.createSecondaryContact(email, phoneNumber, primaryContact.id);

      // Re-fetch all contacts to include the new one
      const updatedContacts = await this.getAllRelatedContacts([
        primaryContact,
      ]);
      return this.consolidateContacts(updatedContacts);
    }

    // Check if we need to merge two separate primary contacts
    const primaryContacts = allRelatedContacts.filter(
      (contact) => contact.linkPrecedence === "primary"
    );

    if (primaryContacts.length > 1) {
      // Multiple primary contacts found - need to merge them
      await this.mergePrimaryContacts(primaryContacts);

      // Re-fetch all contacts after merging
      const mergedContacts = await this.getAllRelatedContacts([
        primaryContacts[0],
      ]);
      return this.consolidateContacts(mergedContacts);
    }

    // Return consolidated view of existing contacts
    return this.consolidateContacts(allRelatedContacts);
  }

  /**
   * Find contacts that match either email or phone number
   */
  private async findMatchingContacts(
    email?: string,
    phoneNumber?: string
  ): Promise<PrismaContact[]> {
    if (!email && !phoneNumber) {
      return [];
    }

    const whereConditions = [];

    if (email) {
      whereConditions.push({ email });
    }

    if (phoneNumber) {
      whereConditions.push({ phoneNumber });
    }

    return prisma.contact.findMany({
      where: {
        OR: whereConditions,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  /**
   * Get all contacts related to the given contacts (including linked ones)
   */
  private async getAllRelatedContacts(
    contacts: PrismaContact[]
  ): Promise<PrismaContact[]> {
    if (contacts.length === 0) {
      return [];
    }

    // Find all primary contact IDs
    const primaryIds = new Set<number>();

    for (const contact of contacts) {
      if (contact.linkPrecedence === "primary") {
        primaryIds.add(contact.id);
      } else if (contact.linkedId) {
        primaryIds.add(contact.linkedId);
      }
    }

    // Get all contacts (primary and secondary) for these primary IDs
    const allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: Array.from(primaryIds) } },
          { linkedId: { in: Array.from(primaryIds) } },
        ],
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return allRelatedContacts;
  }

  /**
   * Check if we need to create a new contact with the provided information
   */
  private shouldCreateNewContact(
    existingContacts: PrismaContact[],
    email?: string,
    phoneNumber?: string
  ): boolean {
    // Check if exact combination already exists
    const exactMatch = existingContacts.some(
      (contact) =>
        contact.email === (email || null) &&
        contact.phoneNumber === (phoneNumber || null)
    );

    if (exactMatch) {
      return false;
    }

    // Check if we have new information to add
    const hasNewEmail =
      !!email && !existingContacts.some((contact) => contact.email === email);
    const hasNewPhoneNumber =
      !!phoneNumber &&
      !existingContacts.some((contact) => contact.phoneNumber === phoneNumber);

    return hasNewEmail || hasNewPhoneNumber;
  }

  /**
   * Create a new primary contact
   */
  private async createNewPrimaryContact(
    email?: string,
    phoneNumber?: string
  ): Promise<ConsolidatedContact> {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: null,
        linkPrecedence: "primary",
      },
    });

    return {
      primaryContactId: newContact.id,
      emails: newContact.email ? [newContact.email] : [],
      phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
      secondaryContactIds: [],
    };
  }

  /**
   * Create a new secondary contact linked to a primary contact
   */
  private async createSecondaryContact(
    email?: string,
    phoneNumber?: string,
    primaryContactId?: number
  ): Promise<PrismaContact> {
    return prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: primaryContactId,
        linkPrecedence: "secondary",
      },
    });
  }

  /**
   * Find the primary contact from a list of related contacts
   */
  private findPrimaryContact(contacts: PrismaContact[]): PrismaContact {
    const primaryContact = contacts.find(
      (contact) => contact.linkPrecedence === "primary"
    );

    if (!primaryContact) {
      throw new Error("No primary contact found in the related contacts");
    }

    return primaryContact;
  }

  /**
   * Merge multiple primary contacts into one
   * The oldest contact becomes/remains primary, others become secondary
   */
  private async mergePrimaryContacts(
    primaryContacts: PrismaContact[]
  ): Promise<void> {
    // Sort by creation date to find the oldest (which will remain primary)
    const sortedContacts = primaryContacts.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const oldestPrimary = sortedContacts[0];
    const contactsToUpdate = sortedContacts.slice(1);

    // Convert other primary contacts to secondary
    for (const contact of contactsToUpdate) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkedId: oldestPrimary.id,
          linkPrecedence: "secondary",
          updatedAt: new Date(),
        },
      });

      // Update any secondary contacts that were linked to this contact
      await prisma.contact.updateMany({
        where: { linkedId: contact.id },
        data: {
          linkedId: oldestPrimary.id,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Consolidate all related contacts into the response format
   */
  private consolidateContacts(contacts: PrismaContact[]): ConsolidatedContact {
    const primaryContact = this.findPrimaryContact(contacts);
    const secondaryContacts = contacts.filter(
      (contact) => contact.linkPrecedence === "secondary"
    );

    // Collect unique emails and phone numbers
    const emailSet = new Set<string>();
    const phoneNumberSet = new Set<string>();

    // Add primary contact's data first
    if (primaryContact.email) {
      emailSet.add(primaryContact.email);
    }
    if (primaryContact.phoneNumber) {
      phoneNumberSet.add(primaryContact.phoneNumber);
    }

    // Add secondary contacts' data
    for (const contact of secondaryContacts) {
      if (contact.email) {
        emailSet.add(contact.email);
      }
      if (contact.phoneNumber) {
        phoneNumberSet.add(contact.phoneNumber);
      }
    }

    return {
      primaryContactId: primaryContact.id,
      emails: Array.from(emailSet),
      phoneNumbers: Array.from(phoneNumberSet),
      secondaryContactIds: secondaryContacts.map((contact) => contact.id),
    };
  }
}

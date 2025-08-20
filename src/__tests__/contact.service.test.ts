import { ContactService } from "../services/contact.service";
import { prisma } from "../config/database";
// import { LinkPrecedence } from '@prisma/client'; // Not needed for SQLite

describe("ContactService", () => {
  let contactService: ContactService;

  beforeEach(() => {
    contactService = new ContactService();
  });

  describe("identify - New Contact Creation", () => {
    it("should create a new primary contact when no existing contacts exist", async () => {
      const result = await contactService.identify({
        email: "lorraine@hillvalley.edu",
        phoneNumber: "123456",
      });

      expect(result.primaryContactId).toBeDefined();
      expect(result.emails).toEqual(["lorraine@hillvalley.edu"]);
      expect(result.phoneNumbers).toEqual(["123456"]);
      expect(result.secondaryContactIds).toEqual([]);
    });

    it("should create a new primary contact with only email", async () => {
      const result = await contactService.identify({
        email: "doc@hillvalley.edu",
      });

      expect(result.emails).toEqual(["doc@hillvalley.edu"]);
      expect(result.phoneNumbers).toEqual([]);
      expect(result.secondaryContactIds).toEqual([]);
    });

    it("should create a new primary contact with only phone number", async () => {
      const result = await contactService.identify({
        phoneNumber: "987654",
      });

      expect(result.emails).toEqual([]);
      expect(result.phoneNumbers).toEqual(["987654"]);
      expect(result.secondaryContactIds).toEqual([]);
    });
  });

  describe("identify - Secondary Contact Creation", () => {
    it("should create a secondary contact when partial match exists", async () => {
      // Create initial primary contact
      await contactService.identify({
        email: "lorraine@hillvalley.edu",
        phoneNumber: "123456",
      });

      // Add new email with same phone number
      const result = await contactService.identify({
        email: "mcfly@hillvalley.edu",
        phoneNumber: "123456",
      });

      expect(result.emails).toContain("lorraine@hillvalley.edu");
      expect(result.emails).toContain("mcfly@hillvalley.edu");
      expect(result.phoneNumbers).toEqual(["123456"]);
      expect(result.secondaryContactIds).toHaveLength(1);
    });

    it("should handle multiple secondary contacts", async () => {
      // Create primary contact
      await contactService.identify({
        email: "primary@test.com",
        phoneNumber: "111",
      });

      // Add first secondary
      await contactService.identify({
        email: "secondary1@test.com",
        phoneNumber: "111",
      });

      // Add second secondary
      const result = await contactService.identify({
        email: "secondary2@test.com",
        phoneNumber: "111",
      });

      expect(result.emails).toHaveLength(3);
      expect(result.emails).toContain("primary@test.com");
      expect(result.emails).toContain("secondary1@test.com");
      expect(result.emails).toContain("secondary2@test.com");
      expect(result.secondaryContactIds).toHaveLength(2);
    });
  });

  describe("identify - Primary Contact Merging", () => {
    it("should merge two primary contacts when they get linked", async () => {
      // Create first primary contact
      const first = await contactService.identify({
        email: "george@hillvalley.edu",
        phoneNumber: "919191",
      });

      // Create second primary contact
      const second = await contactService.identify({
        email: "biffsucks@hillvalley.edu",
        phoneNumber: "717171",
      });

      // Link them through a common request
      const result = await contactService.identify({
        email: "george@hillvalley.edu",
        phoneNumber: "717171",
      });

      // The older contact should remain primary
      const olderPrimaryId = Math.min(
        first.primaryContactId,
        second.primaryContactId
      );
      const newerContactId = Math.max(
        first.primaryContactId,
        second.primaryContactId
      );

      expect(result.primaryContactId).toBe(olderPrimaryId);
      expect(result.emails).toContain("george@hillvalley.edu");
      expect(result.emails).toContain("biffsucks@hillvalley.edu");
      expect(result.phoneNumbers).toContain("919191");
      expect(result.phoneNumbers).toContain("717171");
      expect(result.secondaryContactIds).toContain(newerContactId);
    });
  });

  describe("identify - Exact Match Scenarios", () => {
    it("should return existing contact when exact match exists", async () => {
      // Create initial contact
      const initial = await contactService.identify({
        email: "test@example.com",
        phoneNumber: "123456",
      });

      // Request with exact same information
      const result = await contactService.identify({
        email: "test@example.com",
        phoneNumber: "123456",
      });

      expect(result.primaryContactId).toBe(initial.primaryContactId);
      expect(result.emails).toEqual(["test@example.com"]);
      expect(result.phoneNumbers).toEqual(["123456"]);
      expect(result.secondaryContactIds).toEqual([]);
    });

    it("should return consolidated view when requesting with partial existing info", async () => {
      // Create primary contact
      await contactService.identify({
        email: "lorraine@hillvalley.edu",
        phoneNumber: "123456",
      });

      // Create secondary contact
      await contactService.identify({
        email: "mcfly@hillvalley.edu",
        phoneNumber: "123456",
      });

      // Request with just the email from secondary
      const result = await contactService.identify({
        email: "mcfly@hillvalley.edu",
      });

      expect(result.emails).toContain("lorraine@hillvalley.edu");
      expect(result.emails).toContain("mcfly@hillvalley.edu");
      expect(result.phoneNumbers).toEqual(["123456"]);
      expect(result.secondaryContactIds).toHaveLength(1);
    });
  });

  describe("identify - Edge Cases", () => {
    it("should handle null values correctly", async () => {
      const result = await contactService.identify({
        email: "test@example.com",
        phoneNumber: undefined,
      });

      expect(result.emails).toEqual(["test@example.com"]);
      expect(result.phoneNumbers).toEqual([]);
    });

    it("should maintain data integrity with complex linking scenarios", async () => {
      // Create multiple unrelated contacts first
      await contactService.identify({
        email: "contact1@test.com",
        phoneNumber: "111",
      });

      await contactService.identify({
        email: "contact2@test.com",
        phoneNumber: "222",
      });

      await contactService.identify({
        email: "contact3@test.com",
        phoneNumber: "333",
      });

      // Now link contact1 and contact2
      const result = await contactService.identify({
        email: "contact1@test.com",
        phoneNumber: "222",
      });

      // Should only contain contact1 and contact2 data, not contact3
      expect(result.emails).toHaveLength(2);
      expect(result.emails).toContain("contact1@test.com");
      expect(result.emails).toContain("contact2@test.com");
      expect(result.emails).not.toContain("contact3@test.com");
      expect(result.phoneNumbers).toContain("111");
      expect(result.phoneNumbers).toContain("222");
      expect(result.phoneNumbers).not.toContain("333");
    });
  });
});

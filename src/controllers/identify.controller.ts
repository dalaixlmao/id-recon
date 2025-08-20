import { Request, Response } from "express";
import { ContactService } from "../services/contact.service";
import { identifyRequestSchema } from "../utils/validation";
import { IdentifyResponse } from "../types/contact.types";

export class IdentifyController {
  private contactService: ContactService;

  constructor() {
    this.contactService = new ContactService();
  }

  /**
   * Handle POST /identify requests
   */
  identify = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validationResult = identifyRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          error: "Invalid request body",
          details: validationResult.error.issues,
        });
        return;
      }

      const { email, phoneNumber } = validationResult.data;

      // Process the identity reconciliation
      const consolidatedContact = await this.contactService.identify({
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
      });

      // Format response according to API specification
      const response: IdentifyResponse = {
        contact: consolidatedContact,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error in identify endpoint:", error);

      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while processing the request",
      });
    }
  };
}

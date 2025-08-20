import { z } from "zod";

export const identifyRequestSchema = z
  .object({
    email: z.string().email().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "At least one of email or phoneNumber must be provided",
    path: ["email", "phoneNumber"],
  });

export type IdentifyRequestInput = z.infer<typeof identifyRequestSchema>;

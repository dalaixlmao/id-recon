import { Router } from "express";
import { IdentifyController } from "../controllers/identify.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
const identifyController = new IdentifyController();

// POST /identify - Main identity reconciliation endpoint
router.post("/identify", asyncHandler(identifyController.identify));

export { router as identifyRoutes };

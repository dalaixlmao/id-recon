import express from "express";
import cors from "cors";
import helmet from "helmet";
import { identifyRoutes } from "./routes/identify.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? false // Configure allowed origins in production
        : true,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Identity Reconciliation Service",
  });
});

// API routes
app.use("/", identifyRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app };

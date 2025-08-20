import dotenv from "dotenv";
import { app } from "./app";
import { prisma } from "./config/database";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Database connection test
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log("🔄 Shutting down gracefully...");

  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Identity endpoint: http://localhost:${PORT}/identify`);
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

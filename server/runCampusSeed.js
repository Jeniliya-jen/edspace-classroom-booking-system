import "dotenv/config";
import mongoose from "mongoose";
import { seedCampus } from "./campusSeed.js";

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Create a .env file based on .env.example.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await seedCampus();
  console.log("Campus seed completed without deleting existing records:", result);
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error("Campus seed failed:", error);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});

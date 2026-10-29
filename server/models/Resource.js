import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, enum: ["Spaces", "Technology", "Equipment"] },
  type: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: String, required: true },
  location: { type: String, required: true },
  availability: { type: String, required: true, enum: ["Available today", "Limited slots"] },
  rating: { type: Number, required: true, min: 0, max: 5 },
  visual: { type: String, required: true, enum: ["maker", "projector", "lab", "camera", "laptop", "reading"] }
}, { timestamps: true });

export default mongoose.model("Resource", resourceSchema);

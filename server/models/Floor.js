import mongoose from "mongoose";

const floorSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", required: true },
  number: { type: Number, required: true, min: 0, max: 3 },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }
}, { timestamps: true });

floorSchema.index({ departmentId: 1, number: 1 }, { unique: true });

export default mongoose.model("Floor", floorSchema);

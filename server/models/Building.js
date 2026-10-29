import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true }
}, { timestamps: true });

export default mongoose.model("Building", buildingSchema);

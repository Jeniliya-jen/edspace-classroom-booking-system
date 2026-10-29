import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  buildingName: { type: String, required: true },
  description: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Department", departmentSchema);

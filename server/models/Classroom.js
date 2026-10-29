import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  roomNumber: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", required: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: "Floor", required: true },
  floorNumber: { type: Number, required: true },
  type: { type: String, required: true, enum: ["Standard Classroom", "Smart Classroom", "Lecture Hall", "Tutorial Room", "Seminar Room", "Computer Lab", "Department Laboratory"] },
  capacity: { type: Number, required: true, min: 1 },
  equipment: { type: [String], default: [] },
  description: { type: String, required: true }
}, { timestamps: true });

classroomSchema.index({ departmentId: 1, floorNumber: 1, roomNumber: 1 });
classroomSchema.index({ capacity: 1, type: 1 });

export default mongoose.model("Classroom", classroomSchema);

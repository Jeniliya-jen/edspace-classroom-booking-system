import mongoose from "mongoose";

const campusBookingSchema = new mongoose.Schema({
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  timeSlot: { type: String, required: true },
  bookedBy: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  attendeeCount: { type: Number, required: true, min: 1 },
  purpose: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  simulated: { type: Boolean, default: false }
}, { timestamps: true, collection: "campus_bookings" });

campusBookingSchema.index(
  { classroomId: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } }
);
campusBookingSchema.index({ date: 1, timeSlot: 1, status: 1 });

export default mongoose.model("CampusBooking", campusBookingSchema);

import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resource",
    required: true
  },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, required: true },
  purpose: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
  teacher: { type: String, default: "Jamie Davis", trim: true }
}, { timestamps: true });

bookingSchema.index({ resourceId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model("Booking", bookingSchema);

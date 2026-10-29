import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import Building from "./models/Building.js";
import CampusBooking from "./models/CampusBooking.js";
import Classroom from "./models/Classroom.js";
import Department from "./models/Department.js";
import Floor from "./models/Floor.js";
import Booking from "./models/Booking.js";
import Resource from "./models/Resource.js";
import { seedResources } from "./seed.js";
import { bookingSlots, floorNames, seedCampus } from "./campusSeed.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/api/departments", async (_request, response, next) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    response.json(departments);
  } catch (error) {
    next(error);
  }
});

app.get("/api/floors", async (request, response, next) => {
  try {
    const filter = {};
    if (request.query.departmentId) {
      if (!mongoose.isValidObjectId(request.query.departmentId)) {
        response.status(400).json({ message: "Choose a valid department." });
        return;
      }
      filter.departmentId = request.query.departmentId;
    }
    const floors = await Floor.find(filter).populate("buildingId", "name shortName").sort({ departmentId: 1, number: 1 }).lean();
    response.json(floors);
  } catch (error) {
    next(error);
  }
});

app.get("/api/buildings", async (_request, response, next) => {
  try {
    const buildings = await Building.find().populate("departmentId", "name code").sort({ name: 1 }).lean();
    response.json(buildings);
  } catch (error) {
    next(error);
  }
});

app.get("/api/slots", (_request, response) => response.json(bookingSlots));

app.get("/api/equipment", async (_request, response, next) => {
  try {
    const equipment = await Classroom.distinct("equipment");
    response.json(equipment.sort((first, second) => first.localeCompare(second)));
  } catch (error) {
    next(error);
  }
});

app.get("/api/classrooms", async (request, response, next) => {
  try {
    const {
      departmentId, buildingId, floorId, floorNumber, capacity, type, equipment,
      date, timeSlot, availableOnly, search, sort = "roomNumber", page = "1", limit = "24"
    } = request.query;
    const filter = {};
    for (const [field, value] of [["departmentId", departmentId], ["buildingId", buildingId], ["floorId", floorId]]) {
      if (value) {
        if (!mongoose.isValidObjectId(value)) {
          response.status(400).json({ message: `Choose a valid ${field.replace("Id", "").toLowerCase()}.` });
          return;
        }
        filter[field] = value;
      }
    }
    if (floorNumber !== undefined && floorNumber !== "") {
      const parsed = Number(floorNumber);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3) {
        response.status(400).json({ message: "Floor must be between ground and third floor." });
        return;
      }
      filter.floorNumber = parsed;
    }
    if (capacity) {
      const parsed = Number(capacity);
      if (!Number.isInteger(parsed) || parsed < 1) {
        response.status(400).json({ message: "Capacity filter must be a positive number." });
        return;
      }
      filter.capacity = { $gte: parsed };
    }
    if (type) filter.type = type;
    if (equipment) filter.equipment = { $in: [equipment] };
    if (search) filter.$or = [
      { code: { $regex: escapeRegExp(search), $options: "i" } },
      { roomNumber: { $regex: escapeRegExp(search), $options: "i" } }
    ];

    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(60, Math.max(1, Number.parseInt(limit, 10) || 24));
    const sortOptions = {
      roomNumber: { roomNumber: 1 },
      capacity: { capacity: 1, roomNumber: 1 },
      capacityDesc: { capacity: -1, roomNumber: 1 }
    };
    const sortBy = sortOptions[sort] || sortOptions.roomNumber;
    const selectedSlotBookings = date && timeSlot
      ? await CampusBooking.find({ date, timeSlot, status: "confirmed" }).select("classroomId").lean()
      : [];
    const bookedIds = new Set(selectedSlotBookings.map(booking => String(booking.classroomId)));
    const dailyBookings = date
      ? await CampusBooking.find({ date, status: "confirmed" }).select("classroomId timeSlot").lean()
      : [];
    const dailySlotsByRoom = new Map();
    for (const booking of dailyBookings) {
      const roomId = String(booking.classroomId);
      if (!dailySlotsByRoom.has(roomId)) dailySlotsByRoom.set(roomId, new Set());
      dailySlotsByRoom.get(roomId).add(booking.timeSlot);
    }
    if (availableOnly === "true" && date && timeSlot) {
      filter._id = { $nin: [...bookedIds] };
    }
    const total = await Classroom.countDocuments(filter);
    const populateClassroom = query => query
      .populate("departmentId", "code name")
      .populate("buildingId", "name shortName")
      .populate("floorId", "number name");
    let classrooms;
    if (sort === "availability" && date && timeSlot) {
      const allMatches = await populateClassroom(Classroom.find(filter).sort(sortBy)).lean();
      allMatches.sort((first, second) =>
        Number(bookedIds.has(String(first._id))) - Number(bookedIds.has(String(second._id))) ||
        first.code.localeCompare(second.code)
      );
      classrooms = allMatches.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    } else {
      classrooms = await populateClassroom(Classroom.find(filter)
        .sort(sortBy)
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)).lean();
    }
    const results = classrooms.map(classroom => ({
      ...classroom,
      selectedSlotStatus: date && timeSlot ? (bookedIds.has(String(classroom._id)) ? "booked" : "available") : null,
      remainingSlots: date ? bookingSlots.length - (dailySlotsByRoom.get(String(classroom._id))?.size || 0) : null
    }));

    response.json({
      classrooms: results,
      total,
      matching: results.length,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      limit: pageSize
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/classrooms/:id/availability", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ message: "That classroom ID is not valid." });
      return;
    }
    const date = request.query.date;
    if (!isValidDate(date) || date < localToday()) {
      response.status(400).json({ message: "Choose today or a future date." });
      return;
    }
    const classroom = await Classroom.findById(request.params.id).select("code capacity").lean();
    if (!classroom) {
      response.status(404).json({ message: "Classroom not found." });
      return;
    }
    const bookings = await CampusBooking.find({ classroomId: classroom._id, date, status: "confirmed" }).select("timeSlot").lean();
    const bookedSlots = new Set(bookings.map(booking => booking.timeSlot));
    response.json({
      classroom,
      date,
      slots: bookingSlots.map(timeSlot => ({ timeSlot, status: bookedSlots.has(timeSlot) ? "booked" : "available" }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/campus/bookings", async (request, response, next) => {
  try {
    const { date, departmentId, search, status = "confirmed", sort = "dateAsc", page = "1", limit = "20" } = request.query;
    const filter = {};
    if (date) {
      if (!isValidDate(date)) {
        response.status(400).json({ message: "Enter a valid booking date." });
        return;
      }
      filter.date = date;
    }
    if (status !== "all") filter.status = status;
    if (departmentId) {
      if (!mongoose.isValidObjectId(departmentId)) {
        response.status(400).json({ message: "Choose a valid department." });
        return;
      }
      const rooms = await Classroom.find({ departmentId }).select("_id").lean();
      filter.classroomId = { $in: rooms.map(room => room._id) };
    }
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const sortOptions = {
      dateAsc: { date: 1, timeSlot: 1 },
      dateDesc: { date: -1, timeSlot: 1 },
      name: { bookedBy: 1, date: 1 },
      attendees: { attendeeCount: -1, date: 1 }
    };
    const sortBy = sortOptions[sort] || sortOptions.dateAsc;
    let query = CampusBooking.find(filter)
      .populate({ path: "classroomId", populate: [{ path: "departmentId", select: "code name" }, { path: "buildingId", select: "name" }, { path: "floorId", select: "name number" }] })
      .sort(sortBy);
    if (search) {
      const safeSearch = escapeRegExp(search);
      const rooms = await Classroom.find({ $or: [{ code: { $regex: safeSearch, $options: "i" } }, { roomNumber: { $regex: safeSearch, $options: "i" } }] }).select("_id").lean();
      const roomIds = rooms.map(room => room._id);
      filter.$or = [
        { bookedBy: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { purpose: { $regex: safeSearch, $options: "i" } },
        { classroomId: { $in: roomIds } }
      ];
      query = CampusBooking.find(filter)
        .populate({ path: "classroomId", populate: [{ path: "departmentId", select: "code name" }, { path: "buildingId", select: "name" }, { path: "floorId", select: "name number" }] })
        .sort(sortBy);
    }
    const [total, bookings] = await Promise.all([
      CampusBooking.countDocuments(filter),
      query.skip((pageNumber - 1) * pageSize).limit(pageSize).lean()
    ]);
    response.json({ bookings, total, page: pageNumber, pages: Math.ceil(total / pageSize), limit: pageSize });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", async (request, response, next) => {
  try {
    const date = request.query.date || localToday();
    const timeSlot = request.query.timeSlot || bookingSlots[0];
    if (!isValidDate(date) || !bookingSlots.includes(timeSlot)) {
      response.status(400).json({ message: "Choose a valid date and time slot." });
      return;
    }
    const [departments, buildings, floors, classrooms, bookings, todaysBookings, upcomingBookings, currentSlotBookings] = await Promise.all([
      Department.countDocuments(),
      Building.countDocuments(),
      Floor.countDocuments(),
      Classroom.countDocuments(),
      CampusBooking.countDocuments({ status: "confirmed" }),
      CampusBooking.countDocuments({ status: "confirmed", date: localToday() }),
      CampusBooking.countDocuments({ status: "confirmed", date: { $gte: localToday() } }),
      CampusBooking.find({ status: "confirmed", date, timeSlot }).select("classroomId").lean()
    ]);
    const totalClassrooms = classrooms;
    const bookedCount = currentSlotBookings.length;
    const bookedIds = currentSlotBookings.map(booking => booking.classroomId);
    const [byDepartment, bookingByDepartment, byFloor, bookingTrend, popularRooms] = await Promise.all([
      Classroom.aggregate([
        { $group: { _id: "$departmentId", classrooms: { $sum: 1 } } },
        { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
        { $unwind: "$department" },
        { $project: { _id: 0, code: "$department.code", name: "$department.name", classrooms: 1 } },
        { $sort: { classrooms: -1 } }
      ]),
      CampusBooking.aggregate([
        { $match: { status: "confirmed" } },
        { $lookup: { from: "classrooms", localField: "classroomId", foreignField: "_id", as: "classroom" } },
        { $unwind: "$classroom" },
        { $group: { _id: "$classroom.departmentId", bookings: { $sum: 1 } } },
        { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } },
        { $unwind: "$department" },
        { $project: { _id: 0, code: "$department.code", name: "$department.name", bookings: 1 } },
        { $sort: { bookings: -1 } }
      ]),
      Floor.aggregate([
        { $lookup: { from: "classrooms", localField: "_id", foreignField: "floorId", as: "rooms" } },
        { $lookup: { from: "departments", localField: "departmentId", foreignField: "_id", as: "department" } },
        { $unwind: "$department" },
        { $project: { name: 1, number: 1, departmentCode: "$department.code", classroomCount: { $size: "$rooms" }, floorName: "$name" } },
        { $sort: { number: 1, name: 1 } }
      ]),
      CampusBooking.aggregate([
        { $match: { status: "confirmed", date: { $gte: recentDate(6), $lte: localToday() } } },
        { $group: { _id: "$date", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      CampusBooking.aggregate([
        { $match: { status: "confirmed", simulated: false } },
        { $group: { _id: "$classroomId", bookings: { $sum: 1 } } },
        { $sort: { bookings: -1 } },
        { $limit: 5 },
        { $lookup: { from: "classrooms", localField: "_id", foreignField: "_id", as: "classroom" } },
        { $unwind: "$classroom" },
        { $project: { _id: 0, code: "$classroom.code", roomNumber: "$classroom.roomNumber", bookings: 1 } }
      ])
    ]);
    const bookedRooms = bookedIds.length ? await Classroom.find({ _id: { $in: bookedIds } }).select("floorId").lean() : [];
    const bookedByFloor = new Map();
    for (const room of bookedRooms) {
      const floorId = String(room.floorId);
      bookedByFloor.set(floorId, (bookedByFloor.get(floorId) || 0) + 1);
    }
    const trendByDate = new Map(bookingTrend.map(item => [item._id, item.count]));
    const trend = Array.from({ length: 7 }, (_, index) => {
      const day = recentDate(6 - index);
      return { date: day, bookings: trendByDate.get(day) || 0 };
    });
    response.json({
      totals: {
        departments, buildings, floors, classrooms, bookings, todaysBookings, upcomingBookings,
        available: Math.max(0, totalClassrooms - bookedCount),
        booked: bookedCount,
        utilization: totalClassrooms ? Math.round((bookedCount / totalClassrooms) * 100) : 0
      },
      byDepartment,
      bookingByDepartment,
      byFloor: byFloor.map(floor => ({
        ...floor,
        booked: bookedByFloor.get(String(floor._id)) || 0
      })),
      trend,
      popularRooms,
      selected: { date, timeSlot }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/campus/bookings", async (request, response, next) => {
  try {
    const { classroomId, date, timeSlot, bookedBy, email, attendeeCount, purpose } = request.body;
    if (!mongoose.isValidObjectId(classroomId)) {
      response.status(400).json({ message: "Choose a valid classroom." });
      return;
    }
    if (!isValidDate(date) || date < localToday()) {
      response.status(400).json({ message: "Choose today or a future booking date." });
      return;
    }
    if (!bookingSlots.includes(timeSlot)) {
      response.status(400).json({ message: "Choose a valid booking time slot." });
      return;
    }
    if (typeof bookedBy !== "string" || bookedBy.trim().length < 2 || bookedBy.trim().length > 80) {
      response.status(400).json({ message: "Enter your name (2 to 80 characters)." });
      return;
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 160) {
      response.status(400).json({ message: "Enter a valid college email address." });
      return;
    }
    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      response.status(400).json({ message: "Attendee count must be a positive whole number." });
      return;
    }
    if (typeof purpose !== "string" || purpose.trim().length < 3 || purpose.trim().length > 200) {
      response.status(400).json({ message: "Enter a booking purpose (3 to 200 characters)." });
      return;
    }
    const classroom = await Classroom.findById(classroomId).select("capacity").lean();
    if (!classroom) {
      response.status(404).json({ message: "That classroom was not found." });
      return;
    }
    if (attendeeCount > classroom.capacity) {
      response.status(400).json({ message: `Attendee count cannot exceed this room's capacity of ${classroom.capacity}.` });
      return;
    }
    const booking = await CampusBooking.create({
      classroomId, date, timeSlot, bookedBy: bookedBy.trim(), email: email.trim().toLowerCase(),
      attendeeCount, purpose: purpose.trim(), status: "confirmed", simulated: false
    });
    const populated = await booking.populate({
      path: "classroomId",
      populate: [{ path: "departmentId", select: "code name" }, { path: "buildingId", select: "name" }, { path: "floorId", select: "name number" }]
    });
    response.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: "That room and time slot were just booked. Select another slot." });
      return;
    }
    next(error);
  }
});

app.delete("/api/campus/bookings/:id", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ message: "That booking ID is not valid." });
      return;
    }
    const booking = await CampusBooking.findOne({ _id: request.params.id, status: "confirmed" });
    if (!booking) {
      response.status(404).json({ message: "Active booking not found." });
      return;
    }
    if (booking.simulated) {
      response.status(403).json({ message: "Sample campus bookings cannot be cancelled." });
      return;
    }
    if (booking.date < localToday()) {
      response.status(400).json({ message: "Past bookings cannot be cancelled." });
      return;
    }
    booking.status = "cancelled";
    await booking.save();
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/resources", async (_request, response, next) => {
  try {
    const resources = await Resource.find().sort({ name: 1 }).lean();
    response.json(resources);
  } catch (error) {
    next(error);
  }
});

app.get("/api/bookings", async (_request, response, next) => {
  try {
    const bookings = await Booking.find().populate("resourceId").sort({ date: 1, time: 1 }).lean();
    response.json(bookings);
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings", async (request, response, next) => {
  try {
    const { resourceId, date, time, purpose } = request.body;
    if (!mongoose.isValidObjectId(resourceId)) {
      response.status(400).json({ message: "Choose a valid classroom resource." });
      return;
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) {
      response.status(400).json({ message: "Choose today or a future date." });
      return;
    }
    if (typeof time !== "string" || !/^(08|09|10|11|12|01|02|03):00 (AM|PM)$/.test(time)) {
      response.status(400).json({ message: "Choose an available start time." });
      return;
    }
    if (typeof purpose !== "string" || purpose.trim().length < 3 || purpose.trim().length > 80) {
      response.status(400).json({ message: "Add a purpose between 3 and 80 characters." });
      return;
    }
    if (!(await Resource.exists({ _id: resourceId }))) {
      response.status(404).json({ message: "That resource is no longer available." });
      return;
    }

    const booking = await Booking.create({ resourceId, date, time, purpose: purpose.trim() });
    const populated = await booking.populate("resourceId");
    response.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: "That resource is already booked for this date and time." });
      return;
    }
    next(error);
  }
});

app.delete("/api/bookings/:id", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      response.status(400).json({ message: "That booking ID is not valid." });
      return;
    }
    const booking = await Booking.findByIdAndDelete(request.params.id);
    if (!booking) {
      response.status(404).json({ message: "This booking was not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error("API request failed:", error);
  response.status(500).json({ message: "Something went wrong while contacting the booking service." });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing. Create a .env file using .env.example.");
  }
  await mongoose.connect(mongoUri);
  await Promise.all([
    Department.init(), Building.init(), Floor.init(), Classroom.init(), CampusBooking.init()
  ]);
  const campusStats = await seedCampus();
  console.log(`Campus ready: ${campusStats.departments} departments, ${campusStats.classrooms} classrooms; ${campusStats.simulatedBookings} simulated booking slots checked.`);
  await seedResources();
  app.listen(port, () => console.log(`EdSpace API listening at http://localhost:${port}`));
}

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function recentDate(daysAgo) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  today.setUTCDate(today.getUTCDate() - daysAgo);
  return today.toISOString().slice(0, 10);
}

function escapeRegExp(value) {
  return value.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

start().catch(error => {
  console.error("Could not start EdSpace. Check that MongoDB is running and MONGODB_URI is correct.", error);
  process.exitCode = 1;
});

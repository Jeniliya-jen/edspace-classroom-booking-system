import Building from "./models/Building.js";
import CampusBooking from "./models/CampusBooking.js";
import Classroom from "./models/Classroom.js";
import Department from "./models/Department.js";
import Floor from "./models/Floor.js";

export const bookingSlots = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 01:00",
  "02:00 - 03:00",
  "03:00 - 04:00",
  "04:00 - 05:00"
];

export const floorNames = ["Ground Floor", "First Floor", "Second Floor", "Third Floor"];

const departments = [
  { code: "CSE", name: "Computer Science and Engineering", buildingName: "Innovation & Computing Block", description: "Computing, software engineering, and digital systems." },
  { code: "MECH", name: "Mechanical Engineering", buildingName: "Mechanical Engineering Block", description: "Mechanical design, manufacturing, and applied engineering." },
  { code: "ECE", name: "Electronics and Communication Engineering", buildingName: "Electronics & Communication Block", description: "Electronics, communications, and embedded systems." },
  { code: "EEE", name: "Electrical and Electronics Engineering", buildingName: "Electrical Engineering Block", description: "Electrical power, controls, and electronics." },
  { code: "FPT", name: "Food Processing Technology", buildingName: "Food Technology Block", description: "Food science, processing, quality, and safety." },
  { code: "BME", name: "Biomedical Engineering", buildingName: "Biomedical Sciences Block", description: "Medical technology, instrumentation, and healthcare systems." },
  { code: "RA", name: "Robotics and Automation", buildingName: "Robotics & Automation Block", description: "Robotics, automation, and intelligent manufacturing." },
  { code: "CIVIL", name: "Civil Engineering", buildingName: "Civil Engineering Block", description: "Structures, construction, transport, and the built environment." },
  { code: "IT", name: "Information Technology", buildingName: "Digital Technologies Block", description: "Information technology, networks, and data systems." },
  { code: "AIML", name: "Artificial Intelligence and Machine Learning", buildingName: "AI & ML Block", description: "Artificial intelligence, machine learning, and intelligent systems." },
  { code: "BT", name: "Biotechnology", buildingName: "Biotechnology Block", description: "Biological sciences, biotechnology, and applied research." },
  { code: "CHEM", name: "Chemical Engineering", buildingName: "Chemical Engineering Block", description: "Chemical processes, materials, and process engineering." }
];

const departmentEquipment = {
  CSE: ["Desktop computers", "Projector", "Whiteboard", "High-speed Wi-Fi"],
  MECH: ["CAD workstations", "Projector", "Workshop access", "Whiteboard"],
  ECE: ["Oscilloscopes", "Circuit kits", "Projector", "Whiteboard"],
  EEE: ["Electrical training kits", "Projector", "Safety equipment", "Whiteboard"],
  FPT: ["Food analysis kits", "Refrigerator", "Projector", "Safety equipment"],
  BME: ["Medical simulator", "Clinical projector", "Anatomical models", "Safety equipment"],
  RA: ["Robotics kits", "Industrial controller", "Projector", "Safety equipment"],
  CIVIL: ["CAD workstations", "Surveying kits", "Projector", "Whiteboard"],
  IT: ["Desktop computers", "Network lab kit", "Projector", "High-speed Wi-Fi"],
  AIML: ["GPU workstations", "Projector", "High-speed Wi-Fi", "Whiteboard"],
  BT: ["Microscopes", "Lab safety kit", "Projector", "Refrigerator"],
  CHEM: ["Chemical safety kit", "Fume hood access", "Projector", "Whiteboard"]
};

const floorPrefixes = ["G", "F1", "F2", "F3"];
const capacities = [30, 40, 50, 60, 80, 100];
const roomTypes = ["Standard Classroom", "Smart Classroom", "Lecture Hall", "Tutorial Room", "Seminar Room", "Computer Lab", "Department Laboratory"];
const labDepartments = new Set(["MECH", "ECE", "EEE", "FPT", "BME", "RA", "CIVIL", "BT", "CHEM"]);

function roomTypeFor(code, floor, roomIndex) {
  if (roomIndex === 0 && floor === 0) return "Lecture Hall";
  if (roomIndex === 1 && floor === 0) return "Smart Classroom";
  if (roomIndex === 2) return code === "CSE" || code === "IT" || code === "AIML" ? "Computer Lab" : "Department Laboratory";
  if (labDepartments.has(code) && roomIndex === 3 && floor > 0) return "Department Laboratory";
  if (roomIndex === 4 || roomIndex === 5) return "Tutorial Room";
  if (roomIndex === 6) return "Seminar Room";
  return "Standard Classroom";
}

function equipmentFor(code, type, roomIndex) {
  const departmentItems = departmentEquipment[code];
  if (type === "Computer Lab") return [...new Set([...departmentItems, "Desktop computers", "High-speed Wi-Fi"])];
  if (type === "Department Laboratory") return [...new Set([...departmentItems, "Laboratory workstations"])];
  if (type === "Lecture Hall") return ["Projector", "Microphone and speakers", "Lecture capture", "Whiteboard"];
  if (type === "Smart Classroom") return [...new Set([...departmentItems, "Interactive display"])];
  return roomIndex % 2 === 0 ? departmentItems.slice(1, 3) : ["Projector", "Whiteboard", "High-speed Wi-Fi"];
}

function roomCapacity(index, roomType) {
  if (roomType === "Lecture Hall") return 100 + (index % 2) * 50;
  return capacities[(index * 7 + Math.floor(index / 3)) % capacities.length];
}

export async function seedCampus() {
  const departmentIds = new Map();
  const buildingIds = new Map();
  const floorIds = new Map();

  for (const department of departments) {
    const savedDepartment = await Department.findOneAndUpdate(
      { code: department.code },
      { $set: department },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    departmentIds.set(department.code, savedDepartment._id);

    const building = await Building.findOneAndUpdate(
      { name: department.buildingName },
      { $set: { name: department.buildingName, shortName: `${department.code} Block`, departmentId: savedDepartment._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    buildingIds.set(department.code, building._id);

    for (let floorNumber = 0; floorNumber < floorNames.length; floorNumber += 1) {
      const code = `${department.code}-${floorPrefixes[floorNumber]}`;
      const floor = await Floor.findOneAndUpdate(
        { code },
        { $set: { code, name: floorNames[floorNumber], number: floorNumber, departmentId: savedDepartment._id, buildingId: building._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      floorIds.set(code, floor._id);
    }
  }

  const existingClassrooms = await Classroom.find()
    .select("_id code roomNumber departmentId floorNumber createdAt")
    .lean();
  const existingBookings = await CampusBooking.find()
    .select("_id classroomId date timeSlot bookedBy email attendeeCount purpose status simulated createdAt")
    .lean();
  const bookingsByClassroom = new Map();
  for (const booking of existingBookings) {
    const key = String(booking.classroomId);
    if (!bookingsByClassroom.has(key)) bookingsByClassroom.set(key, []);
    bookingsByClassroom.get(key).push(booking);
  }
  const classroomsByLocation = new Map();
  for (const classroom of existingClassrooms) {
    const digits = classroom.roomNumber.match(/\d+/g)?.join("") || classroom.code.match(/\d+$/)?.[0] || "";
    const roomOrdinal = Number(digits) % 100;
    if (roomOrdinal < 1 || roomOrdinal > 10) continue;
    const key = `${String(classroom.departmentId)}:${classroom.floorNumber}:${roomOrdinal - 1}`;
    if (!classroomsByLocation.has(key)) classroomsByLocation.set(key, []);
    classroomsByLocation.get(key).push(classroom);
  }

  const classroomOperations = [];
  const newClassrooms = [];
  for (const department of departments) {
    for (let floorNumber = 0; floorNumber < floorNames.length; floorNumber += 1) {
      for (let roomIndex = 0; roomIndex < 10; roomIndex += 1) {
        const roomSuffix = (floorNumber + 1) * 100 + roomIndex + 1;
        const roomNumber = department.code === "CSE"
          ? `CS${roomSuffix}`
          : `${department.code}-${roomSuffix}`;
        const code = `${department.code}-${floorPrefixes[floorNumber]}-${roomSuffix}`;
        const type = roomTypeFor(department.code, floorNumber, roomIndex);
        const equipment = equipmentFor(department.code, type, roomIndex);
        const capacity = roomCapacity(roomIndex + floorNumber, type);
        const departmentId = departmentIds.get(department.code);
        const floorId = floorIds.get(`${department.code}-${floorPrefixes[floorNumber]}`);
        const update = {
          code, roomNumber, departmentId, buildingId: buildingIds.get(department.code),
          floorId, floorNumber, type, capacity, equipment,
          description: `${type} in the ${floorNames[floorNumber].toLowerCase()} of the ${department.name} building.`
        };
        const locationKey = `${String(departmentId)}:${floorNumber}:${roomIndex}`;
        const candidates = classroomsByLocation.get(locationKey) || [];
        candidates.sort((first, second) => {
          const firstBookings = bookingsByClassroom.get(String(first._id)) || [];
          const secondBookings = bookingsByClassroom.get(String(second._id)) || [];
          const firstReal = firstBookings.some(booking => !booking.simulated);
          const secondReal = secondBookings.some(booking => !booking.simulated);
          return Number(secondReal) - Number(firstReal) ||
            secondBookings.length - firstBookings.length ||
            new Date(first.createdAt || 0) - new Date(second.createdAt || 0);
        });

        const [canonical, ...duplicates] = candidates;
        if (!canonical) {
          newClassrooms.push({ updateOne: { filter: { code }, update: { $setOnInsert: update }, upsert: true } });
          continue;
        }

        if (duplicates.length) {
          const allBookings = candidates.flatMap(classroom => bookingsByClassroom.get(String(classroom._id)) || []);
          const confirmedBySlot = new Map();
          for (const booking of allBookings.filter(item => item.status === "confirmed")) {
            const slotKey = `${booking.date}:${booking.timeSlot}`;
            if (!confirmedBySlot.has(slotKey)) confirmedBySlot.set(slotKey, []);
            confirmedBySlot.get(slotKey).push(booking);
          }
          const conflictingBookingIds = [];
          for (const slotBookings of confirmedBySlot.values()) {
            slotBookings.sort((first, second) =>
              Number(first.simulated) - Number(second.simulated) ||
              new Date(first.createdAt || 0) - new Date(second.createdAt || 0)
            );
            conflictingBookingIds.push(...slotBookings.slice(1).map(booking => booking._id));
          }
          if (conflictingBookingIds.length) {
            await CampusBooking.updateMany(
              { _id: { $in: conflictingBookingIds } },
              { $set: { status: "cancelled" } }
            );
          }
          await CampusBooking.updateMany(
            { classroomId: { $in: duplicates.map(classroom => classroom._id) } },
            { $set: { classroomId: canonical._id } }
          );
          await Classroom.deleteMany({ _id: { $in: duplicates.map(classroom => classroom._id) } });
        }

        classroomOperations.push({ updateOne: { filter: { _id: canonical._id }, update: { $set: update } } });
      }
    }
  }
  if (classroomOperations.length) await Classroom.bulkWrite(classroomOperations, { ordered: false });
  if (newClassrooms.length) await Classroom.bulkWrite(newClassrooms, { ordered: false });

  const legacyAidsDepartment = await Department.findOne({ code: "AIDS" }).select("_id").lean();
  if (legacyAidsDepartment) {
    const aimlDepartmentId = departmentIds.get("AIML");
    const legacyClassrooms = await Classroom.find({ departmentId: legacyAidsDepartment._id })
      .select("_id roomNumber floorNumber")
      .lean();

    for (const legacyClassroom of legacyClassrooms) {
      const aimlRoomNumber = legacyClassroom.roomNumber.replace(/^AIDS/, "AIML");
      const aimlClassroom = await Classroom.findOne({
        departmentId: aimlDepartmentId,
        floorNumber: legacyClassroom.floorNumber,
        roomNumber: aimlRoomNumber
      }).select("_id").lean();
      if (!aimlClassroom) {
        throw new Error(`Cannot migrate legacy AIDS classroom ${legacyClassroom.roomNumber}: matching AIML classroom was not found.`);
      }

      const bookings = await CampusBooking.find({
        classroomId: { $in: [legacyClassroom._id, aimlClassroom._id] },
        status: "confirmed"
      }).select("_id classroomId date timeSlot simulated createdAt").lean();
      const bookingsBySlot = new Map();
      for (const booking of bookings) {
        const key = `${booking.date}:${booking.timeSlot}`;
        if (!bookingsBySlot.has(key)) bookingsBySlot.set(key, []);
        bookingsBySlot.get(key).push(booking);
      }
      const conflictingBookingIds = [];
      for (const slotBookings of bookingsBySlot.values()) {
        slotBookings.sort((first, second) =>
          Number(first.simulated) - Number(second.simulated) ||
          new Date(first.createdAt || 0) - new Date(second.createdAt || 0)
        );
        conflictingBookingIds.push(...slotBookings.slice(1).map(booking => booking._id));
      }
      if (conflictingBookingIds.length) {
        await CampusBooking.updateMany(
          { _id: { $in: conflictingBookingIds } },
          { $set: { status: "cancelled" } }
        );
      }
      await CampusBooking.updateMany(
        { classroomId: legacyClassroom._id },
        { $set: { classroomId: aimlClassroom._id } }
      );
    }

    await Classroom.deleteMany({ departmentId: legacyAidsDepartment._id });
    await Floor.deleteMany({ departmentId: legacyAidsDepartment._id });
    await Building.deleteMany({ departmentId: legacyAidsDepartment._id });
    await Department.deleteOne({ _id: legacyAidsDepartment._id });
  }

  const rooms = await Classroom.find().select("_id code capacity").sort({ code: 1 }).lean();
  const today = new Date();
  const dateKeys = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
    return date.toISOString().slice(0, 10);
  });
  await CampusBooking.updateMany(
    { simulated: true, status: "confirmed" },
    { $set: { status: "cancelled" } }
  );
  const realBookings = await CampusBooking.find({ simulated: false, status: "confirmed" })
    .select("classroomId date timeSlot")
    .lean();
  const occupiedSlots = new Set(realBookings.map(booking => `${booking.classroomId}:${booking.date}:${booking.timeSlot}`));
  const simulatedBookings = [];
  for (const room of rooms) {
    const stableHash = [...room.code].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
    for (let bookingNumber = 0; bookingNumber < 3; bookingNumber += 1) {
      const dayIndex = (stableHash + bookingNumber * 5) % dateKeys.length;
      const slotIndex = (Math.floor(stableHash / 13) + bookingNumber * 2) % bookingSlots.length;
      const date = dateKeys[dayIndex];
      const timeSlot = bookingSlots[slotIndex];
      if (occupiedSlots.has(`${room._id}:${date}:${timeSlot}`)) continue;
      simulatedBookings.push({
        updateOne: {
          filter: { classroomId: room._id, date, timeSlot, simulated: true },
          update: { $set: {
            classroomId: room._id, date, timeSlot,
            bookedBy: "Campus Demo User", email: "demo@campus.edu",
            attendeeCount: Math.min(room.capacity, 12 + (stableHash % 18)),
            purpose: "Scheduled campus demonstration", status: "confirmed", simulated: true
          } },
          upsert: true
        }
      });
    }
  }
  if (simulatedBookings.length) await CampusBooking.bulkWrite(simulatedBookings, { ordered: false });

  return {
    departments: departments.length,
    buildings: departments.length,
    floors: departments.length * floorNames.length,
    classrooms: rooms.length,
    simulatedBookings: simulatedBookings.length
  };
}

# EdSpace — University Classroom Booking

EdSpace is a responsive university classroom booking application. The React interface uses a Node.js/Express API and MongoDB for persistent campus and booking data.

## Abstract

EdSpace is a full-stack classroom resource booking system designed to help university staff find and reserve suitable campus classrooms. It simulates a university with 12 configurable academic departments, 12 buildings, four floors per department, and 480 individually described classrooms. Staff can search by room number, department, floor, building, capacity, classroom type, and equipment, then check availability for a selected date and one-hour time slot. The booking workflow collects the user's name, college email, attendee count, and purpose; validates capacity and input; and prevents duplicate reservations for the same room and slot. Staff can review, search, sort, filter, and cancel eligible bookings. A dashboard presents live campus counts, selected-slot availability and utilization, department activity, floor use, and recent booking trends.

The interface is developed with React, JavaScript, semantic HTML, and responsive CSS, using the supplied HTML as a visual reference for its dark burgundy, plum, and muted-pink style. The backend uses Node.js and Express to expose JSON APIs for departments, buildings, floors, classrooms, availability, bookings, and dashboard data. MongoDB with Mongoose stores each campus entity and booking as a persistent document. A repeatable, non-destructive seed script generates the campus catalog and stable sample bookings; it does not truncate existing data. Server-side validation and a unique active-booking index protect booking integrity. The project demonstrates responsive UI design, DOM-driven interface behavior through React, form validation, REST API integration, server-side business rules, MongoDB data modeling, filtering, pagination, and persistent storage.

## Sample output screenshots

For the project report's sample output section, capture:

1. The EdSpace welcome screen and campus dashboard in a browser.
2. The filtered classroom catalog and a room's availability/booking dialog.
3. The MongoDB Compass `departments`, `classrooms`, and `campus_bookings` collections after the campus seed has run and a test booking has been added.

Use the browser screenshot and MongoDB Compass screenshots as report figures; redact email addresses if you use real personal data. The example seeded bookings use demo contact details.

## What is included

- A burgundy, black, plum, and muted-pink interface inspired by the supplied visual reference.
- A one-time animated welcome screen, sticky section navigation, campus search, date/time-aware room cards, responsive booking details, and toast notifications.
- Twelve configurable departments, twelve department buildings, four floors per department, and 480 individually stored classrooms.
- CSE classroom labels use `CS101`–`CS110` on Ground Floor, `CS201`–`CS210` on First Floor, `CS301`–`CS310` on Second Floor, and `CS401`–`CS410` on Third Floor. Other departments include their code in each room label, such as `EEE-101`, `EEE-201`, `EEE-301`, and `EEE-401`.
- Seeded classroom equipment, realistic classroom types and capacities, and 1,440 stable sample bookings across several campus dates.
- MongoDB-backed search, filters, pagination, availability, dashboard metrics, booking creation, and cancellation.
- Server-side validation and a unique active-booking index that prevents two reservations for the same classroom/date/time slot.
- The original `resources` collection and original `/api/resources` and `/api/bookings` endpoints remain intact. Campus reservations use a separate `campus_bookings` collection so existing resource bookings and indexes are not overwritten.

## Local setup

Requirements: Node.js 18+, npm, and MongoDB Community Server running locally or a MongoDB Atlas URI.

1. Copy `.env.example` to `.env`.
2. Verify the local MongoDB URI in `.env`:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/classroomly
   ```

3. Install packages:

   ```powershell
   npm install
   ```

4. Optional: seed or reconcile campus data explicitly. The seed uses upserts and is safe to run again; it does not truncate collections.

   ```powershell
   npm run seed:campus
   ```

5. Start the frontend and API together:

   ```powershell
   npm run dev
   ```

6. Open the Vite URL printed in the terminal (normally `http://localhost:5173`). MongoDB health is available at `http://localhost:5000/api/health`.

The API also seeds the campus catalog automatically when it starts. Existing resource records are retained.

## MongoDB collections

The campus application stores data in:

- `departments` — department metadata and building name.
- `buildings` — campus building records.
- `floors` — four department floors.
- `classrooms` — 480 independent room records.
- `campus_bookings` — stable simulated reservations and real prototype bookings.

The earlier `resources` and `bookings` collections are kept separate for backwards compatibility. Demo bookings are marked `simulated`; the prototype does not implement user authentication, so the booking list is a campus demo view rather than a private authenticated user account.

## Campus APIs

- `GET /api/health`
- `GET /api/departments`
- `GET /api/buildings`
- `GET /api/floors?departmentId=...`
- `GET /api/slots`
- `GET /api/equipment`
- `GET /api/classrooms?departmentId=&buildingId=&floorId=&capacity=&type=&equipment=&date=&timeSlot=&availableOnly=&sort=&search=&page=&limit=`
- `GET /api/classrooms/:id/availability?date=YYYY-MM-DD`
- `GET /api/campus/bookings?departmentId=&search=&status=&sort=&page=&limit=`
- `POST /api/campus/bookings`
- `DELETE /api/campus/bookings/:id`
- `GET /api/dashboard?date=YYYY-MM-DD&timeSlot=...`

Create a production frontend build with `npm run build`; run only the API with `npm start`.

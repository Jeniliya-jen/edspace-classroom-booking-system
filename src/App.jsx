import { useCallback, useEffect, useMemo, useState } from "react";

const timeSlots = [
  "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "12:00 - 01:00", "02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00"
];
const roomTypes = ["Standard Classroom", "Smart Classroom", "Lecture Hall", "Tutorial Room", "Seminar Room", "Computer Lab", "Department Laboratory"];
function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function Icon({ name }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    people: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6.7a3.5 3.5 0 0 1 0 6.8m1 3.2h1a3 3 0 0 1 3 3V20"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    close: <path d="m18 6-12 12M6 6l12 12"/>,
    book: <><path d="M4 19.5V6.2A2.2 2.2 0 0 1 6.2 4H20v13.4H6.2A2.2 2.2 0 0 0 4 19.5Zm0 0A2.2 2.2 0 0 0 6.2 22H20v-4.6M8 8h8M8 11.5h8"/></>,
    spark: <path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/>
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "The booking service could not complete that request.");
  }
  return response.status === 204 ? null : response.json();
}

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}

function App() {
  const [departments, setDepartments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [slots, setSlots] = useState(timeSlots);
  const [classrooms, setClassrooms] = useState([]);
  const [roomTotal, setRoomTotal] = useState(0);
  const [roomPages, setRoomPages] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingPages, setBookingPages] = useState(1);
  const [dashboard, setDashboard] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [databaseStatus, setDatabaseStatus] = useState("checking");
  const [toast, setToast] = useState("");
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("edspace-entered"));
  const [activeSection, setActiveSection] = useState("resources");
  const [dialogRoom, setDialogRoom] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [page, setPage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState({
    departmentId: "", floorId: "", buildingId: "", search: "", capacity: "",
    type: "", equipment: "", date: localDate(), timeSlot: timeSlots[0],
    availableOnly: false, sort: "roomNumber"
  });
  const [bookingFilters, setBookingFilters] = useState({ search: "", status: "confirmed", departmentId: "", sort: "dateAsc" });
  const [form, setForm] = useState({ bookedBy: "", email: "", attendeeCount: 20, purpose: "" });
  const [selectedSlot, setSelectedSlot] = useState("");
  const [formError, setFormError] = useState("");

  const notify = useCallback(message => setToast(message), []);
  const updateFilter = (key, value) => {
    setPage(1);
    setFilters(previous => ({ ...previous, [key]: value }));
  };
  const filterByEquipment = item => {
    updateFilter("equipment", item);
    setDialogRoom(null);
    notify(`Showing classrooms with ${item}.`);
  };
  const loadBase = useCallback(async () => {
    try {
      const [departmentData, buildingData, floorData, slotData, equipmentData, health] = await Promise.all([
        api("/api/departments"), api("/api/buildings"), api("/api/floors"), api("/api/slots"),
        api("/api/equipment"), api("/api/health")
      ]);
      setDepartments(departmentData);
      setBuildings(buildingData);
      setFloors(floorData);
      setSlots(slotData);
      setEquipmentOptions(equipmentData);
      setDatabaseStatus(health.database);
      setServiceError("");
      setFilters(previous => ({ ...previous, timeSlot: previous.timeSlot || slotData[0] }));
    } catch (error) {
      setServiceError(error.message);
      setDatabaseStatus("disconnected");
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!dialogRoom) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setDialogRoom(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialogRoom]);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const params = new URLSearchParams({ page: String(page), limit: "24", date: filters.date, timeSlot: filters.timeSlot, sort: filters.sort });
    for (const key of ["departmentId", "floorId", "buildingId", "capacity", "type", "equipment", "search"]) {
      if (filters[key]) params.set(key, filters[key]);
    }
    if (filters.availableOnly) params.set("availableOnly", "true");
    try {
      const result = await api(`/api/classrooms?${params}`);
      setClassrooms(result.classrooms);
      setRoomTotal(result.total);
      setRoomPages(Math.max(1, result.pages));
      setServiceError("");
    } catch (error) {
      setClassrooms([]);
      setServiceError(error.message);
    } finally {
      setLoadingRooms(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = window.setTimeout(loadRooms, 180);
    return () => window.clearTimeout(timer);
  }, [loadRooms, refresh]);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    const params = new URLSearchParams({ page: String(bookingPage), limit: "12", status: bookingFilters.status, sort: bookingFilters.sort });
    if (bookingFilters.search) params.set("search", bookingFilters.search);
    if (bookingFilters.departmentId) params.set("departmentId", bookingFilters.departmentId);
    try {
      const result = await api(`/api/campus/bookings?${params}`);
      setBookings(result.bookings);
      setBookingTotal(result.total);
      setBookingPages(Math.max(1, result.pages));
    } catch (error) {
      notify(error.message);
    } finally {
      setLoadingBookings(false);
    }
  }, [bookingFilters, bookingPage, notify]);
  useEffect(() => { loadBookings(); }, [loadBookings, refresh]);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      setDashboard(await api(`/api/dashboard?date=${encodeURIComponent(filters.date)}&timeSlot=${encodeURIComponent(filters.timeSlot)}`));
    } catch (error) {
      notify(error.message);
    } finally {
      setLoadingDashboard(false);
    }
  }, [filters.date, filters.timeSlot, notify]);
  useEffect(() => { loadDashboard(); }, [loadDashboard, refresh]);

  const floorOptions = useMemo(
    () => floors.filter(floor => !filters.departmentId || floor.departmentId === filters.departmentId),
    [floors, filters.departmentId]
  );
  const buildingOptions = useMemo(
    () => buildings.filter(building => !filters.departmentId || building.departmentId?._id === filters.departmentId),
    [buildings, filters.departmentId]
  );

  async function openRoom(room) {
    setDialogRoom(room);
    setSelectedSlot(filters.timeSlot);
    setForm({ bookedBy: "", email: "", attendeeCount: Math.min(20, room.capacity), purpose: "" });
    setFormError("");
  }

  useEffect(() => {
    if (!dialogRoom) return undefined;
    let active = true;
    setLoadingAvailability(true);
    api(`/api/classrooms/${dialogRoom._id}/availability?date=${encodeURIComponent(filters.date)}`)
      .then(result => {
        if (active) {
          setAvailability(result.slots);
          setSelectedSlot(current => result.slots.some(slot => slot.timeSlot === current && slot.status === "available")
            ? current
            : result.slots.find(slot => slot.status === "available")?.timeSlot || "");
        }
      })
      .catch(error => { if (active) setFormError(error.message); })
      .finally(() => { if (active) setLoadingAvailability(false); });
    return () => { active = false; };
  }, [dialogRoom, filters.date, refresh]);

  async function submitBooking(event) {
    event.preventDefault();
    setFormError("");
    if (!dialogRoom || !selectedSlot) {
      setFormError("Choose an available time slot.");
      return;
    }
    try {
      const booking = await api("/api/campus/bookings", {
        method: "POST",
        body: JSON.stringify({
          classroomId: dialogRoom._id, date: filters.date, timeSlot: selectedSlot,
          bookedBy: form.bookedBy, email: form.email,
          attendeeCount: Number(form.attendeeCount), purpose: form.purpose
        })
      });
      setDialogRoom(null);
      setToast(`${booking.classroomId.roomNumber} is reserved for ${selectedSlot}.`);
      setRefresh(value => value + 1);
    } catch (error) {
      setFormError(error.message);
    }
  }

  async function cancelBooking(booking) {
    try {
      await api(`/api/campus/bookings/${booking._id}`, { method: "DELETE" });
      setToast("Booking cancelled. This time slot is available again.");
      setRefresh(value => value + 1);
    } catch (error) {
      notify(error.message);
    }
  }

  function navigate(section) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
  }

  function enterApp() {
    sessionStorage.setItem("edspace-entered", "yes");
    setShowSplash(false);
    window.setTimeout(() => document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  const availableSlots = availability.filter(slot => slot.status === "available");
  const dashboardTotals = dashboard?.totals;

  return (
    <div className="edspace-app">
      {showSplash && <div className="splash" role="dialog" aria-modal="true" aria-labelledby="splash-title">
        <span className="splash-orb orb-one"/><span className="splash-orb orb-two"/>
        <div className="splash-rings"><i/><i/><i/></div>
        <div className="splash-inner"><span className="pill">✦ Smart campus scheduling</span><h1 className="splash-title" id="splash-title">EdSpace</h1><p className="splash-subtitle">Reserve <strong>classrooms</strong> in seconds.</p><button className="enter-button" type="button" onClick={enterApp}>Enter Booking System <span>→</span></button><span className="splash-hint">12 departments · 480 classrooms · one campus</span></div>
      </div>}

      <header className="site-header">
        <div className="site-nav wrap">
          <a className="wordmark" href="#top" onClick={() => setActiveSection("resources")}>Ed<span>Space</span> <b>✦</b></a>
          <nav aria-label="Main navigation">
            {[["resources", "Resources"], ["book", "Book a Classroom"], ["mine", "My Bookings"], ["dashboard", "Dashboard"], ["about", "About"]].map(([id, label]) => <button key={id} className={activeSection === id ? "nav-active" : ""} type="button" onClick={() => navigate(id)}>{label}</button>)}
          </nav>
          <div className="header-status"><span className={`status-dot ${databaseStatus}`}/><span>{databaseStatus === "connected" ? "MongoDB live" : databaseStatus === "checking" ? "Connecting" : "Offline"}</span><time>{new Date().toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</time></div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <span className="hero-glow glow-left"/><span className="hero-glow glow-right"/>
          <div className="wrap hero-content">
            <span className="pill">🎓 &nbsp; Smart campus scheduling</span>
            <p className="hero-overline">ONE CAMPUS. ROOM FOR EVERY IDEA.</p>
            <h1>Reserve any classroom,<br/><span className="gradient-text">in a few clicks.</span></h1>
            <p className="hero-description">Classrooms, labs, seminar halls and specialist spaces — see live availability, avoid clashes, and manage every booking from one place.</p>
            <button className="primary-button" type="button" onClick={() => navigate("book")}>Find your classroom <Icon name="arrow"/></button>
            <div className="hero-stats">
              {[
                [dashboardTotals?.departments ?? "—", "Departments"],
                [dashboardTotals?.classrooms ?? "—", "Classrooms"],
                [dashboardTotals?.bookings ?? "—", "Campus bookings"],
                [`${dashboardTotals?.utilization ?? 0}%`, "Slot utilization"]
              ].map(([value, label]) => <article className="hero-stat" key={label}><strong>{loadingDashboard ? "—" : value}</strong><span>{label}</span></article>)}
            </div>
          </div>
          <div className="hero-illustration" aria-hidden="true"><div className="hero-moon"/><div className="hero-building building-back"/><div className="hero-building building-front"><i/><i/><i/><i/><i/><i/><i/><i/></div><span className="hero-star star-a">✦</span><span className="hero-star star-b">✧</span><span className="hero-caption">YOUR CAMPUS<br/>YOUR CLASSROOM</span></div>
        </section>

        <section className="section-block" id="resources">
          <div className="wrap">
            <figure className="campus-panorama">
              <img src="/campus-panorama.png" alt="Aerial view of the campus buildings and surrounding greenery" loading="lazy" decoding="async" />
              <figcaption>Our campus</figcaption>
            </figure>
            <div className="section-heading"><div><p className="section-kicker">EXPLORE THE CAMPUS</p><h2>Find your <span>space.</span></h2><p className="section-intro">Explore 480 classrooms across 12 departments. Pick a date and time to see live availability.</p></div><div className="result-count"><strong>{roomTotal.toLocaleString()}</strong><span>matching rooms</span></div></div>
            {serviceError && <div className="service-alert" role="alert"><div><strong>Booking service unavailable</strong><span>{serviceError}</span></div><button type="button" onClick={() => { loadBase(); setRefresh(value => value + 1); }}>Retry connection</button></div>}
            <div className="filter-panel">
              <label className="filter-field"><span>Department</span><select value={filters.departmentId} onChange={event => { updateFilter("departmentId", event.target.value); updateFilter("floorId", ""); updateFilter("buildingId", ""); }}><option value="">All departments</option>{departments.map(department => <option key={department._id} value={department._id}>{department.code} · {department.name}</option>)}</select></label>
              <label className="filter-field"><span>Floor</span><select value={filters.floorId} onChange={event => updateFilter("floorId", event.target.value)}><option value="">All floors</option>{floorOptions.map(floor => <option key={floor._id} value={floor._id}>{floor.name}</option>)}</select></label>
              <label className="filter-field"><span>Building</span><select value={filters.buildingId} onChange={event => updateFilter("buildingId", event.target.value)}><option value="">All buildings</option>{buildingOptions.map(building => <option key={building._id} value={building._id}>{building.shortName}</option>)}</select></label>
              <label className="filter-field"><span>Date</span><input type="date" min={localDate()} value={filters.date} onChange={event => { if (event.target.value) updateFilter("date", event.target.value); }}/></label>
              <label className="filter-field"><span>Time slot</span><select value={filters.timeSlot} onChange={event => updateFilter("timeSlot", event.target.value)}>{slots.map(slot => <option key={slot}>{slot}</option>)}</select></label>
              <label className="filter-field"><span>Minimum seats</span><select value={filters.capacity} onChange={event => updateFilter("capacity", event.target.value)}><option value="">Any capacity</option>{[30, 40, 50, 60, 80, 100].map(value => <option key={value} value={value}>{value}+ seats</option>)}</select></label>
              <label className="filter-field"><span>Room type</span><select value={filters.type} onChange={event => updateFilter("type", event.target.value)}><option value="">All room types</option>{roomTypes.map(type => <option key={type}>{type}</option>)}</select></label>
              <label className="filter-field"><span>Equipment</span><select value={filters.equipment} onChange={event => updateFilter("equipment", event.target.value)}><option value="">Any equipment</option>{equipmentOptions.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="search-field"><span>Room search</span><span className="search-input"><Icon name="search"/><input type="search" value={filters.search} placeholder="Try CSE-F1-201" onChange={event => updateFilter("search", event.target.value)}/></span></label>
              <label className="filter-field"><span>Sort rooms</span><select value={filters.sort} onChange={event => updateFilter("sort", event.target.value)}><option value="roomNumber">Room number</option><option value="capacity">Capacity · smallest first</option><option value="capacityDesc">Capacity · largest first</option><option value="availability">Availability · free first</option></select></label>
              <label className="available-toggle"><input type="checkbox" checked={filters.availableOnly} onChange={event => updateFilter("availableOnly", event.target.checked)}/><span className="toggle-track"/><span>Available at selected time only</span></label>
              <button className="reset-filters" type="button" onClick={() => { setFilters(previous => ({ ...previous, departmentId: "", floorId: "", buildingId: "", search: "", capacity: "", type: "", equipment: "", availableOnly: false, sort: "roomNumber" })); setPage(1); }}>Reset filters</button>
            </div>
            <div className="resource-grid" aria-live="polite">
              {loadingRooms ? <div className="empty-panel">Loading campus classrooms…</div> : classrooms.length === 0 ? <div className="empty-panel">No rooms match those filters. Try widening your search.</div> : classrooms.map((room, index) => <article className={`room-card ${room.selectedSlotStatus === "booked" ? "room-booked" : ""}`} key={room._id} style={{ animationDelay: `${index * 18}ms` }}>
                <div className="room-card-top"><span className={`availability-pill ${room.selectedSlotStatus || "neutral"}`}><i/>{room.selectedSlotStatus === "booked" ? "Slot booked" : room.selectedSlotStatus === "available" ? "Available at selected time" : "Select date & time"}</span><span className="room-dept">{room.departmentId?.code}</span></div>
                {room.remainingSlots !== null && <span className={`daily-availability ${room.remainingSlots === 0 ? "none" : room.remainingSlots <= 2 ? "limited" : ""}`}>{room.remainingSlots === 0 ? "Fully booked today" : room.remainingSlots <= 2 ? `${room.remainingSlots} slots left today` : `${room.remainingSlots} of ${slots.length} slots free today`}</span>}
                <div className="room-symbol">{room.type.includes("Lab") ? "⌬" : room.type === "Lecture Hall" ? "◈" : room.type === "Seminar Room" ? "◇" : "▤"}</div>
                <p className="room-type">{room.type}</p><h3>{room.roomNumber}</h3>
                <p className="room-location"><Icon name="location"/>{room.buildingId?.shortName} <span>·</span> {room.floorId?.name}</p>
                <div className="room-facts"><span><Icon name="people"/>{room.capacity} seats</span><span><Icon name="clock"/>{filters.timeSlot}</span></div>
                <div className="equipment-tags" aria-label="Filter by classroom equipment">{room.equipment.slice(0, 3).map(item => <button className="equipment-chip" type="button" key={item} aria-pressed={filters.equipment === item} onClick={() => filterByEquipment(item)}>{item}</button>)}</div>
                <button className="room-details-button" type="button" onClick={() => openRoom(room)}>Room details <Icon name="arrow"/></button>
              </article>)}
            </div>
            <Pagination page={page} pages={roomPages} setPage={setPage} label="classrooms"/>
          </div>
        </section>

        <section className="section-block booking-section" id="book">
          <div className="wrap">
            <div className="section-heading"><div><p className="section-kicker">A ROOM FOR YOUR NEXT IDEA</p><h2>Booking, <span>made simple.</span></h2><p className="section-intro">Choose a classroom above to see its date-specific slots and reserve your session.</p></div></div>
            <div className="booking-guide"><div className="guide-step"><b>01</b><div><strong>Find your department</strong><span>Filter the campus by department, floor, room type, and equipment.</span></div></div><div className="guide-step"><b>02</b><div><strong>Check live availability</strong><span>Pick a date and see confirmed bookings for every time slot.</span></div></div><div className="guide-step"><b>03</b><div><strong>Make it yours</strong><span>Add your college email, attendee count, and lesson purpose.</span></div></div></div>
          </div>
        </section>

        <section className="section-block" id="mine">
          <div className="wrap">
            <div className="section-heading"><div><p className="section-kicker">YOUR CAMPUS CALENDAR</p><h2>My <span>bookings.</span></h2><p className="section-intro">Prototype demo view: includes sample campus activity and reservations from this session.</p></div><span className="result-count"><strong>{bookingTotal.toLocaleString()}</strong><span>reservations</span></span></div>
            <div className="table-toolbar"><label className="search-input"><Icon name="search"/><input type="search" value={bookingFilters.search} placeholder="Search rooms, names, email, or purpose" onChange={event => { setBookingPage(1); setBookingFilters(previous => ({ ...previous, search: event.target.value })); }}/></label><select value={bookingFilters.departmentId} onChange={event => { setBookingPage(1); setBookingFilters(previous => ({ ...previous, departmentId: event.target.value })); }}><option value="">All departments</option>{departments.map(department => <option key={department._id} value={department._id}>{department.code}</option>)}</select><select value={bookingFilters.status} onChange={event => { setBookingPage(1); setBookingFilters(previous => ({ ...previous, status: event.target.value })); }}><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="all">All statuses</option></select><select aria-label="Sort bookings" value={bookingFilters.sort} onChange={event => { setBookingPage(1); setBookingFilters(previous => ({ ...previous, sort: event.target.value })); }}><option value="dateAsc">Date · earliest</option><option value="dateDesc">Date · latest</option><option value="name">Booked by</option><option value="attendees">Attendee count</option></select></div>
            <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Booking ID</th><th>Classroom</th><th>Department / building</th><th>Date & time</th><th>Booked by</th><th>Attendees</th><th>Purpose</th><th>Status</th><th/></tr></thead><tbody>
              {loadingBookings ? <tr><td colSpan="9" className="table-empty">Loading bookings…</td></tr> : bookings.length === 0 ? <tr><td colSpan="9" className="table-empty">No bookings found for these filters.</td></tr> : bookings.map(booking => <tr key={booking._id}><td className="booking-id">{booking._id.slice(-7).toUpperCase()}{booking.simulated && <small> SAMPLE</small>}</td><td><strong>{booking.classroomId?.roomNumber}</strong><span className="cell-sub">{booking.classroomId?.type}</span></td><td>{booking.classroomId?.departmentId?.code}<span className="cell-sub">{booking.classroomId?.buildingId?.name}</span></td><td>{formatDate(booking.date)}<span className="cell-sub">{booking.timeSlot}</span></td><td>{booking.bookedBy}<span className="cell-sub">{booking.email}</span></td><td>{booking.attendeeCount}</td><td className="purpose-cell">{booking.purpose}</td><td><span className={`booking-status ${booking.status}`}>{booking.status}</span></td><td>{!booking.simulated && booking.status === "confirmed" && booking.date >= localDate() && <button className="cancel-button" type="button" onClick={() => cancelBooking(booking)}>Cancel</button>}</td></tr>)}
            </tbody></table></div><Pagination page={bookingPage} pages={bookingPages} setPage={setBookingPage} label="bookings"/></div>
          </div>
        </section>

        <section className="section-block dashboard-section" id="dashboard">
          <div className="wrap">
            <div className="section-heading"><div><p className="section-kicker">CAMPUS AT A GLANCE</p><h2>One campus, <span>many possibilities.</span></h2><p className="section-intro">Live statistics and seeded activity, calculated from MongoDB records.</p></div><div className="dashboard-pickers"><label>Date<input type="date" min={localDate()} value={filters.date} onChange={event => { if (event.target.value) updateFilter("date", event.target.value); }}/></label><label>Slot<select value={filters.timeSlot} onChange={event => updateFilter("timeSlot", event.target.value)}>{slots.map(slot => <option key={slot}>{slot}</option>)}</select></label></div></div>
            <div className="metric-grid">
              {[["Departments", dashboardTotals?.departments], ["Buildings", dashboardTotals?.buildings], ["Floors", dashboardTotals?.floors], ["Classrooms", dashboardTotals?.classrooms], ["Available · selected slot", dashboardTotals?.available], ["Booked · selected slot", dashboardTotals?.booked], ["Total confirmed", dashboardTotals?.bookings], ["Today's bookings", dashboardTotals?.todaysBookings], ["Upcoming bookings", dashboardTotals?.upcomingBookings], ["Selected-slot utilization", `${dashboardTotals?.utilization ?? 0}%`]].map(([label, value], index) => <article className="metric-card" key={label}><span>0{index + 1}</span><strong>{loadingDashboard ? "—" : value ?? 0}</strong><p>{label}</p></article>)}
            </div>
            {dashboard && <div className="chart-grid">
              <Chart title="Bookings by department" items={dashboard.bookingByDepartment.map(item => ({ label: item.code, value: item.bookings }))}/>
              <Chart title="Selected-slot availability" items={[{ label: "Available", value: dashboard.totals.available }, { label: "Booked", value: dashboard.totals.booked }]}/>
              <Chart title="Booking activity · last 7 days" items={dashboard.trend.map(item => ({ label: formatDate(item.date, { month: "short", day: "numeric" }), value: item.bookings }))}/>
              <Chart title="Selected-slot utilization by floor" items={dashboard.byFloor.map(item => ({ label: `${item.departmentCode} · ${item.floorName}`, value: item.classroomCount ? Math.round((item.booked / item.classroomCount) * 100) : 0, displayValue: `${item.classroomCount ? Math.round((item.booked / item.classroomCount) * 100) : 0}%` }))}/>
            </div>}
            {dashboard?.popularRooms?.length > 0 && <p className="dashboard-note">Most frequently booked rooms: {dashboard.popularRooms.map(room => `${room.roomNumber} (${room.bookings})`).join(" · ")}</p>}
          </div>
        </section>

        <section className="section-block about-section" id="about">
          <div className="wrap about-layout"><div><p className="section-kicker">BUILT FOR THE WAY CAMPUS WORKS</p><h2>Thoughtful spaces.<br/><span>Better learning.</span></h2><p className="section-intro">EdSpace brings a university campus into one easy-to-navigate booking experience. Its room inventory and sample timetable are generated once, stored in MongoDB, and queried live — not invented on every page load.</p></div><div className="about-panel"><h3>Under the hood</h3><ul><li>React interface with accessible, responsive controls.</li><li>Node.js and Express REST API with server-side validation.</li><li>MongoDB models for departments, buildings, floors, classrooms, and reservations.</li><li>Atomic booking conflict protection and cancellation.</li><li>Seeded demo activity across 12 departments and 480 rooms.</li></ul><div className="tech-tags">{["React", "JavaScript", "CSS3", "Node.js", "Express", "MongoDB", "Mongoose", "REST API"].map(tag => <span key={tag}>{tag}</span>)}</div></div></div>
        </section>
      </main>

      <footer className="site-footer"><div className="wrap"><a className="wordmark" href="#top">Ed<span>Space</span> <b>✦</b></a><p>Designed for curious minds and shared campus spaces.</p><span>Web Technology Project · {new Date().getFullYear()}</span></div></footer>

      {dialogRoom && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDialogRoom(null); }}>
        <section className="room-modal" role="dialog" aria-modal="true" aria-labelledby="room-modal-title">
          <button className="modal-close" type="button" aria-label="Close room details" onClick={() => setDialogRoom(null)}><Icon name="close"/></button>
          <div className="modal-topline"><span className="section-kicker">ROOM DETAILS · {dialogRoom.departmentId?.code}</span><span className="modal-room-number">{dialogRoom.roomNumber}</span></div>
          <h2 id="room-modal-title">{dialogRoom.type}</h2><p className="modal-location"><Icon name="location"/>{dialogRoom.buildingId?.name} · {dialogRoom.floorId?.name}</p>
          <div className="modal-facts"><span><strong>{dialogRoom.capacity}</strong> seats</span><span><strong>{dialogRoom.roomNumber}</strong> room number</span><span><strong>{dialogRoom.departmentId?.code}</strong> department</span></div>
          <p className="modal-description">{dialogRoom.description}</p>
          <h3>Equipment</h3><div className="equipment-tags modal-equipment" aria-label="Filter by classroom equipment">{dialogRoom.equipment.map(item => <button className="equipment-chip" type="button" key={item} aria-pressed={filters.equipment === item} onClick={() => filterByEquipment(item)}>{item}</button>)}</div>
          <div className="availability-heading"><div><h3>Choose a time</h3><span>{formatDate(filters.date, { weekday: "long", month: "long", day: "numeric" })}</span></div><span className="availability-legend"><i/>Available <i className="legend-busy"/>Booked</span></div>
          <div className="slot-grid">{loadingAvailability ? <p>Checking this room’s schedule…</p> : availability.map(slot => <button key={slot.timeSlot} className={`time-slot ${slot.status} ${selectedSlot === slot.timeSlot ? "selected" : ""}`} type="button" disabled={slot.status === "booked"} onClick={() => setSelectedSlot(slot.timeSlot)}><span>{slot.timeSlot}</span><small>{slot.status === "booked" ? "Booked" : "Available"}</small></button>)}</div>
          <form className="reservation-form" onSubmit={submitBooking}>
            <div className="form-grid"><label>Full name<input required minLength="2" maxLength="80" autoComplete="name" value={form.bookedBy} onChange={event => setForm(previous => ({ ...previous, bookedBy: event.target.value }))} placeholder="Your name"/></label><label>College email<input required type="email" autoComplete="email" value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} placeholder="you@college.edu"/></label><label>Attendees<input required type="number" min="1" max={dialogRoom.capacity} value={form.attendeeCount} onChange={event => setForm(previous => ({ ...previous, attendeeCount: event.target.value }))}/><small>Room capacity: {dialogRoom.capacity}</small></label><label>Purpose<input required minLength="3" maxLength="200" value={form.purpose} onChange={event => setForm(previous => ({ ...previous, purpose: event.target.value }))} placeholder="e.g. Web Technology lecture"/></label></div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <button className="primary-button reserve-button" type="submit" disabled={!selectedSlot || loadingAvailability || !availableSlots.some(slot => slot.timeSlot === selectedSlot)}>Confirm classroom booking <Icon name="arrow"/></button>
          </form>
        </section>
      </div>}
      {toast && <div className="toast-message" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function Pagination({ page, pages, setPage, label }) {
  if (pages <= 1) return null;
  return <div className="pagination"><span>Page {page} of {pages} {label}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>← Previous</button><button type="button" disabled={page >= pages} onClick={() => setPage(current => Math.min(pages, current + 1))}>Next →</button></div></div>;
}

function Chart({ title, items }) {
  const maximum = Math.max(1, ...items.map(item => item.value));
  return <article className="chart-card"><h3>{title}</h3><div className="bar-list">{items.map(item => <div className="bar-row" key={item.label}><span title={item.label}>{item.label}</span><div className="bar-track"><i style={{ width: `${Math.max(item.value ? 3 : 0, (item.value / maximum) * 100)}%` }}/></div><b>{item.displayValue ?? item.value}</b></div>)}</div></article>;
}

export default App;

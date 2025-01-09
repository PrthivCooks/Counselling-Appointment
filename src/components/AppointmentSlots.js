import React, { useEffect, useState } from "react";
import { database, auth } from "../firebase";
import { ref, get, update, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import "../css/appointmentSlots.css";

// Helper function to find this week's Monday to Friday with day names
const generateThisWeeksDays = () => {
  const dates = [];
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Offset to this week's Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset); // Move to Monday of this week

  for (let i = 0; i < 5; i++) {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + i); // Add i days to Monday
    const formattedDate = nextDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const dayName = nextDate.toLocaleDateString(undefined, { weekday: "long" }); // Day name
    dates.push({ date: formattedDate, day: dayName }); // Add date and day
  }
  return dates;
};

const AppointmentSlots = () => {
  const timeSlots = [
    "8:30-9:00",
    "9:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "12:00-1:00",
    "1:00-2:00",
    "2:00-3:00",
    "3:00-4:00",
    "4:00-4:30",
  ];

  const [dates, setDates] = useState(generateThisWeeksDays());
  const [slots, setSlots] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [userDetails, setUserDetails] = useState({
    name: "",
    phone: "",
    registrationNumber: "",
    reason: "",
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [alertMessage, setAlertMessage] = useState(null); // For alert messages
  const [showModal, setShowModal] = useState(false); // For booking form modal

  const fetchHolidays = async () => {
    const holidaysRef = ref(database, "holidays");
    const snapshot = await get(holidaysRef);

    if (snapshot.exists()) {
      setHolidays(snapshot.val());
    }
  };

  const fetchSlots = async () => {
    const allSlots = {};
    const validDates = dates.filter((item) => !holidays.includes(item.date));

    for (const { date } of validDates) {
      const slotsRef = ref(database, `appointments/${date}`);
      const snapshot = await get(slotsRef);

      const fetchedSlots = snapshot.exists() ? snapshot.val() : {};
      allSlots[date] = timeSlots.reduce((acc, slot) => {
        acc[slot] = fetchedSlots[slot] || { status: "Free" };
        return acc;
      }, {});
    }
    setSlots(allSlots);
  };

  const fetchUpcomingAppointments = async (uid) => {
    const userAppointments = [];
    for (const { date } of dates) {
      if (holidays.includes(date)) continue;

      const slotsRef = ref(database, `appointments/${date}`);
      const snapshot = await get(slotsRef);

      if (snapshot.exists()) {
        const slotsForDate = snapshot.val();
        for (const [slot, details] of Object.entries(slotsForDate)) {
          if (details.userId === uid) {
            userAppointments.push({ date, slot, ...details });
          }
        }
      }
    }
    setUpcomingAppointments(userAppointments);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchHolidays().then(() => {
          fetchUpcomingAppointments(user.uid);
        });
      }
    });

    return () => unsubscribe();
  }, [dates]);

  useEffect(() => {
    fetchHolidays().then(() => {
      fetchSlots();
    });
  }, [dates]);

  const handleSlotClick = async (date, slot) => {
    const slotStatus = slots[date]?.[slot]?.status;

    if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
      setAlertMessage("This slot is in the past. You cannot book it.");
      return;
    }

    if (slotStatus === "Booked") {
      setAlertMessage("This slot is booked by someone else.");
      return;
    }

    if (slotStatus === "Blocked") {
      setAlertMessage("The counsellor has blocked this slot. Please choose another slot.");
      return;
    }

    setSelectedSlot(slot);
    setSelectedDate(date);
    setShowModal(true); // Show booking modal
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    const slotRef = ref(database, `appointments/${selectedDate}/${selectedSlot}`);

    const snapshot = await get(slotRef);
    if (snapshot.exists() && snapshot.val().status === "Booked") {
      setAlertMessage("This slot was just booked by someone else. Please choose another slot.");
      setSelectedSlot(null);
      setSelectedDate(null);
      fetchSlots();
      setShowModal(false);
      return;
    }

    await update(slotRef, {
      status: "Booked",
      ...userDetails,
      userId: currentUser.uid,
    });
    setAlertMessage("Appointment booked successfully!");
    setSelectedSlot(null);
    setSelectedDate(null);
    fetchSlots();
    fetchUpcomingAppointments(currentUser.uid);
    setShowModal(false);
  };

  const handleCancelAppointment = async (appointment) => {
    const { date, slot } = appointment;
    const slotRef = ref(database, `appointments/${date}/${slot}`);

    await remove(slotRef);
    setAlertMessage("Appointment canceled successfully!");
    fetchSlots();
    fetchUpcomingAppointments(currentUser.uid);
  };

  return (
    <div className="title">
      <h1>Counselling Appointment Booking</h1>

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="alert-container">
          <div className="alert-content">
            <p>{alertMessage}</p>
            <button onClick={() => setAlertMessage(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Display Upcoming Appointments */}
      <div className="upcomingdetails">
        <h2>Upcoming Appointments</h2>
        {upcomingAppointments.length > 0 ? (
          <ul>
            {upcomingAppointments.map((appointment, index) => (
              <li key={index}>
                <p>
                  <strong>Date:</strong> {appointment.date} | <strong>Slot:</strong>{" "}
                  {appointment.slot} | <strong>Reason:</strong> {appointment.reason}
                </p>
                <button onClick={() => handleCancelAppointment(appointment)}>
                  Cancel Appointment
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming appointments.</p>
        )}
      </div>

      <table border="1" style={{ width: "100%", textAlign: "center" }}>
        <thead>
          <tr>
            <th>Time</th>
            {dates.map(({ date, day }) => (
              <th key={date} style={{ color: holidays.includes(date) ? "gray" : "black" }}>
                {day}, {date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => (
            <tr key={slot}>
              <td>{slot}</td>
              {dates.map(({ date }) => (
                <td
                  key={`${date}-${slot}`}
                  style={{
                    color:
                      slots[date]?.[slot]?.status === "Booked"
                        ? "red"
                        : slots[date]?.[slot]?.status === "Blocked"
                        ? "gray"
                        : "green",
                    cursor: slots[date]?.[slot]?.status === "Free" ? "pointer" : "default",
                  }}
                  onClick={() => handleSlotClick(date, slot)}
                >
                  {slots[date]?.[slot]?.status || "Free"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal for booking form */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowModal(false)}>
              &times;
            </span>
            <h2>Book Slot: {selectedSlot} on {selectedDate}</h2>
            <form onSubmit={handleBooking}>
              <input
                type="text"
                placeholder="Full Name"
                value={userDetails.name}
                onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={userDetails.phone}
                onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Registration Number"
                value={userDetails.registrationNumber}
                onChange={(e) =>
                  setUserDetails({ ...userDetails, registrationNumber: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Reason for Visit"
                value={userDetails.reason}
                onChange={(e) => setUserDetails({ ...userDetails, reason: e.target.value })}
                required
              />
              <button type="submit">Confirm Booking</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentSlots;

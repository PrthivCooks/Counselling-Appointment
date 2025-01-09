import React, { useEffect, useState } from "react";
import { database } from "../firebase";
import { ref, get, update, remove, set } from "firebase/database";
import * as XLSX from "xlsx";
import "../css/adminDashboard.css";

// Helper function to generate this week's Monday to Friday with day names
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

const AdminDashboard = () => {
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
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Fetch holidays and slots from Firebase
  const fetchSlotsAndHolidays = async () => {
    const allSlots = {};
    const holidaysRef = ref(database, "holidays");
    const holidaysSnapshot = await get(holidaysRef);

    const holidayDates = holidaysSnapshot.exists() ? holidaysSnapshot.val() : [];
    setHolidays(holidayDates);

    for (const { date } of dates) {
      if (holidayDates.includes(date)) continue;

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

  useEffect(() => {
    fetchSlotsAndHolidays();
  }, [dates]);

  const handleSlotClick = (date, slot) => {
    const slotDetails = slots[date]?.[slot];
    if (!slotDetails) return;

    setSelectedSlot(slot);
    setSelectedDate(date);
    setSelectedDetails(slotDetails);
    setFeedback(slotDetails.feedback || "");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setSelectedDate(null);
    setSelectedDetails(null);
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setTimeout(() => {
      setAlertMessage("");
    }, 3000);
  };

  const handleCancelAppointmentOrUnblock = async () => {
    const slotRef = ref(database, `appointments/${selectedDate}/${selectedSlot}`);
    await remove(slotRef);
    showAlert(
      selectedDetails.status === "Booked"
        ? "Appointment canceled successfully!"
        : "Slot unblocked successfully!"
    );
    handleCloseModal();
    fetchSlotsAndHolidays();
  };

  const handleBlockSlot = async () => {
    const slotRef = ref(database, `appointments/${selectedDate}/${selectedSlot}`);
    await update(slotRef, { status: "Blocked" });
    showAlert("Slot blocked successfully!");
    handleCloseModal();
    fetchSlotsAndHolidays();
  };

  const handleSaveFeedback = async () => {
    const slotRef = ref(database, `appointments/${selectedDate}/${selectedSlot}`);
    await update(slotRef, {
      ...selectedDetails,
      feedback,
      sessionComplete: true,
    });
    showAlert("Session marked complete with feedback saved.");
    handleCloseModal();
    fetchSlotsAndHolidays();
  };

  const handleMarkHoliday = async (date) => {
    const holidaysRef = ref(database, "holidays");
    const updatedHolidays = [...holidays, date];
    await set(holidaysRef, updatedHolidays);
    showAlert(`${date} marked as a holiday!`);
    fetchSlotsAndHolidays();
  };

  const handleUnmarkHoliday = async (date) => {
    const holidaysRef = ref(database, "holidays");
    const updatedHolidays = holidays.filter((holiday) => holiday !== date);
    await set(holidaysRef, updatedHolidays);
    showAlert(`${date} unmarked as a holiday!`);
    fetchSlotsAndHolidays();
  };

  const handleDownloadData = () => {
    const data = [];

    for (const { date } of dates) {
      if (!slots[date]) continue;

      for (const slot in slots[date]) {
        const slotDetails = slots[date][slot];

        if (slotDetails.status === "Booked") {
          data.push({
            Date: date,
            Slot: slot,
            Name: slotDetails.name || "",
            RegistrationNumber: slotDetails.registrationNumber || "",
            Phone: slotDetails.phone || "",
            Reason: slotDetails.reason || "",
            Feedback: slotDetails.feedback || "",
            SessionComplete: slotDetails.sessionComplete ? "Yes" : "No",
          });
        }
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Appointments");
    XLSX.writeFile(workbook, "Weekly_Appointments.xlsx");
  };

  return (
    <div className="admin-dashboard">
      <h1 className="title1">Admin Dashboard</h1>

      <button className="download-btn" onClick={handleDownloadData}>
        Download This Week's Data
      </button>

      <table className="appointment-table">
        <thead>
          <tr>
            <th>Time</th>
            {dates.map(({ date, day }) => (
              <th key={date}>
                {day}, {date}
                {holidays.includes(date) ? (
                  <button className="holiday-btn" onClick={() => handleUnmarkHoliday(date)}>
                    Unmark Holiday
                  </button>
                ) : (
                  <button className="holiday-btn" onClick={() => handleMarkHoliday(date)}>
                    Mark Holiday
                  </button>
                )}
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
                  className={
                    slots[date]?.[slot]?.status === "Booked"
                      ? "booked"
                      : slots[date]?.[slot]?.status === "Blocked"
                      ? "blocked"
                      : "free"
                  }
                  onClick={() => handleSlotClick(date, slot)}
                >
                  {slots[date]?.[slot]?.status || "Free"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-modal" onClick={handleCloseModal}>
              &times;
            </button>
            <h2>
              Manage Slot: {selectedSlot} on {selectedDate}
            </h2>
            {selectedDetails.status === "Booked" && (
              <div>
                <p><strong>Name:</strong> {selectedDetails.name}</p>
                <p><strong>Phone:</strong> {selectedDetails.phone}</p>
                <p><strong>Registration Number:</strong> {selectedDetails.registrationNumber}</p>
                <p><strong>Reason:</strong> {selectedDetails.reason}</p>
                <p>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDetails.sessionComplete || false}
                      onChange={(e) => setSelectedDetails({
                        ...selectedDetails,
                        sessionComplete: e.target.checked,
                      })}
                    />
                    Session Complete
                  </label>
                </p>
                <textarea
                  placeholder="Enter feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <button onClick={handleSaveFeedback}>Save Feedback</button>
                <button onClick={handleCancelAppointmentOrUnblock}>Cancel Appointment</button>
              </div>
            )}

            {selectedDetails.status === "Blocked" && (
              <div>
                <button onClick={handleCancelAppointmentOrUnblock}>Unblock Slot</button>
              </div>
            )}

            {selectedDetails.status === "Free" && (
              <div>
                <button onClick={handleBlockSlot}>Block Slot</button>
              </div>
            )}
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="custom-alert">
          <p>{alertMessage}</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

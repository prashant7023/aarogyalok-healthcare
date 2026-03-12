import { useState, useEffect } from "react";
import api from "../../shared/utils/api";
import useAuthStore from "../auth/authStore";
import {
  Users,
  Calendar,
  Clock,
  Stethoscope,
  Award,
  MapPin,
  DollarSign,
  ChevronRight,
  Timer
} from "lucide-react";
import { io } from "socket.io-client";
import DoctorDashboard from "./DoctorDashboard";
import BookingForm from "./BookingForm";

export default function QueuePage() {
  const { user } = useAuthStore();
  const role = user?.role || "patient";
  const isDoctor = role === "doctor";

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [socket, setSocket] = useState(null);

  // SOCKET CONNECTION
  useEffect(() => {
    const socketInstance = io(
      import.meta.env.VITE_API_URL || "http://localhost:5000"
    );

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected to Socket.IO");
    });

    socketInstance.on("new-booking", (data) => {
      console.log("New booking:", data);

      if (selectedDoctor?._id === data.doctorId) {
        fetchDoctorSlots(selectedDoctor._id, selectedDate);
      }
    });

    return () => {
      socketInstance.off("new-booking");
      socketInstance.disconnect();
    };
  }, [selectedDoctor, selectedDate]);

  // FETCH DOCTORS
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get("/queue/doctors");
      setDoctors(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch doctors:", e);
    }
  };

  // FETCH SLOTS
  const fetchDoctorSlots = async (doctorId, date) => {
    try {
      const res = await api.get(`/queue/doctors/${doctorId}/slots?date=${date}`);

      setAvailableSlots(res.data.data?.slots || []);
      setSelectedDoctor(res.data.data?.doctor);
    } catch (e) {
      console.error("Failed to fetch slots:", e);
    }
  };

  // SELECT DOCTOR
  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);

    fetchDoctorSlots(doctor._id, selectedDate);

    if (socket) {
      socket.emit("join-doctor", doctor._id);
    }
  };

  // DATE CHANGE
  const handleDateChange = (e) => {
    const newDate = e.target.value;

    setSelectedDate(newDate);

    if (selectedDoctor) {
      fetchDoctorSlots(selectedDoctor._id, newDate);
    }
  };

  // SLOT SELECT
  const handleSlotSelect = (slot) => {
    if (slot.available) {
      setSelectedSlot(slot);
      setBookingModal(true);
    }
  };

  // BOOK APPOINTMENT
  const handleBooking = async (patientData) => {
    if (!selectedSlot || !selectedDoctor) return;

    setLoading(true);

    try {
      await api.post("/queue/bookings", {
        doctorId: selectedDoctor._id,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot.time,
        ...patientData
      });

      alert("✅ Appointment booked successfully!");

      setBookingModal(false);
      setSelectedSlot(null);

      fetchDoctorSlots(selectedDoctor._id, selectedDate);
    } catch (e) {
      alert(e.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  // DOCTOR DASHBOARD
  if (isDoctor) {
    return <DoctorDashboard />;
  }

  // PATIENT VIEW
  return (
    <div className="fade-in">
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h1>Book Doctor Appointment</h1>
          <p>Browse available doctors and book your consultation</p>
        </div>
      </div>

      {!selectedDoctor ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem"
            }}
          >
            <h2
              style={{
                fontSize: "1.3rem",
                margin: 0,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Stethoscope size={22} />
              Available Doctors
            </h2>

            <div
              style={{
                background: "#dbeafe",
                color: "#2563eb",
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                fontSize: "0.9rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Users size={16} />
              {doctors.length} Doctors
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem"
            }}
          >
            {doctors.map((doctor) => (
              <div
                key={doctor._id}
                className="card"
                style={{
                  padding: "1.75rem",
                  cursor: "pointer",
                  border: "2px solid transparent"
                }}
                onClick={() => handleDoctorClick(doctor)}
              >
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "12px",
                      background: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "1.5rem",
                      fontWeight: 700
                    }}
                  >
                    {doctor?.name?.charAt(0)}
                  </div>

                  <div>
                    <h3>{doctor.name}</h3>
                    <span className="badge badge-blue">
                      {doctor.specialization}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {doctor.qualification && (
                    <div>
                      <Award size={14} /> {doctor.qualification}
                    </div>
                  )}

                  {doctor.experience && (
                    <div>
                      <Timer size={14} /> {doctor.experience} years experience
                    </div>
                  )}

                  {doctor.consultationFee && (
                    <div>
                      <DollarSign size={14} /> ₹{doctor.consultationFee}
                    </div>
                  )}

                  {doctor.clinicAddress && (
                    <div>
                      <MapPin size={14} /> {doctor.clinicAddress}
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
                  Book Appointment <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSelectedDoctor(null);
              setAvailableSlots([]);
              setSelectedSlot(null);
            }}
            style={{ marginBottom: "1.5rem" }}
          >
            ← Back to Doctors
          </button>

          <div className="card" style={{ padding: "2rem" }}>
            <h2>{selectedDoctor.name}</h2>

            <div style={{ marginBottom: "1.5rem" }}>
              <Calendar size={18} />

              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={handleDateChange}
              />
            </div>

            <h3>Available Time Slots</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "0.75rem"
              }}
            >
              {availableSlots.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSlotSelect(slot)}
                  disabled={!slot.available}
                  className="btn"
                >
                  <Clock size={14} /> {slot.time}
                </button>
              ))}
            </div>

            {availableSlots.length === 0 && (
              <p style={{ textAlign: "center", padding: "2rem" }}>
                No slots available
              </p>
            )}
          </div>
        </div>
      )}

      {bookingModal && (
        <BookingForm
          doctor={selectedDoctor}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onClose={() => setBookingModal(false)}
          onSubmit={handleBooking}
          loading={loading}
        />
      )}
    </div>
  );
}
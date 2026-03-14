import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, User, Calendar, CheckCircle, XCircle, AlertCircle, Hash, Clock, Plus } from 'lucide-react';
import api from '../../shared/utils/api';

const formatEta = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AppointmentDetails() {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offlinePatient, setOfflinePatient] = useState({
        patientName: '',
        patientPhone: '',
        patientAge: '',
        patientGender: 'Male',
        description: '',
    });
    const [submittingOffline, setSubmittingOffline] = useState(false);
    const [doneModalBooking, setDoneModalBooking] = useState(null);
    const [prescription, setPrescription] = useState('');
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [medicineInput, setMedicineInput] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [submittingDone, setSubmittingDone] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [appointmentId]);

    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        const socket = io(socketUrl);

        socket.on('connect', () => {
            socket.emit('join-appointment-queue', appointmentId);
        });

        socket.on('queue-updated', ({ appointmentId: updatedAppointmentId, queue, currentTokenNumber }) => {
            if (updatedAppointmentId !== appointmentId) return;

            setAppointment((prev) => {
                if (!prev) return prev;
                return { ...prev, currentTokenNumber };
            });

            setBookings((prev) =>
                prev.map((booking) => {
                    const updated = queue?.find((item) => item._id === booking._id || item.tokenNumber === booking.tokenNumber);
                    if (!updated) return booking;
                    return {
                        ...booking,
                        estimatedTurnTime: updated.estimatedTurnTime,
                        estimatedWaitMinutes: updated.estimatedWaitMinutes,
                        status: updated.status || booking.status,
                    };
                })
            );
        });

        return () => {
            socket.disconnect();
        };
    }, [appointmentId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/queue/doctor/appointments/${appointmentId}`);
            setAppointment(res.data.data.appointment);
            setBookings(res.data.data.bookings || []);
        } catch (e) {
            console.error('Failed to fetch details:', e);
            alert('Failed to load appointment details');
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (bookingId, markStatus) => {
        try {
            await api.patch(`/queue/doctor/bookings/${bookingId}/mark`, { markStatus });
            fetchDetails();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update patient status');
        }
    };

    const openDoneModal = (booking) => {
        setDoneModalBooking(booking);
        setPrescription(booking?.doctorPrescription || '');
        setMedicines(Array.isArray(booking?.prescribedMedicines) ? booking.prescribedMedicines : []);
        setPrescriptionFile(null);
        setMedicineInput('');
    };

    const closeDoneModal = () => {
        if (submittingDone) return;
        setDoneModalBooking(null);
        setPrescription('');
        setPrescriptionFile(null);
        setMedicineInput('');
        setMedicines([]);
    };

    const handleAddMedicine = () => {
        const value = medicineInput.trim();
        if (!value) return;
        setMedicines((prev) => [...prev, value]);
        setMedicineInput('');
    };

    const handleRemoveMedicine = (indexToRemove) => {
        setMedicines((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleCompleteWithPrescription = async () => {
        if (!doneModalBooking?._id) return;

        if (!prescription.trim() && !prescriptionFile && medicines.length === 0) {
            alert('Please upload prescription file, add notes, or add at least one medicine');
            return;
        }

        setSubmittingDone(true);
        try {
            const formData = new FormData();
            formData.append('markStatus', 'completed');
            formData.append('prescription', prescription);
            formData.append('medicines', JSON.stringify(medicines));
            if (prescriptionFile) {
                formData.append('prescriptionFile', prescriptionFile);
            }

            await api.patch(`/queue/doctor/bookings/${doneModalBooking._id}/mark`, formData);
            closeDoneModal();
            fetchDetails();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to upload prescription and complete consultation');
        } finally {
            setSubmittingDone(false);
        }
    };

    const handleAddOfflinePatient = async (e) => {
        e.preventDefault();
        setSubmittingOffline(true);

        try {
            await api.post(`/queue/doctor/appointments/${appointmentId}/offline-bookings`, {
                ...offlinePatient,
                patientAge: parseInt(offlinePatient.patientAge),
            });
            setOfflinePatient({ patientName: '', patientPhone: '', patientAge: '', patientGender: 'Male', description: '' });
            fetchDetails();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to add offline patient');
        } finally {
            setSubmittingOffline(false);
        }
    };

    if (loading) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>;
    }

    if (!appointment) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: '3rem' }}>Appointment not found</div>;
    }

    const activeQueue = bookings.filter((booking) => booking.status === 'confirmed');

    return (
        <div className="fade-in">
            <button
                className="btn btn-secondary"
                onClick={() => navigate('/queue')}
                style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a' }}>{appointment.title}</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div><strong>Date:</strong> {new Date(appointment.appointmentDate).toLocaleDateString()}</div>
                    <div><strong>Duration:</strong> {appointment.consultationDurationMinutes} min/patient</div>
                    <div><strong>Current Token:</strong> {appointment.currentTokenNumber || '-'}</div>
                    <div><strong>Issued Tokens:</strong> {appointment.totalTokensIssued || 0}</div>
                </div>
                <div><strong>Address:</strong> {appointment.address}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} color="#2563eb" /> Add Offline Walk-in Patient
                </h2>
                <form onSubmit={handleAddOfflinePatient} style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                        <input className="input" placeholder="Patient name" value={offlinePatient.patientName} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientName: e.target.value }))} required />
                        <input className="input" type="number" placeholder="Age" min="1" max="120" value={offlinePatient.patientAge} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientAge: e.target.value }))} required />
                        <select className="input" value={offlinePatient.patientGender} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientGender: e.target.value }))}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <input className="input" type="tel" placeholder="Patient mobile number (optional)" value={offlinePatient.patientPhone} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, patientPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} pattern="\d{10}" title="Enter a valid 10-digit mobile number" />
                    <textarea className="input" rows={2} placeholder="Symptoms / notes" value={offlinePatient.description} onChange={(e) => setOfflinePatient((prev) => ({ ...prev, description: e.target.value }))} required style={{ resize: 'vertical' }} />
                    <button type="submit" className="btn btn-primary" disabled={submittingOffline} style={{ width: 'fit-content' }}>
                        {submittingOffline ? 'Adding...' : 'Add to Queue'}
                    </button>
                </form>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                {/* Queue stats header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e1e3e5', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                            <span style={{ fontSize: '0.72rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active</span>
                            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{activeQueue.length}</span>
                        </div>
                        <div style={{ width: 1, height: 28, background: '#e1e3e5' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#005bd3' }} />
                            <span style={{ fontSize: '0.72rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total</span>
                            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#303030', lineHeight: 1 }}>{bookings.length}</span>
                        </div>
                        <div style={{ width: 1, height: 28, background: '#e1e3e5' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#008060' }} />
                            <span style={{ fontSize: '0.72rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Prescription Uploaded</span>
                            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#008060', lineHeight: 1 }}>{bookings.filter(b => b.status === 'completed').length}</span>
                        </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#005bd3', background: '#ebf4ff', padding: '0.3rem 0.75rem', borderRadius: '6px' }}>Live Queue</span>
                </div>

                {bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <User size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                        <p>No patients in queue yet</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {bookings
                            .sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0))
                            .map((booking) => {
                                const isDone = booking.status === 'completed';
                                const isCancelled = booking.status === 'cancelled';
                                const isWaiting = booking.status === 'confirmed';
                                const accentColor = isDone ? '#008060' : isCancelled ? '#dc2626' : '#f59e0b';
                                const statusBg = isDone ? '#f0fdf4' : isCancelled ? '#fff1f0' : '#fffbeb';
                                const statusText = isDone ? '#008060' : isCancelled ? '#dc2626' : '#b45309';
                                return (
                                    <div
                                        key={booking._id}
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #e1e3e5',
                                            borderLeft: `4px solid ${accentColor}`,
                                            background: isDone ? '#fafffe' : isCancelled ? '#fffafa' : '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.9rem',
                                            padding: '0.7rem 1rem',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {/* Token badge */}
                                        <div style={{
                                            minWidth: 42, textAlign: 'center',
                                            background: '#ebf4ff', color: '#005bd3',
                                            borderRadius: '8px', padding: '0.35rem 0.3rem',
                                            fontWeight: 800, fontSize: '1rem', lineHeight: 1.15,
                                            flexShrink: 0,
                                        }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#5b8dee', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Token</div>
                                            {booking.tokenNumber}
                                        </div>

                                        {/* Patient info */}
                                        <div style={{ flex: 1, minWidth: 130 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#303030', marginBottom: '0.15rem' }}>
                                                {booking.patientName}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#8a8a8a', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <span>{booking.patientAge}y</span>
                                                <span style={{ color: '#d1d5db' }}>•</span>
                                                <span>{booking.patientGender}</span>
                                                {booking.isOfflineEntry && (
                                                    <>
                                                        <span style={{ color: '#d1d5db' }}>•</span>
                                                        <span style={{ background: '#f1f2f3', color: '#636363', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.68rem' }}>Walk-in</span>
                                                    </>
                                                )}
                                                {booking.patientPhone && (
                                                    <>
                                                        <span style={{ color: '#d1d5db' }}>•</span>
                                                        <span style={{ color: '#005bd3', fontWeight: 700 }}>📱 {booking.patientPhone}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Meta chips */}
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', flexShrink: 0 }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.22rem 0.55rem', borderRadius: '6px', background: '#ebf4ff', color: '#005bd3', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <Hash size={10} /> {appointment.currentTokenNumber || '-'}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.22rem 0.55rem', borderRadius: '6px', background: '#f0fdfa', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <Clock size={10} /> {formatEta(booking.estimatedTurnTime)}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.22rem 0.55rem', borderRadius: '6px', background: '#f8fafc', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <Calendar size={10} /> {booking.estimatedWaitMinutes ?? 0} min
                                            </span>
                                        </div>

                                        {/* Status + actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                                            <span style={{
                                                padding: '0.28rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                background: statusBg, color: statusText,
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            }}>
                                                {isDone && <CheckCircle size={12} />}
                                                {isCancelled && <XCircle size={12} />}
                                                {isWaiting && <AlertCircle size={12} />}
                                                {isDone ? 'Done' : isCancelled ? 'Cancelled' : 'Waiting'}
                                            </span>
                                            {isWaiting && (
                                                <>
                                                    <button
                                                        onClick={() => handleMark(booking._id, 'absent')}
                                                        style={{ fontSize: '0.75rem', padding: '0.28rem 0.6rem', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => openDoneModal(booking)}
                                                        style={{ fontSize: '0.75rem', padding: '0.28rem 0.65rem', background: '#008060', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Upload Prescription
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>

            {doneModalBooking && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.45)',
                        zIndex: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                    }}
                >
                    <div style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: '10px', border: '1px solid #e1e3e5', padding: '1rem' }}>
                        <h3 style={{ margin: 0, marginBottom: '0.7rem', fontSize: '1rem', color: '#0f172a' }}>
                            Upload Prescription & Add Medicine — {doneModalBooking.patientName}
                        </h3>

                        <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: '#334155' }}>
                                Upload Prescription File (PDF / JPG / PNG)
                            </label>
                            <input
                                className="input"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
                                style={{ width: '100%' }}
                            />
                            {(prescriptionFile || doneModalBooking?.doctorPrescriptionFileUrl) && (
                                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#475569' }}>
                                    {prescriptionFile
                                        ? `Selected: ${prescriptionFile.name}`
                                        : `Existing file: ${doneModalBooking?.doctorPrescriptionFileUrl}`}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: '#334155' }}>
                                Prescription / Medical Notes
                            </label>
                            <textarea
                                className="input"
                                rows={4}
                                placeholder="Write prescription or treatment notes"
                                value={prescription}
                                onChange={(e) => setPrescription(e.target.value)}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: '#334155' }}>
                                Medicines
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    className="input"
                                    placeholder="Enter medicine name"
                                    value={medicineInput}
                                    onChange={(e) => setMedicineInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddMedicine();
                                        }
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddMedicine}
                                    style={{ border: 'none', borderRadius: '6px', background: '#005bd3', color: '#fff', padding: '0.45rem 0.75rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    + Add
                                </button>
                            </div>

                            {medicines.length > 0 && (
                                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {medicines.map((medicine, index) => (
                                        <span
                                            key={`${medicine}-${index}`}
                                            style={{ background: '#ebf4ff', color: '#005bd3', borderRadius: '999px', padding: '0.22rem 0.55rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                        >
                                            {medicine}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedicine(index)}
                                                style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 800, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={closeDoneModal}
                                style={{ border: '1px solid #e1e3e5', background: '#fff', color: '#475569', borderRadius: '6px', padding: '0.45rem 0.8rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCompleteWithPrescription}
                                disabled={submittingDone}
                                style={{ border: 'none', background: '#008060', color: '#fff', borderRadius: '6px', padding: '0.45rem 0.8rem', fontWeight: 700, cursor: submittingDone ? 'not-allowed' : 'pointer' }}
                            >
                                {submittingDone ? 'Saving...' : 'Save Prescription'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

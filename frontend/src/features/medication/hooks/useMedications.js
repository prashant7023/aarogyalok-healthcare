/**
 * hooks/useMedications.js
 *
 * All medication-related API calls in one place.
 * Exposes state + actions consumed by MedicationPage and its sub-components.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/utils/api';

export function useMedications() {
    const [meds, setMeds] = useState([]);
    const [todayReminders, setTodayReminders] = useState([]);
    const [adherence, setAdherence] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- Fetch active medication list ---
    const fetchMeds = useCallback(async () => {
        try {
            const r = await api.get('/medication');
            setMeds(r.data.data || []);
        } catch (e) {
            console.error('[useMedications] fetchMeds failed:', e.message);
            setError('Could not load medications. Check API URL.');
        }
    }, []);

    // --- Fetch today's reminder logs ---
    const fetchTodayReminders = useCallback(async () => {
        try {
            const r = await api.get('/medication/reminders/today');
            setTodayReminders(r.data.data || []);
        } catch (e) {
            console.error('[useMedications] fetchTodayReminders failed:', e.message);
        }
    }, []);

    // --- Fetch 7-day adherence stats ---
    const fetchAdherence = useCallback(async (days = 7) => {
        try {
            const r = await api.get(`/medication/adherence?days=${days}`);
            setAdherence(r.data.data);
        } catch (e) {
            console.error('[useMedications] fetchAdherence failed:', e.message);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchMeds();
        fetchTodayReminders();
        fetchAdherence();
    }, [fetchMeds, fetchTodayReminders, fetchAdherence]);

    // --- Add new medication ---
    const addMedication = async (formData) => {
        setLoading(true); setError('');
        try {
            const payload = {
                ...formData,
                scheduleTimes: formData.scheduleTimes.split(',').map((s) => s.trim()),
            };
            const r = await api.post('/medication', payload);
            setMeds((prev) => [r.data.data, ...prev]);
            // Refresh reminders + adherence after adding
            await fetchTodayReminders();
            await fetchAdherence();
            return true;
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to add medication');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // --- Delete / deactivate medication ---
    const deleteMedication = async (id) => {
        try {
            await api.delete(`/medication/${id}`);
            setMeds((prev) => prev.filter((m) => m._id !== id));
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to delete');
        }
    };

    // --- Update medication schedule times ---
    const updateMedicationSchedule = async (id, scheduleTimes) => {
        setLoading(true);
        setError('');
        try {
            const payload = {
                scheduleTimes: scheduleTimes.map((time) => String(time).trim()).filter(Boolean),
            };

            const r = await api.put(`/medication/${id}`, payload);
            const updated = r.data.data;

            setMeds((prev) => prev.map((m) => (m._id === id ? updated : m)));
            await fetchTodayReminders();
            await fetchAdherence();
            return true;
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to update schedule');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // --- Respond to a reminder (taken or skipped) ---
    const respondToReminder = async (reminderId, status) => {
        try {
            await api.patch(`/medication/reminders/${reminderId}/respond`, { status });
            setTodayReminders((prev) =>
                prev.map((r) => r._id === reminderId ? { ...r, status, respondedAt: new Date() } : r)
            );
            // Update adherence after responding
            await fetchAdherence();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to update reminder');
        }
    };

    // --- Called by socket hook when a real-time reminder arrives ---
    const addIncomingReminder = useCallback((reminderData) => {
        setTodayReminders((prev) => {
            // Avoid duplicates
            const exists = prev.find((r) => r._id === reminderData.reminderId);
            if (exists) return prev;
            return [...prev, {
                _id: reminderData.reminderId,
                medicineName: reminderData.medicineName,
                dosage: reminderData.dosage,
                scheduledAt: reminderData.scheduledAt,
                status: 'pending',
            }];
        });
    }, []);

    return {
        meds, todayReminders, adherence, loading, error,
        addMedication, deleteMedication, updateMedicationSchedule,
        respondToReminder, addIncomingReminder,
        refetchReminders: fetchTodayReminders,
    };
}

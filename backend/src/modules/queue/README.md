# Queue Management - Doctor Appointment Booking System

## 📋 Overview

ArogyaLok Queue Management ab ek comprehensive doctor appointment booking system hai jo real-time slot booking provide karta hai. Patients doctors ko browse kar sakte hain aur unki availability ke basis par appointments book kar sakte hain.

## ✨ Features

### For Patients:
- ✅ **Browse Doctors** - Specialization ke saath sabhi available doctors dekhein
- ✅ **Real-time Slots** - Live available time slots dekhein
- ✅ **Book Appointments** - Date aur time slot select karke appointment book karein
- ✅ **Socket.IO Integration** - Real-time updates jab koi slot book ho
- ✅ **Your Bookings** - Apni upcoming appointments track karein

### For Doctors:
- ✅ **Easy Registration** - UI se directly register ho sakte hain
- ✅ **Set Working Hours** - Apna working schedule set karein (e.g., Monday-Friday, 10 AM - 2 PM)
- ✅ **Configure Slots** - Patient duration set karein (5, 10, 15, 20, 30 minutes)
- ✅ **Auto Slot Generation** - Working hours ke basis par automatically slots create hon
- ✅ **Appointments Dashboard** - Apni sabhi appointments ek jagah dekhein
- ✅ **Real-time Notifications** - Jab koi patient book kare, turant notification aaye
- ✅ **Date Filter** - Kisi bhi date ki appointments dekh sakte hain
- ✅ **Patient Details** - Phone, email, symptoms sabhi details dikhte hain

## 🚀 How to Register as Doctor (UI se)

### Method 1: Frontend Registration Form (Recommended ✅)

1. **Queue page par jao**: `http://localhost:5173/queue`
2. **"Register as Doctor" button** par click karo (top-right corner)
3. **Form fill karo**:
   - **Personal Info**: Name, Email, Password, Phone
   - **Professional Details**: 
     - Specialization (dropdown se select karo - Cardiologist, Dermatologist, etc.)
     - Qualification (e.g., MBBS, MD)
     - Experience (years)
     - Consultation Fee (₹)
   - **Working Schedule**:
     - Working Days: Monday se Friday (ya koi bhi range)
     - Working Hours: Start time (e.g., 10:00 AM) aur End time (e.g., 2:00 PM)
     - Time per Patient: 10 minutes (dropdown se select)
   - **Clinic Address**: Apna clinic ka address
4. **"Register Doctor" button** par click karo
5. **Done!** Ab aap doctor list mein aa jaoge aur patients aapki slots book kar sakte hain

### Example Registration:
```
Name: Dr. Rajesh Kumar
Email: rajesh@clinic.com
Specialization: Cardiologist
Working Days: Monday to Friday
Working Hours: 10:00 AM to 2:00 PM
Time per Patient: 10 minutes

Result: Total slots = (4 hours × 60 min) / 10 = 24 slots per day
```

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
cd aarogyalok-healthcare/backend

# Install dependencies (agar nahi kiya hai)
npm install

# Environment variables set karein (.env file)
MONGODB_URI=mongodb://localhost:27017/arogyalok-healthcare
JWT_SECRET=your_secret_key
PORT=5000

# (Optional) Database mein sample doctors seed karein
node src/scripts/seedDoctors.js

# Server start karein
npm run dev
```

### 2. Frontend Setup

```bash
cd aarogyalok-healthcare/frontend

# Install dependencies
npm install

# Environment variables set karein (.env)
VITE_API_URL=http://localhost:5000

# Frontend start karein
npm run dev
```

## 📡 API Endpoints

### Doctor Routes

```
POST   /api/queue/doctors/register          - Register new doctor
POST   /api/queue/doctors/login             - Doctor login
GET    /api/queue/doctors                   - Get all doctors (with filters)
GET    /api/queue/doctors/:id/slots         - Get doctor with available slots
```

### Booking Routes

```
POST   /api/queue/bookings                  - Book an appointment (Patient)
GET    /api/queue/bookings/my               - Get patient's bookings
DELETE /api/queue/bookings/:id              - Cancel booking
GET    /api/queue/appointments              - Get doctor's appointments (Doctor)
```

## 🧪 Sample Doctor Credentials

Script se 5 doctors create hote hain. Login credentials:

**Password (all doctors):** `doctor123`

**Emails:**
- rajesh@clinic.com - Cardiologist (10:00 AM - 2:00 PM)
- priya@clinic.com - Dermatologist (9:00 AM - 1:00 PM)
- amit@clinic.com - Pediatrician (11:00 AM - 3:00 PM)
- sneha@clinic.com - Orthopedic (10:00 AM - 4:00 PM)
- vikram@clinic.com - General Physician (8:00 AM - 12:00 PM)

## 🔧 How It Works

### Doctor Registration Flow:
1. Doctor registers with working hours (e.g., 10:00 AM - 2:00 PM)
2. Sets patient duration (e.g., 10 minutes per patient)
3. System automatically calculates: (4 hours × 60 min) / 10 = **24 slots**

### Patient Booking Flow:
1. Patient Queue page par jata hai
2. Doctors list se ek doctor select karta hai
3. Date select karta hai
4. Available slots show hote hain (green slots = available)
5. Slot select karke symptoms enter karta hai
6. Booking confirm hoti hai
7. Real-time Socket.IO event se doctor ko notification jati hai

### Real-time Updates:
- Jab slot book hota hai, immediately dusre users ko unavailable dikhe
- Socket.IO rooms use hote hain: `doctor-${doctorId}`
- Events: `new-booking`, `booking-cancelled`

## 🎨 UI Components

### Doctor Card:
- Doctor ka naam aur initial avatar
- Specialization badge
- Experience, qualification, consultation fee
- Clinic address
- "Book Appointment" button

### Slot Selection:
- Calendar date picker
- Grid of time slots
- Color coding: Blue = Available, Gray = Booked
- Click karke select karo

### Booking Modal:
- Confirm booking details
- Optional symptoms field
- Confirm/Cancel buttons

## 🔒 Authentication

- JWT-based authentication
- Patients can book appointments (role: 'patient')
- Doctors can view their appointments (role: 'doctor')
- Middleware: `protect` and `restrict(role)`

## 📊 Database Models

### Doctor Model:
```javascript
{
  name, email, password, phone,
  specialization, qualification, experience,
  workingDays: ['Monday', 'Tuesday', ...],
  workingHours: { start: '10:00', end: '14:00' },
  patientDuration: 10, // minutes
  consultationFee, clinicAddress, rating
}
```

### Booking Model:
```javascript
{
  doctorId, patientId,
  appointmentDate, timeSlot,
  status: 'confirmed' | 'cancelled' | 'completed',
  tokenNumber, symptoms
}
```

## 🎯 Testing Flow

### For Patients:

1. **Seed Doctors**: `node src/scripts/seedDoctors.js`
2. **Register as Patient**: POST `/api/auth/register` with role='patient'
3. **Login**: POST `/api/auth/login`
4. **Browse Doctors**: GET `/api/queue/doctors`
5. **Check Slots**: GET `/api/queue/doctors/:id/slots?date=2026-03-12`
6. **Book Appointment**: POST `/api/queue/bookings`
7. **View Bookings**: GET `/api/queue/bookings/my`

### For Doctors:

1. **Register as Doctor**: 
   - Option 1: Use UI - Click "Register as Doctor" button on queue page
   - Option 2: POST `/api/queue/doctors/register`
2. **Login as Doctor**: POST `/api/queue/doctors/login`
3. **Go to Queue Page**: `http://localhost:5173/queue`
4. **View Dashboard**: Automatically shows appointments dashboard for doctors
5. **Features**:
   - View today's appointments by default
   - Select any date to see appointments
   - Real-time notifications when patients book
   - See patient details (name, phone, email, symptoms)
   - Token numbers for each appointment
   - Status badges (confirmed, completed, cancelled)

### Doctor Dashboard Features:

**Stats Overview:**
- Total appointments
- Confirmed bookings
- Completed appointments
- Cancelled appointments

**Appointments List:**
- Token number
- Time slot
- Patient details with avatar
- Contact information
- Symptoms/notes
- Status indicator

**Real-time Updates:**
- Socket.IO connection for instant notifications
- Browser notifications (with permission)
- Auto-refresh when new booking arrives

## 🔥 Real-time Socket Events

```javascript
// Frontend
socket.emit('join-doctor', doctorId);

// Backend emits
socket.to(`doctor-${doctorId}`).emit('new-booking', bookingData);
socket.to(`doctor-${doctorId}`).emit('booking-cancelled', { bookingId });
```

## 🎨 Styling

Same existing theme use ki gayi hai:
- Card components with hover effects
- Primary blue color (#3b82f6)
- Stat cards with icons
- Responsive grid layout
- Modal for booking confirmation

## ⚡ Performance

- Slots on-demand generate hote hain (har date ke liye)
- Booked slots efficiently filter hote hain
- Real-time updates sirf relevant users ko milti hain
- Indexed queries for faster lookups

## 🔮 Future Enhancements

- [ ] SMS/Email notifications
- [ ] Doctor availability toggle
- [ ] Appointment rescheduling
- [ ] Video consultation integration
- [ ] Reviews and ratings
- [ ] Multiple clinic locations

---

**Made with ❤️ for ArogyaLok Healthcare**

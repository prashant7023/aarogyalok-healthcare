# 🏥 ArogyaLok AI — Integrated Smart Healthcare Platform

> **Hackathon Project** | 4 Developers | 10 Days | Node.js + MongoDB + Gemini AI

---

## 🔴 Problem Statements

### 1. AI Symptom Checker (HCM-1001)
| Problem | Real-World Impact |
|---|---|
| Minor symptoms ignored → late diagnosis | People Google symptoms → unreliable info → panic or ignore |
| Rural users lack quick medical access | No severity classification before hospital arrival |
| Overcrowding due to unnecessary visits | No triage system to filter urgent vs non-urgent cases |

### 2. Smart Medication Reminder (HCM-1002)
| Problem | Real-World Impact |
|---|---|
| Elderly forget medications | Medication non-adherence → 30–50% treatment failure in chronic diseases |
| No tracking of dose adherence | Doctors have no visibility into patient compliance |
| Chronic patients skip doses | No automated follow-up or reminder system |

### 3. Hospital Queue Management (HCM-1004)
| Problem | Real-World Impact |
|---|---|
| Long unmanaged waiting times | Patients waste 2–5 hours in OPD queues |
| No real-time queue visibility | Walk-in chaos with no system for resource planning |
| No digital token system | Patients can't track their turn remotely |

### 4. Digital Health Records (HCM-1005)
| Problem | Real-World Impact |
|---|---|
| Paper records lost or damaged | No centralized history accessible to any doctor |
| No record portability | Doctors repeat expensive tests every visit |
| No structured diagnosis history | No single source of truth for a patient's health journey |

---

## ✅ Our Unified Solution — One Smart Healthcare OS

ArogyaLok AI connects all 4 problems into **one seamless flow**:

```
User enters symptoms
      ↓
AI classifies severity (Gemini API)
      ↓
Auto-suggest hospital appointment (Queue)
      ↓
Visit stored in Health Records (EHR)
      ↓
Medication schedule auto-created
      ↓
Daily reminders sent via Cron
```

---

## 🏗 Architecture

**Monolithic Modular Backend** — each developer owns one independent module.

```
backend/src/
├── modules/
│   ├── auth/        ← JWT Auth (All devs use this)
│   ├── symptom/     ← Dev 1: Gemini AI + Severity
│   ├── medication/  ← Dev 2: CRUD + Cron Reminders
│   ├── queue/       ← Dev 3: Tokens + Socket.io
│   └── records/     ← Dev 4: EHR + File Upload
├── shared/
│   ├── middleware/  ← JWT protect, Error handler
│   └── utils/       ← asyncHandler, response helpers
├── config/          ← MongoDB, Gemini setup
├── app.js
└── server.js
```

---

## ⚙ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js + Express | Fast API, widely supported |
| Database | MongoDB Atlas | Flexible schema for health data |
| Auth | JWT + bcryptjs | Stateless, secure |
| AI | Gemini 1.5 Flash | Structured symptom analysis |
| Real-time | Socket.io | Live queue updates |
| Reminders | Node-cron | Server-side scheduling |
| File Upload | Multer | PDF/image health reports |

---

## 👥 Team & Module Ownership

| Developer | Module | Key Features |
|---|---|---|
| Dev 1 | `symptom` | Gemini prompt engineering, severity classification, auto-booking |
| Dev 2 | `medication` | Medicine CRUD, cron-based reminders, adherence history |
| Dev 3 | `queue` | Token issuance, Socket.io real-time updates, doctor call-next |
| Dev 4 | `records` | File upload (PDF/images), EHR CRUD, diagnosis history |

---

## 🗓 10-Day Execution Plan

| Days | Goal |
|---|---|
| **Day 1–2** | Repo setup, Auth system, DB connection, module skeletons |
| **Day 3–4** | Each dev implements their core module |
| **Day 5–6** | Cross-module integration (AI → Queue → Records → Medication) |
| **Day 7** | Cron reminders + Socket.io live updates |
| **Day 8** | UI polish, dashboard, severity color coding |
| **Day 9** | Testing, edge cases, demo data |
| **Day 10** | Demo prep, fake users, preloaded DB |

---

## 🚀 What Will Impress Judges

- ✅ **AI-based severity classification** with Gemini structured output
- ✅ **Real-time queue updates** via Socket.io
- ✅ **Medication reminders** with cron scheduling
- ✅ **Integrated flow** — all 4 modules connected
- ✅ **Clean modular architecture** — easy to extend into microservices

---

## 📡 API Overview

```
POST  /api/auth/register       → Register patient/doctor
POST  /api/auth/login          → Login + JWT token

POST  /api/symptom/analyze     → AI symptom analysis (Gemini)
GET   /api/symptom/history     → Patient's symptom reports

POST  /api/medication          → Add medication + schedule reminders
GET   /api/medication          → List active medications

POST  /api/queue/token         → Get a hospital queue token
GET   /api/queue/status/:id    → See current queue (public)
PATCH /api/queue/next          → Doctor calls next patient

POST  /api/records/upload      → Upload health file (PDF/image)
GET   /api/records             → List all health records
```

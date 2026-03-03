# ArogyaLok AI – Backend

**Integrated Smart Healthcare Platform** | Hackathon Project

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| Reminders | Node-cron |
| AI | Gemini API |
| File Upload | Multer |

## Module Ownership

| Module | Developer | Responsibility |
|---|---|---|
| `auth` | All | Register / Login / JWT |
| `symptom` | Dev 1 | AI Symptom Checker via Gemini |
| `medication` | Dev 2 | Medication CRUD + Cron reminders |
| `queue` | Dev 3 | Hospital queue + Socket.io |
| `records` | Dev 4 | Digital EHR + File upload |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env and fill values
cp .env.example .env

# Start dev server
npm run dev
```

Server: `http://localhost:5000`  
Health check: `GET /health`

## API Endpoints

```
POST  /api/auth/register
POST  /api/auth/login
GET   /api/auth/me              (protected)

POST  /api/symptom/analyze      (protected)
GET   /api/symptom/history      (protected)

POST  /api/medication           (protected)
GET   /api/medication           (protected)
PUT   /api/medication/:id       (protected)
DELETE /api/medication/:id      (protected)

POST  /api/queue/token          (protected)
GET   /api/queue/status/:hospitalId
PATCH /api/queue/next           (protected)

POST  /api/records/upload       (protected, multipart)
GET   /api/records              (protected)
GET   /api/records/:id          (protected)
DELETE /api/records/:id         (protected)
```

## Folder Structure

```
backend/
├── src/
│   ├── config/         ← db.js, gemini.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── symptom/    (Dev 1)
│   │   ├── medication/ (Dev 2)
│   │   ├── queue/      (Dev 3)
│   │   └── records/    (Dev 4)
│   ├── shared/
│   │   ├── middleware/
│   │   └── utils/
│   ├── app.js
│   └── server.js
├── uploads/            ← gitignored
├── .env                ← gitignored
├── .env.example
└── package.json
```

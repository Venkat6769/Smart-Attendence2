# Smart Attendance System

A full-stack QR code-based university attendance management system built with React, Node.js/Express, and PostgreSQL / Supabase.

---

## Features

- **Dynamic Rotating QR Codes**: Anti-proxy security with QR codes that dynamically rotate every 5 seconds
- **Lecturers** generate time-limited QR codes for class sessions
- **Students** scan QR codes via browser camera to mark attendance
- Auto-marks absent students when a session is closed
- Attendance percentage per course with 75% threshold flagging
- Downloadable PDF reports for lecturers
- Admin panel for user, course, and enrollment management
- JWT authentication with role-based access control (Admin / Lecturer / Student)

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Tailwind CSS, React Router v6, Axios |
| Backend    | Node.js, Express.js                 |
| Database   | Supabase (PostgreSQL via `pg`)       |
| Auth       | JSON Web Tokens (`jsonwebtoken`), bcryptjs |
| QR Code    | `qrcode` (generate), `html5-qrcode` (scan) |
| PDF        | PDFKit                              |

---

## Project Structure

```
smart-attendance-system/
├── database/
│   └── schema.sql          ← Run this in Supabase SQL Editor
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── db/
│   │   ├── index.js        ← PostgreSQL pool
│   │   └── seed.js         ← Seeds the admin user
│   ├── middleware/
│   │   ├── auth.js         ← JWT verification
│   │   └── roles.js        ← Role-based access
│   ├── routes/             ← HTTP method + path definitions
│   ├── controllers/        ← Business logic
│   └── utils/
│       ├── qrcode.js
│       ├── pdf.js
│       └── attendance.js
└── frontend/
    └── src/
        ├── api/axios.js    ← Configured Axios instance
        ├── context/        ← AuthContext (global auth state)
        ├── components/     ← Shared UI components
        └── pages/          ← Admin / Lecturer / Student pages
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd smart-attendance-system
```

---

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (~2 minutes)
3. Go to **SQL Editor** and paste the entire contents of `database/schema.sql`
4. Click **Run** — this creates all tables and indexes
5. Go to **Settings → Database → Connection string → URI** and copy the URI

---

### 3. Backend Setup

```bash
cd backend
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
JWT_SECRET=your_long_random_secret_key_minimum_32_characters_here
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres
FRONTEND_URL=http://localhost:5173
```

Seed the admin user:

```bash
npm run seed
```

This creates:
- **Email:** `admin@university.edu`
- **Password:** `Admin@123`

Start the backend:

```bash
npm run dev       # development (with nodemon)
npm start         # production
```

Backend runs on `http://localhost:5000`

---

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

### 5. First Login

1. Open `http://localhost:5173`
2. Log in with:
   - **Email:** `admin@university.edu`
   - **Password:** `Admin@123`
3. You will be redirected to the Admin Dashboard

From there, create lecturers and students, set up courses, and enroll students.

---

## Default Passwords

When an admin creates a lecturer or student, the default password is:

```
Welcome@123
```

Users are forced to change this password on their first login.

---

## Deployment

### Backend → Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repository
4. Settings:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Add Environment Variables (same as your local `.env`):
   - `PORT` = `10000` (Render sets this automatically, but be explicit)
   - `JWT_SECRET` = your secret
   - `DATABASE_URL` = your Supabase connection URI
   - `FRONTEND_URL` = your Vercel frontend URL (add after deploying frontend)
6. Deploy

Your API URL will be something like: `https://smart-attendance-api.onrender.com`

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Settings:
   - **Root directory:** `frontend`
   - **Framework:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://smart-attendance-api.onrender.com`)
5. Deploy

---

### After Deployment

1. Update the backend's `FRONTEND_URL` env var to your Vercel URL
2. Re-deploy the backend on Render so CORS is updated

---

## API Reference

### Auth

| Method | Endpoint                  | Access   | Description          |
|--------|---------------------------|----------|----------------------|
| POST   | `/api/auth/login`         | Public   | Login, returns JWT   |
| GET    | `/api/auth/me`            | All      | Get current user     |
| POST   | `/api/auth/logout`        | All      | Client-side logout   |
| PATCH  | `/api/auth/change-password` | All    | Change own password  |

### Admin

| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| GET    | `/api/users`                  | All users                      |
| POST   | `/api/users/lecturer`         | Create lecturer                |
| POST   | `/api/users/student`          | Create student                 |
| POST   | `/api/courses`                | Create course                  |
| GET    | `/api/courses`                | All courses                    |
| PATCH  | `/api/courses/:id/assign`     | Assign lecturer to course      |
| POST   | `/api/enrollments`            | Enroll student in course       |
| GET    | `/api/students/flagged`       | Students below 75%             |
| GET    | `/api/attendance/all`         | All attendance records         |

### Lecturer

| Method | Endpoint                          | Description                   |
|--------|-----------------------------------|-------------------------------|
| GET    | `/api/lecturer/courses`           | Assigned courses              |
| POST   | `/api/sessions/start`             | Start session + QR code       |
| POST   | `/api/sessions/:id/end`           | End session, auto-mark absent |
| GET    | `/api/sessions/:courseId/list`    | List sessions for a course    |
| PATCH  | `/api/attendance/manual`          | Override attendance           |
| GET    | `/api/reports/course/:id`         | Course report                 |
| GET    | `/api/reports/session/:id`        | Session report                |
| GET    | `/api/reports/course/:id/pdf`     | Download PDF report           |

### Student

| Method | Endpoint                              | Description               |
|--------|---------------------------------------|---------------------------|
| GET    | `/api/student/courses`                | Enrolled courses          |
| POST   | `/api/attendance/scan`                | Submit QR token           |
| GET    | `/api/attendance/history/:courseId`   | Session history           |
| GET    | `/api/attendance/percentage/:courseId`| Attendance percentage     |
| GET    | `/api/attendance/warnings`            | Courses below 75%         |

---

## Attendance Formula

```
Attendance % = (Sessions Marked Present ÷ Total Closed Sessions) × 100
```

Students are flagged when `Attendance % < 75`

---

## Notes for Defense

- **Authentication:** Stateless JWT. Token stored in `localStorage`. Decoded server-side on every protected request via `verifyToken` middleware.
- **QR Flow:** Backend generates a UUID token → encodes it in a QR image → student scans → backend validates 5 conditions before marking present.
- **Auto-absent:** When lecturer ends a session, the backend finds all enrolled students with no present record and inserts absent rows.
- **PDF:** Generated server-side with PDFKit and streamed as a binary response with `Content-Disposition: attachment`.
- **Scalability note:** For a production system, you'd add refresh tokens and Redis. This project keeps it simple for learning.

---

Built by Abdul @ Fadidev Studio

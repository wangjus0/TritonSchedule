# TritonSchedule

[![CI/CD](https://github.com/wangjus0/tritonschedule/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/wangjus0/tritonschedule/actions/workflows/ci-cd.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

> *Smart course scheduling for UCSD students — build your perfect quarter without the stress.*

---

## 🌟 Why TritonSchedule Exists

Planning your courses at UCSD shouldn't feel like solving a puzzle with missing pieces. Between navigating complex prerequisites, finding open sections, and balancing your workload, students spend hours just trying to figure out what to take next.

**TritonSchedule solves this.**

We built a data-driven platform that brings together everything you need to plan your quarter — in one place, in minutes instead of hours.

---

## 🤔 What Problem We Solve

UCSD students face real challenges when scheduling:

- **Information scattered across multiple sources** — WebReg, catalog descriptions, Reddit threads, RateMyProfessor — it's fragmented and time-consuming
- **No visibility into section availability** — You refresh WebReg hoping for open spots, with no sense of trends or patterns
- **Hard to predict course difficulty** — Credits don't tell the whole story; how do you know if a course will crush you?
- **No personalized recommendations** — Generic degree requirements don't account for your specific goals, strengths, or interests

**The result:** Students either overcommit, under-challenge themselves, or waste precious time hunting down information.

---

## 💡 The TritonSchedule Solution

TritonSchedule aggregates high-impact academic resources into a single, intuitive interface so you can:

- **See the full picture** — Course data, professor ratings, section trends, and prerequisite chains — all in one view
- **Make informed decisions** — Real insights from student experiences, not just course titles and unit counts
- **Plan with confidence** — Know what's available, what's challenging, and what fits your goals before you register

Think of it as your personal course scheduling assistant — minus the guesswork.

---

## ✨ What You Get

- **Centralized Course Data** — No more tab-hopping. Find courses, sections, and details without leaving the app.
- **Prerequisite Visualization** — See exactly what's required before you can take a course — plan your entire degree path, not just next quarter.
- **Open Section Tracking** — Spot available seats at a glance — never again wonder if that waitlist will open up.
- **Student-Driven Insights** — Leverage community knowledge to understand what courses are really like — from workload to grading to hidden gems.
- **Modern, Mobile-Friendly Interface** — Plan your courses on your phone, tablet, or laptop — anywhere you have internet.

---

## 📝 Environment Variables

### Backend (.env)
Create a `.env` file in the `backend` directory with the following variables:

- `MONGO_URI` – MongoDB connection string (e.g., `mongodb://localhost:27017` or Atlas URI)
- `DB_NAME` – Database name (e.g., `tritonschedule`)
- `API_KEY` – Secret key for API authentication

### Frontend (.env)
Create a `.env` file in the `frontend` directory (Vite requires `VITE_` prefix):

- `VITE_API_BASE_URL` – Backend API URL (e.g., `http://localhost:3000`)
- `VITE_API_BASE_FALLBACK_URL` – Fallback API URL if primary fails
- `VITE_API_KEY` – API key for frontend requests

See `.env.example` files in each directory for exact names.

## 🚀 Get Started

### Quick Setup

```bash
# Clone the project
git clone https://github.com/wangjus0/tritonschedule.git
cd tritonschedule

# Start the backend
cd backend
npm ci
npm run build
npm start

# In a new terminal, start the frontend
cd frontend
npm ci
npm run dev
```

That's it! Open `http://localhost:5173` in your browser and start planning.

### Requirements

- Node.js 22+
- MongoDB (local or Atlas)
- npm

---

## 📸 See It In Action

*(Screenshots and demos coming soon)*

The interface is designed to be clean and intuitive — search for a course, see open sections, check prerequisites, and add them to your plan. We believe you should spend minutes, not hours, on course planning.

---

## 🛠️ Built With

- **Frontend:** React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend:** Node.js + Express + TypeScript + MongoDB
- **Testing:** Vitest (Frontend), Jest (Backend)

*Why this stack? We chose modern, type-safe technologies to ensure reliability and maintainability — so the tool you depend on just works.*

---

## 🤝 Contribute

We believe TritonSchedule gets better when students build it together.

Here's how you can help:

1. **Fork** the repository
2. **Create a feature branch** for your idea
3. **Make your changes** — and add tests if possible
4. **Ensure CI passes** (we run lint, type check, and tests on every PR)
5. **Open a Pull Request** — we'll review and get back to you quickly

Have ideas or found a bug? Open an issue or start a discussion. We'd love to hear from you.

---

## 📜 License

ISC License — free to use, modify, and distribute.

---

*Made with 🎓 by UCSD students, for UCSD students.*

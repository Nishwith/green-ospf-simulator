# Green OSPF Network Simulator

A local-only B.Tech Computer Networks Laboratory simulator that compares:
1. **Standard OSPF** (Dijkstra Shortest Path First based on link bandwidth)
2. **Energy-Aware Modified OSPF** (Dynamic power-aware traffic consolidation and sleep-mode links)

Built specifically for student laptops without external dependencies, Docker, cloud services, or paid APIs.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Recharts
- **Backend**: Python 3.11+, FastAPI, NetworkX, Pydantic, Uvicorn

---

## Directory Structure

```text
green-ospf-simulator/
├── backend/                  # FastAPI & NetworkX simulation engine
│   ├── app/
│   │   ├── core/             # Environment & settings
│   │   ├── models/           # Pydantic data models
│   │   ├── simulation/       # Independent OSPF simulation logic
│   │   └── main.py           # FastAPI entrypoint & REST routes
│   ├── .env.example
│   ├── .env
│   ├── requirements.txt
│   └── venv/
├── frontend/                 # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── services/         # API communication
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Dashboard & connection monitor
│   │   └── index.css         # Tailwind styles
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # Documentation & specifications
│   └── ARCHITECTURE.md
└── README.md
```

---

## Quickstart Instructions

### 1. Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: v18 or higher (with `npm`)

---

### 2. Backend Setup & Run

Open a terminal in the project root:

```bash
# Navigate to backend
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (cmd):
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be live at:
- API Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Interactive API Docs (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### 3. Frontend Setup & Run

Open a second terminal in the project root:

```bash
# Navigate to frontend
cd frontend

# Install npm dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

The frontend will be live at:
- Web UI: [http://localhost:5173](http://localhost:5173)

---

## Verifying the Connection

1. Keep both the backend (`http://127.0.0.1:8000`) and frontend (`http://localhost:5173`) running.
2. Open [http://localhost:5173](http://localhost:5173) in your browser.
3. The dashboard will automatically query `/api/health` and display:
   - Green `Backend Connected` indicator with latency in milliseconds.
   - Verified statuses for **FastAPI**, **NetworkX**, and **Simulation Engine**.
4. Click **Ping Backend** to re-test the connection at any time.

---

## Architectural Isolation Principle
The simulation algorithms (Standard OSPF and Energy-Aware OSPF) reside purely in `backend/app/simulation` and operate independently of React or any UI framework. The frontend communicates with the simulator exclusively via standard JSON REST endpoints.

---

## Free Public Deployment Guide

This project is prepared for free zero-cost public deployment using **Render** (Backend) and **Vercel** (Frontend).

### 1. Backend on Render (Free Web Service)
1. Push repository to GitHub.
2. Log in to [Render](https://render.com) and create a **New Web Service** connected to your repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
4. Add Environment Variables:
   - `PYTHON_VERSION`: `3.11.9`
   - `CORS_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173,https://<your-vercel-domain>.vercel.app`
5. Deploy service and copy your public Render URL: `https://<your-render-service>.onrender.com`.

*(Alternatively, connect the repository using the included `render.yaml` Blueprint).*

### 2. Frontend on Vercel (Hobby Free Tier)
1. Log in to [Vercel](https://vercel.com) and click **Add New Project** → import your GitHub repository.
2. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-service>.onrender.com`
4. Deploy. The Single Page Application (SPA) routing is handled automatically via `frontend/vercel.json`.
5. Update `CORS_ORIGINS` in Render if your Vercel production URL changes.


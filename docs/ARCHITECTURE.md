# Green OSPF Network Simulator - System Architecture

## Project Overview
The **Green OSPF Network Simulator** is an educational, local-only simulation platform designed for B.Tech Computer Networks laboratory study. The system provides a comparative benchmark between:
1. **Standard OSPF**: Shortest Path First (Dijkstra algorithm) relying exclusively on static link costs/bandwidth.
2. **Energy-Aware Modified OSPF**: Power-aware routing heuristic that dynamically routes traffic to consolidate paths during low load and places underutilized interfaces into low-power sleep states.

## Monorepo Layout
```text
green-ospf-simulator/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration & environment loader
│   │   │   ├── __init__.py
│   │   │   └── config.py
│   │   ├── models/         # Pydantic schemas and data transfer objects
│   │   │   ├── __init__.py
│   │   │   └── schemas.py
│   │   ├── simulation/     # Isolated simulation engine (NetworkX, routing)
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── main.py         # FastAPI application entrypoint & API routes
│   ├── .env.example
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── services/       # API client & backend connection handlers
│   │   │   └── api.ts
│   │   ├── types/          # TypeScript interfaces matching backend models
│   │   │   └── index.ts
│   │   ├── App.tsx         # Dashboard & diagnostic view
│   │   ├── main.tsx
│   │   └── index.css       # Tailwind CSS & design tokens
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   └── ARCHITECTURE.md     # Architectural reference documentation
└── README.md               # Quickstart and run instructions
```

## Layer Separation
- **Presentation Layer (`frontend/`)**: React, TypeScript, React Flow, Recharts, Tailwind CSS. Strictly presentation and user interaction. All graph calculations and routing logic reside on the backend.
- **API & Protocol Layer (`backend/app/main.py`)**: FastAPI exposes REST endpoints for topology manipulation, simulation execution, and metrics extraction.
- **Simulation Layer (`backend/app/simulation/`)**: Pure Python engine using NetworkX. Completely detached from web frameworks, enabling headless unit testing and CLI evaluation.

## Health API Specification
- **Endpoint**: `GET /api/health` (also aliased at `GET /health`)
- **Response Format**:
```json
{
  "status": "ok",
  "project_name": "Green OSPF Network Simulator",
  "version": "1.0.0",
  "timestamp": "2026-09-27T11:55:00.000000Z",
  "dependencies": {
    "fastapi": "ready",
    "networkx": "ready (v3.6.1)",
    "simulation_engine": "standby"
  }
}
```

## Local-Only Constraints
- No external cloud services or databases.
- Runs on `127.0.0.1` (`localhost`).
- Compatible with student laptops (Windows, macOS, Linux).

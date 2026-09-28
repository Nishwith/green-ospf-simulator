from datetime import datetime, timezone
from typing import Dict, List, Optional
import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.models.schemas import (
    ComparisonRequest,
    GreenSimulationRequest,
    HealthResponse,
    SimulationLog,
    StandardSimulationRequest,
    TopologySummary,
)
from app.simulation import (
    ComparisonResult,
    SimulationResult,
    Topology,
    WhatIfScenarioRequest,
    get_preset,
    list_presets,
    run_comparison,
    run_energy_aware_ospf,
    run_standard_ospf,
    run_what_if_scenario,
)

app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="Backend API for comparing Standard OSPF vs Energy-Aware Modified OSPF",
)

# Enable CORS for student local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for user-created custom topologies and latest simulation results
CUSTOM_TOPOLOGIES: Dict[str, Topology] = {}
SIMULATION_CACHE: Dict[str, ComparisonResult] = {}
SIMULATION_LOGS: Dict[str, List[SimulationLog]] = {}


def _record_simulation_logs(sim_id: str, comp: ComparisonResult) -> List[SimulationLog]:
    now = datetime.now(timezone.utc).isoformat()
    logs: List[SimulationLog] = [
        SimulationLog(
            id=f"{sim_id}-1",
            timestamp=now,
            level="info",
            phase="init",
            message=f"Simulation initialized for {comp.source} -> {comp.target} ({comp.demand_mbps} Mbps).",
        ),
        SimulationLog(
            id=f"{sim_id}-2",
            timestamp=now,
            level="info",
            phase="lsa_flood",
            message="Type-1 Router-LSAs synchronized across Area 0 Link State Database (LSDB).",
        ),
        SimulationLog(
            id=f"{sim_id}-3",
            timestamp=now,
            level="info",
            phase="dijkstra",
            message=f"Standard OSPF Dijkstra SPF converged on route: {' -> '.join(comp.standard_ospf.selected_path)} ({comp.standard_ospf.metrics.total_path_delay_ms}ms, {comp.standard_ospf.metrics.total_power_watts}W).",
        ),
        SimulationLog(
            id=f"{sim_id}-4",
            timestamp=now,
            level="success",
            phase="energy_eval",
            message=f"Energy-Aware OSPF evaluated {len(comp.energy_aware_ospf.candidate_paths)} candidate paths and selected: {' -> '.join(comp.energy_aware_ospf.selected_path)}.",
        ),
        SimulationLog(
            id=f"{sim_id}-5",
            timestamp=now,
            level="event",
            phase="sleep_transition",
            message=f"Sleep heuristics transitioned {comp.additional_sleeping_links} idle links and {comp.additional_sleeping_routers} unused routers into low-power states.",
        ),
        SimulationLog(
            id=f"{sim_id}-6",
            timestamp=now,
            level="success",
            phase="completed",
            message=f"Benchmark completed: saved {comp.power_saved_watts}W ({comp.power_saved_percentage}% power reduction).",
        ),
    ]
    SIMULATION_LOGS[sim_id] = logs
    SIMULATION_LOGS["latest"] = logs
    return logs


@app.get("/", tags=["General"])
def root_info():
    return {
        "project": settings.project_name,
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "presets_url": "/api/topology/list",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Preserved health-check API endpoint."""
    return HealthResponse(
        status="ok",
        project_name=settings.project_name,
        version="1.0.0",
        dependencies={
            "fastapi": "ready",
            "networkx": f"ready (v{nx.__version__})",
            "simulation_engine": "ready",
        },
    )


# --- Topology Endpoints (both /api/topology/* and /api/presets/*) ---


@app.get("/api/topology/list", response_model=List[TopologySummary], tags=["Topology"])
@app.get("/api/presets", response_model=List[TopologySummary], tags=["Topology"])
def get_topology_presets() -> List[TopologySummary]:
    """List all available campus network presets and custom topologies."""
    presets = [TopologySummary(**p) for p in list_presets()]
    custom = [
        TopologySummary(
            id=t.id,
            name=t.name,
            description=t.description,
            nodes_count=len(t.nodes),
            links_count=len(t.links),
        )
        for t in CUSTOM_TOPOLOGIES.values()
    ]
    return presets + custom


@app.get("/api/topology/{preset_id}", response_model=Topology, tags=["Topology"])
@app.get("/api/presets/{preset_id}", response_model=Topology, tags=["Topology"])
def get_topology_by_id(preset_id: str) -> Topology:
    """Retrieve full topology specification by ID."""
    if preset_id in CUSTOM_TOPOLOGIES:
        return CUSTOM_TOPOLOGIES[preset_id]
    topo = get_preset(preset_id)
    if not topo:
        raise HTTPException(status_code=404, detail=f"Topology '{preset_id}' not found.")
    return topo


@app.post("/api/topology/create", response_model=Topology, tags=["Topology"])
def create_custom_topology(topology: Topology) -> Topology:
    """Register a custom user-defined network topology."""
    CUSTOM_TOPOLOGIES[topology.id] = topology
    return topology


# --- Simulation Endpoints ---


@app.post("/api/simulation/ospf", response_model=SimulationResult, tags=["Simulation"])
@app.post("/api/simulate/standard", response_model=SimulationResult, tags=["Simulation"])
def simulate_standard_ospf(request: StandardSimulationRequest) -> SimulationResult:
    """Run Standard OSPF (Dijkstra SPF based on static bandwidth/cost)."""
    topo = CUSTOM_TOPOLOGIES.get(request.topology_id) or get_preset(request.topology_id)
    return run_standard_ospf(
        topology=topo,
        demand=request.demand,
        failed_link_ids=set(request.failed_links),
        solar_available=request.solar_available,
        traffic_multiplier=request.traffic_multiplier,
    )


@app.post("/api/simulation/energy-ospf", response_model=SimulationResult, tags=["Simulation"])
@app.post("/api/simulate/green", response_model=SimulationResult, tags=["Simulation"])
def simulate_green_ospf(request: GreenSimulationRequest) -> SimulationResult:
    """Run Proposed Energy-Aware Modified OSPF with dynamic sleeping heuristics and configurable weights."""
    topo = CUSTOM_TOPOLOGIES.get(request.topology_id) or get_preset(request.topology_id)
    return run_energy_aware_ospf(
        topology=topo,
        demand=request.demand,
        weights=request.weights,
        failed_link_ids=set(request.failed_links),
        solar_available=request.solar_available,
        traffic_multiplier=request.traffic_multiplier,
    )


@app.post("/api/simulation/compare", response_model=ComparisonResult, tags=["Simulation"])
@app.post("/api/simulate/compare", response_model=ComparisonResult, tags=["Simulation"])
def simulate_comparison(request: ComparisonRequest) -> ComparisonResult:
    """Run side-by-side benchmark comparison between Standard OSPF and Energy-Aware OSPF under identical baseline conditions."""
    topo = CUSTOM_TOPOLOGIES.get(request.topology_id) or get_preset(request.topology_id)
    result = run_comparison(
        topology=topo,
        demand=request.demand,
        weights=request.weights,
        failed_link_ids=set(request.failed_links),
        solar_available=request.solar_available,
        traffic_multiplier=request.traffic_multiplier,
        random_seed=request.random_seed,
    )
    eff_demand = round(request.demand.demand_mbps * request.traffic_multiplier, 2)
    solar_tag = "solar1" if request.solar_available else "solar0"
    failed_tag = "_".join(sorted(request.failed_links)) if request.failed_links else "nofail"
    sim_id = f"{request.topology_id}_{request.demand.source}_{request.demand.target}_{eff_demand}mbps_{solar_tag}_{failed_tag}_s{request.random_seed}"
    SIMULATION_CACHE[sim_id] = result
    SIMULATION_CACHE["latest"] = result
    _record_simulation_logs(sim_id, result)
    return result


@app.post("/api/simulation/what-if", response_model=ComparisonResult, tags=["Simulation"])
@app.post("/api/simulate/what-if", response_model=ComparisonResult, tags=["Simulation"])
def simulate_what_if(request: WhatIfScenarioRequest) -> ComparisonResult:
    """Execute what-if sensitivity analysis (link cuts, traffic spikes, weight variations, solar changes)."""
    result = run_what_if_scenario(request)
    whatif_eff = round(request.demand_mbps * request.traffic_multiplier, 2)
    whatif_solar = "solar1" if request.solar_available else "solar0"
    whatif_failed = "_".join(sorted(request.failed_links)) if request.failed_links else "nofail"
    sim_id = f"what_if_{request.topology_id}_{request.source}_{request.target}_{whatif_eff}mbps_{whatif_solar}_{whatif_failed}_s{request.random_seed}"
    SIMULATION_CACHE[sim_id] = result
    SIMULATION_CACHE["latest"] = result
    _record_simulation_logs(sim_id, result)
    return result


@app.get("/api/simulation/{sim_id}/results", response_model=ComparisonResult, tags=["Simulation"])
def get_cached_simulation_results(sim_id: str) -> ComparisonResult:
    """Retrieve cached simulation results for a given simulation ID or 'latest'."""
    if sim_id in SIMULATION_CACHE:
        return SIMULATION_CACHE[sim_id]
    if "latest" in SIMULATION_CACHE:
        return SIMULATION_CACHE["latest"]
    # Fallback to computing standard comparison on medium campus
    topo = get_preset("medium_campus")
    res = run_comparison(
        topology=topo,
        demand=ComparisonRequest().demand,
    )
    SIMULATION_CACHE[sim_id] = res
    return res


@app.get("/api/simulation/{sim_id}/logs", response_model=List[SimulationLog], tags=["Simulation"])
def get_simulation_logs(sim_id: str) -> List[SimulationLog]:
    """Retrieve step-by-step SPF convergence and energy transition logs."""
    if sim_id in SIMULATION_LOGS:
        return SIMULATION_LOGS[sim_id]
    if "latest" in SIMULATION_LOGS:
        return SIMULATION_LOGS["latest"]
    # Generate default logs
    now = datetime.now(timezone.utc).isoformat()
    return [
        SimulationLog(
            id="1",
            timestamp=now,
            level="info",
            phase="init",
            message="System initialized; ready for simulation run.",
        )
    ]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)


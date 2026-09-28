from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.simulation.models import AlgorithmWeights, TrafficDemand


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Service health state")
    project_name: str = Field(..., description="Project name")
    version: str = Field(default="1.0.0", description="Backend service version")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Current UTC timestamp",
    )
    dependencies: Dict[str, str] = Field(
        default_factory=dict,
        description="Key dependency statuses",
    )


class TopologySummary(BaseModel):
    id: str
    name: str
    description: str
    nodes_count: int
    links_count: int


class SimulationLog(BaseModel):
    id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    level: str = "info"
    phase: str = "completed"
    message: str
    details: Optional[str] = None


class SimulationRequestBase(BaseModel):
    topology_id: str = Field(default="medium_campus", description="Preset topology ID (small_campus, medium_campus, large_campus)")
    demand: TrafficDemand = Field(
        default_factory=lambda: TrafficDemand(source="R1", target="R6", demand_mbps=150.0),
        description="Traffic demand parameters",
    )
    traffic_multiplier: float = Field(default=1.0, ge=0.1, le=10.0, description="Traffic load multiplier (0.5, 1.0, 1.5, 2.0)")
    failed_links: List[str] = Field(default_factory=list, description="List of failed link IDs")
    solar_available: bool = Field(default=True, description="Flag for local solar renewable generation")


class StandardSimulationRequest(SimulationRequestBase):
    pass


class GreenSimulationRequest(SimulationRequestBase):
    weights: Optional[AlgorithmWeights] = Field(default=None, description="Custom alpha, beta, gamma, delta weights")


class ComparisonRequest(SimulationRequestBase):
    weights: Optional[AlgorithmWeights] = Field(default=None, description="Custom alpha, beta, gamma, delta weights")
    random_seed: int = Field(default=42, description="Random seed for repeatable comparisons")

"""Data models for network topology, traffic, OSPF state, energy metrics, and simulation results."""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class PowerState(str, Enum):
    ACTIVE = "active"
    SLEEP = "sleep"
    OFF = "off"


class LinkStatus(str, Enum):
    UP = "up"
    DOWN = "down"
    SLEEP = "sleep"


class RouterNode(BaseModel):
    id: str = Field(..., description="Unique router identifier, e.g., 'R1'")
    name: str = Field(..., description="Human-readable router name")
    role: str = Field(default="router", description="Role: core, distribution, access, or edge")
    base_power_watts: float = Field(default=100.0, description="Chassis base/idle power in Watts")
    sleep_power_ratio: float = Field(default=0.15, description="Power ratio in sleep mode (e.g., 0.15 = 15% base power)")
    power_state: PowerState = Field(default=PowerState.ACTIVE, description="Current power state")
    green_energy_source: Optional[str] = Field(default=None, description="Renewable energy source, e.g., 'solar', 'grid'")
    green_energy_kw: float = Field(default=0.0, description="Green energy available locally in kW")
    x: float = Field(default=0.0, description="X coordinate for canvas rendering")
    y: float = Field(default=0.0, description="Y coordinate for canvas rendering")


class NetworkLink(BaseModel):
    id: str = Field(..., description="Unique link identifier, e.g., 'L_R1_R2'")
    source: str = Field(..., description="Source router ID")
    target: str = Field(..., description="Target router ID")
    bandwidth_mbps: float = Field(default=1000.0, description="Link bandwidth capacity in Mbps")
    delay_ms: float = Field(default=2.0, description="One-way propagation delay in milliseconds")
    ospf_cost: int = Field(default=10, description="Standard OSPF link cost")
    base_power_watts: float = Field(default=15.0, description="Link linecard baseline power in Watts")
    dynamic_power_factor: float = Field(default=0.01, description="Dynamic energy in Watts per Mbps of forwarded traffic")
    sleep_power_watts: float = Field(default=1.5, description="Link interface power when in sleep state")
    current_traffic_mbps: float = Field(default=0.0, description="Active traffic load in Mbps")
    status: LinkStatus = Field(default=LinkStatus.UP, description="Link operating status")
    max_utilization_threshold: float = Field(default=0.85, description="Max safe link utilization ratio (e.g. 0.85 = 85%)")


class Topology(BaseModel):
    id: str = Field(..., description="Preset or topology identifier")
    name: str = Field(..., description="Topology name")
    description: str = Field(default="", description="Detailed topology description")
    reference_bandwidth_mbps: float = Field(default=100000.0, description="OSPF reference bandwidth (100 Gbps)")
    nodes: List[RouterNode] = Field(default_factory=list, description="List of routers")
    links: List[NetworkLink] = Field(default_factory=list, description="List of bidirectional links")


class TrafficDemand(BaseModel):
    source: str = Field(..., description="Originating router ID")
    target: str = Field(..., description="Destination router ID")
    demand_mbps: float = Field(default=100.0, description="Offered traffic rate in Mbps")
    sla_max_delay_ms: Optional[float] = Field(default=30.0, description="SLA maximum allowable end-to-end delay in ms")
    sla_max_hop_count: Optional[int] = Field(default=6, description="SLA maximum allowable hop count")
    sla_max_utilization: Optional[float] = Field(default=0.85, description="SLA maximum allowable link utilization ratio")


class AlgorithmWeights(BaseModel):
    alpha: float = Field(default=0.25, description="Weight for Normalized OSPF Cost (performance)")
    beta: float = Field(default=0.35, description="Weight for Energy Factor (power minimization)")
    gamma: float = Field(default=0.25, description="Weight for Congestion Factor (utilization avoidance)")
    delta: float = Field(default=0.15, description="Weight for Energy-State Penalty (traffic consolidation)")


class LSARecord(BaseModel):
    lsa_id: str = Field(..., description="Router ID advertising this LSA")
    sequence_number: int = Field(default=1, description="LSA sequence number")
    age_seconds: int = Field(default=0, description="LSA age")
    links: List[Dict[str, str]] = Field(default_factory=list, description="Connected neighbor links and costs")


class RoutingTableEntry(BaseModel):
    destination: str
    next_hop: str
    cost: float
    outgoing_interface: str
    full_path: List[str]


class PathEvaluationDetail(BaseModel):
    path: List[str]
    hops: int
    total_ospf_cost: float
    total_delay_ms: float
    bottleneck_bandwidth_mbps: float
    max_link_utilization: float
    green_cost: float
    is_valid: bool
    rejection_reason: Optional[str] = None


class EnergyBreakdown(BaseModel):
    total_power_watts: float
    router_base_power_watts: float
    router_sleep_power_watts: float
    link_base_power_watts: float
    link_dynamic_power_watts: float
    link_sleep_power_watts: float
    green_energy_offset_watts: float
    net_grid_power_watts: float


class SimulationMetrics(BaseModel):
    total_power_watts: float
    energy_breakdown: EnergyBreakdown
    average_link_utilization_pct: float
    max_link_utilization_pct: float
    active_routers_count: int
    sleeping_routers_count: int
    active_links_count: int
    sleeping_links_count: int
    total_path_delay_ms: float
    total_hops: int
    path_cost: float


class SimulationResult(BaseModel):
    algorithm: str
    source: str
    target: str
    demand_mbps: float
    traffic_multiplier: float = 1.0
    effective_demand_mbps: float = 150.0
    solar_available: bool = True
    solar_generation_watts: float = 0.0
    net_grid_power_watts: float = 0.0
    selected_path: List[str]
    selected_link_ids: List[str]
    is_feasible: bool
    status_message: str
    metrics: SimulationMetrics
    routing_table: List[RoutingTableEntry] = Field(default_factory=list)
    lsdb_summary: Dict[str, LSARecord] = Field(default_factory=dict)
    candidate_paths: List[PathEvaluationDetail] = Field(default_factory=list)
    active_nodes: List[str] = Field(default_factory=list)
    sleeping_nodes: List[str] = Field(default_factory=list)
    active_links: List[str] = Field(default_factory=list)
    sleeping_links: List[str] = Field(default_factory=list)


class ComparisonResult(BaseModel):
    topology_id: str
    source: str
    target: str
    demand_mbps: float
    traffic_multiplier: float = 1.0
    effective_demand_mbps: float = 150.0
    solar_available: bool = True
    solar_generation_watts: float = 0.0
    net_grid_power_watts: float = 0.0
    net_power_saved_watts: float = 0.0
    random_seed: int
    standard_ospf: SimulationResult
    energy_aware_ospf: SimulationResult
    power_saved_watts: float
    power_saved_percentage: float
    delay_delta_ms: float
    hops_delta: int
    additional_sleeping_links: int
    additional_sleeping_routers: int
    green_efficiency_score: float
    summary: str


class WhatIfScenarioRequest(BaseModel):
    topology_id: str = Field(default="medium_campus")
    source: str = Field(default="R1")
    target: str = Field(default="R6")
    demand_mbps: float = Field(default=150.0)
    failed_links: List[str] = Field(default_factory=list, description="IDs of links to simulate as DOWN")
    traffic_multiplier: float = Field(default=1.0, description="Multiplier for demand (e.g. 2.0 = 200%)")
    solar_available: bool = Field(default=True, description="Whether solar green energy generation is active")
    weights: Optional[AlgorithmWeights] = Field(default=None, description="Custom alpha, beta, gamma, delta")
    random_seed: int = Field(default=42)

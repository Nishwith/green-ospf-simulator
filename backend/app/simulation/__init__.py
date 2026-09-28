"""Green OSPF Network Simulator - Simulation Engine Package."""

from .comparison import run_comparison
from .energy import compute_network_energy
from .green_ospf import (
    calculate_green_link_cost,
    compute_normalized_components,
    run_energy_aware_ospf,
)
from .models import (
    AlgorithmWeights,
    ComparisonResult,
    EnergyBreakdown,
    LinkStatus,
    NetworkLink,
    PathEvaluationDetail,
    PowerState,
    RouterNode,
    RoutingTableEntry,
    SimulationMetrics,
    SimulationResult,
    Topology,
    TrafficDemand,
    WhatIfScenarioRequest,
)
from .ospf import (
    build_networkx_graph,
    compute_routing_tables,
    generate_lsdb,
    run_standard_ospf,
)
from .presets import (
    PRESETS,
    get_medium_campus_preset,
    get_preset,
    get_small_campus_preset,
    list_presets,
)
from .what_if import run_what_if_scenario

__all__ = [
    "run_comparison",
    "compute_network_energy",
    "calculate_green_link_cost",
    "compute_normalized_components",
    "run_energy_aware_ospf",
    "build_networkx_graph",
    "compute_routing_tables",
    "generate_lsdb",
    "run_standard_ospf",
    "get_preset",
    "list_presets",
    "get_small_campus_preset",
    "get_medium_campus_preset",
    "run_what_if_scenario",
    "Topology",
    "RouterNode",
    "NetworkLink",
    "TrafficDemand",
    "AlgorithmWeights",
    "SimulationResult",
    "ComparisonResult",
    "WhatIfScenarioRequest",
    "SimulationMetrics",
    "EnergyBreakdown",
    "RoutingTableEntry",
    "PathEvaluationDetail",
    "PowerState",
    "LinkStatus",
    "PRESETS",
]

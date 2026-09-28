"""What-if simulation scenario engine."""

from typing import Set
from .comparison import run_comparison
from .models import ComparisonResult, TrafficDemand, WhatIfScenarioRequest
from .presets import get_preset


def run_what_if_scenario(request: WhatIfScenarioRequest) -> ComparisonResult:
    """Execute a what-if scenario by applying parameter perturbations:

    - Link failures
    - Traffic demand surges
    - Solar energy changes
    - Weight tuning (alpha, beta, gamma, delta)
    """
    topo = get_preset(request.topology_id)
    failed_links: Set[str] = set(request.failed_links)

    effective_demand = round(request.demand_mbps * max(0.1, request.traffic_multiplier), 2)

    demand = TrafficDemand(
        source=request.source,
        target=request.target,
        demand_mbps=effective_demand,
        sla_max_delay_ms=35.0,
        sla_max_hop_count=6,
        sla_max_utilization=0.85,
    )

    comp = run_comparison(
        topology=topo,
        demand=demand,
        weights=request.weights,
        failed_link_ids=failed_links,
        solar_available=request.solar_available,
        traffic_multiplier=1.0,
        random_seed=request.random_seed,
    )
    comp.traffic_multiplier = request.traffic_multiplier
    comp.standard_ospf.traffic_multiplier = request.traffic_multiplier
    comp.energy_aware_ospf.traffic_multiplier = request.traffic_multiplier
    return comp

"""Comparison Engine: Executes Standard OSPF vs Proposed Energy-Aware OSPF under strictly identical benchmark conditions."""

import random
from typing import Optional, Set
from .green_ospf import run_energy_aware_ospf
from .models import (
    AlgorithmWeights,
    ComparisonResult,
    Topology,
    TrafficDemand,
)
from .ospf import run_standard_ospf


def run_comparison(
    topology: Topology,
    demand: TrafficDemand,
    weights: Optional[AlgorithmWeights] = None,
    failed_link_ids: Optional[Set[str]] = None,
    solar_available: bool = True,
    traffic_multiplier: float = 1.0,
    random_seed: int = 42,
) -> ComparisonResult:
    """Execute side-by-side simulation under strictly identical conditions:

    - same topology
    - same source
    - same destination
    - same traffic
    - same link conditions
    - same initial energy
    - same random seed
    """
    random.seed(random_seed)

    # Deep copies ensure complete isolation between algorithm runs
    topo_standard = topology.model_copy(deep=True)
    topo_green = topology.model_copy(deep=True)

    demand_standard = demand.model_copy(deep=True)
    demand_green = demand.model_copy(deep=True)

    failed_copy = set(failed_link_ids) if failed_link_ids else set()

    # 1. Run Standard OSPF
    res_std = run_standard_ospf(
        topology=topo_standard,
        demand=demand_standard,
        failed_link_ids=failed_copy,
        solar_available=solar_available,
        traffic_multiplier=traffic_multiplier,
    )

    # 2. Run Proposed Energy-Aware Modified OSPF
    res_green = run_energy_aware_ospf(
        topology=topo_green,
        demand=demand_green,
        weights=weights,
        failed_link_ids=failed_copy,
        solar_available=solar_available,
        traffic_multiplier=traffic_multiplier,
    )

    # 3. Calculate Deltas and Comparative Metrics
    std_power = res_std.metrics.total_power_watts
    green_power = res_green.metrics.total_power_watts
    power_saved_watts = round(max(0.0, std_power - green_power), 2)
    power_saved_pct = round((power_saved_watts / std_power * 100.0) if std_power > 0 else 0.0, 2)
    net_power_saved = round(max(0.0, res_std.net_grid_power_watts - res_green.net_grid_power_watts), 2)

    delay_delta = round(res_green.metrics.total_path_delay_ms - res_std.metrics.total_path_delay_ms, 2)
    hops_delta = res_green.metrics.total_hops - res_std.metrics.total_hops

    additional_sleeping_links = res_green.metrics.sleeping_links_count - res_std.metrics.sleeping_links_count
    additional_sleeping_routers = res_green.metrics.sleeping_routers_count - res_std.metrics.sleeping_routers_count

    # Green efficiency score: Ratio of power saved penalized only if SLA delay increases significantly
    latency_penalty_ratio = (delay_delta / max(0.1, res_std.metrics.total_path_delay_ms)) if delay_delta > 0 else 0.0
    efficiency_score = round(power_saved_pct / (1.0 + (0.5 * latency_penalty_ratio)), 2)

    # 4. Synthesize Summary Report
    path_std_str = " -> ".join(res_std.selected_path)
    path_green_str = " -> ".join(res_green.selected_path)
    eff_demand = round(demand.demand_mbps * traffic_multiplier, 2)
    solar_desc = (
        f"Daytime solar generation active ({res_green.solar_generation_watts}W green offset; net grid power: {res_green.net_grid_power_watts}W vs {res_std.net_grid_power_watts}W standard)."
        if solar_available and res_green.solar_generation_watts > 0
        else "Night mode: solar generation is 0W (grid power equals total gross power)."
    )

    summary_text = (
        f"Energy-Aware OSPF saved {power_saved_watts} W ({power_saved_pct}%) gross equipment power and {net_power_saved} W net grid power at {traffic_multiplier}x traffic scale ({eff_demand} Mbps). "
        f"Standard OSPF chose route [{path_std_str}] ({res_std.metrics.total_path_delay_ms}ms, {std_power}W gross). "
        f"Green OSPF consolidated traffic onto [{path_green_str}] ({res_green.metrics.total_path_delay_ms}ms, {green_power}W gross), "
        f"allowing {additional_sleeping_links} idle links and {additional_sleeping_routers} unused routers to sleep. {solar_desc}"
    )

    return ComparisonResult(
        topology_id=topology.id,
        source=demand.source,
        target=demand.target,
        demand_mbps=demand.demand_mbps,
        traffic_multiplier=traffic_multiplier,
        effective_demand_mbps=eff_demand,
        solar_available=solar_available,
        solar_generation_watts=res_green.solar_generation_watts,
        net_grid_power_watts=res_green.net_grid_power_watts,
        net_power_saved_watts=net_power_saved,
        random_seed=random_seed,
        standard_ospf=res_std,
        energy_aware_ospf=res_green,
        power_saved_watts=power_saved_watts,
        power_saved_percentage=power_saved_pct,
        delay_delta_ms=delay_delta,
        hops_delta=hops_delta,
        additional_sleeping_links=additional_sleeping_links,
        additional_sleeping_routers=additional_sleeping_routers,
        green_efficiency_score=efficiency_score,
        summary=summary_text,
    )

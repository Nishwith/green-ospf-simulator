"""Proposed Energy-Aware Modified OSPF: Multi-factor green cost, constraints, candidate path evaluation, and sleeping heuristics."""

from typing import Dict, List, Optional, Set, Tuple
import networkx as nx
from .energy import compute_network_energy
from .models import (
    AlgorithmWeights,
    EnergyBreakdown,
    LinkStatus,
    NetworkLink,
    PathEvaluationDetail,
    PowerState,
    RouterNode,
    SimulationMetrics,
    SimulationResult,
    Topology,
    TrafficDemand,
)
from .ospf import build_networkx_graph, compute_routing_tables, generate_lsdb


def compute_normalized_components(
    link: NetworkLink,
    demand_mbps: float,
    max_ospf_cost: float,
    max_link_power: float,
    nodes_by_id: Dict[str, RouterNode],
    solar_available: bool = True,
) -> Tuple[float, float, float, float]:
    """Calculate the 4 normalized metric factors for a candidate link:

    1. C_norm: Normalized OSPF Cost (performance)
    2. E_factor: Energy consumption factor (link power & endpoint solar offsets)
    3. U_factor: Congestion / projected utilization factor
    4. P_state: Energy-state penalty (incentivizes traffic consolidation on active links)
    """
    # 1. C_norm: Normalized OSPF cost [0, 1]
    c_norm = min(1.0, float(link.ospf_cost) / max(1.0, max_ospf_cost))

    # 2. E_factor: Link power footprint adjusted by renewable generation at endpoints
    prospective_link_power = link.base_power_watts + (demand_mbps * link.dynamic_power_factor)
    solar_credit = 0.0
    if solar_available:
        src_node = nodes_by_id.get(link.source)
        tgt_node = nodes_by_id.get(link.target)
        if src_node and src_node.green_energy_kw > 0:
            solar_credit += src_node.green_energy_kw * 250.0  # partial credit per incident link
        if tgt_node and tgt_node.green_energy_kw > 0:
            solar_credit += tgt_node.green_energy_kw * 250.0

    net_power = max(1.0, prospective_link_power - solar_credit)
    e_factor = min(1.0, net_power / max(1.0, max_link_power))

    # 3. U_factor: Projected link utilization and congestion curve
    prospective_traffic = link.current_traffic_mbps + demand_mbps
    utilization_ratio = prospective_traffic / max(1.0, link.bandwidth_mbps)

    if utilization_ratio <= 0.50:
        u_factor = utilization_ratio * 0.4
    elif utilization_ratio <= link.max_utilization_threshold:
        # Moderate linear rise between 50% and 85%
        u_factor = 0.20 + (utilization_ratio - 0.50) * 1.5
    else:
        # Severe exponential penalty once surpassing safe threshold (approaching congestion)
        u_factor = min(2.0, 0.725 + (utilization_ratio - link.max_utilization_threshold) * 5.0)

    # 4. P_state: State transition penalty.
    # If link is already carrying traffic (>0), penalty is 0 (consolidation bonus).
    # If link is currently idle (0 traffic), penalty is 1.0 (requires waking link from sleep).
    p_state = 0.0 if link.current_traffic_mbps > 0.0 else 1.0

    return (c_norm, e_factor, u_factor, p_state)


def calculate_green_link_cost(
    link: NetworkLink,
    demand_mbps: float,
    max_ospf_cost: float,
    max_link_power: float,
    weights: AlgorithmWeights,
    nodes_by_id: Dict[str, RouterNode],
    solar_available: bool = True,
) -> float:
    """Calculate combined weighted Green OSPF metric:

    Cost_green(e) = alpha * C_norm + beta * E_factor + gamma * U_factor + delta * P_state
    """
    c_norm, e_factor, u_factor, p_state = compute_normalized_components(
        link=link,
        demand_mbps=demand_mbps,
        max_ospf_cost=max_ospf_cost,
        max_link_power=max_link_power,
        nodes_by_id=nodes_by_id,
        solar_available=solar_available,
    )

    combined_cost = (
        (weights.alpha * c_norm)
        + (weights.beta * e_factor)
        + (weights.gamma * u_factor)
        + (weights.delta * p_state)
    )
    return max(0.001, combined_cost)


def run_energy_aware_ospf(
    topology: Topology,
    demand: TrafficDemand,
    weights: Optional[AlgorithmWeights] = None,
    failed_link_ids: Optional[Set[str]] = None,
    solar_available: bool = True,
    max_candidates: int = 12,
    traffic_multiplier: float = 1.0,
) -> SimulationResult:
    """Simulate Proposed Energy-Aware Modified OSPF:

    1. Enumerate candidate paths between source and target.
    2. Compute multi-factor green cost with configurable alpha, beta, gamma, delta.
    3. Evaluate SLA constraints (delay, utilization, hops, loop-free).
    4. Provide detailed path acceptance/rejection explanations.
    5. Place unutilized links and routers into low-power sleep states.
    6. Compute consolidated energy metrics and savings.
    """
    actual_weights = weights or AlgorithmWeights()
    failed = failed_link_ids or set()
    g = build_networkx_graph(topology, failed)
    lsdb = generate_lsdb(topology, failed)
    effective_demand = round(demand.demand_mbps * traffic_multiplier, 2)

    nodes_by_id = {n.id: n for n in topology.nodes}
    sim_links = [l.model_copy() for l in topology.links]
    link_lookup = {l.id: l for l in sim_links}

    # Reference normalizers
    max_ospf_cost = max([l.ospf_cost for l in topology.links] + [100.0])
    max_link_power = max([l.base_power_watts + (effective_demand * l.dynamic_power_factor) for l in topology.links] + [50.0])

    if demand.source not in g.nodes() or demand.target not in g.nodes():
        empty_energy = EnergyBreakdown(
            total_power_watts=0, router_base_power_watts=0, router_sleep_power_watts=0,
            link_base_power_watts=0, link_dynamic_power_watts=0, link_sleep_power_watts=0,
            green_energy_offset_watts=0, net_grid_power_watts=0
        )
        return SimulationResult(
            algorithm="Energy-Aware Modified OSPF",
            source=demand.source,
            target=demand.target,
            demand_mbps=demand.demand_mbps,
            traffic_multiplier=traffic_multiplier,
            effective_demand_mbps=effective_demand,
            solar_available=solar_available,
            solar_generation_watts=0.0,
            net_grid_power_watts=0.0,
            selected_path=[],
            selected_link_ids=[],
            is_feasible=False,
            status_message=f"Source ({demand.source}) or Target ({demand.target}) not in network graph.",
            metrics=SimulationMetrics(
                total_power_watts=0, energy_breakdown=empty_energy,
                average_link_utilization_pct=0, max_link_utilization_pct=0,
                active_routers_count=0, sleeping_routers_count=0,
                active_links_count=0, sleeping_links_count=0,
                total_path_delay_ms=0, total_hops=0, path_cost=0,
            ),
        )

    # 1. Enumerate candidate loop-free paths using Yen's algorithm / NetworkX shortest simple paths
    evaluated_candidates: List[PathEvaluationDetail] = []
    valid_candidates: List[Tuple[float, List[str], List[str], float, float]] = []  # (green_cost, path, link_ids, delay, max_util)

    try:
        candidate_paths_gen = nx.shortest_simple_paths(g, demand.source, demand.target, weight="cost")
        count = 0
        for raw_path in candidate_paths_gen:
            if count >= max_candidates:
                break
            count += 1

            path_hops = len(raw_path) - 1
            path_link_ids: List[str] = []
            path_ospf_cost = 0.0
            path_delay = 0.0
            path_green_cost = 0.0
            bottleneck_bw = float("inf")
            max_link_util = 0.0
            rejection_reasons: List[str] = []

            # Evaluate every hop along candidate path
            for i in range(len(raw_path) - 1):
                u, v = raw_path[i], raw_path[i + 1]
                edge_data = g.get_edge_data(u, v)
                lid = edge_data["id"]
                path_link_ids.append(lid)

                link_obj = link_lookup.get(lid)
                if not link_obj:
                    continue

                path_ospf_cost += link_obj.ospf_cost
                path_delay += link_obj.delay_ms
                bottleneck_bw = min(bottleneck_bw, link_obj.bandwidth_mbps)

                proj_traffic = link_obj.current_traffic_mbps + effective_demand
                proj_util = (proj_traffic / max(1.0, link_obj.bandwidth_mbps)) * 100.0
                max_link_util = max(max_link_util, proj_util)

                # Compute green cost for this edge
                edge_green_cost = calculate_green_link_cost(
                    link=link_obj,
                    demand_mbps=effective_demand,
                    max_ospf_cost=max_ospf_cost,
                    max_link_power=max_link_power,
                    weights=actual_weights,
                    nodes_by_id=nodes_by_id,
                    solar_available=solar_available,
                )
                path_green_cost += edge_green_cost

            # 2. SLA Constraint Checks
            if demand.sla_max_delay_ms is not None and path_delay > demand.sla_max_delay_ms:
                rejection_reasons.append(f"Exceeds SLA delay: {path_delay:.1f}ms > {demand.sla_max_delay_ms:.1f}ms")

            sla_util_pct = (demand.sla_max_utilization or 0.85) * 100.0
            if max_link_util > sla_util_pct:
                rejection_reasons.append(f"Violates link utilization threshold: {max_link_util:.1f}% > {sla_util_pct:.1f}%")

            if demand.sla_max_hop_count is not None and path_hops > demand.sla_max_hop_count:
                rejection_reasons.append(f"Exceeds max allowable hops: {path_hops} > {demand.sla_max_hop_count}")

            is_valid = len(rejection_reasons) == 0
            rejection_str = "; ".join(rejection_reasons) if not is_valid else None

            evaluated_candidates.append(
                PathEvaluationDetail(
                    path=raw_path,
                    hops=path_hops,
                    total_ospf_cost=round(path_ospf_cost, 2),
                    total_delay_ms=round(path_delay, 2),
                    bottleneck_bandwidth_mbps=bottleneck_bw,
                    max_link_utilization=round(max_link_util, 2),
                    green_cost=round(path_green_cost, 3),
                    is_valid=is_valid,
                    rejection_reason=rejection_str,
                )
            )

            if is_valid:
                valid_candidates.append((path_green_cost, raw_path, path_link_ids, path_delay, max_link_util))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        pass

    # 3. Path Selection: Pick valid path with lowest green cost
    if valid_candidates:
        valid_candidates.sort(key=lambda x: x[0])
        best_green_cost, selected_path, selected_link_ids, selected_delay, _ = valid_candidates[0]
        status_msg = f"Optimal energy-aware path selected (Green Metric: {best_green_cost:.3f})."
        is_feasible = True
    elif evaluated_candidates:
        # Fallback to candidate with minimum constraint violation or standard path
        best = min(evaluated_candidates, key=lambda x: x.green_cost)
        selected_path = best.path
        selected_link_ids = []
        selected_delay = best.total_delay_ms
        best_green_cost = best.green_cost
        for i in range(len(selected_path) - 1):
            u, v = selected_path[i], selected_path[i + 1]
            selected_link_ids.append(g.get_edge_data(u, v)["id"])
        status_msg = f"SLA constraints relaxed; selected lowest green cost candidate path ({best_green_cost:.3f})."
        is_feasible = True
    else:
        empty_energy = EnergyBreakdown(
            total_power_watts=0, router_base_power_watts=0, router_sleep_power_watts=0,
            link_base_power_watts=0, link_dynamic_power_watts=0, link_sleep_power_watts=0,
            green_energy_offset_watts=0, net_grid_power_watts=0
        )
        return SimulationResult(
            algorithm="Energy-Aware Modified OSPF",
            source=demand.source,
            target=demand.target,
            demand_mbps=demand.demand_mbps,
            traffic_multiplier=traffic_multiplier,
            effective_demand_mbps=effective_demand,
            solar_available=solar_available,
            solar_generation_watts=0.0,
            net_grid_power_watts=0.0,
            selected_path=[],
            selected_link_ids=[],
            is_feasible=False,
            status_message="No feasible candidate paths found.",
            metrics=SimulationMetrics(
                total_power_watts=0, energy_breakdown=empty_energy,
                average_link_utilization_pct=0, max_link_utilization_pct=0,
                active_routers_count=0, sleeping_routers_count=0,
                active_links_count=0, sleeping_links_count=0,
                total_path_delay_ms=0, total_hops=0, path_cost=0,
            ),
        )

    # 4. Traffic Forwarding onto selected path
    for lid in selected_link_ids:
        if lid in link_lookup:
            link_lookup[lid].current_traffic_mbps += effective_demand

    # 5. Dynamic Sleep State Assignment
    # Routers on the active path remain ACTIVE; all unneeded routers transition to SLEEP
    active_node_ids = set(selected_path)
    all_node_ids = {n.id for n in topology.nodes}
    sleeping_node_ids = all_node_ids - active_node_ids

    # Links on the active path remain ACTIVE; unneeded links transition to SLEEP
    active_link_ids = set(selected_link_ids)
    all_up_links = {l.id for l in sim_links if l.status != LinkStatus.DOWN and l.id not in failed}
    sleeping_link_ids = all_up_links - active_link_ids

    # 6. Green Energy Calculation
    energy = compute_network_energy(
        nodes=topology.nodes,
        links=sim_links,
        active_node_ids=active_node_ids,
        active_link_ids=active_link_ids,
        is_green_mode=True,
        solar_available=solar_available,
    )

    # 7. Utilization metrics (for active links)
    active_utils = [
        (link_lookup[lid].current_traffic_mbps / link_lookup[lid].bandwidth_mbps) * 100.0
        for lid in active_link_ids
        if lid in link_lookup and link_lookup[lid].bandwidth_mbps > 0
    ]
    avg_util = sum(active_utils) / len(active_utils) if active_utils else 0.0
    max_util = max(active_utils) if active_utils else 0.0

    # 8. Source routing table
    routing_tables = compute_routing_tables(g)
    source_table = [e for e in routing_tables if e.full_path and e.full_path[0] == demand.source]

    metrics = SimulationMetrics(
        total_power_watts=energy.total_power_watts,
        energy_breakdown=energy,
        average_link_utilization_pct=round(avg_util, 2),
        max_link_utilization_pct=round(max_util, 2),
        active_routers_count=len(active_node_ids),
        sleeping_routers_count=len(sleeping_node_ids),
        active_links_count=len(active_link_ids),
        sleeping_links_count=len(sleeping_link_ids),
        total_path_delay_ms=round(selected_delay, 2),
        total_hops=len(selected_path) - 1,
        path_cost=round(best_green_cost, 3),
    )

    return SimulationResult(
        algorithm="Energy-Aware Modified OSPF",
        source=demand.source,
        target=demand.target,
        demand_mbps=demand.demand_mbps,
        traffic_multiplier=traffic_multiplier,
        effective_demand_mbps=effective_demand,
        solar_available=solar_available,
        solar_generation_watts=energy.green_energy_offset_watts,
        net_grid_power_watts=energy.net_grid_power_watts,
        selected_path=selected_path,
        selected_link_ids=selected_link_ids,
        is_feasible=is_feasible,
        status_message=status_msg,
        metrics=metrics,
        routing_table=source_table,
        lsdb_summary=lsdb,
        candidate_paths=evaluated_candidates,
        active_nodes=sorted(list(active_node_ids)),
        sleeping_nodes=sorted(list(sleeping_node_ids)),
        active_links=sorted(list(active_link_ids)),
        sleeping_links=sorted(list(sleeping_link_ids)),
    )

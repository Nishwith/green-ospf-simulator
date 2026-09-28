"""Standard OSPF simulation: LSA/LSDB generation, Dijkstra SPF, routing tables, and traffic forwarding."""

from typing import Dict, List, Optional, Set, Tuple
import networkx as nx
from .energy import compute_network_energy
from .models import (
    EnergyBreakdown,
    LinkStatus,
    LSARecord,
    NetworkLink,
    RoutingTableEntry,
    SimulationMetrics,
    SimulationResult,
    Topology,
    TrafficDemand,
)


def build_networkx_graph(topology: Topology, failed_link_ids: Optional[Set[str]] = None) -> nx.Graph:
    """Construct an undirected NetworkX graph from topology data models."""
    g = nx.Graph()
    failed = failed_link_ids or set()

    for node in topology.nodes:
        g.add_node(node.id, data=node)

    for link in topology.links:
        if link.id in failed or link.status == LinkStatus.DOWN:
            continue
        g.add_edge(
            link.source,
            link.target,
            id=link.id,
            cost=link.ospf_cost,
            bandwidth=link.bandwidth_mbps,
            delay=link.delay_ms,
            data=link,
        )

    return g


def generate_lsdb(topology: Topology, failed_link_ids: Optional[Set[str]] = None) -> Dict[str, LSARecord]:
    """Generate conceptual Router-LSAs (Type 1) and synthesize the synchronized Area 0 LSDB."""
    failed = failed_link_ids or set()
    lsdb: Dict[str, LSARecord] = {}

    for node in topology.nodes:
        advertised_links: List[Dict[str, str]] = []
        for link in topology.links:
            if link.id in failed or link.status == LinkStatus.DOWN:
                continue
            if link.source == node.id or link.target == node.id:
                neighbor = link.target if link.source == node.id else link.source
                advertised_links.append({
                    "neighbor_router_id": neighbor,
                    "link_id": link.id,
                    "metric": str(link.ospf_cost),
                    "bandwidth_mbps": str(link.bandwidth_mbps),
                })

        lsdb[node.id] = LSARecord(
            lsa_id=node.id,
            sequence_number=0x80000001,
            age_seconds=12,
            links=advertised_links,
        )

    return lsdb


def compute_routing_tables(g: nx.Graph) -> List[RoutingTableEntry]:
    """Compute OSPF routing table entries for all pairs in the network using Dijkstra SPF."""
    entries: List[RoutingTableEntry] = []

    for src in g.nodes():
        for dst in g.nodes():
            if src == dst:
                continue
            try:
                path = nx.dijkstra_path(g, src, dst, weight="cost")
                cost = nx.dijkstra_path_length(g, src, dst, weight="cost")
                next_hop = path[1]
                edge_data = g.get_edge_data(src, next_hop)
                link_id = edge_data["id"] if edge_data else f"L_{src}_{next_hop}"
                entries.append(
                    RoutingTableEntry(
                        destination=dst,
                        next_hop=next_hop,
                        cost=float(cost),
                        outgoing_interface=link_id,
                        full_path=path,
                    )
                )
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue

    return entries


def run_standard_ospf(
    topology: Topology,
    demand: TrafficDemand,
    failed_link_ids: Optional[Set[str]] = None,
    solar_available: bool = True,
    traffic_multiplier: float = 1.0,
) -> SimulationResult:
    """Simulate Standard OSPF: Dijkstra SPF purely on static link cost, all links kept powered ON."""
    failed = failed_link_ids or set()
    g = build_networkx_graph(topology, failed)
    lsdb = generate_lsdb(topology, failed)
    effective_demand = round(demand.demand_mbps * traffic_multiplier, 2)

    if demand.source not in g.nodes() or demand.target not in g.nodes():
        empty_energy = EnergyBreakdown(
            total_power_watts=0, router_base_power_watts=0, router_sleep_power_watts=0,
            link_base_power_watts=0, link_dynamic_power_watts=0, link_sleep_power_watts=0,
            green_energy_offset_watts=0, net_grid_power_watts=0
        )
        return SimulationResult(
            algorithm="Standard OSPF",
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
            status_message=f"Source ({demand.source}) or Target ({demand.target}) not found in graph.",
            metrics=SimulationMetrics(
                total_power_watts=0,
                energy_breakdown=empty_energy,
                average_link_utilization_pct=0,
                max_link_utilization_pct=0,
                active_routers_count=0,
                sleeping_routers_count=0,
                active_links_count=0,
                sleeping_links_count=0,
                total_path_delay_ms=0,
                total_hops=0,
                path_cost=0,
            ),
        )

    # 1. Dijkstra Shortest Path First on OSPF cost
    try:
        path = nx.dijkstra_path(g, demand.source, demand.target, weight="cost")
        total_cost = float(nx.dijkstra_path_length(g, demand.source, demand.target, weight="cost"))
    except nx.NetworkXNoPath:
        empty_energy = EnergyBreakdown(
            total_power_watts=0, router_base_power_watts=0, router_sleep_power_watts=0,
            link_base_power_watts=0, link_dynamic_power_watts=0, link_sleep_power_watts=0,
            green_energy_offset_watts=0, net_grid_power_watts=0
        )
        return SimulationResult(
            algorithm="Standard OSPF",
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
            status_message=f"No loop-free path available between {demand.source} and {demand.target}.",
            metrics=SimulationMetrics(
                total_power_watts=0,
                energy_breakdown=empty_energy,
                average_link_utilization_pct=0,
                max_link_utilization_pct=0,
                active_routers_count=0,
                sleeping_routers_count=0,
                active_links_count=0,
                sleeping_links_count=0,
                total_path_delay_ms=0,
                total_hops=0,
                path_cost=0,
            ),
        )

    # 2. Extract selected link IDs, calculate delay, forward traffic
    selected_link_ids: List[str] = []
    total_delay = 0.0
    active_nodes = set(path)

    # Make working copy of links to apply traffic
    sim_links = [l.model_copy() for l in topology.links]
    link_lookup = {l.id: l for l in sim_links}

    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        edge_data = g.get_edge_data(u, v)
        lid = edge_data["id"]
        selected_link_ids.append(lid)
        total_delay += edge_data["delay"]

        if lid in link_lookup:
            link_lookup[lid].current_traffic_mbps += effective_demand

    # 3. Standard OSPF keeps all non-down links and nodes powered ON
    all_up_links = {l.id for l in sim_links if l.status != LinkStatus.DOWN and l.id not in failed}
    all_nodes = {n.id for n in topology.nodes}

    # 4. Energy calculation
    energy = compute_network_energy(
        nodes=topology.nodes,
        links=sim_links,
        active_node_ids=all_nodes,  # In standard OSPF, all routers remain active
        active_link_ids=all_up_links,  # In standard OSPF, all links remain active
        is_green_mode=False,
        solar_available=solar_available,
    )

    # 5. Link utilization metrics
    utilizations = [
        (l.current_traffic_mbps / l.bandwidth_mbps) * 100.0
        for l in sim_links
        if l.bandwidth_mbps > 0 and l.id in all_up_links
    ]
    avg_util = sum(utilizations) / len(utilizations) if utilizations else 0.0
    max_util = max(utilizations) if utilizations else 0.0

    # 6. Routing table from source perspective
    routing_tables = compute_routing_tables(g)
    source_table = [e for e in routing_tables if e.full_path and e.full_path[0] == demand.source]

    metrics = SimulationMetrics(
        total_power_watts=energy.total_power_watts,
        energy_breakdown=energy,
        average_link_utilization_pct=round(avg_util, 2),
        max_link_utilization_pct=round(max_util, 2),
        active_routers_count=len(all_nodes),
        sleeping_routers_count=0,
        active_links_count=len(all_up_links),
        sleeping_links_count=0,
        total_path_delay_ms=round(total_delay, 2),
        total_hops=len(path) - 1,
        path_cost=round(total_cost, 2),
    )

    return SimulationResult(
        algorithm="Standard OSPF",
        source=demand.source,
        target=demand.target,
        demand_mbps=demand.demand_mbps,
        traffic_multiplier=traffic_multiplier,
        effective_demand_mbps=effective_demand,
        solar_available=solar_available,
        solar_generation_watts=energy.green_energy_offset_watts,
        net_grid_power_watts=energy.net_grid_power_watts,
        selected_path=path,
        selected_link_ids=selected_link_ids,
        is_feasible=True,
        status_message="Path computed successfully via standard Dijkstra SPF.",
        metrics=metrics,
        routing_table=source_table,
        lsdb_summary=lsdb,
        candidate_paths=[],
        active_nodes=list(all_nodes),
        sleeping_nodes=[],
        active_links=list(all_up_links),
        sleeping_links=[],
    )

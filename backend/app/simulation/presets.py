"""Campus network topology presets: Small, Medium, and Large."""

from typing import Dict, List
from .models import LinkStatus, NetworkLink, PowerState, RouterNode, Topology


def calculate_ospf_cost(bandwidth_mbps: float, reference_bw_mbps: float = 100000.0) -> int:
    """Standard Cisco/IETF OSPF cost = reference_bw / interface_bw (min 1)."""
    if bandwidth_mbps <= 0:
        return 65535
    cost = int(reference_bw_mbps / bandwidth_mbps)
    return max(1, cost)


def get_small_campus_preset() -> Topology:
    """Small Campus: 5 routers (Core, Distribution, Access)."""
    ref_bw = 100000.0
    nodes = [
        RouterNode(id="R1", name="Core Gateway", role="core", base_power_watts=120.0, sleep_power_ratio=0.15, green_energy_source="grid", green_energy_kw=0.0, x=100, y=200),
        RouterNode(id="R2", name="Distribution North", role="distribution", base_power_watts=90.0, sleep_power_ratio=0.12, green_energy_source="solar", green_energy_kw=0.05, x=300, y=100),
        RouterNode(id="R3", name="Distribution South", role="distribution", base_power_watts=90.0, sleep_power_ratio=0.12, green_energy_source="grid", green_energy_kw=0.0, x=300, y=300),
        RouterNode(id="R4", name="Engineering Lab Access", role="access", base_power_watts=60.0, sleep_power_ratio=0.10, green_energy_source="solar", green_energy_kw=0.04, x=500, y=100),
        RouterNode(id="R5", name="Admin Access", role="access", base_power_watts=60.0, sleep_power_ratio=0.10, green_energy_source="grid", green_energy_kw=0.0, x=500, y=300),
    ]

    raw_links = [
        ("L_R1_R2", "R1", "R2", 10000.0, 1.5, 25.0, 0.008),
        ("L_R1_R3", "R1", "R3", 1000.0, 3.0, 14.0, 0.012),
        ("L_R2_R3", "R2", "R3", 1000.0, 2.5, 12.0, 0.010),
        ("L_R2_R4", "R2", "R4", 10000.0, 2.0, 22.0, 0.008),
        ("L_R3_R5", "R3", "R5", 1000.0, 3.5, 12.0, 0.010),
        ("L_R4_R5", "R4", "R5", 1000.0, 4.0, 10.0, 0.010),
    ]

    links = [
        NetworkLink(
            id=lid,
            source=s,
            target=t,
            bandwidth_mbps=bw,
            delay_ms=d,
            ospf_cost=calculate_ospf_cost(bw, ref_bw),
            base_power_watts=p_base,
            dynamic_power_factor=p_dyn,
            sleep_power_watts=p_base * 0.1,
            current_traffic_mbps=0.0,
            status=LinkStatus.UP,
        )
        for lid, s, t, bw, d, p_base, p_dyn in raw_links
    ]

    return Topology(
        id="small_campus",
        name="Small Campus Network",
        description="5-Router topology ideal for initial verification and basic path comparison.",
        reference_bandwidth_mbps=ref_bw,
        nodes=nodes,
        links=links,
    )


def get_medium_campus_preset() -> Topology:
    """Medium Campus: 8 routers (Core R1-R2, Dist R3-R5, Target R6, Access R7-R8)."""
    ref_bw = 100000.0
    nodes = [
        RouterNode(id="R1", name="Core Gateway North", role="core", base_power_watts=140.0, sleep_power_ratio=0.15, green_energy_source="solar", green_energy_kw=0.06, x=100, y=250),
        RouterNode(id="R2", name="Core Gateway South", role="core", base_power_watts=150.0, sleep_power_ratio=0.15, green_energy_source="grid", green_energy_kw=0.0, x=250, y=100),
        RouterNode(id="R3", name="Aggregation Hub Alpha", role="distribution", base_power_watts=95.0, sleep_power_ratio=0.12, green_energy_source="grid", green_energy_kw=0.0, x=300, y=250),
        RouterNode(id="R4", name="Solar Aggregation Beta", role="distribution", base_power_watts=90.0, sleep_power_ratio=0.12, green_energy_source="solar", green_energy_kw=0.08, x=300, y=400),
        RouterNode(id="R5", name="High-Speed Transit Hub", role="distribution", base_power_watts=110.0, sleep_power_ratio=0.14, green_energy_source="grid", green_energy_kw=0.0, x=500, y=100),
        RouterNode(id="R6", name="Central Data Center / Edge", role="core", base_power_watts=130.0, sleep_power_ratio=0.15, green_energy_source="grid", green_energy_kw=0.0, x=550, y=300),
        RouterNode(id="R7", name="Academic Block Router", role="access", base_power_watts=65.0, sleep_power_ratio=0.10, green_energy_source="solar", green_energy_kw=0.04, x=150, y=450),
        RouterNode(id="R8", name="Library & Research Pod", role="access", base_power_watts=65.0, sleep_power_ratio=0.10, green_energy_source="grid", green_energy_kw=0.0, x=700, y=300),
    ]

    # Explicit candidate pathways from R1 to R6:
    # 1. R1 -> R2 -> R5 -> R6: 10 Gbps high-speed backbone (standard OSPF preferred, high power)
    # 2. R1 -> R3 -> R6: 1 Gbps direct transit (medium delay, moderate power)
    # 3. R1 -> R4 -> R6: 1 Gbps green transit (R4 has 80W solar offset, energy-aware preferred!)
    # 4. Cross connections R2-R3, R3-R4, R4-R7, R6-R8
    raw_links = [
        ("L_R1_R2", "R1", "R2", 10000.0, 1.2, 32.0, 0.007),
        ("L_R1_R3", "R1", "R3", 1000.0, 3.5, 14.0, 0.012),
        ("L_R1_R4", "R1", "R4", 1000.0, 4.0, 13.0, 0.011),
        ("L_R1_R7", "R1", "R7", 1000.0, 2.5, 12.0, 0.010),
        ("L_R2_R5", "R2", "R5", 10000.0, 1.5, 30.0, 0.007),
        ("L_R2_R3", "R2", "R3", 1000.0, 2.2, 14.0, 0.010),
        ("L_R3_R4", "R3", "R4", 1000.0, 2.0, 12.0, 0.010),
        ("L_R3_R6", "R3", "R6", 1000.0, 4.5, 15.0, 0.012),
        ("L_R4_R6", "R4", "R6", 1000.0, 3.8, 13.0, 0.011),
        ("L_R5_R6", "R5", "R6", 10000.0, 1.8, 28.0, 0.007),
        ("L_R6_R8", "R6", "R8", 1000.0, 2.0, 11.0, 0.010),
        ("L_R4_R7", "R4", "R7", 1000.0, 3.0, 11.0, 0.010),
    ]

    links = [
        NetworkLink(
            id=lid,
            source=s,
            target=t,
            bandwidth_mbps=bw,
            delay_ms=d,
            ospf_cost=calculate_ospf_cost(bw, ref_bw),
            base_power_watts=p_base,
            dynamic_power_factor=p_dyn,
            sleep_power_watts=p_base * 0.1,
            current_traffic_mbps=0.0,
            status=LinkStatus.UP,
        )
        for lid, s, t, bw, d, p_base, p_dyn in raw_links
    ]

    return Topology(
        id="medium_campus",
        name="Medium Campus Network",
        description="8-Router hierarchical campus featuring Core R1-R2, Aggregation R3-R5, and Data Center R6 with solar nodes.",
        reference_bandwidth_mbps=ref_bw,
        nodes=nodes,
        links=links,
    )


def get_large_campus_preset() -> Topology:
    """Large Campus: 14 routers (Multi-building campus network with redundant rings)."""
    ref_bw = 100000.0
    nodes = [
        RouterNode(id="R1", name="Core Gateway North", role="core", base_power_watts=160.0, sleep_power_ratio=0.15, green_energy_source="solar", green_energy_kw=0.08, x=100, y=250),
        RouterNode(id="R2", name="Core Gateway South", role="core", base_power_watts=160.0, sleep_power_ratio=0.15, green_energy_source="grid", green_energy_kw=0.0, x=100, y=400),
        RouterNode(id="R3", name="Distribution Ring 1", role="distribution", base_power_watts=100.0, sleep_power_ratio=0.12, green_energy_source="solar", green_energy_kw=0.05, x=280, y=150),
        RouterNode(id="R4", name="Distribution Ring 2", role="distribution", base_power_watts=100.0, sleep_power_ratio=0.12, green_energy_source="grid", green_energy_kw=0.0, x=280, y=300),
        RouterNode(id="R5", name="Distribution Ring 3", role="distribution", base_power_watts=100.0, sleep_power_ratio=0.12, green_energy_source="solar", green_energy_kw=0.06, x=280, y=480),
        RouterNode(id="R6", name="Central Data Center 1", role="core", base_power_watts=140.0, sleep_power_ratio=0.15, green_energy_source="grid", green_energy_kw=0.0, x=450, y=250),
        RouterNode(id="R7", name="Central Data Center 2", role="core", base_power_watts=140.0, sleep_power_ratio=0.15, green_energy_source="solar", green_energy_kw=0.07, x=450, y=400),
        RouterNode(id="R8", name="Engineering Pod A", role="access", base_power_watts=70.0, sleep_power_ratio=0.10, green_energy_source="grid", green_energy_kw=0.0, x=620, y=120),
        RouterNode(id="R9", name="Engineering Pod B", role="access", base_power_watts=70.0, sleep_power_ratio=0.10, green_energy_source="solar", green_energy_kw=0.04, x=620, y=220),
        RouterNode(id="R10", name="Science Complex", role="access", base_power_watts=70.0, sleep_power_ratio=0.10, green_energy_source="grid", green_energy_kw=0.0, x=620, y=320),
        RouterNode(id="R11", name="Admin Complex", role="access", base_power_watts=65.0, sleep_power_ratio=0.10, green_energy_source="solar", green_energy_kw=0.05, x=620, y=420),
        RouterNode(id="R12", name="Hostel Cluster A", role="access", base_power_watts=60.0, sleep_power_ratio=0.10, green_energy_source="grid", green_energy_kw=0.0, x=780, y=200),
        RouterNode(id="R13", name="Hostel Cluster B", role="access", base_power_watts=60.0, sleep_power_ratio=0.10, green_energy_source="grid", green_energy_kw=0.0, x=780, y=350),
        RouterNode(id="R14", name="Campus Border Router", role="edge", base_power_watts=120.0, sleep_power_ratio=0.14, green_energy_source="solar", green_energy_kw=0.06, x=900, y=280),
    ]

    raw_links = [
        ("L_R1_R2", "R1", "R2", 40000.0, 0.8, 45.0, 0.005),
        ("L_R1_R3", "R1", "R3", 10000.0, 1.8, 25.0, 0.008),
        ("L_R1_R4", "R1", "R4", 10000.0, 1.5, 25.0, 0.008),
        ("L_R2_R4", "R2", "R4", 10000.0, 1.6, 25.0, 0.008),
        ("L_R2_R5", "R2", "R5", 10000.0, 1.9, 25.0, 0.008),
        ("L_R3_R4", "R3", "R4", 1000.0, 2.5, 12.0, 0.010),
        ("L_R4_R5", "R4", "R5", 1000.0, 2.5, 12.0, 0.010),
        ("L_R3_R6", "R3", "R6", 10000.0, 2.0, 26.0, 0.008),
        ("L_R4_R6", "R4", "R6", 10000.0, 1.7, 26.0, 0.008),
        ("L_R4_R7", "R4", "R7", 10000.0, 1.7, 26.0, 0.008),
        ("L_R5_R7", "R5", "R7", 10000.0, 2.1, 26.0, 0.008),
        ("L_R6_R7", "R6", "R7", 40000.0, 1.0, 42.0, 0.005),
        ("L_R6_R8", "R6", "R8", 1000.0, 3.2, 14.0, 0.011),
        ("L_R6_R9", "R6", "R9", 1000.0, 3.0, 14.0, 0.011),
        ("L_R7_R10", "R7", "R10", 1000.0, 3.1, 14.0, 0.011),
        ("L_R7_R11", "R7", "R11", 1000.0, 2.9, 13.0, 0.011),
        ("L_R8_R12", "R8", "R12", 1000.0, 2.2, 11.0, 0.010),
        ("L_R9_R12", "R9", "R12", 1000.0, 2.5, 11.0, 0.010),
        ("L_R10_R13", "R10", "R13", 1000.0, 2.4, 11.0, 0.010),
        ("L_R11_R13", "R11", "R13", 1000.0, 2.3, 11.0, 0.010),
        ("L_R12_R14", "R12", "R14", 10000.0, 2.0, 22.0, 0.008),
        ("L_R13_R14", "R13", "R14", 10000.0, 2.1, 22.0, 0.008),
    ]

    links = [
        NetworkLink(
            id=lid,
            source=s,
            target=t,
            bandwidth_mbps=bw,
            delay_ms=d,
            ospf_cost=calculate_ospf_cost(bw, ref_bw),
            base_power_watts=p_base,
            dynamic_power_factor=p_dyn,
            sleep_power_watts=p_base * 0.1,
            current_traffic_mbps=0.0,
            status=LinkStatus.UP,
        )
        for lid, s, t, bw, d, p_base, p_dyn in raw_links
    ]

    return Topology(
        id="large_campus",
        name="Large Campus Network",
        description="14-Router multi-tier campus network with Core, Distribution rings, Access pods, and Border Gateway.",
        reference_bandwidth_mbps=ref_bw,
        nodes=nodes,
        links=links,
    )


PRESETS: Dict[str, Topology] = {
    "small_campus": get_small_campus_preset(),
    "medium_campus": get_medium_campus_preset(),
    "large_campus": get_large_campus_preset(),
}


def get_preset(preset_id: str) -> Topology:
    """Retrieve topology preset by ID (defaults to medium_campus)."""
    # Return fresh copy
    if preset_id not in PRESETS:
        preset_id = "medium_campus"
    return PRESETS[preset_id].model_copy(deep=True)


def list_presets() -> List[Dict[str, str]]:
    """List summary metadata for all campus presets."""
    return [
        {
            "id": topo.id,
            "name": topo.name,
            "description": topo.description,
            "nodes_count": len(topo.nodes),
            "links_count": len(topo.links),
        }
        for topo in PRESETS.values()
    ]

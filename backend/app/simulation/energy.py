"""Energy consumption modeling for network routers, link interfaces, and renewable sources."""

from typing import Dict, List, Set
from .models import EnergyBreakdown, LinkStatus, NetworkLink, PowerState, RouterNode


def compute_network_energy(
    nodes: List[RouterNode],
    links: List[NetworkLink],
    active_node_ids: Set[str],
    active_link_ids: Set[str],
    is_green_mode: bool,
    solar_available: bool = True,
) -> EnergyBreakdown:
    """Calculate total power consumption across all chassis, linecards, dynamic flows, and green offsets.

    In standard mode (is_green_mode=False):
    - All routers and links remain fully powered ON (idle power incurred everywhere).
    In green mode (is_green_mode=True):
    - Unused routers drop to low-power sleep states.
    - Unused links enter low-power sleep states.
    """
    router_base_power = 0.0
    router_sleep_power = 0.0
    link_base_power = 0.0
    link_dynamic_power = 0.0
    link_sleep_power = 0.0
    green_offset = 0.0

    # 1. Router power calculations
    for node in nodes:
        is_active = node.id in active_node_ids or (not is_green_mode)
        if is_active:
            router_base_power += node.base_power_watts
        else:
            router_sleep_power += node.base_power_watts * node.sleep_power_ratio

        # Renewable green generation (e.g. solar panels on roof)
        if solar_available and node.green_energy_kw > 0.0:
            # Convert kW to Watts (e.g. 0.06 kW = 60 Watts)
            green_offset += node.green_energy_kw * 1000.0

    # 2. Link power calculations
    for link in links:
        is_active = link.id in active_link_ids or (not is_green_mode and link.status != LinkStatus.DOWN)
        traffic = link.current_traffic_mbps if link.id in active_link_ids else 0.0

        if is_active:
            link_base_power += link.base_power_watts
            link_dynamic_power += traffic * link.dynamic_power_factor
        else:
            # Green sleep mode
            link_sleep_power += link.sleep_power_watts

    total_gross_power = (
        router_base_power
        + router_sleep_power
        + link_base_power
        + link_dynamic_power
        + link_sleep_power
    )

    net_grid_power = max(0.0, total_gross_power - green_offset)

    return EnergyBreakdown(
        total_power_watts=round(total_gross_power, 2),
        router_base_power_watts=round(router_base_power, 2),
        router_sleep_power_watts=round(router_sleep_power, 2),
        link_base_power_watts=round(link_base_power, 2),
        link_dynamic_power_watts=round(link_dynamic_power, 2),
        link_sleep_power_watts=round(link_sleep_power, 2),
        green_energy_offset_watts=round(green_offset, 2),
        net_grid_power_watts=round(net_grid_power, 2),
    )

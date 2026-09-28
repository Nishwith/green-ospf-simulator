"""QA Invariant and Contract Verification Tests for Green OSPF Network Simulator.

These tests enforce core simulation invariants:
1. Standard OSPF and Proposed Energy-Aware OSPF must run under strictly identical conditions.
2. Input topology and demand models must remain immutable during simulation.
3. Simulations must be deterministic and repeatable.
4. SLA constraints (delay, utilization, hop count) must be evaluated on candidate paths.
5. Solar toggle flag must properly govern renewable credit and offset calculations.
6. Edge cases (disconnected networks, invalid router IDs) must fail gracefully.
7. Power state counts must sum to total network elements without leaks.
"""

import unittest
from app.simulation.comparison import run_comparison
from app.simulation.energy import compute_network_energy
from app.simulation.green_ospf import (
    compute_normalized_components,
    run_energy_aware_ospf,
)
from app.simulation.models import (
    AlgorithmWeights,
    LinkStatus,
    TrafficDemand,
)
from app.simulation.ospf import run_standard_ospf
from app.simulation.presets import (
    calculate_ospf_cost,
    get_medium_campus_preset,
    get_small_campus_preset,
)


class TestQASimulationInvariants(unittest.TestCase):
    def setUp(self):
        self.topo = get_medium_campus_preset()
        self.demand = TrafficDemand(
            source="R1",
            target="R6",
            demand_mbps=150.0,
            sla_max_delay_ms=30.0,
            sla_max_hop_count=5,
            sla_max_utilization=0.85,
        )

    def test_identical_conditions_and_immutability(self):
        """Standard OSPF and Energy-Aware OSPF must receive identical baseline conditions

        and must never mutate the caller's topology or demand objects.
        """
        # Snapshot initial link traffic
        initial_traffic = {l.id: l.current_traffic_mbps for l in self.topo.links}

        comp = run_comparison(
            topology=self.topo,
            demand=self.demand,
            failed_link_ids={"L_R3_R4"},
            solar_available=True,
            random_seed=42,
        )

        # 1. Benchmark input verification
        self.assertEqual(comp.source, self.demand.source)
        self.assertEqual(comp.target, self.demand.target)
        self.assertEqual(comp.demand_mbps, self.demand.demand_mbps)
        self.assertEqual(comp.standard_ospf.source, comp.energy_aware_ospf.source)
        self.assertEqual(comp.standard_ospf.target, comp.energy_aware_ospf.target)
        self.assertEqual(comp.standard_ospf.demand_mbps, comp.energy_aware_ospf.demand_mbps)

        # Both algorithms must have respected the same failed links
        self.assertNotIn("L_R3_R4", comp.standard_ospf.selected_link_ids)
        self.assertNotIn("L_R3_R4", comp.energy_aware_ospf.selected_link_ids)

        # 2. Immutability check: caller's topology must not have its traffic modified
        for link in self.topo.links:
            self.assertEqual(
                link.current_traffic_mbps,
                initial_traffic[link.id],
                f"Link {link.id} was mutated in caller topology!",
            )

    def test_deterministic_simulation(self):
        """Running the comparison twice with identical inputs must yield identical results."""
        comp1 = run_comparison(self.topo, self.demand, random_seed=42)
        comp2 = run_comparison(self.topo, self.demand, random_seed=42)

        self.assertEqual(comp1.standard_ospf.selected_path, comp2.standard_ospf.selected_path)
        self.assertEqual(comp1.energy_aware_ospf.selected_path, comp2.energy_aware_ospf.selected_path)
        self.assertEqual(comp1.power_saved_watts, comp2.power_saved_watts)
        self.assertEqual(comp1.power_saved_percentage, comp2.power_saved_percentage)
        self.assertEqual(comp1.delay_delta_ms, comp2.delay_delta_ms)
        self.assertEqual(comp1.green_efficiency_score, comp2.green_efficiency_score)

    def test_power_state_conservation(self):
        """In both modes, active + sleeping elements must account for all non-down elements."""
        comp = run_comparison(self.topo, self.demand)

        total_nodes = len(self.topo.nodes)
        total_up_links = len([l for l in self.topo.links if l.status != LinkStatus.DOWN])

        # Standard OSPF: 0 sleeping, all active
        std_m = comp.standard_ospf.metrics
        self.assertEqual(std_m.active_routers_count, total_nodes)
        self.assertEqual(std_m.sleeping_routers_count, 0)
        self.assertEqual(std_m.active_links_count, total_up_links)
        self.assertEqual(std_m.sleeping_links_count, 0)

        # Green OSPF: active + sleeping must equal total
        green_m = comp.energy_aware_ospf.metrics
        self.assertEqual(
            green_m.active_routers_count + green_m.sleeping_routers_count,
            total_nodes,
        )
        self.assertEqual(
            green_m.active_links_count + green_m.sleeping_links_count,
            total_up_links,
        )

    def test_sla_constraint_violation_detection(self):
        """Candidate paths that violate SLA constraints must be flagged is_valid=False

        with an informative rejection_reason.
        """
        # Tight delay limit: 2.0ms (impossible for R1 -> R6)
        tight_delay_demand = TrafficDemand(
            source="R1",
            target="R6",
            demand_mbps=150.0,
            sla_max_delay_ms=2.0,
        )
        res = run_energy_aware_ospf(self.topo, tight_delay_demand)

        self.assertGreater(len(res.candidate_paths), 0)
        for cand in res.candidate_paths:
            self.assertFalse(cand.is_valid)
            self.assertIsNotNone(cand.rejection_reason)
            self.assertIn("Exceeds SLA delay", cand.rejection_reason)

    def test_solar_toggle_flag(self):
        """When solar_available=False, solar offset must be zero."""
        nodes_by_id = {n.id: n for n in self.topo.nodes}
        link_r1_r4 = next(l for l in self.topo.links if l.id == "L_R1_R4")

        # With solar available
        _, e_solar, _, _ = compute_normalized_components(
            link=link_r1_r4,
            demand_mbps=150.0,
            max_ospf_cost=100.0,
            max_link_power=50.0,
            nodes_by_id=nodes_by_id,
            solar_available=True,
        )

        # Without solar
        _, e_no_solar, _, _ = compute_normalized_components(
            link=link_r1_r4,
            demand_mbps=150.0,
            max_ospf_cost=100.0,
            max_link_power=50.0,
            nodes_by_id=nodes_by_id,
            solar_available=False,
        )

        # With solar credit, energy factor should be lower (greener)
        self.assertLess(e_solar, e_no_solar)

        # In energy breakdown, offset must be 0 when solar is False
        eb_no_solar = compute_network_energy(
            nodes=self.topo.nodes,
            links=self.topo.links,
            active_node_ids={"R1", "R4", "R6"},
            active_link_ids={"L_R1_R4", "L_R4_R6"},
            is_green_mode=True,
            solar_available=False,
        )
        self.assertEqual(eb_no_solar.green_energy_offset_watts, 0.0)

    def test_disconnected_network_graceful_handling(self):
        """When all paths between source and target are severed, simulation must

        return is_feasible=False with empty path and 0 metrics, not crash.
        """
        # Cut all links connected to R1
        r1_links = {l.id for l in self.topo.links if l.source == "R1" or l.target == "R1"}

        std_res = run_standard_ospf(
            topology=self.topo,
            demand=self.demand,
            failed_link_ids=r1_links,
        )
        self.assertFalse(std_res.is_feasible)
        self.assertEqual(std_res.selected_path, [])
        self.assertIn("No loop-free path", std_res.status_message)
        self.assertEqual(std_res.metrics.total_power_watts, 0.0)

        green_res = run_energy_aware_ospf(
            topology=self.topo,
            demand=self.demand,
            failed_link_ids=r1_links,
        )
        self.assertFalse(green_res.is_feasible)
        self.assertEqual(green_res.selected_path, [])
        self.assertEqual(green_res.metrics.total_power_watts, 0.0)

    def test_invalid_router_ids(self):
        """Non-existent router ID in demand must return is_feasible=False."""
        bad_demand = TrafficDemand(source="UNKNOWN_ROUTER", target="R6", demand_mbps=100.0)
        std_res = run_standard_ospf(self.topo, bad_demand)
        self.assertFalse(std_res.is_feasible)

        green_res = run_energy_aware_ospf(self.topo, bad_demand)
        self.assertFalse(green_res.is_feasible)


if __name__ == "__main__":
    unittest.main()

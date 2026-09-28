"""Unit tests for Standard OSPF, Energy-Aware OSPF, comparison, and what-if engines."""

import unittest
from app.simulation.comparison import run_comparison
from app.simulation.energy import compute_network_energy
from app.simulation.green_ospf import (
    calculate_green_link_cost,
    compute_normalized_components,
    run_energy_aware_ospf,
)
from app.simulation.models import (
    AlgorithmWeights,
    LinkStatus,
    PowerState,
    TrafficDemand,
    WhatIfScenarioRequest,
)
from app.simulation.ospf import (
    build_networkx_graph,
    compute_routing_tables,
    generate_lsdb,
    run_standard_ospf,
)
from app.simulation.presets import get_medium_campus_preset, get_small_campus_preset
from app.simulation.what_if import run_what_if_scenario


class TestSimulationEngines(unittest.TestCase):
    def setUp(self):
        self.medium_topo = get_medium_campus_preset()
        self.small_topo = get_small_campus_preset()
        self.demand_r1_r6 = TrafficDemand(
            source="R1",
            target="R6",
            demand_mbps=150.0,
            sla_max_delay_ms=30.0,
            sla_max_hop_count=5,
            sla_max_utilization=0.85,
        )

    def test_standard_ospf_r1_to_r6(self):
        result = run_standard_ospf(
            topology=self.medium_topo,
            demand=self.demand_r1_r6,
        )
        self.assertTrue(result.is_feasible)
        self.assertEqual(result.source, "R1")
        self.assertEqual(result.target, "R6")
        self.assertEqual(result.selected_path[0], "R1")
        self.assertEqual(result.selected_path[-1], "R6")
        # Standard OSPF should pick the lowest OSPF cost path: R1 -> R2 -> R5 -> R6 (10G links = cost 10 each, total cost 30)
        self.assertEqual(result.selected_path, ["R1", "R2", "R5", "R6"])
        self.assertEqual(result.metrics.path_cost, 30.0)
        # In Standard OSPF, all nodes and links remain active (0 sleeping)
        self.assertEqual(result.metrics.sleeping_links_count, 0)
        self.assertEqual(result.metrics.sleeping_routers_count, 0)
        self.assertGreater(result.metrics.total_power_watts, 0)

    def test_lsdb_and_routing_tables(self):
        lsdb = generate_lsdb(self.medium_topo)
        self.assertEqual(len(lsdb), 8)
        self.assertIn("R1", lsdb)
        self.assertGreater(len(lsdb["R1"].links), 0)

        g = build_networkx_graph(self.medium_topo)
        tables = compute_routing_tables(g)
        self.assertGreater(len(tables), 20)
        # Check an entry from R1
        r1_entries = [e for e in tables if e.full_path and e.full_path[0] == "R1"]
        self.assertGreater(len(r1_entries), 0)

    def test_green_ospf_r1_to_r6(self):
        result = run_energy_aware_ospf(
            topology=self.medium_topo,
            demand=self.demand_r1_r6,
            weights=AlgorithmWeights(alpha=0.15, beta=0.50, gamma=0.20, delta=0.15),
        )
        self.assertTrue(result.is_feasible)
        self.assertEqual(result.selected_path[0], "R1")
        self.assertEqual(result.selected_path[-1], "R6")
        # Green OSPF should put idle links and routers into sleep
        self.assertGreater(result.metrics.sleeping_links_count, 0)
        self.assertGreater(result.metrics.sleeping_routers_count, 0)
        self.assertGreater(len(result.candidate_paths), 1)

    def test_side_by_side_comparison(self):
        comp = run_comparison(
            topology=self.medium_topo,
            demand=self.demand_r1_r6,
            random_seed=42,
        )
        self.assertTrue(comp.standard_ospf.is_feasible)
        self.assertTrue(comp.energy_aware_ospf.is_feasible)
        # Power saved must be positive and percentage significant
        self.assertGreater(comp.power_saved_watts, 0)
        self.assertGreater(comp.power_saved_percentage, 0)
        self.assertGreater(comp.additional_sleeping_links, 0)
        self.assertGreater(comp.additional_sleeping_routers, 0)
        # Summary text must be non-empty and informative
        self.assertIn("Energy-Aware OSPF saved", comp.summary)

    def test_what_if_link_failure(self):
        # Fail the backbone link L_R1_R2 and see what happens
        req = WhatIfScenarioRequest(
            topology_id="medium_campus",
            source="R1",
            target="R6",
            demand_mbps=150.0,
            failed_links=["L_R1_R2"],
        )
        comp = run_what_if_scenario(req)
        # Both algorithms should reroute around the failed link
        self.assertNotIn("L_R1_R2", comp.standard_ospf.selected_link_ids)
        self.assertNotIn("L_R1_R2", comp.energy_aware_ospf.selected_link_ids)
        self.assertTrue(comp.standard_ospf.is_feasible)
        self.assertTrue(comp.energy_aware_ospf.is_feasible)

    def test_what_if_traffic_multiplier(self):
        req_normal = WhatIfScenarioRequest(
            topology_id="medium_campus",
            source="R1",
            target="R6",
            demand_mbps=100.0,
            traffic_multiplier=1.0,
        )
        comp_normal = run_what_if_scenario(req_normal)

        req_surge = WhatIfScenarioRequest(
            topology_id="medium_campus",
            source="R1",
            target="R6",
            demand_mbps=100.0,
            traffic_multiplier=2.5,
        )
        comp_surge = run_what_if_scenario(req_surge)

        self.assertEqual(comp_surge.demand_mbps, 250.0)
        self.assertGreater(
            comp_surge.standard_ospf.metrics.average_link_utilization_pct,
            comp_normal.standard_ospf.metrics.average_link_utilization_pct,
        )


if __name__ == "__main__":
    unittest.main()

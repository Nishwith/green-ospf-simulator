"""Unit tests for simulation models, presets, and topology configurations."""

import unittest
from app.simulation.models import (
    AlgorithmWeights,
    LinkStatus,
    NetworkLink,
    PowerState,
    RouterNode,
    Topology,
    TrafficDemand,
)
from app.simulation.presets import (
    calculate_ospf_cost,
    get_large_campus_preset,
    get_medium_campus_preset,
    get_preset,
    get_small_campus_preset,
    list_presets,
)


class TestModelsAndPresets(unittest.TestCase):
    def test_ospf_cost_calculation(self):
        # 10 Gbps (10,000 Mbps) with 100 Gbps reference = 10
        self.assertEqual(calculate_ospf_cost(10000.0, 100000.0), 10)
        # 1 Gbps (1,000 Mbps) with 100 Gbps reference = 100
        self.assertEqual(calculate_ospf_cost(1000.0, 100000.0), 100)
        # 100 Mbps with 100 Gbps reference = 1000
        self.assertEqual(calculate_ospf_cost(100.0, 100000.0), 1000)
        # Zero or negative bandwidth
        self.assertEqual(calculate_ospf_cost(0.0), 65535)

    def test_router_and_link_models(self):
        router = RouterNode(
            id="R1",
            name="Test Router",
            base_power_watts=120.0,
            sleep_power_ratio=0.15,
            power_state=PowerState.ACTIVE,
        )
        self.assertEqual(router.id, "R1")
        self.assertEqual(router.base_power_watts, 120.0)

        link = NetworkLink(
            id="L_R1_R2",
            source="R1",
            target="R2",
            bandwidth_mbps=1000.0,
            delay_ms=2.5,
            ospf_cost=100,
            base_power_watts=15.0,
            status=LinkStatus.UP,
        )
        self.assertEqual(link.source, "R1")
        self.assertEqual(link.target, "R2")
        self.assertEqual(link.status, LinkStatus.UP)

    def test_algorithm_weights_defaults(self):
        weights = AlgorithmWeights()
        self.assertAlmostEqual(weights.alpha + weights.beta + weights.gamma + weights.delta, 1.0, places=2)

    def test_presets_loading(self):
        presets = list_presets()
        self.assertEqual(len(presets), 3)
        ids = [p["id"] for p in presets]
        self.assertIn("small_campus", ids)
        self.assertIn("medium_campus", ids)
        self.assertIn("large_campus", ids)

    def test_medium_campus_structure(self):
        topo = get_medium_campus_preset()
        node_ids = {n.id for n in topo.nodes}
        # Medium campus must have R1 and R6
        self.assertIn("R1", node_ids)
        self.assertIn("R6", node_ids)
        self.assertEqual(len(topo.nodes), 8)
        self.assertGreaterEqual(len(topo.links), 10)

        # Check solar generation on R1 and R4
        r1 = next(n for n in topo.nodes if n.id == "R1")
        r4 = next(n for n in topo.nodes if n.id == "R4")
        self.assertGreater(r1.green_energy_kw, 0)
        self.assertGreater(r4.green_energy_kw, 0)


if __name__ == "__main__":
    unittest.main()

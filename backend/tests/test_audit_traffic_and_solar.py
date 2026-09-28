"""Functional audit tests for Traffic Load Scale and Solar Generation controls.

Verifies end-to-end simulation effects:
- Traffic multipliers (0.5x, 1.0x, 1.5x, 2.0x) correctly scale effective demand,
  dynamic energy draw, and link utilizations.
- Solar toggle (Night/Off vs Day/On) adjusts solar renewable offset and net grid power
  without corrupting gross chassis draw.
- Standard OSPF and Green OSPF maintain strict benchmark parity.
"""

import unittest
from app.simulation.comparison import run_comparison
from app.simulation.models import TrafficDemand
from app.simulation.presets import get_preset


class TestAuditTrafficAndSolarControls(unittest.TestCase):
    def setUp(self):
        self.topology = get_preset("medium_campus")
        self.base_demand = TrafficDemand(source="R1", target="R6", demand_mbps=150.0)

    def test_traffic_scaling_effective_demand_and_metrics(self):
        """Test Traffic Load Scale across 0.5x, 1.0x, 1.5x, 2.0x."""
        scales = [0.5, 1.0, 1.5, 2.0]
        expected_demands = [75.0, 150.0, 225.0, 300.0]

        results = []
        for scale, expected_eff in zip(scales, expected_demands):
            comp = run_comparison(
                topology=self.topology,
                demand=self.base_demand,
                solar_available=False,
                traffic_multiplier=scale,
                random_seed=42,
            )
            results.append(comp)

            # Check effective demand propagation
            self.assertEqual(comp.traffic_multiplier, scale)
            self.assertEqual(comp.effective_demand_mbps, expected_eff)
            self.assertEqual(comp.standard_ospf.effective_demand_mbps, expected_eff)
            self.assertEqual(comp.energy_aware_ospf.effective_demand_mbps, expected_eff)
            self.assertEqual(comp.standard_ospf.traffic_multiplier, scale)
            self.assertEqual(comp.energy_aware_ospf.traffic_multiplier, scale)

        # Verify strictly monotonic increase in link utilization and dynamic power
        for i in range(len(scales) - 1):
            curr_res = results[i]
            next_res = results[i + 1]

            # Standard OSPF utilization & dynamic power must increase
            self.assertLess(
                curr_res.standard_ospf.metrics.average_link_utilization_pct,
                next_res.standard_ospf.metrics.average_link_utilization_pct,
                f"Standard utilization failed to increase from {scales[i]}x to {scales[i+1]}x",
            )
            self.assertLess(
                curr_res.standard_ospf.metrics.energy_breakdown.link_dynamic_power_watts,
                next_res.standard_ospf.metrics.energy_breakdown.link_dynamic_power_watts,
                f"Standard dynamic power failed to increase from {scales[i]}x to {scales[i+1]}x",
            )

            # Green OSPF utilization & dynamic power must increase
            self.assertLess(
                curr_res.energy_aware_ospf.metrics.average_link_utilization_pct,
                next_res.energy_aware_ospf.metrics.average_link_utilization_pct,
                f"Green utilization failed to increase from {scales[i]}x to {scales[i+1]}x",
            )
            self.assertLess(
                curr_res.energy_aware_ospf.metrics.energy_breakdown.link_dynamic_power_watts,
                next_res.energy_aware_ospf.metrics.energy_breakdown.link_dynamic_power_watts,
                f"Green dynamic power failed to increase from {scales[i]}x to {scales[i+1]}x",
            )

    def test_solar_generation_off_vs_on(self):
        """Test Solar Generation: Night (Off) vs Day (On)."""
        # 1. Run Solar OFF (Night)
        comp_off = run_comparison(
            topology=self.topology,
            demand=self.base_demand,
            solar_available=False,
            traffic_multiplier=1.0,
            random_seed=42,
        )

        # Solar OFF verification
        self.assertFalse(comp_off.solar_available)
        self.assertEqual(comp_off.solar_generation_watts, 0.0)
        self.assertEqual(comp_off.standard_ospf.metrics.energy_breakdown.green_energy_offset_watts, 0.0)
        self.assertEqual(comp_off.energy_aware_ospf.metrics.energy_breakdown.green_energy_offset_watts, 0.0)

        # Net grid power must equal gross power when solar is off
        self.assertEqual(
            comp_off.standard_ospf.metrics.energy_breakdown.net_grid_power_watts,
            comp_off.standard_ospf.metrics.total_power_watts,
        )
        self.assertEqual(
            comp_off.energy_aware_ospf.metrics.energy_breakdown.net_grid_power_watts,
            comp_off.energy_aware_ospf.metrics.total_power_watts,
        )

        # 2. Run Solar ON (Daytime)
        comp_on = run_comparison(
            topology=self.topology,
            demand=self.base_demand,
            solar_available=True,
            traffic_multiplier=1.0,
            random_seed=42,
        )

        # Solar ON verification
        self.assertTrue(comp_on.solar_available)
        # In medium campus: R1 (60W) + R4 (80W) + R7 (40W) = 180W total solar capacity
        self.assertEqual(comp_on.solar_generation_watts, 180.0)
        self.assertEqual(comp_on.standard_ospf.metrics.energy_breakdown.green_energy_offset_watts, 180.0)
        self.assertEqual(comp_on.energy_aware_ospf.metrics.energy_breakdown.green_energy_offset_watts, 180.0)

        # Gross equipment power must NOT change merely because solar is enabled
        self.assertEqual(
            comp_off.standard_ospf.metrics.total_power_watts,
            comp_on.standard_ospf.metrics.total_power_watts,
        )
        self.assertEqual(
            comp_off.energy_aware_ospf.metrics.total_power_watts,
            comp_on.energy_aware_ospf.metrics.total_power_watts,
        )

        # Net grid power must decrease by exactly 180W
        expected_std_net = round(comp_off.standard_ospf.metrics.total_power_watts - 180.0, 2)
        expected_green_net = round(comp_off.energy_aware_ospf.metrics.total_power_watts - 180.0, 2)

        self.assertEqual(
            comp_on.standard_ospf.metrics.energy_breakdown.net_grid_power_watts,
            expected_std_net,
        )
        self.assertEqual(
            comp_on.energy_aware_ospf.metrics.energy_breakdown.net_grid_power_watts,
            expected_green_net,
        )

    def test_fair_comparison_benchmark_parity(self):
        """Standard and Green OSPF must receive identical inputs."""
        comp = run_comparison(
            topology=self.topology,
            demand=self.base_demand,
            solar_available=True,
            traffic_multiplier=1.5,
            random_seed=42,
        )

        self.assertEqual(comp.standard_ospf.demand_mbps, comp.energy_aware_ospf.demand_mbps)
        self.assertEqual(comp.standard_ospf.effective_demand_mbps, comp.energy_aware_ospf.effective_demand_mbps)
        self.assertEqual(comp.standard_ospf.traffic_multiplier, comp.energy_aware_ospf.traffic_multiplier)
        self.assertEqual(comp.standard_ospf.solar_available, comp.energy_aware_ospf.solar_available)
        self.assertEqual(comp.standard_ospf.source, comp.energy_aware_ospf.source)
        self.assertEqual(comp.standard_ospf.target, comp.energy_aware_ospf.target)

    def test_cache_key_and_scenario_isolation(self):
        """Test Part 7: Cache keys must strictly differentiate Scenario A, B, and C."""
        from fastapi.testclient import TestClient
        from app.main import app, SIMULATION_CACHE

        client = TestClient(app)

        # Scenario A: 150 Mbps, solar OFF, 1.0x
        resp_a = client.post(
            "/api/simulation/compare",
            json={
                "topology_id": "medium_campus",
                "demand": {"source": "R1", "target": "R6", "demand_mbps": 150.0},
                "traffic_multiplier": 1.0,
                "solar_available": False,
            },
        )
        self.assertEqual(resp_a.status_code, 200)
        data_a = resp_a.json()
        self.assertEqual(data_a["effective_demand_mbps"], 150.0)
        self.assertFalse(data_a["solar_available"])

        # Scenario B: 150 Mbps base * 2.0x = 300 Mbps effective, solar OFF
        resp_b = client.post(
            "/api/simulation/compare",
            json={
                "topology_id": "medium_campus",
                "demand": {"source": "R1", "target": "R6", "demand_mbps": 150.0},
                "traffic_multiplier": 2.0,
                "solar_available": False,
            },
        )
        self.assertEqual(resp_b.status_code, 200)
        data_b = resp_b.json()
        self.assertEqual(data_b["effective_demand_mbps"], 300.0)
        self.assertFalse(data_b["solar_available"])

        # Scenario C: 150 Mbps base, solar ON
        resp_c = client.post(
            "/api/simulation/compare",
            json={
                "topology_id": "medium_campus",
                "demand": {"source": "R1", "target": "R6", "demand_mbps": 150.0},
                "traffic_multiplier": 1.0,
                "solar_available": True,
            },
        )
        self.assertEqual(resp_c.status_code, 200)
        data_c = resp_c.json()
        self.assertEqual(data_c["effective_demand_mbps"], 150.0)
        self.assertTrue(data_c["solar_available"])

        # Scenario B must have higher dynamic energy than Scenario A
        self.assertGreater(
            data_b["standard_ospf"]["metrics"]["energy_breakdown"]["link_dynamic_power_watts"],
            data_a["standard_ospf"]["metrics"]["energy_breakdown"]["link_dynamic_power_watts"],
        )

        # Scenario C must have lower net grid power than Scenario A
        self.assertLess(
            data_c["standard_ospf"]["metrics"]["energy_breakdown"]["net_grid_power_watts"],
            data_a["standard_ospf"]["metrics"]["energy_breakdown"]["net_grid_power_watts"],
        )

        # Cache must contain distinct keys for all 3 scenarios
        key_a = "medium_campus_R1_R6_150.0mbps_solar0_nofail_s42"
        key_b = "medium_campus_R1_R6_300.0mbps_solar0_nofail_s42"
        key_c = "medium_campus_R1_R6_150.0mbps_solar1_nofail_s42"

        self.assertIn(key_a, SIMULATION_CACHE)
        self.assertIn(key_b, SIMULATION_CACHE)
        self.assertIn(key_c, SIMULATION_CACHE)
        self.assertNotEqual(SIMULATION_CACHE[key_a].effective_demand_mbps, SIMULATION_CACHE[key_b].effective_demand_mbps)
        self.assertNotEqual(SIMULATION_CACHE[key_a].solar_available, SIMULATION_CACHE[key_c].solar_available)


if __name__ == "__main__":
    unittest.main()

"""Unit tests for FastAPI endpoints."""

import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        # Health endpoint must return status ok and dependencies ready
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["dependencies"]["fastapi"], "ready")
        self.assertIn("networkx", data["dependencies"])
        self.assertEqual(data["dependencies"]["simulation_engine"], "ready")

    def test_presets_endpoints(self):
        resp = self.client.get("/api/presets")
        self.assertEqual(resp.status_code, 200)
        presets = resp.json()
        self.assertGreaterEqual(len(presets), 3)

        resp_med = self.client.get("/api/presets/medium_campus")
        self.assertEqual(resp_med.status_code, 200)
        topo = resp_med.json()
        self.assertEqual(topo["id"], "medium_campus")
        self.assertEqual(len(topo["nodes"]), 8)

    def test_standard_ospf_api(self):
        payload = {
            "topology_id": "medium_campus",
            "demand": {
                "source": "R1",
                "target": "R6",
                "demand_mbps": 150.0,
            },
        }
        resp = self.client.post("/api/simulate/standard", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["algorithm"], "Standard OSPF")
        self.assertEqual(data["selected_path"], ["R1", "R2", "R5", "R6"])
        self.assertTrue(data["is_feasible"])
        self.assertGreater(data["metrics"]["total_power_watts"], 0)

    def test_green_ospf_api(self):
        payload = {
            "topology_id": "medium_campus",
            "demand": {
                "source": "R1",
                "target": "R6",
                "demand_mbps": 150.0,
            },
            "weights": {
                "alpha": 0.2,
                "beta": 0.4,
                "gamma": 0.2,
                "delta": 0.2,
            },
        }
        resp = self.client.post("/api/simulate/green", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["algorithm"], "Energy-Aware Modified OSPF")
        self.assertTrue(data["is_feasible"])
        self.assertGreater(data["metrics"]["sleeping_links_count"], 0)
        self.assertGreater(data["metrics"]["sleeping_routers_count"], 0)

    def test_comparison_api(self):
        payload = {
            "topology_id": "medium_campus",
            "demand": {
                "source": "R1",
                "target": "R6",
                "demand_mbps": 150.0,
            },
            "random_seed": 42,
        }
        resp = self.client.post("/api/simulate/compare", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreater(data["power_saved_watts"], 0)
        self.assertGreater(data["power_saved_percentage"], 0)
        self.assertGreater(data["additional_sleeping_links"], 0)
        self.assertIn("summary", data)

    def test_what_if_api(self):
        payload = {
            "topology_id": "medium_campus",
            "source": "R1",
            "target": "R6",
            "demand_mbps": 120.0,
            "failed_links": ["L_R1_R2"],
            "traffic_multiplier": 1.5,
            "solar_available": True,
        }
        resp = self.client.post("/api/simulate/what-if", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertNotIn("L_R1_R2", data["standard_ospf"]["selected_link_ids"])
        self.assertNotIn("L_R1_R2", data["energy_aware_ospf"]["selected_link_ids"])

    def test_topology_and_simulation_alias_endpoints(self):
        # 1. Topology list alias
        resp_list = self.client.get("/api/topology/list")
        self.assertEqual(resp_list.status_code, 200)
        topos = resp_list.json()
        self.assertGreaterEqual(len(topos), 3)

        # 2. Topology by ID alias
        resp_med = self.client.get("/api/topology/medium_campus")
        self.assertEqual(resp_med.status_code, 200)
        self.assertEqual(resp_med.json()["id"], "medium_campus")

        # 3. Simulation comparison alias
        compare_payload = {
            "topology_id": "medium_campus",
            "demand": {
                "source": "R1",
                "target": "R6",
                "demand_mbps": 150.0,
            },
        }
        resp_comp = self.client.post("/api/simulation/compare", json=compare_payload)
        self.assertEqual(resp_comp.status_code, 200)
        comp_data = resp_comp.json()
        self.assertGreater(comp_data["power_saved_watts"], 0)

        # 4. Simulation logs
        resp_logs = self.client.get("/api/simulation/latest/logs")
        self.assertEqual(resp_logs.status_code, 200)
        logs = resp_logs.json()
        self.assertGreater(len(logs), 0)


if __name__ == "__main__":
    unittest.main()


// ponytail: isolated fallback data provider matching backend models for when backend simulation endpoints are offline/unimplemented
import type {
  ComparisonResult,
  PathEvaluationDetail,
  RoutingTableEntry,
  SimulationLog,
  SimulationResult,
  Topology,
  TopologySummary,
} from '../types';

export const PRESET_TOPOLOGIES: Record<string, Topology> = {
  small_campus: {
    id: 'small_campus',
    name: 'Small Campus Network',
    description: '5-Router topology ideal for initial verification and basic path comparison.',
    reference_bandwidth_mbps: 100000.0,
    nodes: [
      { id: 'R1', name: 'Core Gateway', role: 'core', base_power_watts: 120.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 100, y: 200 },
      { id: 'R2', name: 'Distribution North', role: 'distribution', base_power_watts: 90.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.05, x: 320, y: 100 },
      { id: 'R3', name: 'Distribution South', role: 'distribution', base_power_watts: 90.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 320, y: 300 },
      { id: 'R4', name: 'Engineering Lab Access', role: 'access', base_power_watts: 60.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.04, x: 540, y: 100 },
      { id: 'R5', name: 'Admin Access', role: 'access', base_power_watts: 60.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 540, y: 300 },
    ],
    links: [
      { id: 'L_R1_R2', source: 'R1', target: 'R2', bandwidth_mbps: 10000.0, delay_ms: 1.5, ospf_cost: 10, base_power_watts: 25.0, dynamic_power_factor: 0.008, sleep_power_watts: 2.5, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R1_R3', source: 'R1', target: 'R3', bandwidth_mbps: 1000.0, delay_ms: 3.0, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.012, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R2_R3', source: 'R2', target: 'R3', bandwidth_mbps: 1000.0, delay_ms: 2.5, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R2_R4', source: 'R2', target: 'R4', bandwidth_mbps: 10000.0, delay_ms: 2.0, ospf_cost: 10, base_power_watts: 22.0, dynamic_power_factor: 0.008, sleep_power_watts: 2.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R3_R5', source: 'R3', target: 'R5', bandwidth_mbps: 1000.0, delay_ms: 3.5, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R4_R5', source: 'R4', target: 'R5', bandwidth_mbps: 1000.0, delay_ms: 4.0, ospf_cost: 100, base_power_watts: 10.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.0, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
    ],
  },
  medium_campus: {
    id: 'medium_campus',
    name: 'Medium Campus Network',
    description: '8-Router hierarchical campus featuring Core R1-R2, Aggregation R3-R5, and Data Center R6 with solar nodes.',
    reference_bandwidth_mbps: 100000.0,
    nodes: [
      { id: 'R1', name: 'Core Gateway North', role: 'core', base_power_watts: 140.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.06, x: 100, y: 250 },
      { id: 'R2', name: 'Core Gateway South', role: 'core', base_power_watts: 150.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 260, y: 110 },
      { id: 'R3', name: 'Aggregation Hub Alpha', role: 'distribution', base_power_watts: 95.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 310, y: 250 },
      { id: 'R4', name: 'Solar Aggregation Beta', role: 'distribution', base_power_watts: 90.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.08, x: 310, y: 400 },
      { id: 'R5', name: 'High-Speed Transit Hub', role: 'distribution', base_power_watts: 110.0, sleep_power_ratio: 0.14, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 500, y: 110 },
      { id: 'R6', name: 'Central Data Center / Edge', role: 'core', base_power_watts: 130.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 560, y: 300 },
      { id: 'R7', name: 'Academic Block Router', role: 'access', base_power_watts: 65.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.04, x: 140, y: 450 },
      { id: 'R8', name: 'Library & Research Pod', role: 'access', base_power_watts: 65.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 720, y: 300 },
    ],
    links: [
      { id: 'L_R1_R2', source: 'R1', target: 'R2', bandwidth_mbps: 10000.0, delay_ms: 1.2, ospf_cost: 10, base_power_watts: 32.0, dynamic_power_factor: 0.007, sleep_power_watts: 3.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R1_R3', source: 'R1', target: 'R3', bandwidth_mbps: 1000.0, delay_ms: 3.5, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.012, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R1_R4', source: 'R1', target: 'R4', bandwidth_mbps: 1000.0, delay_ms: 4.0, ospf_cost: 100, base_power_watts: 13.0, dynamic_power_factor: 0.011, sleep_power_watts: 1.3, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R1_R7', source: 'R1', target: 'R7', bandwidth_mbps: 1000.0, delay_ms: 2.5, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R2_R5', source: 'R2', target: 'R5', bandwidth_mbps: 10000.0, delay_ms: 1.5, ospf_cost: 10, base_power_watts: 30.0, dynamic_power_factor: 0.007, sleep_power_watts: 3.0, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R2_R3', source: 'R2', target: 'R3', bandwidth_mbps: 1000.0, delay_ms: 2.2, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R3_R4', source: 'R3', target: 'R4', bandwidth_mbps: 1000.0, delay_ms: 2.0, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R3_R6', source: 'R3', target: 'R6', bandwidth_mbps: 1000.0, delay_ms: 4.5, ospf_cost: 100, base_power_watts: 15.0, dynamic_power_factor: 0.012, sleep_power_watts: 1.5, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R4_R6', source: 'R4', target: 'R6', bandwidth_mbps: 1000.0, delay_ms: 3.8, ospf_cost: 100, base_power_watts: 13.0, dynamic_power_factor: 0.011, sleep_power_watts: 1.3, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R5_R6', source: 'R5', target: 'R6', bandwidth_mbps: 10000.0, delay_ms: 1.8, ospf_cost: 10, base_power_watts: 28.0, dynamic_power_factor: 0.007, sleep_power_watts: 2.8, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R6_R8', source: 'R6', target: 'R8', bandwidth_mbps: 1000.0, delay_ms: 2.0, ospf_cost: 100, base_power_watts: 11.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.1, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R4_R7', source: 'R4', target: 'R7', bandwidth_mbps: 1000.0, delay_ms: 3.0, ospf_cost: 100, base_power_watts: 11.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.1, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
    ],
  },
  large_campus: {
    id: 'large_campus',
    name: 'Large Campus Network',
    description: '14-Router hierarchical multi-building campus network with redundant rings and multi-tier access pods.',
    reference_bandwidth_mbps: 100000.0,
    nodes: [
      { id: 'R1', name: 'Core Gateway North', role: 'core', base_power_watts: 160.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.08, x: 100, y: 200 },
      { id: 'R2', name: 'Core Gateway South', role: 'core', base_power_watts: 160.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 100, y: 380 },
      { id: 'R3', name: 'Distribution Ring 1', role: 'distribution', base_power_watts: 100.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.05, x: 280, y: 120 },
      { id: 'R4', name: 'Distribution Ring 2', role: 'distribution', base_power_watts: 100.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 280, y: 290 },
      { id: 'R5', name: 'Distribution Ring 3', role: 'distribution', base_power_watts: 100.0, sleep_power_ratio: 0.12, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.06, x: 280, y: 460 },
      { id: 'R6', name: 'Central Data Center 1', role: 'core', base_power_watts: 140.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 460, y: 200 },
      { id: 'R7', name: 'Central Data Center 2', role: 'core', base_power_watts: 140.0, sleep_power_ratio: 0.15, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.07, x: 460, y: 380 },
      { id: 'R8', name: 'Engineering Pod A', role: 'access', base_power_watts: 70.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 640, y: 100 },
      { id: 'R9', name: 'Engineering Pod B', role: 'access', base_power_watts: 70.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.04, x: 640, y: 200 },
      { id: 'R10', name: 'Science Complex', role: 'access', base_power_watts: 70.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 640, y: 320 },
      { id: 'R11', name: 'Admin Complex', role: 'access', base_power_watts: 65.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.05, x: 640, y: 440 },
      { id: 'R12', name: 'Hostel Cluster A', role: 'access', base_power_watts: 60.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 800, y: 180 },
      { id: 'R13', name: 'Hostel Cluster B', role: 'access', base_power_watts: 60.0, sleep_power_ratio: 0.10, power_state: 'active', green_energy_source: 'grid', green_energy_kw: 0.0, x: 800, y: 340 },
      { id: 'R14', name: 'Campus Border Router', role: 'edge', base_power_watts: 120.0, sleep_power_ratio: 0.14, power_state: 'active', green_energy_source: 'solar', green_energy_kw: 0.06, x: 920, y: 260 },
    ],
    links: [
      { id: 'L_R1_R2', source: 'R1', target: 'R2', bandwidth_mbps: 10000.0, delay_ms: 1.0, ospf_cost: 10, base_power_watts: 35.0, dynamic_power_factor: 0.007, sleep_power_watts: 3.5, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R1_R3', source: 'R1', target: 'R3', bandwidth_mbps: 10000.0, delay_ms: 1.4, ospf_cost: 10, base_power_watts: 28.0, dynamic_power_factor: 0.008, sleep_power_watts: 2.8, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R1_R4', source: 'R1', target: 'R4', bandwidth_mbps: 1000.0, delay_ms: 2.5, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R2_R4', source: 'R2', target: 'R4', bandwidth_mbps: 1000.0, delay_ms: 2.5, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R2_R5', source: 'R2', target: 'R5', bandwidth_mbps: 10000.0, delay_ms: 1.4, ospf_cost: 10, base_power_watts: 28.0, dynamic_power_factor: 0.008, sleep_power_watts: 2.8, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R3_R6', source: 'R3', target: 'R6', bandwidth_mbps: 10000.0, delay_ms: 1.5, ospf_cost: 10, base_power_watts: 30.0, dynamic_power_factor: 0.007, sleep_power_watts: 3.0, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R4_R6', source: 'R4', target: 'R6', bandwidth_mbps: 1000.0, delay_ms: 3.0, ospf_cost: 100, base_power_watts: 13.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.3, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R4_R7', source: 'R4', target: 'R7', bandwidth_mbps: 1000.0, delay_ms: 3.0, ospf_cost: 100, base_power_watts: 13.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.3, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R5_R7', source: 'R5', target: 'R7', bandwidth_mbps: 10000.0, delay_ms: 1.5, ospf_cost: 10, base_power_watts: 30.0, dynamic_power_factor: 0.007, sleep_power_watts: 3.0, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R6_R7', source: 'R6', target: 'R7', bandwidth_mbps: 10000.0, delay_ms: 1.0, ospf_cost: 10, base_power_watts: 35.0, dynamic_power_factor: 0.006, sleep_power_watts: 3.5, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R6_R8', source: 'R6', target: 'R8', bandwidth_mbps: 1000.0, delay_ms: 2.2, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R6_R9', source: 'R6', target: 'R9', bandwidth_mbps: 1000.0, delay_ms: 2.0, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R7_R10', source: 'R7', target: 'R10', bandwidth_mbps: 1000.0, delay_ms: 2.1, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R7_R11', source: 'R7', target: 'R11', bandwidth_mbps: 1000.0, delay_ms: 2.0, ospf_cost: 100, base_power_watts: 12.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.2, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R8_R12', source: 'R8', target: 'R12', bandwidth_mbps: 1000.0, delay_ms: 2.8, ospf_cost: 100, base_power_watts: 11.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.1, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R9_R12', source: 'R9', target: 'R12', bandwidth_mbps: 1000.0, delay_ms: 2.6, ospf_cost: 100, base_power_watts: 11.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.1, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R10_R13', source: 'R10', target: 'R13', bandwidth_mbps: 1000.0, delay_ms: 2.7, ospf_cost: 100, base_power_watts: 11.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.1, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R11_R13', source: 'R11', target: 'R13', bandwidth_mbps: 1000.0, delay_ms: 2.5, ospf_cost: 100, base_power_watts: 11.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.1, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R12_R14', source: 'R12', target: 'R14', bandwidth_mbps: 1000.0, delay_ms: 3.0, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
      { id: 'L_R13_R14', source: 'R13', target: 'R14', bandwidth_mbps: 1000.0, delay_ms: 3.1, ospf_cost: 100, base_power_watts: 14.0, dynamic_power_factor: 0.010, sleep_power_watts: 1.4, current_traffic_mbps: 0.0, status: 'up', max_utilization_threshold: 0.85 },
    ],
  },
};

export function getPresetList(): TopologySummary[] {
  return Object.values(PRESET_TOPOLOGIES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    nodes_count: t.nodes.length,
    links_count: t.links.length,
  }));
}

// Generate realistic simulation results mirroring backend OSPF Dijkstra & Green OSPF calculations
export function generateFallbackSimulationResult(
  topoId: string,
  algorithm: 'standard' | 'energy',
  source = 'R1',
  target = 'R6',
  demandMbps = 150.0,
  failedLinks: string[] = [],
  solarAvailable = true
): SimulationResult {
  const isEnergy = algorithm === 'energy';
  const isStandard = !isEnergy;
  const topo = PRESET_TOPOLOGIES[topoId] || PRESET_TOPOLOGIES.medium_campus;

  // Paths
  let selectedPath: string[];
  let selectedLinks: string[];
  let hops: number;
  let delay: number;
  let cost: number;

  if (topoId === 'small_campus') {
    selectedPath = ['R1', 'R2', 'R4'];
    selectedLinks = ['L_R1_R2', 'L_R2_R4'];
    hops = 2;
    delay = 3.5;
    cost = 20;
  } else if (isStandard) {
    // Standard OSPF prefers 10G high-bandwidth backbone R1 -> R2 -> R5 -> R6 (cost = 10+10+10 = 30)
    selectedPath = ['R1', 'R2', 'R5', 'R6'];
    selectedLinks = ['L_R1_R2', 'L_R2_R5', 'L_R5_R6'];
    hops = 3;
    delay = 4.5;
    cost = 30.0;
  } else {
    // Energy-Aware OSPF routes via Solar Aggregation R4: R1 -> R4 -> R6 (cost = 100+100 = 200, but 80W solar offset + allows R2, R5 and 4 links to sleep)
    selectedPath = ['R1', 'R4', 'R6'];
    selectedLinks = ['L_R1_R4', 'L_R4_R6'];
    hops = 2;
    delay = 7.8;
    cost = 200.0;
  }

  // Energy Breakdown
  const totalNodesCount = topo.nodes.length;
  const totalLinksCount = topo.links.length;

  let activeRoutersCount: number;
  let sleepingRoutersCount: number;
  let activeLinksCount: number;
  let sleepingLinksCount: number;

  let totalPower: number;
  let routerBase: number;
  let routerSleep: number;
  let linkBase: number;
  let linkDynamic: number;
  let linkSleep: number;
  let greenOffset: number;
  let netGrid: number;

  if (isStandard) {
    // All nodes & links active
    activeRoutersCount = totalNodesCount;
    sleepingRoutersCount = 0;
    activeLinksCount = totalLinksCount - failedLinks.length;
    sleepingLinksCount = 0;

    routerBase = 845.0;
    routerSleep = 0.0;
    linkBase = 217.0;
    linkDynamic = demandMbps * 0.021;
    linkSleep = 0.0;
    greenOffset = solarAvailable ? 180.0 : 0.0;
    totalPower = routerBase + routerSleep + linkBase + linkDynamic + linkSleep;
    netGrid = Math.max(0, totalPower - greenOffset);
  } else {
    // Green OSPF: consolidates flows, puts unneeded nodes & links to sleep
    activeRoutersCount = selectedPath.length;
    sleepingRoutersCount = totalNodesCount - activeRoutersCount;
    activeLinksCount = selectedLinks.length;
    sleepingLinksCount = totalLinksCount - activeLinksCount - failedLinks.length;

    routerBase = 360.0; // R1 (140) + R4 (90) + R6 (130)
    routerSleep = 58.2; // 5 routers in sleep (12% of base)
    linkBase = 26.0;   // 2 active 1G links (13W + 13W)
    linkDynamic = demandMbps * 0.022;
    linkSleep = 19.1;  // 10 sleeping links
    greenOffset = solarAvailable ? 140.0 : 0.0; // R1 + R4 solar
    totalPower = routerBase + routerSleep + linkBase + linkDynamic + linkSleep;
    netGrid = Math.max(0, totalPower - greenOffset);
  }

  const avgUtil = isStandard ? 14.8 : 38.5;
  const maxUtil = isStandard ? 28.0 : Math.min(85.0, (demandMbps / 1000.0) * 100.0);

  // Candidate paths
  const candidatePaths: PathEvaluationDetail[] = [
    {
      path: ['R1', 'R4', 'R6'],
      hops: 2,
      total_ospf_cost: 200.0,
      total_delay_ms: 7.8,
      bottleneck_bandwidth_mbps: 1000.0,
      max_link_utilization: 15.0,
      green_cost: 62.4,
      is_valid: true,
      rejection_reason: null,
    },
    {
      path: ['R1', 'R3', 'R6'],
      hops: 2,
      total_ospf_cost: 200.0,
      total_delay_ms: 8.0,
      bottleneck_bandwidth_mbps: 1000.0,
      max_link_utilization: 15.0,
      green_cost: 88.5,
      is_valid: true,
      rejection_reason: isEnergy ? 'Higher green cost than R1-R4-R6 (no solar generation on R3)' : null,
    },
    {
      path: ['R1', 'R2', 'R5', 'R6'],
      hops: 3,
      total_ospf_cost: 30.0,
      total_delay_ms: 4.5,
      bottleneck_bandwidth_mbps: 10000.0,
      max_link_utilization: 1.5,
      green_cost: 114.2,
      is_valid: true,
      rejection_reason: isEnergy ? 'Rejected: Requires keeping two 10G transit routers (R2, R5) active (+260W grid power)' : null,
    },
    {
      path: ['R1', 'R7', 'R4', 'R6'],
      hops: 3,
      total_ospf_cost: 300.0,
      total_delay_ms: 9.3,
      bottleneck_bandwidth_mbps: 1000.0,
      max_link_utilization: 15.0,
      green_cost: 95.8,
      is_valid: true,
      rejection_reason: 'Higher hop count (3) and delay (9.3ms) than direct green transit',
    },
  ];

  // Routing Table
  const routingTable: RoutingTableEntry[] = [
    { destination: 'R2', next_hop: isEnergy ? 'R4' : 'R2', cost: isEnergy ? 210 : 10, outgoing_interface: isEnergy ? 'eth2' : 'eth0', full_path: isEnergy ? ['R1', 'R4', 'R3', 'R2'] : ['R1', 'R2'] },
    { destination: 'R3', next_hop: isEnergy ? 'R4' : 'R3', cost: isEnergy ? 200 : 100, outgoing_interface: isEnergy ? 'eth2' : 'eth1', full_path: isEnergy ? ['R1', 'R4', 'R3'] : ['R1', 'R3'] },
    { destination: 'R4', next_hop: 'R4', cost: 100, outgoing_interface: 'eth2', full_path: ['R1', 'R4'] },
    { destination: 'R5', next_hop: isEnergy ? 'R4' : 'R2', cost: isEnergy ? 220 : 20, outgoing_interface: isEnergy ? 'eth2' : 'eth0', full_path: isEnergy ? ['R1', 'R4', 'R6', 'R5'] : ['R1', 'R2', 'R5'] },
    { destination: 'R6', next_hop: isEnergy ? 'R4' : 'R2', cost: isEnergy ? 200 : 30, outgoing_interface: isEnergy ? 'eth2' : 'eth0', full_path: selectedPath },
    { destination: 'R7', next_hop: 'R7', cost: 100, outgoing_interface: 'eth3', full_path: ['R1', 'R7'] },
    { destination: 'R8', next_hop: isEnergy ? 'R4' : 'R2', cost: isEnergy ? 300 : 130, outgoing_interface: isEnergy ? 'eth2' : 'eth0', full_path: [...selectedPath, 'R8'] },
  ];

  // LSDB
  const lsdbSummary = {
    R1: {
      lsa_id: 'R1',
      sequence_number: 2147483649,
      age_seconds: 14,
      links: [
        { neighbor_router_id: 'R2', link_id: 'L_R1_R2', metric: '10', bandwidth_mbps: '10000.0' },
        { neighbor_router_id: 'R3', link_id: 'L_R1_R3', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R4', link_id: 'L_R1_R4', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R7', link_id: 'L_R1_R7', metric: '100', bandwidth_mbps: '1000.0' },
      ],
    },
    R4: {
      lsa_id: 'R4',
      sequence_number: 2147483649,
      age_seconds: 18,
      links: [
        { neighbor_router_id: 'R1', link_id: 'L_R1_R4', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R3', link_id: 'L_R3_R4', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R6', link_id: 'L_R4_R6', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R7', link_id: 'L_R4_R7', metric: '100', bandwidth_mbps: '1000.0' },
      ],
    },
    R6: {
      lsa_id: 'R6',
      sequence_number: 2147483651,
      age_seconds: 22,
      links: [
        { neighbor_router_id: 'R3', link_id: 'L_R3_R6', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R4', link_id: 'L_R4_R6', metric: '100', bandwidth_mbps: '1000.0' },
        { neighbor_router_id: 'R5', link_id: 'L_R5_R6', metric: '10', bandwidth_mbps: '10000.0' },
        { neighbor_router_id: 'R8', link_id: 'L_R6_R8', metric: '100', bandwidth_mbps: '1000.0' },
      ],
    },
  };

  const activeNodes = isStandard ? topo.nodes.map((n) => n.id) : selectedPath;
  const sleepingNodes = isStandard ? [] : topo.nodes.filter((n) => !selectedPath.includes(n.id)).map((n) => n.id);
  const activeLinks = isStandard ? topo.links.filter((l) => !failedLinks.includes(l.id)).map((l) => l.id) : selectedLinks;
  const sleepingLinks = isStandard ? [] : topo.links.filter((l) => !selectedLinks.includes(l.id) && !failedLinks.includes(l.id)).map((l) => l.id);

  return {
    algorithm: isEnergy ? 'Energy-Aware Modified OSPF' : 'Standard OSPF (Dijkstra SPF)',
    source,
    target,
    demand_mbps: demandMbps,
    selected_path: selectedPath,
    selected_link_ids: selectedLinks,
    is_feasible: true,
    status_message: isEnergy
      ? `Energy-Aware path found via green solar transit (${selectedPath.join(' -> ')}). Put ${sleepingRoutersCount} routers and ${sleepingLinksCount} links to sleep.`
      : `Shortest path computed via static OSPF cost (${selectedPath.join(' -> ')}). All network devices maintained in active state.`,
    metrics: {
      total_power_watts: Math.round(totalPower * 10) / 10,
      energy_breakdown: {
        total_power_watts: Math.round(totalPower * 10) / 10,
        router_base_power_watts: Math.round(routerBase * 10) / 10,
        router_sleep_power_watts: Math.round(routerSleep * 10) / 10,
        link_base_power_watts: Math.round(linkBase * 10) / 10,
        link_dynamic_power_watts: Math.round(linkDynamic * 10) / 10,
        link_sleep_power_watts: Math.round(linkSleep * 10) / 10,
        green_energy_offset_watts: Math.round(greenOffset * 10) / 10,
        net_grid_power_watts: Math.round(netGrid * 10) / 10,
      },
      average_link_utilization_pct: avgUtil,
      max_link_utilization_pct: maxUtil,
      active_routers_count: activeRoutersCount,
      sleeping_routers_count: sleepingRoutersCount,
      active_links_count: activeLinksCount,
      sleeping_links_count: sleepingLinksCount,
      total_path_delay_ms: delay,
      total_hops: hops,
      path_cost: cost,
    },
    routing_table: routingTable,
    lsdb_summary: lsdbSummary,
    candidate_paths: candidatePaths,
    active_nodes: activeNodes,
    sleeping_nodes: sleepingNodes,
    active_links: activeLinks,
    sleeping_links: sleepingLinks,
  };
}

export function generateFallbackComparisonResult(
  topoId = 'medium_campus',
  source = 'R1',
  target = 'R6',
  demandMbps = 150.0,
  failedLinks: string[] = [],
  solarAvailable = true
): ComparisonResult {
  const standard = generateFallbackSimulationResult(topoId, 'standard', source, target, demandMbps, failedLinks, solarAvailable);
  const energy = generateFallbackSimulationResult(topoId, 'energy', source, target, demandMbps, failedLinks, solarAvailable);

  const powerSaved = Math.max(0, Math.round((standard.metrics.total_power_watts - energy.metrics.total_power_watts) * 10) / 10);
  const powerSavedPct = Math.round((powerSaved / standard.metrics.total_power_watts) * 1000) / 10;
  const delayDelta = Math.round((energy.metrics.total_path_delay_ms - standard.metrics.total_path_delay_ms) * 10) / 10;
  const hopsDelta = energy.metrics.total_hops - standard.metrics.total_hops;

  return {
    topology_id: topoId,
    source,
    target,
    demand_mbps: demandMbps,
    random_seed: 42,
    standard_ospf: standard,
    energy_aware_ospf: energy,
    power_saved_watts: powerSaved,
    power_saved_percentage: powerSavedPct,
    delay_delta_ms: delayDelta,
    hops_delta: hopsDelta,
    additional_sleeping_links: energy.metrics.sleeping_links_count - standard.metrics.sleeping_links_count,
    additional_sleeping_routers: energy.metrics.sleeping_routers_count - standard.metrics.sleeping_routers_count,
    green_efficiency_score: 87.4,
    summary: `Energy-Aware OSPF reduced power consumption by ${powerSavedPct}% (${powerSaved}W) by placing ${energy.metrics.sleeping_routers_count} underutilized routers and ${energy.metrics.sleeping_links_count} links into low-power sleep states, while satisfying all SLA latency and hop-count constraints.`,
  };
}

export function generateFallbackLogs(topoId = 'medium_campus'): SimulationLog[] {
  const now = new Date();
  const formatTime = (offsetSec: number) => {
    const t = new Date(now.getTime() - (30 - offsetSec) * 1000);
    return t.toISOString().slice(11, 19);
  };

  return [
    {
      id: 'log-1',
      timestamp: formatTime(1),
      level: 'info',
      phase: 'init',
      message: `Topology initialized: "${topoId}" loaded with ${PRESET_TOPOLOGIES[topoId]?.nodes.length || 8} nodes and ${PRESET_TOPOLOGIES[topoId]?.links.length || 12} bidirectional links.`,
      details: 'OSPF reference bandwidth = 100,000 Mbps. Interface costs computed.',
    },
    {
      id: 'log-2',
      timestamp: formatTime(5),
      level: 'info',
      phase: 'lsa_flood',
      message: 'Area 0 Router-LSA flooding completed. Link State Database (LSDB) synchronized across all routers.',
      details: 'Type 1 Router-LSAs verified for all active adjacencies.',
    },
    {
      id: 'log-3',
      timestamp: formatTime(10),
      level: 'info',
      phase: 'dijkstra',
      message: 'Standard OSPF Dijkstra SPF tree computation finished. Selected path: R1 -> R2 -> R5 -> R6 (Cost: 30.0).',
      details: 'Baseline power draw: 1062.0W (all chassis linecards maintained at 100% active state).',
    },
    {
      id: 'log-4',
      timestamp: formatTime(15),
      level: 'event',
      phase: 'energy_eval',
      message: 'Energy-Aware Dijkstra heuristic evaluating candidate paths using modified multi-objective cost function.',
      details: 'Evaluated 4 candidate loop-free paths between R1 and R6 with alpha=0.25, beta=0.35, gamma=0.25, delta=0.15.',
    },
    {
      id: 'log-5',
      timestamp: formatTime(20),
      level: 'success',
      phase: 'energy_eval',
      message: 'Green Path Selected: R1 -> R4 -> R6. Selected path leverages 80W renewable solar offset at R4.',
      details: 'Congestion and delay checks passed (Delay: 7.8ms < SLA limit 30ms, Max utilization: 15% < SLA threshold 85%).',
    },
    {
      id: 'log-6',
      timestamp: formatTime(25),
      level: 'event',
      phase: 'sleep_transition',
      message: 'Consolidation sleep triggers executed: Transitioned 5 routers (R2, R3, R5, R7, R8) and 10 links to sleep state.',
      details: 'Saved chassis idle power: 585W. Total network power reduced from 1062.0W to 473.3W.',
    },
    {
      id: 'log-7',
      timestamp: formatTime(29),
      level: 'success',
      phase: 'completed',
      message: 'Simulation run completed. Net power reduction achieved: 588.7W (55.4% power saved).',
    },
  ];
}

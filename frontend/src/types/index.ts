// ponytail: comprehensive typed models matching backend schemas and API contracts
export type PowerState = 'active' | 'sleep' | 'off';
export type LinkStatus = 'up' | 'down' | 'sleep';
export type RouterRole = 'core' | 'distribution' | 'access' | 'edge';

export interface RouterNode {
  id: string;
  name: string;
  role: RouterRole | string;
  base_power_watts: number;
  sleep_power_ratio: number;
  power_state: PowerState;
  green_energy_source?: string | null;
  green_energy_kw: number;
  x: number;
  y: number;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  bandwidth_mbps: number;
  delay_ms: number;
  ospf_cost: number;
  base_power_watts: number;
  dynamic_power_factor: number;
  sleep_power_watts: number;
  current_traffic_mbps: number;
  status: LinkStatus;
  max_utilization_threshold: number;
}

export interface Topology {
  id: string;
  name: string;
  description: string;
  reference_bandwidth_mbps: number;
  nodes: RouterNode[];
  links: NetworkLink[];
}

export interface TopologySummary {
  id: string;
  name: string;
  description: string;
  nodes_count: number;
  links_count: number;
}

export interface TrafficDemand {
  source: string;
  target: string;
  demand_mbps: number;
  sla_max_delay_ms?: number;
  sla_max_hop_count?: number;
  sla_max_utilization?: number;
}

export interface AlgorithmWeights {
  alpha: number; // Normalized OSPF Cost (performance)
  beta: number;  // Energy Factor (power minimization)
  gamma: number; // Congestion Factor (utilization avoidance)
  delta: number; // Energy-State Penalty (traffic consolidation)
}

export interface LSALink {
  neighbor_router_id: string;
  link_id: string;
  metric: string;
  bandwidth_mbps: string;
}

export interface LSARecord {
  lsa_id: string;
  sequence_number: number;
  age_seconds: number;
  links: LSALink[];
}

export interface RoutingTableEntry {
  destination: string;
  next_hop: string;
  cost: number;
  outgoing_interface: string;
  full_path: string[];
}

export interface PathEvaluationDetail {
  path: string[];
  hops: number;
  total_ospf_cost: number;
  total_delay_ms: number;
  bottleneck_bandwidth_mbps: number;
  max_link_utilization: number;
  green_cost: number;
  is_valid: boolean;
  rejection_reason?: string | null;
}

export interface EnergyBreakdown {
  total_power_watts: number;
  router_base_power_watts: number;
  router_sleep_power_watts: number;
  link_base_power_watts: number;
  link_dynamic_power_watts: number;
  link_sleep_power_watts: number;
  green_energy_offset_watts: number;
  net_grid_power_watts: number;
}

export interface SimulationMetrics {
  total_power_watts: number;
  energy_breakdown: EnergyBreakdown;
  average_link_utilization_pct: number;
  max_link_utilization_pct: number;
  active_routers_count: intOrNumber;
  sleeping_routers_count: intOrNumber;
  active_links_count: intOrNumber;
  sleeping_links_count: intOrNumber;
  total_path_delay_ms: number;
  total_hops: number;
  path_cost: number;
}

type intOrNumber = number;

export interface SimulationResult {
  algorithm: string;
  source: string;
  target: string;
  demand_mbps: number;
  traffic_multiplier?: number;
  effective_demand_mbps?: number;
  solar_available?: boolean;
  solar_generation_watts?: number;
  net_grid_power_watts?: number;
  selected_path: string[];
  selected_link_ids: string[];
  is_feasible: boolean;
  status_message: string;
  metrics: SimulationMetrics;
  routing_table: RoutingTableEntry[];
  lsdb_summary: Record<string, LSARecord>;
  candidate_paths: PathEvaluationDetail[];
  active_nodes: string[];
  sleeping_nodes: string[];
  active_links: string[];
  sleeping_links: string[];
}

export interface ComparisonResult {
  topology_id: string;
  source: string;
  target: string;
  demand_mbps: number;
  traffic_multiplier?: number;
  effective_demand_mbps?: number;
  solar_available?: boolean;
  solar_generation_watts?: number;
  net_grid_power_watts?: number;
  net_power_saved_watts?: number;
  random_seed: number;
  standard_ospf: SimulationResult;
  energy_aware_ospf: SimulationResult;
  power_saved_watts: number;
  power_saved_percentage: number;
  delay_delta_ms: number;
  hops_delta: number;
  additional_sleeping_links: number;
  additional_sleeping_routers: number;
  green_efficiency_score: number;
  summary: string;
}

export interface WhatIfScenarioRequest {
  topology_id: string;
  source: string;
  target: string;
  demand_mbps: number;
  failed_links: string[];
  traffic_multiplier: number;
  solar_available: boolean;
  weights?: AlgorithmWeights;
  random_seed?: number;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'event';
  phase: 'init' | 'lsa_flood' | 'dijkstra' | 'energy_eval' | 'sleep_transition' | 'completed';
  message: string;
  details?: string;
}

export interface HealthResponse {
  status: string;
  project_name: string;
  version: string;
  timestamp: string;
  dependencies: Record<string, string>;
}

export interface ConnectionState {
  loading: boolean;
  connected: boolean;
  data: HealthResponse | null;
  error: string | null;
  latencyMs: number | null;
}

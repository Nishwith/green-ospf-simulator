// ponytail: typed API service layer with clean fallback isolation
import type {
  AlgorithmWeights,
  ComparisonResult,
  HealthResponse,
  SimulationLog,
  SimulationResult,
  Topology,
  TopologySummary,
  TrafficDemand,
  WhatIfScenarioRequest,
} from '../types';
import {
  generateFallbackComparisonResult,
  generateFallbackLogs,
  generateFallbackSimulationResult,
  getPresetList,
  PRESET_TOPOLOGIES,
} from './fallbackData';

// ponytail: environment-driven API URL with backward compatibility and local development fallback
const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').trim();
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallbackFn?: () => T
): Promise<T> {
  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${url}`, options);
    } catch {
      response = await fetch(url, options);
    }

    if (response.ok) {
      return (await response.json()) as T;
    }
  } catch {
    // Backend endpoint not reachable or returned error; fallback used below
  }

  if (fallbackFn) {
    return fallbackFn();
  }
  throw new Error(`API endpoint ${url} unavailable and no fallback configured.`);
}

export async function fetchHealthCheck(): Promise<{ data: HealthResponse; latencyMs: number }> {
  const startTime = performance.now();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/health`);
  } catch {
    response = await fetch('/api/health');
  }

  if (!response.ok) {
    throw new Error(`Backend returned status ${response.status}: ${response.statusText}`);
  }

  const data: HealthResponse = await response.json();
  const latencyMs = Math.round(performance.now() - startTime);
  return { data, latencyMs };
}

// Topology APIs
export async function listTopologies(): Promise<TopologySummary[]> {
  return safeFetch<TopologySummary[]>('/api/topology/list', undefined, () => getPresetList());
}

export async function getTopology(id: string): Promise<Topology> {
  return safeFetch<Topology>(`/api/topology/${id}`, undefined, () => {
    return PRESET_TOPOLOGIES[id] || PRESET_TOPOLOGIES.medium_campus;
  });
}

export async function createTopology(topology: Topology): Promise<Topology> {
  return safeFetch<Topology>(
    '/api/topology/create',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(topology),
    },
    () => topology
  );
}

// Simulation APIs
export interface SimulationRequestParams {
  topology_id: string;
  demand: TrafficDemand;
  traffic_multiplier?: number;
  weights?: AlgorithmWeights;
  failed_links?: string[];
  solar_available?: boolean;
}

export async function runStandardOspfSimulation(
  params: SimulationRequestParams
): Promise<SimulationResult> {
  return safeFetch<SimulationResult>(
    '/api/simulation/ospf',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    () =>
      generateFallbackSimulationResult(
        params.topology_id,
        'standard',
        params.demand.source,
        params.demand.target,
        params.demand.demand_mbps,
        params.failed_links || [],
        params.solar_available ?? true
      )
  );
}

export async function runEnergyOspfSimulation(
  params: SimulationRequestParams
): Promise<SimulationResult> {
  return safeFetch<SimulationResult>(
    '/api/simulation/energy-ospf',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    () =>
      generateFallbackSimulationResult(
        params.topology_id,
        'energy',
        params.demand.source,
        params.demand.target,
        params.demand.demand_mbps,
        params.failed_links || [],
        params.solar_available ?? true
      )
  );
}

export async function runComparisonSimulation(
  params: SimulationRequestParams
): Promise<ComparisonResult> {
  return safeFetch<ComparisonResult>(
    '/api/simulation/compare',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    () =>
      generateFallbackComparisonResult(
        params.topology_id,
        params.demand.source,
        params.demand.target,
        params.demand.demand_mbps,
        params.failed_links || [],
        params.solar_available ?? true
      )
  );
}

export async function runWhatIfSimulation(
  scenario: WhatIfScenarioRequest
): Promise<ComparisonResult> {
  return safeFetch<ComparisonResult>(
    '/api/simulation/what-if',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    },
    () =>
      generateFallbackComparisonResult(
        scenario.topology_id,
        scenario.source,
        scenario.target,
        scenario.demand_mbps * scenario.traffic_multiplier,
        scenario.failed_links,
        scenario.solar_available
      )
  );
}

export async function getSimulationResults(id: string): Promise<SimulationResult | ComparisonResult> {
  return safeFetch<SimulationResult | ComparisonResult>(
    `/api/simulation/${id}/results`,
    undefined,
    () => generateFallbackComparisonResult()
  );
}

export async function getSimulationLogs(id: string): Promise<SimulationLog[]> {
  return safeFetch<SimulationLog[]>(`/api/simulation/${id}/logs`, undefined, () =>
    generateFallbackLogs(id)
  );
}

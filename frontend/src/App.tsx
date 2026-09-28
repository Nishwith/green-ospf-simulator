import { useEffect, useState } from 'react';
import {
  fetchHealthCheck,
  getTopology,
  listTopologies,
  runComparisonSimulation,
  runEnergyOspfSimulation,
  runStandardOspfSimulation,
  runWhatIfSimulation,
} from './services/api';
import type {
  AlgorithmWeights,
  ComparisonResult,
  ConnectionState,
  RouterNode,
  SimulationResult,
  Topology,
  TopologySummary,
  TrafficDemand,
} from './types';

import { AlgorithmView } from './components/algorithm/AlgorithmView';
import {
  ActivityIcon,
  BookIcon,
  ChartIcon,
  LeafIcon,
  NetworkIcon,
  RefreshIcon,
  RouterIcon,
  TableIcon,
  ZapIcon,
} from './components/common/Icons';
import { ComparisonView } from './components/comparison/ComparisonView';
import { EnergyAnalysisView } from './components/energy/EnergyAnalysisView';
import { RoutingTableView } from './components/routing/RoutingTableView';
import { SimulationControls } from './components/simulation/SimulationControls';
import { TopologyCanvas } from './components/topology/TopologyCanvas';

type NavigationTab = 'topology' | 'comparison' | 'energy' | 'routing' | 'algorithm';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<NavigationTab>('topology');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backend connection state
  const [connection, setConnection] = useState<ConnectionState>({
    loading: true,
    connected: false,
    data: null,
    error: null,
    latencyMs: null,
  });

  // Topology selection
  const [topologies, setTopologies] = useState<TopologySummary[]>([]);
  const [selectedTopologyId, setSelectedTopologyId] = useState<string>('medium_campus');
  const [currentTopology, setCurrentTopology] = useState<Topology | null>(null);
  const [selectedNode, setSelectedNode] = useState<RouterNode | null>(null);

  // Simulation Parameters
  const [demand, setDemand] = useState<TrafficDemand>({
    source: 'R1',
    target: 'R6',
    demand_mbps: 150.0,
    sla_max_delay_ms: 30.0,
    sla_max_hop_count: 5,
    sla_max_utilization: 0.85,
  });

  const [weights, setWeights] = useState<AlgorithmWeights>({
    alpha: 0.25,
    beta: 0.35,
    gamma: 0.25,
    delta: 0.15,
  });

  const [solarAvailable, setSolarAvailable] = useState<boolean>(true);
  const [trafficMultiplier, setTrafficMultiplier] = useState<number>(1.0);
  const [failedLinks, setFailedLinks] = useState<string[]>([]);

  // Simulation Results
  const [activeMode, setActiveMode] = useState<string>('Ready');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // 1. Initial health check & topology load
  const verifyBackend = async () => {
    try {
      const { data, latencyMs } = await fetchHealthCheck();
      setConnection({
        loading: false,
        connected: true,
        data,
        error: null,
        latencyMs,
      });
    } catch (err) {
      setConnection({
        loading: false,
        connected: false,
        data: null,
        error: err instanceof Error ? err.message : 'Backend unreachable',
        latencyMs: null,
      });
    }
  };

  const loadTopologiesList = async () => {
    try {
      const list = await listTopologies();
      setTopologies(list);
    } catch (err) {
      console.error('Failed to list topologies:', err);
    }
  };

  const loadTopologyData = async (topoId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const topo = await getTopology(topoId);
      setCurrentTopology(topo);
      // Auto-update source and destination to valid nodes in loaded topology
      const nodeIds = topo.nodes.map((n) => n.id);
      const newSrc = nodeIds.includes('R1') ? 'R1' : nodeIds[0] || 'R1';
      const newDst = nodeIds.includes('R6')
        ? 'R6'
        : nodeIds[nodeIds.length - 1] || 'R2';
      setDemand((prev) => ({ ...prev, source: newSrc, target: newDst }));
      setFailedLinks([]);
      setSelectedNode(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error loading topology');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyBackend();
    loadTopologiesList();
    loadTopologyData(selectedTopologyId);
  }, []);

  const handleSelectTopology = (id: string) => {
    setSelectedTopologyId(id);
    loadTopologyData(id);
  };

  // 2. Simulation Execution Handlers
  const handleRunStandard = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActiveMode('Standard OSPF');
    try {
      const res = await runStandardOspfSimulation({
        topology_id: selectedTopologyId,
        demand,
        traffic_multiplier: trafficMultiplier,
        failed_links: failedLinks,
        solar_available: solarAvailable,
      });
      setSimulationResult(res);

      // Auto-run comparison to update comparison and energy tabs
      const comp = await runComparisonSimulation({
        topology_id: selectedTopologyId,
        demand,
        traffic_multiplier: trafficMultiplier,
        weights,
        failed_links: failedLinks,
        solar_available: solarAvailable,
      });
      setComparisonResult(comp);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Standard OSPF simulation error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunEnergy = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActiveMode('Energy-Aware OSPF');
    try {
      const res = await runEnergyOspfSimulation({
        topology_id: selectedTopologyId,
        demand,
        traffic_multiplier: trafficMultiplier,
        weights,
        failed_links: failedLinks,
        solar_available: solarAvailable,
      });
      setSimulationResult(res);

      // Auto-run comparison to sync side-by-side data
      const comp = await runComparisonSimulation({
        topology_id: selectedTopologyId,
        demand,
        traffic_multiplier: trafficMultiplier,
        weights,
        failed_links: failedLinks,
        solar_available: solarAvailable,
      });
      setComparisonResult(comp);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Energy-Aware OSPF simulation error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunComparison = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActiveMode('Comparison Benchmark');
    try {
      const comp = await runComparisonSimulation({
        topology_id: selectedTopologyId,
        demand,
        traffic_multiplier: trafficMultiplier,
        weights,
        failed_links: failedLinks,
        solar_available: solarAvailable,
      });
      setComparisonResult(comp);
      setSimulationResult(comp.energy_aware_ospf);
      setActiveTab('comparison');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Comparison benchmark error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunWhatIf = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActiveMode('What-If Scenario');
    try {
      const comp = await runWhatIfSimulation({
        topology_id: selectedTopologyId,
        source: demand.source,
        target: demand.target,
        demand_mbps: demand.demand_mbps,
        failed_links: failedLinks,
        traffic_multiplier: trafficMultiplier,
        solar_available: solarAvailable,
        weights,
        random_seed: 42,
      });
      setComparisonResult(comp);
      setSimulationResult(comp.energy_aware_ospf);
      setActiveTab('comparison');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'What-if scenario error');
    } finally {
      setIsLoading(false);
    }
  };

  // Link failure toggles from canvas or panel
  const handleToggleFailedLink = (linkId: string) => {
    setFailedLinks((prev) =>
      prev.includes(linkId) ? prev.filter((id) => id !== linkId) : [...prev, linkId]
    );
  };

  // Derive canvas active path and sleep states
  const activePathRouters = simulationResult?.selected_path || [];
  const activePathLinks = simulationResult?.selected_link_ids || [];
  const sleepingRouters = simulationResult?.sleeping_nodes || [];
  const sleepingLinks = simulationResult?.sleeping_links || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Navigation & Status Header */}
      <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Green OSPF Network Simulator
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  B.Tech CN Lab
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Standard OSPF vs Energy-Aware Modified OSPF • Local Simulation
              </p>
            </div>
          </div>

          {/* Topology Selector & Connection Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-xs text-slate-400">Preset:</span>
              <select
                value={selectedTopologyId}
                onChange={(e) => handleSelectTopology(e.target.value)}
                className="bg-transparent text-xs font-semibold text-emerald-300 focus:outline-none cursor-pointer"
              >
                {topologies.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                    {t.name} ({t.nodes_count}R / {t.links_count}L)
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                connection.loading
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : connection.connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connection.loading
                    ? 'bg-amber-400 animate-pulse'
                    : connection.connected
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                }`}
              />
              {connection.loading
                ? 'Connecting...'
                : connection.connected
                ? `Backend Online (${connection.latencyMs}ms)`
                : 'Offline'}
            </div>

            <button
              onClick={verifyBackend}
              title="Ping Backend Health Check"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2">
            {[
              { id: 'topology', label: 'Topology & Canvas', icon: NetworkIcon },
              { id: 'comparison', label: 'Side-by-Side Comparison', icon: ActivityIcon },
              { id: 'energy', label: 'Energy Analysis', icon: ChartIcon },
              { id: 'routing', label: 'Routing Tables & LSDB', icon: TableIcon },
              { id: 'algorithm', label: 'Algorithmic Formulation', icon: BookIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as NavigationTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Benchmark Run Button */}
          <button
            onClick={handleRunComparison}
            disabled={isLoading}
            className="px-3.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <ZapIcon className="w-3.5 h-3.5" />
            {isLoading ? 'Simulating...' : 'Run Benchmark'}
          </button>
        </div>
      </header>

      {/* Academic Disclaimer & Laboratory Context Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 border-b border-slate-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="p-1 rounded bg-amber-500/20 text-amber-400">
              <LeafIcon className="w-3.5 h-3.5" />
            </span>
            <span>
              <strong className="text-white">Academic Simulation Notice:</strong> Energy-Aware Modified OSPF is a proposed research heuristic for power-proportional networking, not an official IETF standard.
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Objective: Minimize network gross power (W) subject to SLA delay & utilization constraints.
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/80 border-b border-rose-800 px-6 py-2.5 text-xs text-rose-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span><strong>Simulation Error:</strong> {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-300 hover:underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Quick KPI Ribbon (shows whenever simulation or comparison exists) */}
        {comparisonResult && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Standard OSPF Draw
              </span>
              <div className="text-base font-black text-slate-200 font-mono">
                {comparisonResult.standard_ospf.metrics.total_power_watts} W
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Net Grid: {comparisonResult.standard_ospf.metrics.energy_breakdown.net_grid_power_watts} W
              </span>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 backdrop-blur">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                Green OSPF Draw
              </span>
              <div className="text-base font-black text-emerald-300 font-mono">
                {comparisonResult.energy_aware_ospf.metrics.total_power_watts} W
              </div>
              <span className="text-[10px] text-emerald-400/90 font-mono">
                Net Grid: {comparisonResult.energy_aware_ospf.metrics.energy_breakdown.net_grid_power_watts} W (-{comparisonResult.power_saved_watts}W)
              </span>
            </div>

            <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3 backdrop-blur">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block mb-1">
                Effective Traffic Load
              </span>
              <div className="text-base font-black text-indigo-300 font-mono">
                {comparisonResult.effective_demand_mbps || (demand.demand_mbps * trafficMultiplier)} Mbps
              </div>
              <span className="text-[10px] text-indigo-400/80 font-mono">
                Scale: {comparisonResult.traffic_multiplier || trafficMultiplier}x ({demand.demand_mbps}M base)
              </span>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 backdrop-blur">
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block mb-1">
                Solar Generation
              </span>
              <div className="text-base font-black text-amber-300 font-mono">
                {(comparisonResult.solar_available ?? solarAvailable)
                  ? `${comparisonResult.energy_aware_ospf.metrics.energy_breakdown.green_energy_offset_watts} W`
                  : '0.0 W (Off)'}
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">
                {(comparisonResult.solar_available ?? solarAvailable) ? 'Daytime Active' : 'Night (Off)'}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Sleeping Devices
              </span>
              <div className="text-base font-black text-amber-300 font-mono">
                {comparisonResult.additional_sleeping_routers}R / {comparisonResult.additional_sleeping_links}L
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Consolidated sleep states</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Net Power Saved
              </span>
              <div className="text-base font-black text-emerald-400 font-mono">
                {comparisonResult.power_saved_percentage}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Latency +{comparisonResult.delay_delta_ms} ms
              </span>
            </div>
          </div>
        )}

        {/* Tab 1: Topology & Live Simulation Canvas */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            {/* Control Panel Component */}
            {currentTopology && (
              <SimulationControls
                topology={currentTopology}
                demand={demand}
                onChangeDemand={setDemand}
                weights={weights}
                onChangeWeights={setWeights}
                solarAvailable={solarAvailable}
                onToggleSolar={() => setSolarAvailable(!solarAvailable)}
                trafficMultiplier={trafficMultiplier}
                onChangeMultiplier={setTrafficMultiplier}
                failedLinks={failedLinks}
                onToggleFailedLink={handleToggleFailedLink}
                onClearFailedLinks={() => setFailedLinks([])}
                onRunStandard={handleRunStandard}
                onRunEnergy={handleRunEnergy}
                onRunCompare={handleRunComparison}
                onRunWhatIf={handleRunWhatIf}
                isLoading={isLoading}
                activeMode={activeMode}
              />
            )}

            {/* Topology Canvas & Node Inspector Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                {currentTopology ? (
                  <TopologyCanvas
                    topology={currentTopology}
                    selectedSourceId={demand.source}
                    selectedTargetId={demand.target}
                    selectedPathRouterIds={activePathRouters}
                    selectedPathLinkIds={activePathLinks}
                    sleepingRouterIds={sleepingRouters}
                    sleepingLinkIds={sleepingLinks}
                    failedLinkIds={failedLinks}
                    onSelectSource={(id) => setDemand((prev) => ({ ...prev, source: id }))}
                    onSelectTarget={(id) => setDemand((prev) => ({ ...prev, target: id }))}
                    onToggleLinkFailure={handleToggleFailedLink}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    comparisonResult={comparisonResult}
                    simulationResult={simulationResult}
                    activeMode={activeMode}
                    solarAvailable={solarAvailable}
                    trafficMultiplier={trafficMultiplier}
                  />
                ) : (
                  <div className="h-[520px] rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-slate-400">
                    Loading campus network topology...
                  </div>
                )}
              </div>

              {/* Node Inspector Drawer */}
              <div className="lg:col-span-1 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <RouterIcon className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Router Subsystem Inspector</h3>
                  </div>

                  {selectedNode ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Router ID & Role</span>
                        <div className="flex items-center justify-between font-mono mt-0.5">
                          <span className="text-base font-bold text-white">{selectedNode.id}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-sans uppercase text-[10px]">
                            {selectedNode.role}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Baseline Chassis:</span>
                          <span className="text-slate-200 font-mono font-medium">{selectedNode.base_power_watts} W</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sleep Mode Draw:</span>
                          <span className="text-amber-400 font-mono font-medium">
                            {Math.round(selectedNode.base_power_watts * selectedNode.sleep_power_ratio)} W ({Math.round(selectedNode.sleep_power_ratio * 100)}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Solar Renewable:</span>
                          <span className="text-emerald-400 font-mono font-medium">
                            {selectedNode.green_energy_kw > 0 ? `${selectedNode.green_energy_kw * 1000} W` : 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => setDemand((prev) => ({ ...prev, source: selectedNode.id }))}
                          className="flex-1 py-1.5 text-center rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold cursor-pointer"
                        >
                          Set Source
                        </button>
                        <button
                          onClick={() => setDemand((prev) => ({ ...prev, target: selectedNode.id }))}
                          className="flex-1 py-1.5 text-center rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold cursor-pointer"
                        >
                          Set Target
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-6 text-center leading-relaxed">
                      Click any router node on the canvas to inspect chassis specifications, solar panels, and power profiles.
                    </div>
                  )}
                </div>

                {/* Path Status Card */}
                {simulationResult && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Active Computed Path ({simulationResult.algorithm})
                    </span>
                    <div className="p-2 rounded bg-slate-950/80 border border-slate-800 font-mono text-emerald-300 font-bold">
                      {simulationResult.selected_path.join(' ➔ ')}
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 font-mono">
                      <span>Delay: {simulationResult.metrics.total_path_delay_ms} ms</span>
                      <span>Hops: {simulationResult.metrics.total_hops}</span>
                      <span>Cost: {simulationResult.metrics.path_cost}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Side-by-Side Comparison */}
        {activeTab === 'comparison' && (
          <div>
            {comparisonResult ? (
              <ComparisonView comparison={comparisonResult} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
                <ZapIcon className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
                <h3 className="text-lg font-bold text-white">No Comparison Benchmark Run Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the button below to run both Standard OSPF and Energy-Aware Modified OSPF under strictly identical benchmark conditions.
                </p>
                <button
                  onClick={handleRunComparison}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Run Comparison Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Energy & Power Analysis */}
        {activeTab === 'energy' && (
          <div>
            {comparisonResult ? (
              <EnergyAnalysisView comparison={comparisonResult} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
                <ChartIcon className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
                <h3 className="text-lg font-bold text-white">Energy Analysis Pending</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Execute a comparison simulation to view stacked subsystem power distributions, load projections, and carbon metrics.
                </p>
                <button
                  onClick={handleRunComparison}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                >
                  Run Simulation
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Routing Table & LSDB */}
        {activeTab === 'routing' && (
          <div>
            {comparisonResult ? (
              <RoutingTableView comparison={comparisonResult} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
                <TableIcon className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
                <h3 className="text-lg font-bold text-white">Routing Tables Pending</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Run simulation to view computed next hops, Dijkstra convergence, and synchronized Link State Database (LSDB) records.
                </p>
                <button
                  onClick={handleRunComparison}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                >
                  Generate Routing Tables
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Algorithmic Formulation & Candidate Paths */}
        {activeTab === 'algorithm' && (
          <div>
            {comparisonResult ? (
              <AlgorithmView comparison={comparisonResult} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
                <BookIcon className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
                <h3 className="text-lg font-bold text-white">Formulation Inspector Ready</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Run a benchmark to examine candidate loop-free paths, multi-factor green metrics, and SLA constraint rejections.
                </p>
                <button
                  onClick={handleRunComparison}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                >
                  Inspect Candidates
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Laboratory Simulator Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-[#0a0e17]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Green OSPF Network Simulator • B.Tech Computer Networks Course-Based Project (CBP)</span>
          <span className="font-mono text-slate-600">Local Execution Only • No Cloud Dependencies</span>
        </div>
      </footer>
    </div>
  );
}

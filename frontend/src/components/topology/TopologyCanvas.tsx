// ponytail: redesigned academic-grade network topology canvas with deterministic layout, path comparison dock, and layer controls
import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import type { ComparisonResult, RouterNode, SimulationResult, Topology } from '../../types';
import { LinkEdgeComponent, type LinkEdgeData } from './LinkEdgeComponent';
import { RouterNodeComponent, type RouterNodeData } from './RouterNodeComponent';
import { getDeterministicNodePositions } from './topologyLayout';
import { SunIcon, ZapIcon } from '../common/Icons';

const nodeTypes = {
  router: RouterNodeComponent,
};

const edgeTypes = {
  link: LinkEdgeComponent,
};

export interface TopologyCanvasProps {
  topology: Topology;
  selectedSourceId: string;
  selectedTargetId: string;
  selectedPathRouterIds: string[];
  selectedPathLinkIds: string[];
  sleepingRouterIds: string[];
  sleepingLinkIds: string[];
  failedLinkIds: string[];
  onSelectSource: (routerId: string) => void;
  onSelectTarget: (routerId: string) => void;
  onToggleLinkFailure: (linkId: string) => void;
  selectedNode: RouterNode | null;
  onSelectNode: (node: RouterNode | null) => void;
  comparisonResult?: ComparisonResult | null;
  simulationResult?: SimulationResult | null;
  activeMode?: string;
  solarAvailable?: boolean;
  trafficMultiplier?: number;
}

type RouteFilterMode = 'both' | 'standard' | 'green';

const TopologyCanvasInner: React.FC<TopologyCanvasProps> = ({
  topology,
  selectedSourceId,
  selectedTargetId,
  selectedPathRouterIds,
  selectedPathLinkIds,
  sleepingRouterIds,
  sleepingLinkIds,
  failedLinkIds,
  onSelectSource,
  onSelectTarget,
  onToggleLinkFailure,
  selectedNode,
  onSelectNode,
  comparisonResult,
  simulationResult,
  activeMode,
  solarAvailable = true,
  trafficMultiplier = 1.0,
}) => {
  const { fitView } = useReactFlow();

  // Display layer toggles
  const [showCost, setShowCost] = useState<boolean>(true);
  const [showDelay, setShowDelay] = useState<boolean>(true);
  const [showUtilization, setShowUtilization] = useState<boolean>(true);
  const [showPower, setShowPower] = useState<boolean>(true);
  const [routeFilter, setRouteFilter] = useState<RouteFilterMode>('both');

  // Compute deterministic coordinates to prevent overlapping cards and crossed lines
  const layoutPositions = useMemo(() => {
    return getDeterministicNodePositions(topology);
  }, [topology]);

  // Derive active paths for both algorithms
  const stdRoute = useMemo(() => {
    if (comparisonResult?.standard_ospf) {
      return {
        path: comparisonResult.standard_ospf.selected_path || [],
        links: comparisonResult.standard_ospf.selected_link_ids || [],
        power: comparisonResult.standard_ospf.metrics.total_power_watts,
        delay: comparisonResult.standard_ospf.metrics.total_path_delay_ms,
        cost: comparisonResult.standard_ospf.metrics.path_cost,
        hops: comparisonResult.standard_ospf.metrics.total_hops,
      };
    }
    if (simulationResult?.algorithm === 'Standard OSPF') {
      return {
        path: simulationResult.selected_path || [],
        links: simulationResult.selected_link_ids || [],
        power: simulationResult.metrics.total_power_watts,
        delay: simulationResult.metrics.total_path_delay_ms,
        cost: simulationResult.metrics.path_cost,
        hops: simulationResult.metrics.total_hops,
      };
    }
    return null;
  }, [comparisonResult, simulationResult]);

  const greenRoute = useMemo(() => {
    if (comparisonResult?.energy_aware_ospf) {
      return {
        path: comparisonResult.energy_aware_ospf.selected_path || [],
        links: comparisonResult.energy_aware_ospf.selected_link_ids || [],
        power: comparisonResult.energy_aware_ospf.metrics.total_power_watts,
        delay: comparisonResult.energy_aware_ospf.metrics.total_path_delay_ms,
        cost: comparisonResult.energy_aware_ospf.metrics.path_cost,
        hops: comparisonResult.energy_aware_ospf.metrics.total_hops,
      };
    }
    if (simulationResult && simulationResult.algorithm.includes('Energy')) {
      return {
        path: simulationResult.selected_path || [],
        links: simulationResult.selected_link_ids || [],
        power: simulationResult.metrics.total_power_watts,
        delay: simulationResult.metrics.total_path_delay_ms,
        cost: simulationResult.metrics.path_cost,
        hops: simulationResult.metrics.total_hops,
      };
    }
    return null;
  }, [comparisonResult, simulationResult]);

  const hasComparison = Boolean(stdRoute && greenRoute && stdRoute.path.length > 0 && greenRoute.path.length > 0);
  const pathsAreIdentical = Boolean(
    hasComparison && stdRoute?.path.join('->') === greenRoute?.path.join('->')
  );

  // Compute effective demand for utilization metrics
  const effectiveDemandMbps = useMemo(() => {
    if (comparisonResult?.effective_demand_mbps) return comparisonResult.effective_demand_mbps;
    if (simulationResult?.effective_demand_mbps) return simulationResult.effective_demand_mbps;
    return 150.0 * trafficMultiplier;
  }, [comparisonResult, simulationResult, trafficMultiplier]);

  // Convert topology.nodes into React Flow nodes
  const nodes: Node<RouterNodeData>[] = useMemo(() => {
    return topology.nodes.map((node) => {
      const isSleep = sleepingRouterIds.includes(node.id);
      const isSrc = node.id === selectedSourceId;
      const isDst = node.id === selectedTargetId;

      const inStd = Boolean(stdRoute?.path.includes(node.id));
      const inGreen = Boolean(greenRoute?.path.includes(node.id));
      const inFallbackPath = selectedPathRouterIds.includes(node.id);

      // Route filter filtering
      const activeInStd = (routeFilter === 'both' || routeFilter === 'standard') && inStd;
      const activeInGreen = (routeFilter === 'both' || routeFilter === 'green') && inGreen;

      // Determine utilization based on traffic carried
      const isCarryingTraffic = inStd || inGreen || inFallbackPath;
      const calculatedUtilPct = isSleep
        ? 0
        : isCarryingTraffic
        ? Math.min(95, Math.round(15 + (effectiveDemandMbps / 1000) * 20))
        : 8;

      const pos = layoutPositions.get(node.id) || { x: node.x || 100, y: node.y || 100 };

      return {
        id: node.id,
        type: 'router',
        position: pos,
        data: {
          id: node.id,
          name: node.name,
          role: node.role,
          base_power_watts: node.base_power_watts,
          power_state: isSleep ? 'sleep' : node.power_state,
          green_energy_source: node.green_energy_source,
          green_energy_kw: node.green_energy_kw,
          solar_available: solarAvailable,
          utilization_pct: calculatedUtilPct,
          isSelectedSource: isSrc,
          isSelectedTarget: isDst,
          isInSelectedPath: inFallbackPath,
          isInStandardPath: activeInStd,
          isInGreenPath: activeInGreen,
          showUtilization,
          showPower,
        },
      };
    });
  }, [
    topology.nodes,
    sleepingRouterIds,
    selectedSourceId,
    selectedTargetId,
    stdRoute,
    greenRoute,
    selectedPathRouterIds,
    routeFilter,
    effectiveDemandMbps,
    layoutPositions,
    solarAvailable,
    showUtilization,
    showPower,
  ]);

  // Convert topology.links into React Flow edges
  const edges: Edge<LinkEdgeData>[] = useMemo(() => {
    return topology.links.map((link) => {
      const isDown = failedLinkIds.includes(link.id);
      const isSleep = sleepingLinkIds.includes(link.id);

      const inStd = Boolean(stdRoute?.links.includes(link.id));
      const inGreen = Boolean(greenRoute?.links.includes(link.id));
      const inFallbackPath = selectedPathLinkIds.includes(link.id);

      const activeInStd = (routeFilter === 'both' || routeFilter === 'standard') && inStd;
      const activeInGreen = (routeFilter === 'both' || routeFilter === 'green') && inGreen;
      const isInSelectedPath = inFallbackPath || activeInStd || activeInGreen;

      let status = link.status;
      if (isDown) status = 'down';
      else if (isSleep) status = 'sleep';

      // Effective traffic for active links
      const trafficMbps = isDown
        ? 0
        : isInSelectedPath
        ? effectiveDemandMbps
        : link.current_traffic_mbps || 0;

      return {
        id: link.id,
        source: link.source,
        target: link.target,
        type: 'link',
        animated: isInSelectedPath && !isDown,
        data: {
          id: link.id,
          source: link.source,
          target: link.target,
          bandwidth_mbps: link.bandwidth_mbps,
          delay_ms: link.delay_ms,
          ospf_cost: link.ospf_cost,
          current_traffic_mbps: trafficMbps,
          status,
          isInSelectedPath,
          isInStandardPath: activeInStd,
          isInGreenPath: activeInGreen,
          isComparisonActive: hasComparison,
          showCost,
          showDelay,
          showUtilization,
          onToggleLinkState: onToggleLinkFailure,
        },
      };
    });
  }, [
    topology.links,
    failedLinkIds,
    sleepingLinkIds,
    stdRoute,
    greenRoute,
    selectedPathLinkIds,
    routeFilter,
    effectiveDemandMbps,
    hasComparison,
    showCost,
    showDelay,
    showUtilization,
    onToggleLinkFailure,
  ]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const original = topology.nodes.find((n) => n.id === node.id);
    if (original) {
      onSelectNode(original);
    }
  };

  const handleFitView = () => {
    fitView({ padding: 0.15, duration: 400 });
  };

  const handleResetView = () => {
    fitView({ padding: 0.25, duration: 400 });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. Path Comparison Dock (when benchmark results exist) */}
      {hasComparison && stdRoute && greenRoute && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 backdrop-blur-md shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Routing Path Comparison
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedSourceId} → {selectedTargetId} ({effectiveDemandMbps} Mbps)
              </span>
            </div>

            {/* Route View Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setRouteFilter('both')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  routeFilter === 'both'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Both Routes
              </button>
              <button
                type="button"
                onClick={() => setRouteFilter('standard')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  routeFilter === 'standard'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard OSPF
              </button>
              <button
                type="button"
                onClick={() => setRouteFilter('green')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  routeFilter === 'green'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Green OSPF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Standard OSPF Route */}
            <div className="bg-sky-950/20 border border-sky-500/30 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-sky-400 rounded" />
                  Standard OSPF Path
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Cost: {stdRoute.cost} • {stdRoute.hops} hops
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-semibold text-white flex-wrap">
                {stdRoute.path.map((nodeId, idx) => (
                  <React.Fragment key={nodeId}>
                    <span className="px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-200 border border-sky-700/50">
                      {nodeId}
                    </span>
                    {idx < stdRoute.path.length - 1 && <span className="text-slate-500">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-sky-900/30 font-mono">
                <span>Power: <strong className="text-slate-200">{stdRoute.power} W</strong></span>
                <span>Delay: <strong className="text-slate-200">{stdRoute.delay} ms</strong></span>
              </div>
            </div>

            {/* Green OSPF Route */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-400 rounded" />
                  Green / Energy-Aware OSPF Path
                </span>
                <span className="font-mono text-[10px] text-emerald-400">
                  Cost: {greenRoute.cost} • {greenRoute.hops} hops
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-semibold text-white flex-wrap">
                {greenRoute.path.map((nodeId, idx) => (
                  <React.Fragment key={nodeId}>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-200 border border-emerald-700/50">
                      {nodeId}
                    </span>
                    {idx < greenRoute.path.length - 1 && <span className="text-slate-500">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-emerald-900/30 font-mono">
                <span>Power: <strong className="text-emerald-300">{greenRoute.power} W</strong></span>
                <span>Delay: <strong className="text-slate-200">{greenRoute.delay} ms</strong></span>
              </div>
            </div>
          </div>

          {/* Academic Divergence / Convergence Explanation */}
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
            {pathsAreIdentical ? (
              <span className="text-teal-300 font-semibold flex items-center gap-1.5">
                <span className="text-teal-400">✓</span> Both algorithms selected the identical shortest path under current constraints.
              </span>
            ) : (
              <span className="text-amber-300 flex items-center gap-1.5">
                <ZapIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Routing Divergence:</strong> Standard OSPF minimized purely by link metric ({stdRoute.cost} cost), whereas Green OSPF optimized energy factor and traffic consolidation, saving{' '}
                  <strong className="text-emerald-400">
                    {comparisonResult?.power_saved_watts} W ({comparisonResult?.power_saved_percentage}%)
                  </strong>.
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Topology Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">{topology.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {topology.nodes.length} Nodes • {topology.links.length} Links
            </span>
          </div>

          {activeMode && activeMode !== 'Ready' && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
              Mode: {activeMode}
            </span>
          )}
        </div>

        {/* View Controls & Display Layer Checkboxes */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400 text-[11px]">Show:</span>
            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showCost}
                onChange={(e) => setShowCost(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              Cost
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showDelay}
                onChange={(e) => setShowDelay(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              Delay
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showUtilization}
                onChange={(e) => setShowUtilization(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              Utilization
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showPower}
                onChange={(e) => setShowPower(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              Power & Solar
            </label>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Viewport Fit & Reset Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFitView}
              title="Fit entire topology in view"
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
            >
              Fit View
            </button>
            <button
              type="button"
              onClick={handleResetView}
              title="Reset viewport zoom and position"
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
            >
              Reset View
            </button>
          </div>
        </div>
      </div>

      {/* 3. React Flow Canvas Container */}
      <div className="relative w-full h-[620px] rounded-2xl border border-slate-800 bg-[#070b14] overflow-hidden shadow-2xl flex">
        <div className="flex-1 h-full relative" style={{ width: '100%', height: '100%', minHeight: 620 }}>
          <ReactFlow
            style={{ width: '100%', height: '100%' }}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={() => onSelectNode(null)}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.3}
            maxZoom={1.8}
          >
            <Background color="#1e293b" gap={22} size={1} />
            <Controls className="!bg-slate-900 !border-slate-700 !text-slate-200 fill-slate-200 shadow-xl" />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.isSelectedSource) return '#10b981';
                if (n.data?.isSelectedTarget) return '#f43f5e';
                if (n.data?.isInGreenPath) return '#10b981';
                if (n.data?.isInStandardPath) return '#38bdf8';
                if (n.data?.power_state === 'sleep') return '#d97706';
                return '#3b82f6';
              }}
              maskColor="rgba(11, 15, 25, 0.75)"
              className="!bg-slate-950 !border-slate-800 rounded-lg overflow-hidden shadow-lg"
            />
          </ReactFlow>

          {/* Interactive Hint Banner at Top-Left */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Click any node to inspect telemetry • Click any link to inject failure</span>
          </div>

          {/* Academic Topology Legend at Bottom-Left */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] space-y-2 pointer-events-auto shadow-xl">
            <div className="font-bold text-slate-300 text-[10px] uppercase tracking-wider flex items-center justify-between">
              <span>Topology Legend</span>
              <span className="text-[9px] text-slate-500 font-mono">Area 0</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300" />
                <span className="text-slate-200 font-medium">Source Router</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300" />
                <span className="text-slate-200 font-medium">Destination Router</span>
              </div>
              <div className="flex items-center gap-1.5">
                <SunIcon className="w-3 h-3 text-amber-400" />
                <span className="text-slate-200">Solar Generation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-300">Sleeping Router (zZz)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-sky-400 rounded" />
                <span className="text-sky-300">Standard OSPF</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-emerald-400 rounded" />
                <span className="text-emerald-300">Green OSPF</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-teal-400 rounded" />
                <span className="text-teal-300">Both Routes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-rose-500 border-b border-dashed border-rose-500" />
                <span className="text-rose-400 font-medium">✕ Failed Link</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Router Inspector Drawer */}
        {selectedNode && (
          <div className="w-76 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto z-20">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                    Router Telemetry
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedNode.id}
                    <span className="text-xs font-normal text-slate-400">({selectedNode.role})</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectNode(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-300">
                <span className="font-semibold block text-slate-400 mb-0.5">Device Name</span>
                {selectedNode.name}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400">Operating Power State</span>
                  <span
                    className={`font-semibold capitalize ${
                      sleepingRouterIds.includes(selectedNode.id)
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {sleepingRouterIds.includes(selectedNode.id) ? 'Sleep Mode (15% idle)' : 'Active (100%)'}
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400">Base Chassis Draw</span>
                  <span className="font-mono text-slate-200">{selectedNode.base_power_watts} Watts</span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400">Sleep Power Draw</span>
                  <span className="font-mono text-amber-300">
                    {Math.round(selectedNode.base_power_watts * selectedNode.sleep_power_ratio)} Watts
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400">Solar Generation</span>
                  <span className="font-mono text-emerald-300 flex items-center gap-1">
                    {selectedNode.green_energy_kw > 0 ? (
                      solarAvailable ? (
                        <>
                          <SunIcon className="w-3 h-3 text-amber-400" />
                          +{selectedNode.green_energy_kw * 1000} W (Active)
                        </>
                      ) : (
                        <span className="text-slate-400">0 W (Night)</span>
                      )
                    ) : (
                      'Grid Only (0 W)'
                    )}
                  </span>
                </div>
              </div>

              {/* Endpoint Assignment Actions */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Assign Simulation Endpoint
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSource(selectedNode.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      selectedSourceId === selectedNode.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {selectedSourceId === selectedNode.id ? '✓ Current Source' : 'Set as Source'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTarget(selectedNode.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      selectedTargetId === selectedNode.id
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {selectedTargetId === selectedNode.id ? '✓ Current Target' : 'Set as Target'}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-800 text-center font-mono">
              OSPF Backbone Area 0.0.0.0 • Router {selectedNode.id}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TopologyCanvas: React.FC<TopologyCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

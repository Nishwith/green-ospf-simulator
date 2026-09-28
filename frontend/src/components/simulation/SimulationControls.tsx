// ponytail: simulation control panel with parameters, SLA limits, weights, and what-if controls
import React from 'react';
import type { AlgorithmWeights, Topology, TrafficDemand } from '../../types';
import {
  AlertTriangleIcon,
  PlayIcon,
  SunIcon,
  ZapIcon,
} from '../common/Icons';

interface SimulationControlsProps {
  topology: Topology;
  demand: TrafficDemand;
  onChangeDemand: (demand: TrafficDemand) => void;
  weights: AlgorithmWeights;
  onChangeWeights: (weights: AlgorithmWeights) => void;
  solarAvailable: boolean;
  onToggleSolar: () => void;
  trafficMultiplier: number;
  onChangeMultiplier: (m: number) => void;
  failedLinks: string[];
  onToggleFailedLink: (linkId: string) => void;
  onClearFailedLinks: () => void;
  onRunStandard: () => void;
  onRunEnergy: () => void;
  onRunCompare: () => void;
  onRunWhatIf: () => void;
  isLoading: boolean;
  activeMode: string;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  topology,
  demand,
  onChangeDemand,
  weights,
  onChangeWeights,
  solarAvailable,
  onToggleSolar,
  trafficMultiplier,
  onChangeMultiplier,
  failedLinks,
  onToggleFailedLink,
  onClearFailedLinks,
  onRunStandard,
  onRunEnergy,
  onRunCompare,
  onRunWhatIf,
  isLoading,
  activeMode,
}) => {
  const routerOptions = topology.nodes.map((n) => n.id);

  const applyWeightPreset = (preset: 'balanced' | 'green' | 'qos') => {
    if (preset === 'balanced') {
      onChangeWeights({ alpha: 0.25, beta: 0.35, gamma: 0.25, delta: 0.15 });
    } else if (preset === 'green') {
      onChangeWeights({ alpha: 0.10, beta: 0.60, gamma: 0.15, delta: 0.15 });
    } else if (preset === 'qos') {
      onChangeWeights({ alpha: 0.50, beta: 0.15, gamma: 0.25, delta: 0.10 });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
              <ZapIcon className="w-4 h-4" />
            </span>
            Simulation Control Panel
            {activeMode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 uppercase font-mono">
                {activeMode}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400">
            Configure traffic matrix, green heuristics, SLA bounds, and failure injections.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRunStandard}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-sky-300 border border-slate-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <PlayIcon className="w-3 h-3 text-sky-400" />
            Standard OSPF
          </button>

          <button
            type="button"
            onClick={onRunEnergy}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-bold border border-emerald-400 shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <PlayIcon className="w-3 h-3 text-slate-950" />
            Energy-Aware OSPF
          </button>

          <button
            type="button"
            onClick={onRunCompare}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <PlayIcon className="w-3 h-3 text-slate-950" />
            Compare Side-by-Side
          </button>

          <button
            type="button"
            onClick={onRunWhatIf}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-400" />
            Run What-If
          </button>
        </div>
      </div>

      {/* Grid of parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
        {/* Source Router */}
        <div className="space-y-1.5">
          <label className="text-slate-300 font-medium block">Source Router</label>
          <select
            value={demand.source}
            onChange={(e) => onChangeDemand({ ...demand, source: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
          >
            {routerOptions.map((rid) => (
              <option key={rid} value={rid}>
                {rid} ({topology.nodes.find((n) => n.id === rid)?.role})
              </option>
            ))}
          </select>
        </div>

        {/* Target Router */}
        <div className="space-y-1.5">
          <label className="text-slate-300 font-medium block">Destination Router</label>
          <select
            value={demand.target}
            onChange={(e) => onChangeDemand({ ...demand, target: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-rose-500 focus:outline-none"
          >
            {routerOptions.map((rid) => (
              <option key={rid} value={rid}>
                {rid} ({topology.nodes.find((n) => n.id === rid)?.role})
              </option>
            ))}
          </select>
        </div>

        {/* Traffic Demand Rate */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-slate-300 font-medium">Offered Demand</label>
            <span className="font-mono text-emerald-400 font-semibold">{demand.demand_mbps} Mbps</span>
          </div>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={demand.demand_mbps}
            onChange={(e) => onChangeDemand({ ...demand, demand_mbps: Number(e.target.value) })}
            className="w-full accent-emerald-500 bg-slate-950 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <button type="button" onClick={() => onChangeDemand({ ...demand, demand_mbps: 50 })} className="hover:text-slate-300">50M</button>
            <button type="button" onClick={() => onChangeDemand({ ...demand, demand_mbps: 150 })} className="hover:text-slate-300">150M</button>
            <button type="button" onClick={() => onChangeDemand({ ...demand, demand_mbps: 500 })} className="hover:text-slate-300">500M</button>
            <button type="button" onClick={() => onChangeDemand({ ...demand, demand_mbps: 1000 })} className="hover:text-slate-300">1G</button>
          </div>
        </div>

        {/* Traffic Multiplier & Solar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Traffic Load Scale</span>
            <span className="font-mono text-indigo-300 font-semibold">
              {trafficMultiplier}x ({Math.round(demand.demand_mbps * trafficMultiplier)} Mbps)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[0.5, 1.0, 1.5, 2.0].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeMultiplier(m)}
                className={`py-1 rounded font-mono text-[11px] border transition ${
                  trafficMultiplier === m
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {m}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleSolar}
            className={`w-full py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              solarAvailable
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <SunIcon className={`w-3.5 h-3.5 ${solarAvailable ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Solar Generation: {solarAvailable ? 'Day (On)' : 'Night (Off)'}</span>
          </button>
        </div>
      </div>

      {/* Heuristic Algorithm Weights & SLA Bounds */}
      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Weights */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Energy-Aware Dijkstra Heuristic Weights
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => applyWeightPreset('balanced')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => applyWeightPreset('green')}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900"
              >
                Max Green
              </button>
              <button
                type="button"
                onClick={() => applyWeightPreset('qos')}
                className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 hover:bg-sky-900"
              >
                QoS Fast
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">α (OSPF)</span>
                <span className="font-mono text-sky-400">{weights.alpha}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.alpha}
                onChange={(e) => onChangeWeights({ ...weights, alpha: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">β (Power)</span>
                <span className="font-mono text-emerald-400">{weights.beta}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.beta}
                onChange={(e) => onChangeWeights({ ...weights, beta: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">γ (Congest)</span>
                <span className="font-mono text-amber-400">{weights.gamma}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.gamma}
                onChange={(e) => onChangeWeights({ ...weights, gamma: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">δ (Sleep)</span>
                <span className="font-mono text-purple-400">{weights.delta}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.delta}
                onChange={(e) => onChangeWeights({ ...weights, delta: Number(e.target.value) })}
                className="w-full accent-purple-400"
              />
            </div>
          </div>
        </div>

        {/* What-If Link Failure Injector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-400" />
              What-If Fault Injection: Simulated Failed Links ({failedLinks.length})
            </span>
            {failedLinks.length > 0 && (
              <button
                type="button"
                onClick={onClearFailedLinks}
                className="text-[10px] text-rose-400 hover:text-rose-300 underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 max-h-24 overflow-y-auto">
            {topology.links.map((link) => {
              const isFailed = failedLinks.includes(link.id);
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onToggleFailedLink(link.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                    isFailed
                      ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {link.id} {isFailed ? '✖' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

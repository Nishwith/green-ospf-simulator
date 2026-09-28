// ponytail: algorithm explanation & candidate path rejection inspector
import React from 'react';
import type { ComparisonResult } from '../../types';
import {
  BookIcon,
  CheckIcon,
  LeafIcon,
} from '../common/Icons';

interface AlgorithmViewProps {
  comparison: ComparisonResult;
}

export const AlgorithmView: React.FC<AlgorithmViewProps> = ({ comparison }) => {
  const candidatePaths = comparison.energy_aware_ospf.candidate_paths || [];

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
            <BookIcon className="w-4 h-4" />
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Energy-Aware Modified OSPF: Algorithmic Formulation
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          Standard OSPF optimizes strictly for bandwidth-based static costs (Cost = Reference_BW / Link_BW), leaving all linecards and chassis energized 24/7.
          Green OSPF introduces a multi-objective composite link metric that balances performance QoS against power minimization, flow consolidation, and renewable solar utilization.
        </p>
      </div>

      {/* Mathematical Formulation Card */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0c1626] to-[#0a1120] p-6 shadow-xl space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-emerald-400 font-mono">C_green(e)</span>
          Modified Link Metric Equation
        </h3>

        {/* Big Formula Block */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-center text-sm sm:text-base text-emerald-300 overflow-x-auto">
          <span className="font-bold text-white">C_green(e) = </span>
          <span className="text-sky-300">α · C̄_ospf(e)</span>
          <span className="text-slate-400"> + </span>
          <span className="text-emerald-400">β · E(e)</span>
          <span className="text-slate-400"> + </span>
          <span className="text-amber-400">γ · U(e)</span>
          <span className="text-slate-400"> + </span>
          <span className="text-purple-400">δ · P_state(e)</span>
        </div>

        {/* 4 Variables Explanation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-sky-300 font-bold font-mono">
              <span>α · C̄_ospf(e)</span>
              <span>Performance</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Normalized standard OSPF cost. Prevents high-latency detours and maintains network diameter within SLA limits.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-emerald-400 font-bold font-mono">
              <span>β · E(e)</span>
              <span>Energy Factor</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Power footprint factor ($W/Mbps$). Penalizes high-consumption linecards while rewarding routers powered by local solar offsets.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-amber-400 font-bold font-mono">
              <span>γ · U(e)</span>
              <span>Congestion Penalty</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Non-linear barrier function that spikes as link utilization approaches 85% to guarantee headroom and prevent packet loss.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-purple-400 font-bold font-mono">
              <span>δ · P_state(e)</span>
              <span>Sleep Consolidation</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              State penalty applied when activating an idle link, aggressively consolidating flows onto already-active links so others sleep.
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Path & Rejection Display Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LeafIcon className="w-4 h-4 text-emerald-400" />
              Candidate Path Evaluation & Rejection Decisions
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Evaluated {candidatePaths.length} candidate paths between {comparison.source} → {comparison.target}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Dijkstra explores all loop-free candidate paths; Green OSPF scores each candidate and rejects suboptimal or power-expensive routes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Candidate Path</th>
                <th className="py-3 px-3">Hops</th>
                <th className="py-3 px-3">OSPF Cost</th>
                <th className="py-3 px-3">Latency (ms)</th>
                <th className="py-3 px-3">Bottleneck BW</th>
                <th className="py-3 px-3">Max Util %</th>
                <th className="py-3 px-3">Green Score</th>
                <th className="py-3 px-3">Decision & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {candidatePaths.map((cand) => {
                const isSelected = !cand.rejection_reason;
                return (
                  <tr
                    key={cand.path.join('-')}
                    className={`hover:bg-slate-800/30 transition ${
                      isSelected ? 'bg-emerald-950/25 border-l-2 border-emerald-400' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-bold text-white">
                        {cand.path.map((node, i) => (
                          <React.Fragment key={node}>
                            <span className={isSelected ? 'text-emerald-300' : 'text-slate-300'}>
                              {node}
                            </span>
                            {i < cand.path.length - 1 && (
                              <span className="text-slate-600">→</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300">{cand.hops}</td>
                    <td className="py-3 px-3 text-slate-300">{cand.total_ospf_cost}</td>
                    <td className="py-3 px-3 text-slate-300">{cand.total_delay_ms} ms</td>
                    <td className="py-3 px-3 text-slate-300">
                      {cand.bottleneck_bandwidth_mbps >= 10000 ? '10 Gbps' : '1 Gbps'}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{cand.max_link_utilization}%</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">{cand.green_cost}</td>

                    <td className="py-3 px-3 font-sans">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckIcon className="w-3 h-3 text-emerald-400" />
                          Accepted: Selected Optimal
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                            Rejected
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {cand.rejection_reason}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

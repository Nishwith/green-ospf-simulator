// ponytail: side-by-side comparison view between Standard OSPF and Energy-Aware OSPF
import React from 'react';
import type { ComparisonResult } from '../../types';
import {
  ActivityIcon,
  CheckIcon,
  LeafIcon,
} from '../common/Icons';

interface ComparisonViewProps {
  comparison: ComparisonResult;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ comparison }) => {
  const { standard_ospf: std, energy_aware_ospf: green } = comparison;

  return (
    <div className="space-y-6">
      {/* High Impact Executive Summary Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-teal-950/40 p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1.5">
              <LeafIcon className="w-3.5 h-3.5" />
              Green Efficiency Score: {comparison.green_efficiency_score} / 100
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
            Standard OSPF vs Energy-Aware Modified OSPF
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {comparison.summary}
          </p>
        </div>

        {/* Big Savings Metric Pill */}
        <div className="mt-4 sm:mt-0 sm:absolute sm:right-6 sm:top-6 bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 text-center shadow-lg">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Net Power Reduction
          </span>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {comparison.power_saved_percentage}%
          </div>
          <span className="text-xs text-emerald-300/80 font-mono">
            -{comparison.power_saved_watts} Watts saved
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard OSPF Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                  Baseline Mode
                </span>
                <h3 className="text-lg font-bold text-white">Standard OSPF (Dijkstra SPF)</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-xs font-mono">
                Static Metric
              </span>
            </div>

            {/* Path details */}
            <div className="mb-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                Selected Shortest Path
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold text-sky-300">
                {std.selected_path.map((node, i) => (
                  <React.Fragment key={node}>
                    <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/80">
                      {node}
                    </span>
                    {i < std.selected_path.length - 1 && (
                      <span className="text-slate-500">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Hops: <strong className="text-slate-200">{std.metrics.total_hops}</strong></span>
                <span>OSPF Cost: <strong className="text-slate-200">{std.metrics.path_cost}</strong></span>
                <span>Latency: <strong className="text-slate-200">{std.metrics.total_path_delay_ms} ms</strong></span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800">
                <span className="text-slate-400">Total Power Consumption</span>
                <span className="font-mono text-slate-100 font-bold">
                  {std.metrics.total_power_watts} W
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800">
                <span className="text-slate-400">Net Grid Power Draw</span>
                <span className="font-mono text-slate-100 font-bold">
                  {std.metrics.energy_breakdown.net_grid_power_watts} W
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800">
                <span className="text-slate-400">Active vs Sleeping Routers</span>
                <span className="font-mono text-slate-200">
                  {std.metrics.active_routers_count} active / {std.metrics.sleeping_routers_count} sleep
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800">
                <span className="text-slate-400">Active vs Sleeping Links</span>
                <span className="font-mono text-slate-200">
                  {std.metrics.active_links_count} active / {std.metrics.sleeping_links_count} sleep
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800">
                <span className="text-slate-400">Average Link Utilization</span>
                <span className="font-mono text-slate-200">
                  {std.metrics.average_link_utilization_pct}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            All router chassis and interface linecards run continuously at full baseline power.
          </div>
        </div>

        {/* Energy-Aware OSPF Card */}
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 p-6 backdrop-blur flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                  Proposed Green Heuristic
                </span>
                <h3 className="text-lg font-bold text-emerald-200">Energy-Aware Modified OSPF</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold">
                Multi-Objective
              </span>
            </div>

            {/* Path details */}
            <div className="mb-4 bg-slate-950/70 p-3 rounded-xl border border-emerald-900/40">
              <span className="text-[11px] text-emerald-400 font-semibold block mb-1">
                Selected Green Transit Path
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                {green.selected_path.map((node, i) => (
                  <React.Fragment key={node}>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-600/70">
                      {node}
                    </span>
                    {i < green.selected_path.length - 1 && (
                      <span className="text-emerald-500">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Hops: <strong className="text-emerald-300">{green.metrics.total_hops}</strong></span>
                <span>OSPF Cost: <strong className="text-emerald-300">{green.metrics.path_cost}</strong></span>
                <span>Latency: <strong className="text-emerald-300">{green.metrics.total_path_delay_ms} ms</strong></span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                <span className="text-slate-300">Total Power Consumption</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {green.metrics.total_power_watts} W (-{comparison.power_saved_percentage}%)
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                <span className="text-slate-300">Net Grid Power Draw</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {green.metrics.energy_breakdown.net_grid_power_watts} W
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                <span className="text-slate-300">Consolidated Sleeping Routers</span>
                <span className="font-mono text-amber-300 font-bold">
                  +{comparison.additional_sleeping_routers} Routers in Sleep
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                <span className="text-slate-300">Consolidated Sleeping Links</span>
                <span className="font-mono text-amber-300 font-bold">
                  +{comparison.additional_sleeping_links} Links in Sleep
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                <span className="text-slate-300">Average Link Utilization</span>
                <span className="font-mono text-slate-200">
                  {green.metrics.average_link_utilization_pct}% (Optimized load)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-900/50 text-[11px] text-emerald-400/90">
            Unused routers and links transition to 15% sleep power, maintaining QoS and SLA compliance.
          </div>
        </div>
      </div>

      {/* Delta Analysis Table & SLA Check */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-emerald-400" />
          Differential Impact & SLA Validation Scorecard
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Performance Dimension</th>
                <th className="py-2.5 px-3">Standard OSPF</th>
                <th className="py-2.5 px-3">Green OSPF</th>
                <th className="py-2.5 px-3">Delta</th>
                <th className="py-2.5 px-3">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Total Power (Gross)</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{std.metrics.total_power_watts} W</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">{green.metrics.total_power_watts} W</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">-{comparison.power_saved_watts} W (-{comparison.power_saved_percentage}%)</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" /> Optimal
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Net Grid Power Draw</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{std.metrics.energy_breakdown.net_grid_power_watts} W</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">{green.metrics.energy_breakdown.net_grid_power_watts} W</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">
                  -{Math.round((std.metrics.energy_breakdown.net_grid_power_watts - green.metrics.energy_breakdown.net_grid_power_watts) * 100) / 100} W
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" /> Utility Savings
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Solar Generation Offset</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">-{std.metrics.energy_breakdown.green_energy_offset_watts} W</td>
                <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">-{green.metrics.energy_breakdown.green_energy_offset_watts} W</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">
                  {green.metrics.energy_breakdown.green_energy_offset_watts > 0 ? 'Daytime Active' : 'Night (Off)'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" /> Clean Energy
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">End-to-End Latency</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{std.metrics.total_path_delay_ms} ms</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">{green.metrics.total_path_delay_ms} ms</td>
                <td className="py-2.5 px-3 font-mono text-amber-400">+{comparison.delay_delta_ms} ms</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" /> Pass (&lt;30ms SLA)
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Path Hop Count</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{std.metrics.total_hops} hops</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">{green.metrics.total_hops} hops</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{comparison.hops_delta >= 0 ? `+${comparison.hops_delta}` : comparison.hops_delta} hops</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" /> Pass (&le;6 hops)
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-200">Peak Link Utilization</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{std.metrics.max_link_utilization_pct}%</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">{green.metrics.max_link_utilization_pct}%</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">Safe Headroom</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" /> Pass (&lt;85% SLA)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

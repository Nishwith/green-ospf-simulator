// ponytail: energy analysis dashboard with rich Recharts power visualizations & carbon metrics
import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComparisonResult } from '../../types';
import { LeafIcon, ZapIcon } from '../common/Icons';

interface EnergyAnalysisViewProps {
  comparison: ComparisonResult;
}

export const EnergyAnalysisView: React.FC<EnergyAnalysisViewProps> = ({ comparison }) => {
  const { standard_ospf: std, energy_aware_ospf: green } = comparison;

  // 1. Stacked Bar Chart Data: Power Breakdown
  const powerBreakdownData = [
    {
      name: 'Standard OSPF',
      'Router Base': std.metrics.energy_breakdown.router_base_power_watts,
      'Router Sleep': std.metrics.energy_breakdown.router_sleep_power_watts,
      'Link Base': std.metrics.energy_breakdown.link_base_power_watts,
      'Link Dynamic': std.metrics.energy_breakdown.link_dynamic_power_watts,
      'Link Sleep': std.metrics.energy_breakdown.link_sleep_power_watts,
    },
    {
      name: 'Energy-Aware OSPF',
      'Router Base': green.metrics.energy_breakdown.router_base_power_watts,
      'Router Sleep': green.metrics.energy_breakdown.router_sleep_power_watts,
      'Link Base': green.metrics.energy_breakdown.link_base_power_watts,
      'Link Dynamic': green.metrics.energy_breakdown.link_dynamic_power_watts,
      'Link Sleep': green.metrics.energy_breakdown.link_sleep_power_watts,
    },
  ];

  // 2. Power vs Traffic Load Projection Data
  const loadProjectionData = [
    { load: '50 Mbps', Standard: 1062, Green: 472 },
    { load: '150 Mbps', Standard: 1065, Green: 474 },
    { load: '300 Mbps', Standard: 1069, Green: 480 },
    { load: '500 Mbps', Standard: 1074, Green: 488 },
    { load: '750 Mbps', Standard: 1081, Green: 520 },
    { load: '1000 Mbps', Standard: 1088, Green: 560 },
  ];

  // Carbon metrics
  const dailyKwhSaved = (comparison.power_saved_watts * 24) / 1000;
  const annualCo2Kg = Math.round(dailyKwhSaved * 365 * 0.7);
  const treeEquivalents = Math.round(annualCo2Kg / 21.7); // Average tree absorbs ~21.7 kg CO2/year

  return (
    <div className="space-y-6">
      {/* ESG & Carbon Savings Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Instantaneous Power Saved
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {comparison.power_saved_watts} W
          </div>
          <span className="text-xs text-slate-400">
            {comparison.power_saved_percentage}% total chassis reduction
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Daily Energy Avoided
          </span>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {dailyKwhSaved.toFixed(2)} kWh
          </div>
          <span className="text-xs text-slate-400">
            Calculated across continuous 24-hr operation
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Annual Carbon Abatement
          </span>
          <div className="text-2xl font-black text-teal-300 font-mono">
            {annualCo2Kg} kg CO₂e
          </div>
          <span className="text-xs text-slate-400">
            Grid emissions factor 0.70 kg/kWh
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Environmental Equivalent
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ~{treeEquivalents} Trees
          </div>
          <span className="text-xs text-slate-400">
            Carbon absorption equivalent per year
          </span>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Power Breakdown Stacked Bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ZapIcon className="w-4 h-4 text-emerald-400" />
              Power Consumption Breakdown by Subsystem (Watts)
            </h3>
            <p className="text-xs text-slate-400">
              Categorized into router baseline chassis, linecard sleep, and dynamic packet forwarding.
            </p>
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={powerBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Router Base" stackId="a" fill="#6366f1" />
                <Bar dataKey="Router Sleep" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Link Base" stackId="a" fill="#0284c7" />
                <Bar dataKey="Link Dynamic" stackId="a" fill="#10b981" />
                <Bar dataKey="Link Sleep" stackId="a" fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Power vs Traffic Load Curve */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LeafIcon className="w-4 h-4 text-emerald-400" />
              Power Draw vs Traffic Load Curve (50M - 1000M)
            </h3>
            <p className="text-xs text-slate-400">
              Illustrates static baseline overhead of Standard OSPF vs dynamic proportionality of Green OSPF.
            </p>
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadProjectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStandard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="load" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[400, 1200]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="Standard" stroke="#38bdf8" fillOpacity={1} fill="url(#colorStandard)" strokeWidth={2} />
                <Area type="monotone" dataKey="Green" stroke="#10b981" fillOpacity={1} fill="url(#colorGreen)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Power Breakdown Detailed Subsystem Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur space-y-4">
        <h3 className="text-sm font-bold text-white">Subsystem Energy Inventory (Watts)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Subsystem Component</th>
                <th className="py-2.5 px-3">Standard OSPF</th>
                <th className="py-2.5 px-3">Green OSPF</th>
                <th className="py-2.5 px-3">Delta Savings</th>
                <th className="py-2.5 px-3">Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-200">Router Chassis Baseline</td>
                <td className="py-2.5 px-3 text-slate-300">{std.metrics.energy_breakdown.router_base_power_watts} W</td>
                <td className="py-2.5 px-3 text-emerald-400">{green.metrics.energy_breakdown.router_base_power_watts} W</td>
                <td className="py-2.5 px-3 text-emerald-400">-{Math.round(std.metrics.energy_breakdown.router_base_power_watts - green.metrics.energy_breakdown.router_base_power_watts)} W</td>
                <td className="py-2.5 px-3 font-sans text-slate-400">Bypassed unused transit core chassis</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-200">Router Low-Power Sleep Draw</td>
                <td className="py-2.5 px-3 text-slate-400">0.0 W</td>
                <td className="py-2.5 px-3 text-amber-400">{green.metrics.energy_breakdown.router_sleep_power_watts} W</td>
                <td className="py-2.5 px-3 text-amber-400">+{green.metrics.energy_breakdown.router_sleep_power_watts} W</td>
                <td className="py-2.5 px-3 font-sans text-slate-400">12-15% keepalive sleep state</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-200">Link Linecard Baseline</td>
                <td className="py-2.5 px-3 text-slate-300">{std.metrics.energy_breakdown.link_base_power_watts} W</td>
                <td className="py-2.5 px-3 text-emerald-400">{green.metrics.energy_breakdown.link_base_power_watts} W</td>
                <td className="py-2.5 px-3 text-emerald-400">-{Math.round(std.metrics.energy_breakdown.link_base_power_watts - green.metrics.energy_breakdown.link_base_power_watts)} W</td>
                <td className="py-2.5 px-3 font-sans text-slate-400">Interfaces powered down</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-200">Solar Renewable Offset</td>
                <td className="py-2.5 px-3 text-emerald-400">-{std.metrics.energy_breakdown.green_energy_offset_watts} W</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">-{green.metrics.energy_breakdown.green_energy_offset_watts} W</td>
                <td className="py-2.5 px-3 text-emerald-400">Active Solar</td>
                <td className="py-2.5 px-3 font-sans text-slate-400">Routes steered over solar-powered nodes</td>
              </tr>
              <tr className="bg-slate-950/40 font-bold">
                <td className="py-3 px-3 font-sans text-white">Net Grid Power Draw</td>
                <td className="py-3 px-3 text-slate-200">{std.metrics.energy_breakdown.net_grid_power_watts} W</td>
                <td className="py-3 px-3 text-emerald-300">{green.metrics.energy_breakdown.net_grid_power_watts} W</td>
                <td className="py-3 px-3 text-emerald-400">-{Math.round(std.metrics.energy_breakdown.net_grid_power_watts - green.metrics.energy_breakdown.net_grid_power_watts)} W</td>
                <td className="py-3 px-3 font-sans text-emerald-400 font-semibold">{comparison.power_saved_percentage}% Net Grid Reduction</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

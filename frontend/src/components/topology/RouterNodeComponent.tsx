// ponytail: redesigned academic-grade router node card with clear typography hierarchy and explicit source/dest badges
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { PowerState, RouterRole } from '../../types';
import { RouterIcon, SunIcon } from '../common/Icons';

export interface RouterNodeData {
  id: string;
  name: string;
  role: RouterRole | string;
  base_power_watts: number;
  power_state: PowerState;
  green_energy_source?: string | null;
  green_energy_kw: number;
  solar_available?: boolean;
  utilization_pct?: number;
  isSelectedSource?: boolean;
  isSelectedTarget?: boolean;
  isInSelectedPath?: boolean;
  isInStandardPath?: boolean;
  isInGreenPath?: boolean;
  showUtilization?: boolean;
  showPower?: boolean;
  [key: string]: unknown;
}

const roleLabels: Record<string, string> = {
  core: 'Core Router',
  distribution: 'Distribution Router',
  access: 'Access Router',
  edge: 'Edge Gateway',
};

export const RouterNodeComponent = memo(({ data }: { data: RouterNodeData }) => {
  const isSleep = data.power_state === 'sleep';
  const isOff = data.power_state === 'off';
  const hasSolarHardware = data.green_energy_kw > 0;
  const isSolarGenerating = hasSolarHardware && (data.solar_available ?? true);
  const solarWatts = Math.round(data.green_energy_kw * 1000);

  const isSource = Boolean(data.isSelectedSource);
  const isTarget = Boolean(data.isSelectedTarget);
  const isStdPath = Boolean(data.isInStandardPath);
  const isGreenPath = Boolean(data.isInGreenPath);
  const isBothPaths = isStdPath && isGreenPath;

  const currentPowerWatts = isSleep
    ? Math.round(data.base_power_watts * 0.15)
    : isOff
    ? 0
    : data.base_power_watts;

  const utilPct = Math.min(100, Math.max(0, data.utilization_pct ?? (isSleep ? 0 : 15)));
  const showUtil = data.showUtilization ?? true;
  const showPower = data.showPower ?? true;

  // Visual card hierarchy styling
  let containerBorder = 'border-slate-700/80 bg-slate-900/90';
  let glowShadow = 'shadow-md shadow-black/40';

  if (isSource) {
    containerBorder = 'border-emerald-400 ring-2 ring-emerald-400/80 bg-slate-900/95';
    glowShadow = 'shadow-xl shadow-emerald-500/25';
  } else if (isTarget) {
    containerBorder = 'border-rose-500 ring-2 ring-rose-500/80 bg-slate-900/95';
    glowShadow = 'shadow-xl shadow-rose-500/25';
  } else if (isBothPaths) {
    containerBorder = 'border-teal-400 ring-2 ring-teal-400/60 bg-slate-900/95';
    glowShadow = 'shadow-lg shadow-teal-500/20';
  } else if (isGreenPath) {
    containerBorder = 'border-emerald-500 ring-1.5 ring-emerald-500/60 bg-emerald-950/20';
    glowShadow = 'shadow-lg shadow-emerald-500/15';
  } else if (isStdPath) {
    containerBorder = 'border-sky-400 ring-1.5 ring-sky-400/60 bg-sky-950/20';
    glowShadow = 'shadow-lg shadow-sky-500/15';
  } else if (isSleep) {
    containerBorder = 'border-amber-700/50 bg-slate-950/80 opacity-70 border-dashed';
    glowShadow = 'shadow-sm shadow-black/20';
  }

  // Utilization progress bar color: Green (<50%), Sky (50-70%), Amber (70-85%), Rose (>85% SLA breach risk)
  let utilBarColor = 'bg-emerald-500';
  let utilTextColor = 'text-emerald-400';
  if (utilPct > 85) {
    utilBarColor = 'bg-rose-500';
    utilTextColor = 'text-rose-400 font-bold';
  } else if (utilPct > 70) {
    utilBarColor = 'bg-amber-500';
    utilTextColor = 'text-amber-400';
  } else if (utilPct > 50) {
    utilBarColor = 'bg-sky-400';
    utilTextColor = 'text-sky-300';
  }

  return (
    <div
      className={`relative w-[205px] rounded-xl border backdrop-blur-md p-3.5 transition-all duration-300 ${containerBorder} ${glowShadow} text-slate-100 font-sans select-none`}
    >
      {/* React Flow Edge Connection Handles on all 4 card boundaries */}
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-900" />

      {/* Prominent Floating Source / Destination Badges */}
      {isSource && (
        <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-md shadow-emerald-500/40 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
          SOURCE
        </div>
      )}
      {isTarget && (
        <div className="absolute -top-3 right-3 px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-md shadow-rose-500/40 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          DESTINATION
        </div>
      )}

      {/* Path Assignment Pill (if in selected route) */}
      {!isSource && !isTarget && isBothPaths && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-teal-500 text-slate-950 font-bold text-[9px] tracking-wider uppercase border border-teal-300 shadow">
          Both Paths
        </div>
      )}
      {!isSource && !isTarget && !isBothPaths && isGreenPath && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-bold text-[9px] tracking-wider uppercase border border-emerald-300 shadow">
          Green Route
        </div>
      )}
      {!isSource && !isTarget && !isBothPaths && isStdPath && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-sky-500 text-slate-950 font-bold text-[9px] tracking-wider uppercase border border-sky-300 shadow">
          Standard Route
        </div>
      )}

      {/* Header: Large Router ID & Role Specification */}
      <div className="flex items-start justify-between gap-1 mt-0.5 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isSleep ? 'bg-amber-950/60 text-amber-400' : 'bg-slate-800/90 text-emerald-400'}`}>
            <RouterIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-black text-white leading-none tracking-tight font-mono">
              {data.id}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
              {roleLabels[data.role] || `${data.role} Router`}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        {isSleep ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/70 font-mono font-bold">
            SLEEP
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/70 font-mono font-bold">
            ACTIVE
          </span>
        )}
      </div>

      {/* Structured Metrics Section */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
        {/* Metric 1: Utilization */}
        {showUtil && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Utilization</span>
              <span className={`font-mono text-xs font-bold ${utilTextColor}`}>
                {utilPct.toFixed(1)}%
                {utilPct > 85 && <span className="ml-0.5 text-rose-400 font-bold">⚠</span>}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${utilBarColor} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.max(4, utilPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Metric 2: Power Consumption */}
        {showPower && (
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-400 font-medium">Power</span>
            <span className="font-mono text-xs font-bold text-slate-200">
              {currentPowerWatts} W
              {isSleep && <span className="text-[10px] text-amber-400 ml-1 font-normal">(15%)</span>}
            </span>
          </div>
        )}

        {/* Metric 3: Solar Renewable State */}
        {showPower && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Solar</span>
            {hasSolarHardware ? (
              isSolarGenerating ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                  <SunIcon className="w-3 h-3 text-amber-400" />
                  ON ({solarWatts}W)
                </span>
              ) : (
                <span className="font-mono text-[11px] text-slate-500">
                  OFF (Night)
                </span>
              )
            ) : (
              <span className="text-[11px] text-slate-500 font-mono">
                Grid Only
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

RouterNodeComponent.displayName = 'RouterNodeComponent';

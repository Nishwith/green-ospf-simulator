// ponytail: redesigned academic-grade link edge component with clear path differentiation, failure markers, and clean metrics
import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { LinkStatus } from '../../types';

export interface LinkEdgeData {
  id: string;
  source: string;
  target: string;
  bandwidth_mbps: number;
  delay_ms: number;
  ospf_cost: number;
  current_traffic_mbps: number;
  status: LinkStatus;
  isInSelectedPath?: boolean;
  isInStandardPath?: boolean;
  isInGreenPath?: boolean;
  isComparisonActive?: boolean;
  showCost?: boolean;
  showDelay?: boolean;
  showUtilization?: boolean;
  onToggleLinkState?: (linkId: string) => void;
  [key: string]: unknown;
}

export const LinkEdgeComponent = memo((props: EdgeProps) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as LinkEdgeData | undefined;
  const isDown = edgeData?.status === 'down';
  const isSleep = edgeData?.status === 'sleep';

  const isStdPath = Boolean(edgeData?.isInStandardPath);
  const isGreenPath = Boolean(edgeData?.isInGreenPath);
  const isBothPaths = isStdPath && isGreenPath;
  const isSingleActivePath = Boolean(edgeData?.isInSelectedPath) && !edgeData?.isComparisonActive;
  const isComparisonActive = Boolean(edgeData?.isComparisonActive);

  const bwGbps = (edgeData?.bandwidth_mbps || 1000) / 1000;
  const bwLabel = bwGbps >= 1 ? `${bwGbps}G` : `${edgeData?.bandwidth_mbps || 0}M`;

  const trafficMbps = edgeData?.current_traffic_mbps || 0;
  const utilPct = edgeData?.bandwidth_mbps
    ? Math.round((trafficMbps / edgeData.bandwidth_mbps) * 1000) / 10
    : 0;

  const showCost = edgeData?.showCost ?? true;
  const showDelay = edgeData?.showDelay ?? true;
  const showUtil = edgeData?.showUtilization ?? true;

  // Visual stroke & opacity calculation
  let strokeColor = '#475569'; // default slate-600
  let strokeWidth = 2;
  let strokeDasharray: string | undefined = undefined;
  let opacity = 1.0;

  if (isDown) {
    strokeColor = '#ef4444'; // Red for link cut / failure
    strokeWidth = 3;
    strokeDasharray = '6, 6';
    opacity = 1.0;
  } else if (isBothPaths) {
    strokeColor = '#14b8a6'; // Teal-500 for shared dual-selection
    strokeWidth = 4.5;
    opacity = 1.0;
  } else if (isGreenPath) {
    strokeColor = '#10b981'; // Emerald-500 for Green OSPF
    strokeWidth = 4;
    opacity = 1.0;
  } else if (isStdPath) {
    strokeColor = '#38bdf8'; // Sky-400 for Standard OSPF
    strokeWidth = 4;
    opacity = 1.0;
  } else if (isSingleActivePath) {
    strokeColor = '#10b981';
    strokeWidth = 4;
    opacity = 1.0;
  } else if (isSleep) {
    strokeColor = '#d97706'; // Amber-600 for sleeping links
    strokeWidth = 2;
    strokeDasharray = '4, 4';
    opacity = 0.55;
  } else {
    // Non-selected normal link
    if (isComparisonActive || isSingleActivePath) {
      // Subdue non-selected links when an active route is highlighted
      strokeColor = '#334155';
      strokeWidth = 1.5;
      opacity = 0.45;
    } else {
      strokeColor = bwGbps >= 10 ? '#0284c7' : '#64748b';
      strokeWidth = bwGbps >= 10 ? 2.5 : 2;
      opacity = 0.9;
    }
  }

  // Edge label pill styling
  let labelBg = 'bg-slate-900/90 border-slate-700/80 text-slate-300';
  let tagBadge = null;

  if (isDown) {
    labelBg = 'bg-rose-950/95 border-rose-600 text-rose-200 ring-2 ring-rose-500/30';
    tagBadge = (
      <span className="font-black text-[10px] text-rose-400 tracking-wider flex items-center gap-0.5">
        <span>✕</span> FAILED
      </span>
    );
  } else if (isBothPaths) {
    labelBg = 'bg-teal-950/95 border-teal-500 text-teal-200 ring-2 ring-teal-500/30';
    tagBadge = (
      <span className="font-bold text-[9px] text-teal-300 uppercase px-1 rounded bg-teal-900/60">
        Both Routes
      </span>
    );
  } else if (isGreenPath) {
    labelBg = 'bg-emerald-950/95 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30';
    tagBadge = (
      <span className="font-bold text-[9px] text-emerald-300 uppercase px-1 rounded bg-emerald-900/60">
        Green
      </span>
    );
  } else if (isStdPath) {
    labelBg = 'bg-sky-950/95 border-sky-400 text-sky-200 ring-2 ring-sky-400/30';
    tagBadge = (
      <span className="font-bold text-[9px] text-sky-300 uppercase px-1 rounded bg-sky-900/60">
        Standard
      </span>
    );
  } else if (isSleep) {
    labelBg = 'bg-amber-950/80 border-amber-800 text-amber-300';
    tagBadge = (
      <span className="font-bold text-[9px] text-amber-400 uppercase">
        💤 Sleep
      </span>
    );
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease',
        }}
      />

      {/* Edge Interactive Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan select-none"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (edgeData?.onToggleLinkState && edgeData?.id) {
                edgeData.onToggleLinkState(edgeData.id);
              }
            }}
            title={`Link ${edgeData?.id}: Click to inject link failure (What-If sensitivity)`}
            className={`group px-2.5 py-1 rounded-lg text-[10px] font-mono border backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 ${labelBg}`}
          >
            {tagBadge}

            {/* Metric items */}
            {!isDown && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400 font-bold">{bwLabel}</span>
                {showCost && (
                  <span className="text-slate-300">
                    <strong className="text-slate-100">{edgeData?.ospf_cost ?? 10}</strong> cost
                  </span>
                )}
                {showCost && showDelay && <span className="text-slate-600">•</span>}
                {showDelay && (
                  <span className="text-slate-300">
                    <strong className="text-slate-100">{edgeData?.delay_ms ?? 1.5}</strong>ms
                  </span>
                )}
                {showUtil && utilPct > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className={`${utilPct > 85 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                      {utilPct}%
                    </span>
                  </>
                )}
              </div>
            )}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

LinkEdgeComponent.displayName = 'LinkEdgeComponent';

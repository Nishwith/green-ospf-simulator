// ponytail: deterministic layout coordinates and link metric derivation for network topologies
import type { Topology } from '../../types';

export interface DeterministicPosition {
  x: number;
  y: number;
}

/**
 * Provides spacious, non-overlapping, hierarchy-aligned 2D coordinates
 * for network topologies. Solves edge entanglement and card overlaps.
 */
export function getDeterministicNodePositions(topology: Topology): Map<string, DeterministicPosition> {
  const positions = new Map<string, DeterministicPosition>();

  if (topology.id === 'medium_campus') {
    // 8-Router Campus Network (Core -> Distribution/Hub -> Data Center & Pods)
    // Clear separation between Standard OSPF upper highway (R2, R5) and Green OSPF lower solar valley (R4, R7)
    positions.set('R1', { x: 80, y: 220 });   // Core Gateway North (Primary Ingress)
    positions.set('R7', { x: 80, y: 460 });   // Academic Block Router (Access Solar)
    positions.set('R2', { x: 380, y: 60 });   // Core Gateway South (10G Transit)
    positions.set('R4', { x: 380, y: 460 });  // Solar Aggregation Beta (80W Solar Transit)
    positions.set('R3', { x: 620, y: 260 });  // Aggregation Hub Alpha (Center Crossroad)
    positions.set('R5', { x: 680, y: 60 });   // High-Speed Transit Hub (10G Backbone)
    positions.set('R6', { x: 960, y: 200 });  // Central Data Center (Primary Egress)
    positions.set('R8', { x: 1240, y: 200 }); // Library & Research Pod (Access Edge)
    return positions;
  }

  if (topology.id === 'small_campus') {
    // 5-Router Topology (Ingress -> Dual Aggregation -> Dual Access)
    positions.set('R1', { x: 100, y: 220 });  // Core Gateway
    positions.set('R2', { x: 420, y: 90 });   // Distribution North (Solar)
    positions.set('R3', { x: 420, y: 350 });  // Distribution South
    positions.set('R4', { x: 740, y: 90 });   // Engineering Lab Access (Solar)
    positions.set('R5', { x: 740, y: 350 });  // Admin Access
    return positions;
  }

  if (topology.id === 'large_campus') {
    // 14-Router Hierarchical Multi-Building Topology (5 well-spaced vertical tiers)
    positions.set('R1', { x: 80, y: 160 });
    positions.set('R2', { x: 80, y: 400 });

    positions.set('R3', { x: 340, y: 80 });
    positions.set('R4', { x: 340, y: 280 });
    positions.set('R5', { x: 340, y: 480 });

    positions.set('R6', { x: 620, y: 180 });
    positions.set('R7', { x: 620, y: 380 });

    positions.set('R8', { x: 900, y: 80 });
    positions.set('R9', { x: 900, y: 200 });
    positions.set('R10', { x: 900, y: 320 });
    positions.set('R11', { x: 900, y: 460 });

    positions.set('R12', { x: 1180, y: 120 });
    positions.set('R13', { x: 1180, y: 280 });
    positions.set('R14', { x: 1180, y: 440 });
    return positions;
  }

  // Fallback for custom or unrecognized topologies:
  // Apply a minimum safety spacing factor to prevent 50px card collisions
  topology.nodes.forEach((node, idx) => {
    let rawX = node.x ?? (idx % 4) * 280 + 100;
    let rawY = node.y ?? Math.floor(idx / 4) * 220 + 100;
    positions.set(node.id, { x: Math.max(50, rawX * 1.3), y: Math.max(50, rawY * 1.2) });
  });

  return positions;
}

// ponytail: routing tables & OSPF Link State Database (LSDB) inspector
import React, { useState } from 'react';
import type { ComparisonResult } from '../../types';
import { NetworkIcon, RouterIcon, TableIcon } from '../common/Icons';

interface RoutingTableViewProps {
  comparison: ComparisonResult;
}

export const RoutingTableView: React.FC<RoutingTableViewProps> = ({ comparison }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'green'>('green');
  const [searchTerm, setSearchTerm] = useState('');

  const currentResult = activeTab === 'green' ? comparison.energy_aware_ospf : comparison.standard_ospf;
  const routingTable = currentResult.routing_table || [];

  const filteredEntries = routingTable.filter((entry) => {
    const term = searchTerm.toLowerCase();
    return (
      entry.destination.toLowerCase().includes(term) ||
      entry.next_hop.toLowerCase().includes(term) ||
      entry.outgoing_interface.toLowerCase().includes(term) ||
      entry.full_path.join(' ').toLowerCase().includes(term)
    );
  });

  const lsdb = currentResult.lsdb_summary || {};
  const lsdbEntries = Object.values(lsdb);

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-emerald-400" />
            OSPF Routing Information Base (RIB) & Forwarding Table
          </h2>
          <p className="text-xs text-slate-400">
            Inspect computed next-hops, Dijkstra SPF convergence costs, and LSDB records.
          </p>
        </div>

        {/* Algorithm Table Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('standard')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'standard'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Standard OSPF Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('green')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'green'
                  ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Green OSPF Table
            </button>
          </div>
        </div>
      </div>

      {/* Search & Perspective Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Originating Router:</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-white font-bold">
            {comparison.source} (Active Ingress)
          </span>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search destination, next-hop, interface..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Routing Table Display */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Next Hop Router</th>
                <th className="py-3 px-4">Metric / Cost</th>
                <th className="py-3 px-4">Outgoing Interface</th>
                <th className="py-3 px-4">Full Forwarding Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No routing entries match "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isSimTarget = entry.destination === comparison.target;
                  return (
                    <tr
                      key={entry.destination}
                      className={`hover:bg-slate-800/30 transition ${
                        isSimTarget ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{entry.destination}</span>
                          {isSimTarget && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase font-sans">
                              Active Target
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {entry.next_hop}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {entry.cost}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {entry.outgoing_interface}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                          {entry.full_path.map((node, i) => (
                            <React.Fragment key={`${entry.destination}-${node}-${i}`}>
                              <span className="font-semibold text-slate-200">{node}</span>
                              {i < entry.full_path.length - 1 && (
                                <span className="text-slate-600">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OSPF Link State Database (LSDB) Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <NetworkIcon className="w-4 h-4 text-sky-400" />
            OSPF Area 0 Link-State Database (LSDB) Summary
          </h3>
          <p className="text-xs text-slate-400">
            Type 1 Router-LSAs synchronized across all active Area 0 routers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {lsdbEntries.map((lsa) => (
            <div
              key={lsa.lsa_id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5 font-sans">
                  <RouterIcon className="w-3.5 h-3.5 text-slate-400" />
                  Router {lsa.lsa_id}
                </span>
                <span className="text-[10px] text-slate-400">Age: {lsa.age_seconds}s</span>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Seq: <span className="text-indigo-300">0x{lsa.sequence_number.toString(16)}</span></div>
                <div>Checksum: <span className="text-slate-300">Valid</span></div>
                <div>Links Advertised: <span className="text-emerald-400 font-bold">{lsa.links.length}</span></div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-sans block uppercase">Neighbor Adjacencies</span>
                {lsa.links.map((link) => (
                  <div key={link.link_id} className="flex justify-between text-[11px] bg-slate-900/60 px-2 py-1 rounded">
                    <span className="text-slate-300">→ {link.neighbor_router_id}</span>
                    <span className="text-slate-400">cost:{link.metric} ({Number(link.bandwidth_mbps) >= 10000 ? '10G' : '1G'})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

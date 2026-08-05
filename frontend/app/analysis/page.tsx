"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Dataset, Packet } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  Eye, CornerDownRight, Network, FileCode
} from "lucide-react";

function TrafficAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDatasetId = searchParams.get("dataset") || "";

  // State
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>(initialDatasetId);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [totalPackets, setTotalPackets] = useState(0);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingPackets, setLoadingPackets] = useState(false);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [protocol, setProtocol] = useState("");
  const [attackOnly, setAttackOnly] = useState<string>("all"); // "all", "attacks", "normal"
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");

  // Selected Packet for detailed view
  const [activePacket, setActivePacket] = useState<Packet | null>(null);

  // Fetch Datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setLoadingDatasets(true);
        const data = await api.getDatasets();
        const readyData = data.filter((d) => d.status === "ready");
        setDatasets(readyData);
        if (readyData.length > 0 && !initialDatasetId) {
          setSelectedDataset(readyData[0].id);
        }
      } catch (err) {
        toast.error("Failed to load datasets");
      } finally {
        setLoadingDatasets(false);
      }
    };
    fetchDatasets();
  }, [initialDatasetId]);

  // Fetch Packets
  const fetchPackets = async () => {
    if (!selectedDataset) return;
    try {
      setLoadingPackets(true);
      const isAttack =
        attackOnly === "attacks" ? true : attackOnly === "normal" ? false : undefined;

      const data = await api.getTraffic(selectedDataset, {
        page,
        page_size: pageSize,
        search: search || undefined,
        protocol: protocol || undefined,
        attack_only: isAttack,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setPackets(data.items);
      setTotalPackets(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load telemetry packets");
    } finally {
      setLoadingPackets(false);
    }
  };

  useEffect(() => {
    fetchPackets();
  }, [selectedDataset, page, protocol, attackOnly, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPackets();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Dataset Selector */}
        <div className="lg:col-span-1">
          <label className="text-xs text-muted font-medium uppercase tracking-wider block mb-1.5">
            Target Dataset
          </label>
          {loadingDatasets ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value);
                setPage(1);
                router.replace(`/analysis?dataset=${e.target.value}`);
              }}
              className="soc-input"
            >
              {datasets.length === 0 ? (
                <option value="">No ready datasets found</option>
              ) : (
                datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename} ({d.row_count.toLocaleString()} rows)
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        {/* Global search */}
        <form onSubmit={handleSearchSubmit} className="lg:col-span-3">
          <label className="text-xs text-muted font-medium uppercase tracking-wider block mb-1.5">
            Search Parameters
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by IP address, protocol name, or attack classification..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="soc-input pr-24"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 soc-btn-primary py-1 px-3 text-xs flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Packets List Table */}
        <div className={`col-span-1 xl:col-span-3 ${activePacket ? "xl:col-span-3" : "xl:col-span-4"}`}>
          <Card
            title="Captured Packet Logs"
            subtitle={`Showing telemetry packets analyzed by detection engine. Total: ${totalPackets.toLocaleString()}`}
            action={
              <div className="flex items-center gap-3">
                {/* Protocol Filter */}
                <select
                  value={protocol}
                  onChange={(e) => {
                    setProtocol(e.target.value);
                    setPage(1);
                  }}
                  className="soc-input py-1.5 px-3 text-xs w-32 bg-background border-border"
                >
                  <option value="">All Protocols</option>
                  <option value="MAVLink">MAVLink</option>
                  <option value="802.11">802.11</option>
                  <option value="UDP">UDP</option>
                  <option value="TCP">TCP</option>
                  <option value="DTLS">DTLS</option>
                </select>

                {/* Threat Filter */}
                <select
                  value={attackOnly}
                  onChange={(e) => {
                    setAttackOnly(e.target.value);
                    setPage(1);
                  }}
                  className="soc-input py-1.5 px-3 text-xs w-32 bg-background border-border"
                >
                  <option value="all">All Traffic</option>
                  <option value="attacks">Threats Only</option>
                  <option value="normal">Normal Only</option>
                </select>
              </div>
            }
          >
            {!selectedDataset ? (
              <div className="py-24 text-center text-muted">
                <Network className="w-12 h-12 mx-auto text-muted mb-4 opacity-50 animate-pulse" />
                <h3 className="text-white font-medium mb-1">No Active Capture Selected</h3>
                <p className="text-xs">
                  Upload and ingest a telemetry dataset in the Datasets section to view packets here.
                </p>
              </div>
            ) : loadingPackets ? (
              <div className="space-y-3 py-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : packets.length === 0 ? (
              <div className="py-16 text-center text-muted text-sm">
                No packets matching your current filter settings.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted font-semibold uppercase tracking-wider">
                        <th className="pb-3 pl-3 cursor-pointer" onClick={() => handleSort("id")}>
                          <div className="flex items-center gap-1">
                            PID
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="pb-3 cursor-pointer" onClick={() => handleSort("timestamp")}>
                          <div className="flex items-center gap-1">
                            Timestamp
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="pb-3">Source IP</th>
                        <th className="pb-3">Dest IP</th>
                        <th className="pb-3">Protocol</th>
                        <th className="pb-3 cursor-pointer" onClick={() => handleSort("packet_size")}>
                          <div className="flex items-center gap-1">
                            Size (B)
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="pb-3 cursor-pointer" onClick={() => handleSort("time_delay")}>
                          <div className="flex items-center gap-1">
                            Delay (ms)
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="pb-3 cursor-pointer" onClick={() => handleSort("transmission_rate")}>
                          <div className="flex items-center gap-1">
                            Rate (kb/s)
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="pb-3">Classification</th>
                        <th className="pb-3 pr-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {packets.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setActivePacket(p)}
                          className={`hover:bg-white/5 cursor-pointer transition ${
                            activePacket?.id === p.id ? "bg-primary/5 border-l-2 border-primary" : ""
                          }`}
                        >
                          <td className="py-2.5 pl-3 font-mono text-muted text-[10px]">{p.id}</td>
                          <td className="py-2.5 text-muted">
                            {p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-2.5 font-medium text-white">{p.source_ip || "-"}</td>
                          <td className="py-2.5 text-muted">{p.dest_ip || "-"}</td>
                          <td className="py-2.5">
                            <span className="font-semibold text-primary">{p.protocol || "-"}</span>
                          </td>
                          <td className="py-2.5 font-mono">{p.packet_size?.toLocaleString()}</td>
                          <td className="py-2.5 font-mono text-muted">{p.time_delay}</td>
                          <td className="py-2.5 font-mono text-muted">{p.transmission_rate}</td>
                          <td className="py-2.5">
                            <Badge variant={p.is_attack ? "critical" : "success"}>
                              {p.is_attack ? p.attack_type || "Attack" : "Normal"}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <button className="text-muted hover:text-white transition">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center pt-4 border-t border-border/40 text-xs">
                  <span className="text-muted">
                    Page <span className="font-semibold text-white">{page}</span> of{" "}
                    <span className="font-semibold text-white">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="soc-btn-ghost py-1.5 px-3 border border-border rounded-lg bg-card flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="soc-btn-ghost py-1.5 px-3 border border-border rounded-lg bg-card flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Detailed Inspector Panel */}
        {activePacket && (
          <div className="col-span-1 xl:col-span-1">
            <Card
              title="Packet Details"
              subtitle={`Packet ID #${activePacket.id}`}
              action={
                <button
                  onClick={() => setActivePacket(null)}
                  className="text-xs text-muted hover:text-white"
                >
                  Close
                </button>
              }
            >
              <div className="space-y-4 text-xs">
                {/* Meta details */}
                <div className="bg-white/5 p-3 rounded-lg border border-border/60">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">
                    Network Context
                  </p>
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-muted">Time:</span>
                    <span className="text-white text-right">
                      {activePacket.timestamp
                        ? new Date(activePacket.timestamp).toLocaleString()
                        : "N/A"}
                    </span>

                    <span className="text-muted">Mac Address:</span>
                    <span className="text-white font-mono text-right truncate">
                      {activePacket.mac_address || "N/A"}
                    </span>

                    <span className="text-muted">Protocol:</span>
                    <span className="text-primary font-semibold text-right">
                      {activePacket.protocol || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Metric values */}
                <div className="bg-white/5 p-3 rounded-lg border border-border/60">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">
                    Operational Telemetry Metrics
                  </p>
                  <div className="grid grid-cols-2 gap-y-2 font-mono">
                    <span className="text-muted text-xs">Packet Size:</span>
                    <span className="text-white text-right text-xs">
                      {activePacket.packet_size} Bytes
                    </span>

                    <span className="text-muted text-xs">Time Delay:</span>
                    <span className="text-white text-right text-xs">
                      {activePacket.time_delay} ms
                    </span>

                    <span className="text-muted text-xs">Transmission Rate:</span>
                    <span className="text-white text-right text-xs">
                      {activePacket.transmission_rate} kb/s
                    </span>
                  </div>
                </div>

                {/* Attack Details */}
                <div
                  className={`p-3 rounded-lg border ${
                    activePacket.is_attack
                      ? "bg-critical/5 border-critical/30"
                      : "bg-success/5 border-success/30"
                  }`}
                >
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">
                    Threat Detection Assessment
                  </p>
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-muted">Status:</span>
                    <span
                      className={`font-semibold text-right ${
                        activePacket.is_attack ? "text-critical" : "text-success"
                      }`}
                    >
                      {activePacket.is_attack ? "MALICIOUS" : "NORMAL"}
                    </span>

                    <span className="text-muted">Threat Model:</span>
                    <span className="text-white text-right capitalize">
                      {activePacket.is_attack ? activePacket.attack_type || "Generic Anomaly" : "Safe Telemetry"}
                    </span>
                  </div>
                </div>

                {/* RAW JSON representation */}
                <div className="bg-background p-3 rounded-lg border border-border/60">
                  <div className="flex items-center gap-1.5 text-muted mb-2 font-semibold uppercase tracking-wider text-[10px]">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    Structured Payload
                  </div>
                  <pre className="font-mono text-[10px] text-muted overflow-x-auto max-h-36 whitespace-pre-wrap">
                    {JSON.stringify(activePacket, null, 2)}
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrafficAnalysisPage() {
  return (
    <DashboardLayout>
      <AppShell title="Traffic Analysis" subtitle="Inspect captured UAV network logs & telemetry packets">
        <Suspense fallback={<div className="text-muted">Loading Traffic Analysis Module...</div>}>
          <TrafficAnalysisContent />
        </Suspense>
      </AppShell>
    </DashboardLayout>
  );
}

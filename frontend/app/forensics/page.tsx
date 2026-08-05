"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Dataset, ForensicsResult, Report } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Search, ShieldAlert, Clock, Calendar, CheckSquare, ListFilter,
  Cpu, Server, Activity, FileText, ChevronRight, AlertTriangle, AlertCircle
} from "lucide-react";

export default function ForensicsPage() {
  const router = useRouter();
  
  // Datasets
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  // Forensics results
  const [forensics, setForensics] = useState<ForensicsResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fetchDatasets = async () => {
    try {
      setLoadingDatasets(true);
      const data = await api.getDatasets();
      const readyDatasets = data.filter((d) => d.status === "ready");
      setDatasets(readyDatasets);
      if (readyDatasets.length > 0) {
        setSelectedDataset(readyDatasets[0].id);
      }
    } catch (err) {
      toast.error("Failed to load datasets for forensics");
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleScan = async () => {
    if (!selectedDataset) {
      toast.error("Please select a dataset to investigate");
      return;
    }

    try {
      setScanning(true);
      setForensics(null);
      toast.info("Ingesting packet parameters for forensic reconstruction...");
      
      const result = await api.runForensics(selectedDataset);
      setForensics(result);
      toast.success("Forensic timeline built. Indicators of Compromise extracted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Forensic analysis failed");
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!forensics?.investigation?.id) return;

    try {
      setGeneratingReport(true);
      toast.info("Compiling investigation charts & forensic metrics...");
      
      const report = await api.generateReport(forensics.investigation.id);
      toast.success(`PDF report compiled: ${report.title}`);
      
      // Redirect to reports page
      router.push("/reports");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to compile report");
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <DashboardLayout>
      <AppShell title="Forensic Investigations" subtitle="Analyze flight incident timelines, map attack sequences, and extract malicious fingerprints">
        <div className="space-y-6">
          {/* Target Selector */}
          <div className="flex flex-col sm:flex-row items-end gap-4 bg-card border border-border p-4 rounded-xl">
            <div className="flex-1">
              <label className="text-xs text-muted font-medium uppercase tracking-wider block mb-1.5">
                Target Capture Dataset
              </label>
              {loadingDatasets ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="soc-input"
                >
                  <option value="">Select a ready dataset</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_filename}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || !selectedDataset}
              className="soc-btn-primary h-[42px] px-6 flex items-center gap-2 text-xs"
            >
              <Cpu className="w-4 h-4" />
              {scanning ? "Building Investigation Timeline..." : "Execute Forensic Scan"}
            </button>
          </div>

          {scanning && (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted text-sm font-medium">Reconstructing time packets and extracting MAC/IP footprints...</p>
            </div>
          )}

          {!scanning && !forensics && (
            <div className="py-24 text-center border border-dashed border-border rounded-xl">
              <Search className="w-12 h-12 mx-auto text-muted mb-4 opacity-30" />
              <h3 className="text-white font-medium mb-1">Investigation Module Ready</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Select a dataset telemetry capture from the dropdown above and run the forensic engine to reconstruct the timeline and discover IP addresses.
              </p>
            </div>
          )}

          {forensics && (
            <div className="space-y-6">
              {/* Overview Summary */}
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Forensic Case: {forensics.investigation.title}
                  </span>
                  <p className="text-base text-white font-semibold">
                    {forensics.investigation.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="primary">Threat Level</Badge>
                    <span className="text-xs text-muted">
                      Threat Score: <strong className="text-white">{forensics.investigation.threat_score}/100</strong>
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="soc-btn-primary py-2 px-5 text-xs flex items-center gap-1.5 self-start md:self-center"
                >
                  <FileText className="w-4 h-4" />
                  {generatingReport ? "Compiling PDF..." : "Export Forensic Report PDF"}
                </button>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Reconstructed Attack Sequence */}
                  <Card title="Attack Timeline Reconstruction" subtitle="Sequential order of anomalous telemetry signals">
                    {forensics.timeline.length === 0 ? (
                      <div className="py-8 text-center text-muted text-xs">
                        No attack timeline buckets constructed.
                      </div>
                    ) : (
                      <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                        {forensics.timeline.map((item, idx) => (
                          <div key={idx} className="flex gap-4 relative pl-8">
                            {/* Dot icon */}
                            <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-background bg-critical flex items-center justify-center" />
                            
                            <div className="flex-1 bg-white/5 p-3 rounded-lg border border-border/40">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-muted" />
                                  {item.timestamp}
                                </span>
                                <Badge variant="critical">{item.dominant_attack}</Badge>
                              </div>
                              <p className="text-xs text-muted">
                                ML flagged <strong className="text-white">{item.attack_count}</strong> anomaly packets matching signatures of <span className="text-white font-medium">{item.dominant_attack}</span> jamming/injection waveforms.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Protocol vulnerability chart */}
                  <Card title="Telemetry Protocol Vulnerability" subtitle="Impact statistics per wireless protocol">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted font-semibold uppercase tracking-wider">
                            <th className="pb-3">Protocol</th>
                            <th className="pb-3">Captured Packets</th>
                            <th className="pb-3">Malicious Packets</th>
                            <th className="pb-3">Vulnerability Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {forensics.protocol_analysis.map((proto) => (
                            <tr key={proto.protocol} className="hover:bg-white/5 transition">
                              <td className="py-3 font-semibold text-white">{proto.protocol}</td>
                              <td className="py-3 font-mono text-muted">{proto.total.toLocaleString()}</td>
                              <td className="py-3 font-mono text-critical font-medium">
                                {proto.attacks.toLocaleString()}
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-semibold text-white w-10">
                                    {proto.attack_rate}%
                                  </span>
                                  <div className="h-2 flex-1 max-w-[120px] bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-critical"
                                      style={{ width: `${proto.attack_rate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Sidebar Column: Summary & IoC list */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Captured Statistics */}
                  <Card title="Traffic Profile Ingestion" subtitle="Metadata of the analyzed capture">
                    <div className="space-y-3 text-xs">
                      {[
                        ["Total Ingested Packets", forensics.packet_inspection_summary.total_packets],
                        ["Safe Telemetry Packets", forensics.packet_inspection_summary.normal_packets],
                        ["Malicious Attack Packets", forensics.packet_inspection_summary.attack_packets],
                        ["Unique Sender Interfaces", forensics.packet_inspection_summary.unique_source_ips],
                        ["Active Protocols", forensics.packet_inspection_summary.protocols_observed]
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between py-1.5 border-b border-border/20">
                          <span className="text-muted">{label}</span>
                          <span className="text-white font-mono font-semibold">
                            {typeof val === "number" ? val.toLocaleString() : val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Indicators of Compromise (IoC) */}
                  <Card title="Threat Fingerprints (IoC)" subtitle="Extracted IP and MAC artifacts associated with perpetrator">
                    <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                      {forensics.iocs.map((ioc) => (
                        <div key={ioc.id} className="bg-white/5 p-3 rounded-lg border border-border/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-white text-xs font-semibold select-all">
                              {ioc.value}
                            </span>
                            <Badge
                              variant={
                                ioc.severity === "critical"
                                  ? "critical"
                                  : ioc.severity === "medium"
                                  ? "warning"
                                  : "default"
                              }
                            >
                              {ioc.severity}
                            </Badge>
                          </div>
                          
                          <p className="text-[10px] text-muted leading-relaxed">
                            {ioc.description}
                          </p>

                          <div className="flex items-center justify-between text-[9px] text-muted pt-1 border-t border-border/10">
                            <span className="uppercase font-mono font-bold text-primary">
                              Type: {ioc.ioc_type}
                            </span>
                            <span>Occurrences: {ioc.occurrence_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Top IPs List */}
                  <Card title="Top Attacking Hosts" subtitle="IP addresses sending the highest volume of anomalies">
                    <div className="space-y-2">
                      {forensics.top_attacking_ips.map((item, index) => (
                        <div key={item.ip} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded border border-border/40 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-muted">{index + 1}.</span>
                            <span className="text-white font-semibold">{item.ip}</span>
                          </div>
                          <span className="text-critical font-bold">{item.count} pkts</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </DashboardLayout>
  );
}

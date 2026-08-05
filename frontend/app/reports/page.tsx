"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Report } from "@/lib/api";
import { toast } from "sonner";
import {
  FileText, Download, Calendar, ShieldCheck, Database,
  ArrowRightLeft, FileWarning, Search, RefreshCw
} from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      toast.error("Failed to load reports catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = (id: string, title: string) => {
    try {
      const url = api.downloadReport(id);
      window.open(url, "_blank");
      toast.success(`Downloading PDF: ${title}`);
    } catch (err) {
      toast.error("Failed to initiate download");
    }
  };

  const filteredReports = reports.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <AppShell title="Forensic Reports" subtitle="Review and download official case files compiled post-threat scan">
        <div className="space-y-6">
          {/* Top Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search reports by filename or case details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="soc-input pl-10 text-xs py-2 bg-background border-border"
              />
            </div>
            
            <button
              onClick={fetchReports}
              disabled={loading}
              className="soc-btn-ghost border border-border text-xs py-2 px-4 flex items-center gap-2 bg-background"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Directory
            </button>
          </div>

          {/* Directory Grid */}
          <Card title="Case Files Directory" subtitle="Archived incident report publications">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <FileWarning className="w-10 h-10 mx-auto opacity-50 mb-3" />
                <h4 className="text-white font-medium mb-1">No Case Files Found</h4>
                <p className="text-xs">
                  {search ? "No reports match your search query." : "Navigate to Forensics and run a telemetry scan to generate reports."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted font-semibold uppercase tracking-wider">
                      <th className="pb-3 pl-4">Document Title</th>
                      <th className="pb-3">Investigation Reference</th>
                      <th className="pb-3">Generated Timestamp</th>
                      <th className="pb-3">Format</th>
                      <th className="pb-3 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-white/5 transition">
                        <td className="py-4 pl-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>{report.title}</span>
                          </div>
                        </td>
                        <td className="py-4 font-mono text-muted text-[10px]">
                          {report.investigation_id}
                        </td>
                        <td className="py-4 text-muted">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(report.generated_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant="primary">PDF DOCUMENT</Badge>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <button
                            onClick={() => handleDownload(report.id, report.title)}
                            className="soc-btn-ghost hover:bg-primary/10 border border-border hover:border-primary/30 text-xs py-1.5 px-3 flex items-center gap-1.5 inline-flex"
                          >
                            <Download className="w-3.5 h-3.5 text-muted hover:text-white" />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </DashboardLayout>
  );
}

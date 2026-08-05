"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, AuditLog, ActivityLog } from "@/lib/api";
import { toast } from "sonner";
import {
  History, ScrollText, UserCheck, ShieldAlert,
  Clock, Search, RefreshCw, FileCode, ChevronDown, ChevronUp
} from "lucide-react";

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "system">("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === "audit") {
        const data = await api.getAuditLogs();
        setAuditLogs(data);
      } else {
        const data = await api.getActivityLogs();
        setActivityLogs(data);
      }
    } catch (err) {
      toast.error("Failed to load logs database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    setSearch("");
    setExpandedRow(null);
  }, [activeTab]);

  const toggleExpand = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Filter logs based on search query
  const filteredAudit = auditLogs.filter((log) =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.resource_type?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActivity = activityLogs.filter((log) =>
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    log.activity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <AppShell title="System Logs" subtitle="Audit trails and system background chronicles">
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: "audit", label: "User Audit Logs", icon: UserCheck },
              { id: "system", label: "System Activity Log", icon: ScrollText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder={`Search logs by ${activeTab === "audit" ? "action or resource" : "message content"}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="soc-input pl-10 text-xs py-2 bg-background border-border"
              />
            </div>
            
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="soc-btn-ghost border border-border text-xs py-2 px-4 flex items-center gap-2 bg-background"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Logs
            </button>
          </div>

          {/* Logs Panel */}
          {activeTab === "audit" ? (
            <Card title="Security Audit Trails" subtitle="Immutable logs of administrator interface actions">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredAudit.length === 0 ? (
                <div className="py-12 text-center text-muted text-xs">No audit logs found.</div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-muted font-semibold uppercase tracking-wider">
                        <th className="pb-3 pl-4">Timestamp</th>
                        <th className="pb-3">Action</th>
                        <th className="pb-3">Affected Resource</th>
                        <th className="pb-3">IP Address</th>
                        <th className="pb-3 pr-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredAudit.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition">
                          <td className="py-3 pl-4 font-mono text-muted text-[10px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <Badge variant={log.action === "login" ? "success" : "primary"}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="py-3 font-semibold text-white">
                            {log.resource_type ? `${log.resource_type.toUpperCase()}` : "-"}
                          </td>
                          <td className="py-3 font-mono text-muted">
                            {log.details?.ip_address as string || "Local console"}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="text-muted hover:text-white inline-flex items-center gap-1 hover:underline"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              {expandedRow === log.id ? "Hide" : "Inspect"}
                            </button>
                            {expandedRow === log.id && (
                              <div className="mt-2 text-left bg-background p-3 rounded border border-border overflow-x-auto max-h-40 font-mono text-[10px]">
                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card title="System Activity Chronicle" subtitle="Automated pipeline logs and ingestion events">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="py-12 text-center text-muted text-xs">No activity logs found.</div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-muted font-semibold uppercase tracking-wider">
                        <th className="pb-3 pl-4">Timestamp</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3 pr-4">Message Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredActivity.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition">
                          <td className="py-3 pl-4 font-mono text-muted text-[10px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <Badge variant={log.activity_type === "system" ? "default" : "warning"}>
                              {log.activity_type}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-white font-mono leading-relaxed">
                            {log.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </AppShell>
    </DashboardLayout>
  );
}

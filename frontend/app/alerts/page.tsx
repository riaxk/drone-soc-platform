"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Alert } from "@/lib/api";
import { toast } from "sonner";
import {
  Bell, BellOff, ShieldAlert, CheckCircle, Clock,
  Filter, AlertTriangle, AlertCircle, RefreshCw
} from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("unresolved"); // "all", "unresolved", "resolved"
  const [severityFilter, setSeverityFilter] = useState("all"); // "all", "critical", "medium", "low"

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (severityFilter !== "all") params.severity = severityFilter;
      
      const data = await api.getAlerts(params);
      setAlerts(data);
    } catch (err) {
      toast.error("Failed to load alerts list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleResolve = async (id: string) => {
    try {
      toast.info("Updating alert status...");
      await api.resolveAlert(id);
      toast.success("Threat alert successfully resolved");
      fetchAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resolution failed");
    }
  };

  // Compute counts for metrics cards
  const totalUnresolved = alerts.filter(a => a.status === "unresolved").length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const mediumCount = alerts.filter(a => a.severity === "medium").length;
  const lowCount = alerts.filter(a => a.severity === "low").length;

  return (
    <DashboardLayout>
      <AppShell title="Alert Center" subtitle="Real-time network security threats raised by telemetry analysis">
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted uppercase font-medium">Unresolved Alerts</span>
                <p className="text-xl font-bold text-white mt-1">{totalUnresolved}</p>
              </div>
              <Bell className="w-5 h-5 text-primary" />
            </div>

            <div className="bg-critical/10 border border-critical/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-critical uppercase font-medium">Critical Threats</span>
                <p className="text-xl font-bold text-critical mt-1">{criticalCount}</p>
              </div>
              <ShieldAlert className="w-5 h-5 text-critical" />
            </div>

            <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-warning uppercase font-medium">Medium Alerts</span>
                <p className="text-xl font-bold text-warning mt-1">{mediumCount}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>

            <div className="bg-white/5 border border-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted uppercase font-medium">Low Priority</span>
                <p className="text-xl font-bold text-white mt-1">{lowCount}</p>
              </div>
              <AlertCircle className="w-5 h-5 text-muted" />
            </div>
          </div>

          {/* Filter Bar and Action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-muted">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="soc-input py-1.5 px-3 bg-background border-border w-32"
                >
                  <option value="all">All Logs</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Severity */}
              <div className="flex items-center gap-2">
                <span className="text-muted">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="soc-input py-1.5 px-3 bg-background border-border w-32"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="soc-btn-ghost border border-border text-xs py-1.5 px-3 flex items-center gap-2 bg-background"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync Alarm Queue
            </button>
          </div>

          {/* Alerts List */}
          <Card title="Alerts Operations Logs" subtitle={`Real-time security logs count: ${alerts.length}`}>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <BellOff className="w-10 h-10 mx-auto opacity-50 mb-3" />
                <h4 className="text-white font-medium mb-1">Alert Queue Clear</h4>
                <p className="text-xs">No active threat alerts matching your parameters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-white/5 ${
                      alert.status === "resolved"
                        ? "bg-white/5 border-border/40"
                        : alert.severity === "critical"
                        ? "bg-critical/5 border-critical/30"
                        : alert.severity === "medium"
                        ? "bg-warning/5 border-warning/30"
                        : "bg-primary/5 border-primary/30"
                    }`}
                  >
                    {/* Header info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={alert.severity === "critical" ? "critical" : alert.severity === "medium" ? "warning" : "default"}>
                          {alert.severity}
                        </Badge>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          {alert.attack_type || "Anomaly Alarm"}
                        </h4>
                        <span className="text-[10px] text-muted flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(alert.triggered_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted font-mono">{alert.message}</p>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <Badge variant={alert.status === "resolved" ? "success" : "critical"}>
                        {alert.status}
                      </Badge>
                      {alert.status === "unresolved" && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="soc-btn-ghost py-1 px-3 border border-border text-[10px] font-bold uppercase rounded hover:bg-white/10"
                        >
                          Resolve Case
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </DashboardLayout>
  );
}

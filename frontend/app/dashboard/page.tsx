"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, StatCard, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, DashboardStats } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity, Shield, ShieldAlert, Award, RefreshCw,
  AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, ScatterChart, Scatter, ZAxis
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <DashboardLayout>
      <AppShell title="SOC Dashboard" subtitle="Overview of UAV Network Traffic & Attack Detection">
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success font-semibold uppercase tracking-wider">
                System Status: {stats?.system_status || "Operational"}
              </span>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="soc-btn-ghost text-xs px-3 py-1.5 flex items-center gap-2 border border-border rounded-lg bg-card hover:bg-white/5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Metrics
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : (
              <>
                <StatCard
                  title="Total Packets Analyzed"
                  value={stats?.total_packets.toLocaleString() || 0}
                  subtitle={`${stats?.total_datasets} datasets uploaded`}
                  icon={Activity}
                  color="primary"
                />
                <StatCard
                  title="Normal Telemetry"
                  value={stats?.normal_packets.toLocaleString() || 0}
                  subtitle={stats?.total_packets ? `${((stats.normal_packets / stats.total_packets) * 100).toFixed(1)}% of total` : "0%"}
                  icon={Shield}
                  color="success"
                />
                <StatCard
                  title="Malicious Traffic"
                  value={stats?.malicious_packets.toLocaleString() || 0}
                  subtitle={stats?.total_packets ? `${((stats.malicious_packets / stats.total_packets) * 100).toFixed(1)}% of total` : "0%"}
                  icon={ShieldTriangleIcon}
                  color="critical"
                />
                <StatCard
                  title="ML Detection Accuracy"
                  value={stats?.detection_accuracy !== null && stats?.detection_accuracy !== undefined ? `${stats.detection_accuracy}%` : "N/A"}
                  subtitle={stats?.total_models ? `${stats.total_models} models trained` : "No active model"}
                  icon={Award}
                  color="warning"
                />
              </>
            )}
          </div>

          {/* Threat Score & Activity Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Threat Score Gauges */}
            <Card
              title="Threat Exposure Index"
              subtitle="Aggregated risk factors from active anomalous packets and unresolved alerts"
              className="flex flex-col justify-between"
            >
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-36 h-36">
                      <circle
                        className="text-white/5"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="72"
                        cy="72"
                      />
                      <circle
                        className={
                          (stats?.threat_score || 0) > 70
                            ? "text-critical"
                            : (stats?.threat_score || 0) > 40
                            ? "text-warning"
                            : "text-primary"
                        }
                        strokeWidth="10"
                        strokeDasharray={364}
                        strokeDashoffset={364 - (364 * (stats?.threat_score || 0)) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        r="58"
                        cx="72"
                        cy="72"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-white">{stats?.threat_score || 0}</span>
                      <span className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Threat Score</span>
                    </div>
                  </div>

                  <div className="w-full mt-6 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Active Alerts</span>
                      <span className="text-white font-medium">{stats?.active_alerts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Severity Threshold</span>
                      <span className="text-warning font-medium">Medium-High</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Packet Log Timeline */}
            <Card title="Traffic Timeline" subtitle="Chronological flow of packets flagged as attacks vs normal telemetry" className="col-span-2">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (stats?.packet_timeline.length || 0) === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted text-sm">
                  No packet telemetry timeline data. Upload a dataset to begin.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.packet_timeline}>
                      <defs>
                        <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAttack" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937", borderRadius: "8px" }}
                        labelStyle={{ color: "#fff", fontWeight: "bold" }}
                      />
                      <Area type="monotone" dataKey="normal" name="Normal" stroke="#22C55E" fillOpacity={1} fill="url(#colorNormal)" />
                      <Area type="monotone" dataKey="attack" name="Attack" stroke="#EF4444" fillOpacity={1} fill="url(#colorAttack)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Network Parameters & Protocol Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Protocol Distribution */}
            <Card title="Protocol Breakdown" subtitle="Distribution of observed wireless protocols">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (stats?.protocol_distribution.length || 0) === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted text-sm">
                  No protocol breakdown data.
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center">
                  <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.protocol_distribution}
                          dataKey="count"
                          nameKey="protocol"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {stats?.protocol_distribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937", borderRadius: "8px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3 text-xs">
                    {stats?.protocol_distribution.map((entry, index) => (
                      <div key={entry.protocol} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted">{entry.protocol}</span>
                        <span className="text-white font-medium">({entry.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Attack Types Distribution */}
            <Card title="Threat Classification" subtitle="Prevalence of active cyber attack vectors">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (stats?.attack_frequency.length || 0) === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted text-sm">
                  No threats detected in telemetry.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.attack_frequency} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
                      <YAxis dataKey="attack_type" type="category" stroke="#9CA3AF" fontSize={10} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937", borderRadius: "8px" }}
                      />
                      <Bar dataKey="count" name="Count" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={16}>
                        {stats?.attack_frequency.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Network Activity Rate vs Delay Scatter */}
            <Card title="Traffic Delay Profile" subtitle="Relation between Transmission Rate and Time Delay">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (stats?.network_activity.length || 0) === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted text-sm">
                  No activity profile data.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis type="number" dataKey="rate" name="Rate" unit=" kb/s" stroke="#9CA3AF" fontSize={10} />
                      <YAxis type="number" dataKey="delay" name="Delay" unit=" ms" stroke="#9CA3AF" fontSize={10} />
                      <ZAxis type="number" range={[60, 60]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937", borderRadius: "8px" }}
                      />
                      <Scatter name="Telemetry" data={stats?.network_activity}>
                        {stats?.network_activity.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.attack ? "#EF4444" : "#22C55E"}
                            fillOpacity={entry.attack ? 0.8 : 0.4}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Threats Table */}
          <Card title="Recent Threat Logs" subtitle="Latest alerts raised by the ML engine and telemetry monitor">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (stats?.recent_incidents.length || 0) === 0 ? (
              <div className="py-8 text-center text-muted text-sm">
                No active threats or alerts logged. System is secure.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                      <th className="pb-3 pl-4">Timestamp</th>
                      <th className="pb-3">Attack Type</th>
                      <th className="pb-3">Severity</th>
                      <th className="pb-3">Incident Message</th>
                      <th className="pb-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stats?.recent_incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-white/5 transition">
                        <td className="py-3.5 pl-4 text-muted">
                          {incident.triggered_at ? new Date(incident.triggered_at).toLocaleString() : "N/A"}
                        </td>
                        <td className="py-3.5 font-semibold text-white">{incident.attack_type}</td>
                        <td className="py-3.5">
                          <Badge variant={incident.severity === "critical" ? "critical" : incident.severity === "medium" ? "warning" : "default"}>
                            {incident.severity}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-muted">{incident.message}</td>
                        <td className="py-3.5 pr-4">
                          <Badge variant={incident.status === "unresolved" ? "critical" : "success"}>
                            {incident.status}
                          </Badge>
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

const ShieldTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Settings, getUser } from "@/lib/api";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, ShieldAlert, Key, User,
  Sliders, Save, RefreshCw, LogOut, CheckCircle, Trash2, AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Settings form states
  const [nEstimators, setNEstimators] = useState(50);
  const [threshold, setThreshold] = useState(0.5);
  const [notifications, setNotifications] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setNEstimators(data.n_estimators);
      setThreshold(data.detection_threshold);
      setNotifications(data.notifications_enabled);
    } catch (err) {
      toast.error("Failed to load user settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.updateSettings({
        n_estimators: Number(nEstimators),
        detection_threshold: Number(threshold),
        notifications_enabled: notifications,
      });
      toast.success("Operational thresholds updated successfully");
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update preferences");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password confirmation does not match.");
      return;
    }

    try {
      setUpdatingPass(true);
      await api.updatePassword(currentPassword, newPassword);
      toast.success("Security credentials updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change rejected");
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleResetData = async () => {
    try {
      setResetting(true);
      const res = await api.resetDemoData();
      toast.success(res.message || "Demo environment reset successfully.");
      setShowResetModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset demo environment");
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout>
      <AppShell title="System Settings" subtitle="Configure drone detection sensitivity thresholds and manage user credentials">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Settings Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Operational Thresholds Card */}
              <Card title="Detection Operational Limits" subtitle="Tune default machine learning probability boundaries">
                {loading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                          Default n_estimators
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="200"
                          value={nEstimators}
                          onChange={(e) => setNEstimators(Number(e.target.value))}
                          className="soc-input"
                          required
                        />
                        <p className="text-[9px] text-muted mt-1">
                          The number of decision trees fitted during Random Forest execution.
                        </p>
                      </div>

                      <div>
                        <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                          Probability Classification Threshold
                        </label>
                        <input
                          type="number"
                          min="0.05"
                          max="0.95"
                          step="0.05"
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="soc-input"
                          required
                        />
                        <p className="text-[9px] text-muted mt-1">
                          The probability threshold (0.0 to 1.0) required to classify a packet as malicious.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={notifications}
                        onChange={(e) => setNotifications(e.target.checked)}
                        className="rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="notifications" className="text-xs text-white font-medium cursor-pointer">
                        Enable Real-time Threat Alerts Dispatcher
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="soc-btn-primary text-xs py-2 px-5 flex items-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingSettings ? "Updating..." : "Save Preferences"}
                    </button>
                  </form>
                )}
              </Card>

              {/* Password update form */}
              <Card title="Security Credentials" subtitle="Update account verification credentials">
                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="soc-input"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="soc-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="soc-input"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPass}
                    className="soc-btn-primary text-xs py-2 px-5 flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {updatingPass ? "Verifying..." : "Update Password"}
                  </button>
                </form>
              </Card>

              {/* System Management Card */}
              <Card title="System Management" subtitle="Manage platform baseline state and demo data">
                <div className="space-y-4 text-xs">
                  <p className="text-muted leading-relaxed">
                    Resetting the system will permanently wipe all generated telemetry data, models, reports, alerts, activity logs, and analysis history. The system administrator credentials and global configuration parameters will be preserved.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="soc-btn-danger text-xs py-2 px-5 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Reset Demo Data
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Col: User Details card */}
            <div className="lg:col-span-1">
              <Card title="Administrator Identity" subtitle="SOC Profile Details">
                {user ? (
                  <div className="space-y-6 py-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{user.full_name}</h4>
                        <p className="text-muted text-xs truncate max-w-[180px]">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border/40">
                      <div className="flex justify-between py-1 border-b border-border/20">
                        <span className="text-muted">User ID</span>
                        <span className="text-white font-mono text-[10px] truncate max-w-[120px] select-all">
                          {user.id}
                        </span>
                      </div>
                      
                      <div className="flex justify-between py-1 border-b border-border/20">
                        <span className="text-muted">Security Role</span>
                        <Badge variant="primary" className="capitalize">
                          Administrator
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between py-1">
                        <span className="text-muted">System Authority</span>
                        <span className="text-success font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Authenticated
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-44 w-full" />
                )}
              </Card>
            </div>

          </div>
        </div>

        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-border/40">
                <div className="flex items-center gap-3 text-critical">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">Reset Demo Environment?</h3>
                </div>
              </div>
              <div className="p-6 space-y-3 text-xs text-muted leading-relaxed">
                <p>This will permanently remove all demo-generated data including:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Uploaded datasets</li>
                  <li>ML prediction history</li>
                  <li>Reports</li>
                  <li>Activity logs</li>
                  <li>Alerts</li>
                  <li>Analysis history</li>
                </ul>
                <p className="font-semibold text-critical/80 mt-2">Administrator account will NOT be deleted.</p>
              </div>
              <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetData}
                  disabled={resetting}
                  className="soc-btn bg-critical hover:bg-critical/90 text-white text-xs py-2 px-5 flex items-center gap-2"
                >
                  {resetting ? "Resetting..." : "Reset Data"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </DashboardLayout>
  );
}

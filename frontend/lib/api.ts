const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function setUser(user: object) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res as unknown as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<User>("/api/auth/me"),

  getDashboardStats: () => request<DashboardStats>("/api/dashboard/stats"),

  getDatasets: () => request<Dataset[]>("/api/datasets"),

  uploadDataset: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Dataset>("/api/datasets/upload", { method: "POST", body: form });
  },

  analyzeDataset: (id: string) =>
    request<Dataset>(`/api/datasets/${id}/analyze`, { method: "POST" }),

  getTraffic: (id: string, params: Record<string, string | number | boolean | undefined | null>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== "" && v !== undefined && v !== null) qs.set(k, String(v));
    });
    return request<PaginatedPackets>(`/api/traffic/${id}?${qs}`);
  },

  getModels: () => request<MLModel[]>("/api/ml/models"),

  trainModel: (data: { dataset_id: string; n_estimators?: number; name?: string }) =>
    request<{ model: MLModel; metrics: Metrics }>("/api/ml/train", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  predict: (datasetId: string, modelId?: string) =>
    request<PredictResult>(`/api/ml/predict/${datasetId}`, {
      method: "POST",
      body: JSON.stringify({ model_id: modelId || null }),
    }),

  runForensics: (datasetId: string) =>
    request<ForensicsResult>(`/api/forensics/${datasetId}/investigate`, { method: "POST" }),

  getAlerts: (params?: { status?: string; severity?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>);
    return request<Alert[]>(`/api/alerts?${qs}`);
  },

  resolveAlert: (id: string) =>
    request<Alert>(`/api/alerts/${id}/resolve`, { method: "PATCH" }),

  getReports: () => request<Report[]>("/api/reports"),

  generateReport: (investigationId: string) =>
    request<Report>(`/api/reports/generate/${investigationId}`, { method: "POST" }),

  downloadReport: (id: string) => {
    const token = getToken();
    return `${API_URL}/api/reports/${id}/download?token=${token}`;
  },

  getAuditLogs: () => request<AuditLog[]>("/api/logs/audit"),

  getActivityLogs: () => request<ActivityLog[]>("/api/logs/activity"),

  getSettings: () => request<Settings>("/api/auth/settings"),

  updateSettings: (data: Partial<Settings>) =>
    request<Settings>("/api/auth/settings", { method: "PUT", body: JSON.stringify(data) }),

  updatePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/api/auth/password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    }),

  resetDemoData: () =>
    request<{ message: string }>("/api/system/reset", { method: "POST" }),
};

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface DashboardStats {
  total_packets: number;
  normal_packets: number;
  malicious_packets: number;
  detection_accuracy: number | null;
  active_alerts: number;
  threat_score: number;
  total_datasets: number;
  total_models: number;
  system_status: string;
  packet_timeline: { time: string; normal: number; attack: number }[];
  network_activity: { rate: number; delay: number; attack: number }[];
  recent_incidents: { id: string; severity: string; attack_type: string; message: string; status: string; triggered_at: string }[];
  protocol_distribution: { protocol: string; count: number }[];
  attack_frequency: { attack_type: string; count: number }[];
}

export interface Dataset {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  row_count: number;
  status: string;
  error_message: string | null;
  uploaded_at: string;
}

export interface Packet {
  id: number;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  protocol: string;
  packet_size: number;
  time_delay: number;
  transmission_rate: number;
  mac_address: string;
  is_attack: boolean;
  attack_type: string;
}

export interface PaginatedPackets {
  items: Packet[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MLModel {
  id: string;
  name: string;
  model_type: string;
  accuracy: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  is_active: boolean;
  trained_at: string;
}

export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  labels: number[];
}

export interface PredictResult {
  model_id: string;
  total_predictions: number;
  attack_count: number;
  normal_count: number;
  alerts_created: number;
}

export interface ForensicsResult {
  investigation: { id: string; title: string; threat_score: number; summary: string };
  timeline: { timestamp: string; attack_count: number; dominant_attack: string }[];
  iocs: { id: string; ioc_type: string; value: string; severity: string; occurrence_count: number; description: string }[];
  protocol_analysis: { protocol: string; total: number; attacks: number; attack_rate: number }[];
  packet_inspection_summary: Record<string, number>;
  top_attacking_ips: { ip: string; count: number }[];
}

export interface Alert {
  id: string;
  severity: string;
  attack_type: string;
  message: string;
  status: string;
  triggered_at: string;
}

export interface Report {
  id: string;
  investigation_id: string;
  title: string;
  generated_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  resource_type: string;
  created_at: string;
  details: Record<string, unknown>;
}

export interface ActivityLog {
  id: number;
  activity_type: string;
  message: string;
  created_at: string;
}

export interface Settings {
  n_estimators: number;
  detection_threshold: number;
  notifications_enabled: boolean;
}

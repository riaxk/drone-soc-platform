"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Dataset } from "@/lib/api";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
  UploadCloud, FileText, Database, ShieldAlert,
  Clock, Play, Eye, Trash2, CheckCircle2, AlertCircle
} from "lucide-react";

export default function DatasetsPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const data = await api.getDatasets();
      setDatasets(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    // Check extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "pcap") {
      toast.error("Unsupported file format. Only CSV or PCAP are allowed.");
      return;
    }

    try {
      setUploading(true);
      setProgress(10);
      
      // Simulate progress bar increments
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 200);

      await api.uploadDataset(file);
      clearInterval(interval);
      setProgress(100);
      
      toast.success(`Successfully uploaded ${file.name}`);
      fetchDatasets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.tcpdump.pcap": [".pcap"],
    },
  });

  const handleAnalyze = async (id: string, name: string) => {
    toast.info(`Starting forensic analysis on dataset: ${name}`);
    
    // Optimistically update status to processing
    setDatasets((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "processing" } : d))
    );

    try {
      await api.analyzeDataset(id);
      toast.success(`Analysis complete for ${name}. Telemetry ingested.`);
      fetchDatasets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      fetchDatasets();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <DashboardLayout>
      <AppShell title="Dataset Management" subtitle="Upload and prepare UAV network traffic telemetry logs">
        <div className="space-y-6">
          {/* Drag & Drop Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <input {...getInputProps()} />
            <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            {isDragActive ? (
              <p className="text-sm font-medium text-white">Drop your PCAP or CSV telemetry file here...</p>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-white">Drag & drop your network dataset file</p>
                <p className="text-xs text-muted mt-1">Supports standard CSV telemetry or Wireshark PCAP packets</p>
              </div>
            )}

            {uploading && (
              <div className="w-full max-w-xs mt-6 space-y-2">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-[10px] text-muted font-mono">{progress}% uploaded</p>
              </div>
            )}
          </div>

          {/* Dataset Inventory Card */}
          <Card title="Upload History" subtitle="Telemetry datasets cataloged in the SOC database">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : datasets.length === 0 ? (
              <div className="py-12 text-center text-muted">
                <Database className="w-8 h-8 mx-auto text-muted mb-2 opacity-50" />
                <p className="text-sm">No datasets uploaded yet.</p>
                <p className="text-xs mt-1">Use the upload box above to add your first flight traffic log.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                      <th className="pb-3 pl-4">Filename</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Packets Count</th>
                      <th className="pb-3">Uploaded</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {datasets.map((dataset) => (
                      <tr key={dataset.id} className="hover:bg-white/5 transition">
                        <td className="py-4 pl-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-semibold text-white max-w-xs truncate">
                                {dataset.original_filename}
                              </p>
                              {dataset.error_message && (
                                <p className="text-xs text-critical flex items-center gap-1 mt-0.5">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {dataset.error_message}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 capitalize font-mono text-xs">{dataset.file_type}</td>
                        <td className="py-4 text-muted text-xs">{formatBytes(dataset.file_size_bytes)}</td>
                        <td className="py-4 font-mono text-xs text-white">
                          {dataset.row_count ? dataset.row_count.toLocaleString() : "-"}
                        </td>
                        <td className="py-4 text-muted text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(dataset.uploaded_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={
                              dataset.status === "ready"
                                ? "success"
                                : dataset.status === "processing"
                                ? "warning"
                                : dataset.status === "failed"
                                ? "critical"
                                : "default"
                            }
                            pulse={dataset.status === "processing"}
                          >
                            {dataset.status === "processing" ? "Processing..." : dataset.status}
                          </Badge>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {dataset.status === "uploaded" && (
                              <button
                                onClick={() => handleAnalyze(dataset.id, dataset.original_filename)}
                                className="soc-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3" />
                                Ingest Data
                              </button>
                            )}
                            {dataset.status === "ready" && (
                              <>
                                <button
                                  onClick={() => router.push(`/analysis?dataset=${dataset.id}`)}
                                  className="soc-btn-ghost border border-border text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/5"
                                >
                                  <Eye className="w-3 h-3 text-muted hover:text-white" />
                                  Explore Traffic
                                </button>
                                <button
                                  onClick={() => router.push(`/ml-detection?dataset=${dataset.id}`)}
                                  className="soc-btn-ghost border border-border text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/5 text-primary hover:text-primary-light"
                                >
                                  <Database className="w-3 h-3" />
                                  Run ML Detection
                                </button>
                              </>
                            )}
                            {dataset.status === "failed" && (
                              <Badge variant="critical">Ingestion Blocked</Badge>
                            )}
                          </div>
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

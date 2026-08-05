"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, Skeleton } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Dataset, MLModel, Metrics, PredictResult } from "@/lib/api";
import { toast } from "sonner";
import {
  Brain, Settings, Play, Award, CheckCircle, Database,
  TrendingUp, RefreshCw, BarChart2, ShieldAlert, Cpu
} from "lucide-react";

export default function MLDetectionPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<MLModel[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);

  // Train form state
  const [trainDatasetId, setTrainDatasetId] = useState("");
  const [modelType, setModelType] = useState("RandomForest");
  const [nEstimators, setNEstimators] = useState(50);
  const [modelName, setModelName] = useState("");
  const [training, setTraining] = useState(false);
  const [trainMetrics, setTrainMetrics] = useState<Metrics | null>(null);

  // Predict form state
  const [predictDatasetId, setPredictDatasetId] = useState("");
  const [predictModelId, setPredictModelId] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [predictResult, setPredictResult] = useState<PredictResult | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"models" | "train" | "predict">("models");

  const fetchData = async () => {
    try {
      setLoadingDatasets(true);
      setLoadingModels(true);
      
      const [dList, mList] = await Promise.all([
        api.getDatasets(),
        api.getModels()
      ]);

      const readyDatasets = dList.filter((d) => d.status === "ready");
      setDatasets(readyDatasets);
      setModels(mList);

      if (readyDatasets.length > 0) {
        setTrainDatasetId(readyDatasets[0].id);
        setPredictDatasetId(readyDatasets[0].id);
      }
      
      const activeModel = mList.find((m) => m.is_active);
      if (activeModel) {
        setPredictModelId(activeModel.id);
      } else if (mList.length > 0) {
        setPredictModelId(mList[0].id);
      }
    } catch (err) {
      toast.error("Failed to load ML parameters and logs");
    } finally {
      setLoadingDatasets(false);
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainDatasetId) {
      toast.error("Please select a training dataset.");
      return;
    }

    try {
      setTraining(true);
      setTrainMetrics(null);
      toast.info("Training AI classifier on telemetry parameters...");

      const res = await api.trainModel({
        dataset_id: trainDatasetId,
        n_estimators: Number(nEstimators),
        name: modelName || undefined,
      });

      setTrainMetrics(res.metrics);
      toast.success(`Random Forest classifier trained: ${res.model.name}`);
      fetchData(); // reload models
      setActiveTab("models");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI training failed");
    } finally {
      setTraining(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictDatasetId) {
      toast.error("Please select a target dataset for prediction.");
      return;
    }

    try {
      setPredicting(true);
      setPredictResult(null);
      toast.info("Running machine learning classification scan...");

      const res = await api.predict(predictDatasetId, predictModelId || undefined);
      setPredictResult(res);
      toast.success("Classification complete. Check alerts and forensics modules.");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prediction execution failed");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <DashboardLayout>
      <AppShell title="ML Attack Detection" subtitle="Train machine learning classifiers and run security anomaly predictions">
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: "models", label: "Trained Models Catalog", icon: Database },
              { id: "train", label: "Train AI Classifier", icon: Cpu },
              { id: "predict", label: "Run Telemetry Classification", icon: Play }
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

          {/* Model Catalog Tab */}
          {activeTab === "models" && (
            <div className="space-y-6">
              <Card title="Classifier Models Inventory" subtitle="History of trained Scikit-learn Random Forest instances">
                {loadingModels ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : models.length === 0 ? (
                  <div className="py-12 text-center text-muted">
                    <Brain className="w-10 h-10 mx-auto opacity-50 mb-3" />
                    <p className="text-sm">No trained classifiers found.</p>
                    <p className="text-xs mt-1">Navigate to 'Train AI Classifier' to build your first telemetry model.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted font-semibold uppercase tracking-wider">
                          <th className="pb-3 pl-4">Model Name</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3 text-center">Accuracy</th>
                          <th className="pb-3 text-center">Precision</th>
                          <th className="pb-3 text-center">Recall</th>
                          <th className="pb-3 text-center">F1 Score</th>
                          <th className="pb-3">Trained At</th>
                          <th className="pb-3 pr-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {models.map((m) => (
                          <tr key={m.id} className="hover:bg-white/5 transition">
                            <td className="py-3.5 pl-4 font-semibold text-white">{m.name}</td>
                            <td className="py-3.5 font-mono text-muted text-[10px]">{m.model_type}</td>
                            <td className="py-3.5 text-center font-mono text-white">
                              {m.accuracy ? `${(m.accuracy * 100).toFixed(2)}%` : "-"}
                            </td>
                            <td className="py-3.5 text-center font-mono text-muted">
                              {m.precision_score ? `${(m.precision_score * 100).toFixed(2)}%` : "-"}
                            </td>
                            <td className="py-3.5 text-center font-mono text-muted">
                              {m.recall_score ? `${(m.recall_score * 100).toFixed(2)}%` : "-"}
                            </td>
                            <td className="py-3.5 text-center font-mono text-muted">
                              {m.f1_score ? `${(m.f1_score * 100).toFixed(2)}%` : "-"}
                            </td>
                            <td className="py-3.5 text-muted">
                              {new Date(m.trained_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 pr-4 text-right">
                              <Badge variant={m.is_active ? "success" : "default"}>
                                {m.is_active ? "ACTIVE CLASSIFIER" : "ARCHIVED"}
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
          )}

          {/* Train AI Classifier Tab */}
          {activeTab === "train" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card */}
              <div className="lg:col-span-1">
                <Card title="Training Parameters" subtitle="Configure RandomForest training settings">
                  <form onSubmit={handleTrain} className="space-y-4 text-xs">
                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Select Labeled Dataset
                      </label>
                      <select
                        value={trainDatasetId}
                        onChange={(e) => setTrainDatasetId(e.target.value)}
                        className="soc-input text-xs"
                        required
                      >
                        <option value="">Select a ready dataset</option>
                        {datasets.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.original_filename}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Algorithm Class
                      </label>
                      <select
                        value={modelType}
                        onChange={(e) => setModelType(e.target.value)}
                        className="soc-input text-xs"
                      >
                        <option value="RandomForest">Random Forest Classifier</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Estimators Count (n_estimators)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={nEstimators}
                        onChange={(e) => setNEstimators(Number(e.target.value))}
                        className="soc-input text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Custom Model Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., RandomForest-MAVLinkDoS"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="soc-input text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={training || datasets.length === 0}
                      className="soc-btn-primary w-full text-xs py-2 mt-2 flex items-center justify-center gap-2"
                    >
                      <Brain className="w-4 h-4 animate-pulse" />
                      {training ? "Fitting Random Forest Classifier..." : "Execute AI Training"}
                    </button>
                  </form>
                </Card>
              </div>

              {/* Training Outputs (Metrics & Confusion Matrix) */}
              <div className="lg:col-span-2">
                <Card title="Training Performance Metrics" subtitle="Result metrics evaluated on 20% testing partition">
                  {training ? (
                    <div className="space-y-4 py-8">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted text-xs">Fitting trees and computing decision limits...</p>
                      </div>
                    </div>
                  ) : trainMetrics ? (
                    <div className="space-y-6">
                      {/* Metric cards row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Accuracy", val: trainMetrics.accuracy },
                          { label: "Precision", val: trainMetrics.precision },
                          { label: "Recall", val: trainMetrics.recall },
                          { label: "F1 Score", val: trainMetrics.f1_score }
                        ].map((m) => (
                          <div key={m.label} className="bg-white/5 p-3 rounded-lg border border-border text-center">
                            <span className="text-[10px] text-muted uppercase font-medium">{m.label}</span>
                            <p className="text-xl font-bold text-white font-mono mt-1">{(m.val * 100).toFixed(2)}%</p>
                          </div>
                        ))}
                      </div>

                      {/* Confusion Matrix */}
                      <div>
                        <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          Testing Confusion Matrix
                        </h4>
                        
                        <div className="max-w-xs mx-auto grid grid-cols-3 gap-2 text-[11px] font-mono">
                          {/* Col Headers */}
                          <div />
                          <div className="text-center font-semibold text-muted">Pred Normal</div>
                          <div className="text-center font-semibold text-muted">Pred Attack</div>

                          {/* Row 1 */}
                          <div className="font-semibold text-muted flex items-center justify-end pr-2">Actual Normal</div>
                          <div className="bg-success/10 border border-success/30 p-3 rounded text-center text-success font-bold">
                            {trainMetrics.confusion_matrix?.[0]?.[0] || 0}
                          </div>
                          <div className="bg-critical/10 border border-critical/30 p-3 rounded text-center text-critical font-semibold">
                            {trainMetrics.confusion_matrix?.[0]?.[1] || 0}
                          </div>

                          {/* Row 2 */}
                          <div className="font-semibold text-muted flex items-center justify-end pr-2">Actual Attack</div>
                          <div className="bg-critical/10 border border-critical/30 p-3 rounded text-center text-critical font-semibold">
                            {trainMetrics.confusion_matrix?.[1]?.[0] || 0}
                          </div>
                          <div className="bg-success/10 border border-success/30 p-3 rounded text-center text-success font-bold">
                            {trainMetrics.confusion_matrix?.[1]?.[1] || 0}
                          </div>
                        </div>
                        
                        <p className="text-center text-[10px] text-muted mt-3">
                          * True Positives and True Negatives highlight classifier capability.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-muted">
                      <Award className="w-12 h-12 mx-auto text-muted mb-2 opacity-30" />
                      <p className="text-sm">Metrics will be plotted here post-training run.</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Run Classification predictions */}
          {activeTab === "predict" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Column */}
              <div className="lg:col-span-1">
                <Card title="Anomaly Classification Run" subtitle="Perform ML inference on flight logs">
                  <form onSubmit={handlePredict} className="space-y-4 text-xs">
                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Select Ingestion Dataset
                      </label>
                      <select
                        value={predictDatasetId}
                        onChange={(e) => setPredictDatasetId(e.target.value)}
                        className="soc-input text-xs"
                        required
                      >
                        <option value="">Select a ready dataset</option>
                        {datasets.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.original_filename}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted font-medium uppercase tracking-wider block mb-1">
                        Select Decision Model
                      </label>
                      <select
                        value={predictModelId}
                        onChange={(e) => setPredictModelId(e.target.value)}
                        className="soc-input text-xs"
                        required
                      >
                        <option value="">Select active classifier</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.is_active ? "(Active)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={predicting || models.length === 0 || datasets.length === 0}
                      className="soc-btn-primary w-full text-xs py-2 mt-2 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {predicting ? "Classifying Telemetry Packets..." : "Run ML Scan"}
                    </button>
                  </form>
                </Card>
              </div>

              {/* Results Column */}
              <div className="lg:col-span-2">
                <Card title="Classification Scan Findings" subtitle="Anomalous packets detected using the trained model">
                  {predicting ? (
                    <div className="space-y-4 py-8">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted text-xs">Matching logs against random trees decision boundaries...</p>
                      </div>
                    </div>
                  ) : predictResult ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-lg border border-border">
                          <span className="text-[10px] text-muted uppercase font-medium">Classified Packets</span>
                          <p className="text-2xl font-bold text-white font-mono mt-1">
                            {predictResult.total_predictions.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-critical/10 p-4 rounded-lg border border-critical/30">
                          <span className="text-[10px] text-critical uppercase font-medium">Attacks Flagged</span>
                          <p className="text-2xl font-bold text-critical font-mono mt-1">
                            {predictResult.attack_count.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-success/10 p-4 rounded-lg border border-success/30">
                          <span className="text-[10px] text-success uppercase font-medium">Normal Flight Telemetry</span>
                          <p className="text-2xl font-bold text-success font-mono mt-1">
                            {predictResult.normal_count.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-white/5 border border-border flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-white">Alerts Raised</h4>
                          <p className="text-[10px] text-muted mt-0.5">
                            Real-time SOC alerts dispatched to the threat notification queue
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-critical animate-pulse" />
                          <span className="text-lg font-bold text-white font-mono">
                            {predictResult.alerts_created}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-muted">
                      <TrendingUp className="w-12 h-12 mx-auto text-muted mb-2 opacity-30" />
                      <p className="text-sm">Scan results will be displayed here post-prediction execution.</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </DashboardLayout>
  );
}

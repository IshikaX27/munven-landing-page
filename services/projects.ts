import { fetchApi } from "./api";
import { Decision, DecisionKind, Discipline, Feature, FeatureOverview, Project } from "../types/index";

export interface DecisionInput {
  kind: DecisionKind;
  title: string;
  detail?: string | null;
  discipline?: Discipline | null;
}

export const projectService = {
  async list(): Promise<Project[]> {
    return fetchApi("/projects", { method: "GET" });
  },

  async create(name: string, description?: string): Promise<Project> {
    return fetchApi("/projects", { method: "POST", body: JSON.stringify({ name, description: description || null }) });
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<void> {
    await fetchApi(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  async remove(id: string): Promise<void> {
    await fetchApi(`/projects/${id}`, { method: "DELETE" });
  },

  async createFeature(projectId: string, name: string, description?: string): Promise<Feature> {
    return fetchApi(`/projects/${projectId}/features`, {
      method: "POST",
      body: JSON.stringify({ name, description: description || null }),
    });
  },

  async updateFeature(id: string, data: { name?: string; description?: string }): Promise<Feature> {
    return fetchApi(`/features/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  async removeFeature(id: string): Promise<void> {
    await fetchApi(`/features/${id}`, { method: "DELETE" });
  },

  async overview(featureId: string): Promise<FeatureOverview> {
    return fetchApi(`/features/${featureId}/overview`, { method: "GET" });
  },

  async addDecision(featureId: string, data: DecisionInput): Promise<Decision> {
    return fetchApi(`/features/${featureId}/decisions`, { method: "POST", body: JSON.stringify(data) });
  },

  async updateDecision(id: string, data: Partial<DecisionInput>): Promise<Decision> {
    return fetchApi(`/decisions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  async removeDecision(id: string): Promise<void> {
    await fetchApi(`/decisions/${id}`, { method: "DELETE" });
  },
};

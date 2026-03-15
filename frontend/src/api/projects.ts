import { apiClient } from "./client";
import type { Project, ContentType } from "@/types";

export interface CreateProjectPayload {
  title: string;
  source_text: string;
  content_type: ContentType;
}

export interface ProjectListFilters {
  status?: string;
  content_type?: string;
  search?: string;
}

export const projectsApi = {
  list: async (filters?: ProjectListFilters): Promise<Project[]> => {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.content_type) params.content_type = filters.content_type;
    if (filters?.search) params.search = filters.search;
    
    const res = await apiClient.get<Project[]>("/projects", { params });
    return res.data;
  },

  get: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },

  create: async (payload: CreateProjectPayload): Promise<Project> => {
    const res = await apiClient.post<Project>("/projects", payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};

import { apiClient } from "./client";
import type { RenderJob, RenderOutput } from "@/types";

export interface RenderConfig {
  resolution: string;
  fps: number;
  bg_color: string;
  accent_color: string;
  caption_color: string;
  caption_font_size: number;
  caption_position: "top" | "center" | "bottom";
}

export const renderApi = {
  startRender: async (projectId: string, config?: RenderConfig): Promise<RenderJob> => {
    const payload = config ? { config } : {};
    const res = await apiClient.post<RenderJob>(`/render/${projectId}`, payload);
    return res.data;
  },

  getStatus: async (projectId: string): Promise<RenderJob> => {
    const res = await apiClient.get<RenderJob>(`/render/${projectId}/status`);
    return res.data;
  },

  getDownloadUrls: async (projectId: string): Promise<RenderOutput[]> => {
    const res = await apiClient.get<RenderOutput[]>(
      `/render/${projectId}/download`
    );
    return res.data;
  },

  uploadToYoutube: async (projectId: string): Promise<{ url: string }> => {
    const res = await apiClient.post<{ url: string }>(
      `/upload/${projectId}/youtube`
    );
    return res.data;
  },

  uploadToInstagram: async (projectId: string): Promise<{ url: string }> => {
    const res = await apiClient.post<{ url: string }>(
      `/upload/${projectId}/instagram`
    );
    return res.data;
  },
};

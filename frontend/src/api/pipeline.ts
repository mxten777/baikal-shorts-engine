import { apiClient } from "./client";
import type { PipelineState, PipelineStep, Script, Scene } from "@/types";

export const pipelineApi = {
  run: async (projectId: string): Promise<void> => {
    await apiClient.post(`/pipeline/${projectId}/run`);
  },

  getStatus: async (projectId: string): Promise<PipelineState> => {
    const res = await apiClient.get<PipelineState>(
      `/pipeline/${projectId}/status`
    );
    return res.data;
  },

  rerunStep: async (projectId: string, step: PipelineStep): Promise<void> => {
    await apiClient.post(`/pipeline/${projectId}/step/${step}`);
  },

  getScript: async (projectId: string): Promise<Script> => {
    const res = await apiClient.get<Script>(`/scripts/${projectId}`);
    return res.data;
  },

  updateScript: async (
    projectId: string,
    data: Partial<Pick<Script, "hook" | "body" | "cta">>
  ): Promise<Script> => {
    const res = await apiClient.put<Script>(`/scripts/${projectId}`, data);
    return res.data;
  },

  generateTts: async (projectId: string): Promise<void> => {
    await apiClient.post(`/scripts/${projectId}/tts`);
  },

  uploadAudio: async (projectId: string, file: File): Promise<void> => {
    const form = new FormData();
    form.append("file", file);
    await apiClient.post(`/scripts/${projectId}/upload-audio`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getScenes: async (projectId: string): Promise<Scene[]> => {
    const res = await apiClient.get<Scene[]>(`/scenes/${projectId}`);
    return res.data;
  },

  updateScene: async (
    projectId: string,
    sceneId: string,
    data: Partial<Scene>
  ): Promise<Scene> => {
    const res = await apiClient.put<Scene>(
      `/scenes/${projectId}/${sceneId}`,
      data
    );
    return res.data;
  },

  // SSE 스트림 구독 (EventSource)
  createStream: (projectId: string): EventSource => {
    const base = import.meta.env.VITE_API_URL || "/api/v1";
    return new EventSource(`${base}/pipeline/${projectId}/stream`);
  },
};

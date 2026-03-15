import { create } from "zustand";
import type { Project, PipelineState, Script, Scene, RenderJob } from "@/types";

interface ProjectStore {
  // 프로젝트 목록
  projects: Project[];
  setProjects: (projects: Project[]) => void;

  // 현재 선택된 프로젝트
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  // 파이프라인 상태
  pipelineState: PipelineState | null;
  setPipelineState: (state: PipelineState) => void;

  // 대본
  script: Script | null;
  setScript: (script: Script | null) => void;

  // 씬 목록
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  updateScene: (sceneId: string, data: Partial<Scene>) => void;

  // 렌더 작업
  renderJob: RenderJob | null;
  setRenderJob: (job: RenderJob | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),

  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  pipelineState: null,
  setPipelineState: (pipelineState) => set({ pipelineState }),

  script: null,
  setScript: (script) => set({ script }),

  scenes: [],
  setScenes: (scenes) => set({ scenes }),
  updateScene: (sceneId, data) =>
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, ...data } : s
      ),
    })),

  renderJob: null,
  setRenderJob: (renderJob) => set({ renderJob }),
}));

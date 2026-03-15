// 공통 타입 정의

export type ContentType =
  | "PROBLEM"
  | "SOLUTION"
  | "CASE"
  | "COMPARE"
  | "SALES"
  | "BRAND";

export type ProjectStatus =
  | "draft"
  | "processing"
  | "ready"
  | "done"
  | "failed";

export type PipelineStep =
  | "summary"
  | "plan"
  | "script"
  | "scenes"
  | "tts"
  | "render"
  | "package";

export type StepStatus = "pending" | "running" | "done" | "failed";

export interface Project {
  id: string;
  title: string;
  source_text: string;
  content_type: ContentType;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface PipelineRun {
  id: string;
  project_id: string;
  step: PipelineStep;
  status: StepStatus;
  result_json?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
}

export interface PipelineState {
  steps: Record<PipelineStep, StepStatus>;
  current_step: PipelineStep | null;
  error?: string;
}

export interface Script {
  id: string;
  project_id: string;
  hook: string;
  body: string;
  cta: string;
  tts_voice: string;
  audio_url?: string;
  version: number;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_order: number;
  duration_sec: number;
  description: string;
  caption_text: string;
  visual_hint: string;
}

export interface RenderJob {
  id: string;
  project_id: string;
  status: "pending" | "running" | "done" | "failed";
  progress: number;
  output_url?: string;
  thumbnail_url?: string;
  package_url?: string;
  created_at: string;
}

export interface RenderOutput {
  id: string;
  render_job_id: string;
  channel: "youtube" | "instagram" | "linkedin";
  video_url: string;
  caption_text: string;
  hashtags: string[];
  thumbnail_text: string;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  PROBLEM: "문제제기형",
  SOLUTION: "해결제시형",
  CASE: "구축사례형",
  COMPARE: "비교형",
  SALES: "영업전환형",
  BRAND: "대표브랜딩형",
};

export const PIPELINE_STEP_LABELS: Record<PipelineStep, string> = {
  summary: "핵심 요약",
  plan: "기획 생성",
  script: "대본 생성",
  scenes: "씬 분해",
  tts: "음성 생성",
  render: "영상 렌더링",
  package: "패키지 생성",
};

export const PIPELINE_STEPS: PipelineStep[] = [
  "summary",
  "plan",
  "script",
  "scenes",
  "tts",
  "render",
  "package",
];

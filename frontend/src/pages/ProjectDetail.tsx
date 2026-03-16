import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/api/projects";
import { pipelineApi } from "@/api/pipeline";
import { renderApi, type RenderConfig } from "@/api/render";
import { usePipeline } from "@/hooks/usePipeline";
import { PipelineStatus } from "@/components/pipeline/PipelineStatus";
import { RenderConfigDialog } from "@/components/render/RenderConfigDialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import type { Scene } from "@/types";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Mic,
  Upload,
  Film,
  Trash2,
  ExternalLink,
  Settings,
} from "lucide-react";

type TabType = "script" | "scenes" | "render";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("script");
  const [showRenderConfig, setShowRenderConfig] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
    retry: false,
  });

  // 프로젝트가 존재하지 않으면 홈으로 리다이렉트
  useEffect(() => {
    if (id && project === undefined) {
      // 쿼리가 실패했으나 데이터가 없으면 404로 간주
      const timer = setTimeout(() => {
        if (!project) {
          toast.error("프로젝트를 찾을 수 없습니다.");
          navigate("/");
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [project, id, navigate]);

  const { pipelineState, startPipeline } = usePipeline(id);

  const { data: script } = useQuery({
    queryKey: ["script", id],
    queryFn: () => pipelineApi.getScript(id!),
    enabled: !!id && pipelineState?.steps?.script === "done",
    retry: false,
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ["scenes", id],
    queryFn: () => pipelineApi.getScenes(id!),
    enabled: !!id && pipelineState?.steps?.scenes === "done",
    retry: false,
  });

  const [editedHook, setEditedHook] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedCta, setEditedCta] = useState("");

  useEffect(() => {
    if (script) {
      setEditedHook(script.hook);
      setEditedBody(script.body);
      setEditedCta(script.cta);
    }
  }, [script]);

  const saveScriptMutation = useMutation({
    mutationFn: () =>
      pipelineApi.updateScript(id!, {
        hook: editedHook,
        body: editedBody,
        cta: editedCta,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", id] });
      toast.success("대본이 저장되었습니다.");
    },
    onError: () => toast.error("저장 실패. 다시 시도해주세요."),
  });

  const ttsMutation = useMutation({
    mutationFn: () => pipelineApi.generateTts(id!),
    onSuccess: () => toast.success("TTS 생성을 시작했습니다."),
    onError: () => toast.error("TTS 생성 실패."),
  });

  const renderMutation = useMutation({
    mutationFn: (config?: RenderConfig) => renderApi.startRender(id!, config),
    onSuccess: () => {
      toast.success("렌더링을 시작했습니다!");
      navigate(`/renders/${id}`);
    },
    onError: () => toast.error("렌더링 시작 실패."),
  });

  const handleStartRender = (config: RenderConfig) => {
    renderMutation.mutate(config);
  };

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id!),
    onSuccess: () => {
      toast.success("프로젝트가 삭제되었습니다.");
      navigate("/");
    },
    onError: () => toast.error("삭제 실패. 다시 시도해주세요."),
  });

  const handleDelete = () => {
    if (window.confirm(`"${project?.title}" 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteMutation.mutate();
    }
  };

  const handleRestartPipeline = () => {
    toast.success("파이프라인 재실행을 시작합니다!");
    startPipeline();
  };

  const isScriptDone = pipelineState?.steps?.script === "done";
  const isScenesDone = pipelineState?.steps?.scenes === "done";
  const isTtsDone = pipelineState?.steps?.tts === "done";
  const isRenderDone = project?.status === "done";

  // 프로젝트 생성 직후 파이프라인 자동 시작
  useEffect(() => {
    if (project?.status === "draft" && !pipelineState) {
      startPipeline();
    }
  }, [project?.status]);

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-baikal-muted hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        대시보드
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{project?.title}</h1>
          <p className="text-baikal-muted text-sm mt-1">
            {project?.content_type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestartPipeline}
            className="flex items-center gap-2 px-4 py-2 bg-baikal-gray border border-baikal-gray-light rounded-xl text-sm text-baikal-muted hover:text-white hover:border-baikal-cyan/50 transition-all"
          >
            <RefreshCw size={14} />
            전체 재실행
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-baikal-gray border border-red-500/30 rounded-xl text-sm text-red-400 hover:text-red-300 hover:border-red-500/60 transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      </div>

      {/* 파이프라인 상태 */}
      {pipelineState && (
        <div className="mb-6">
          <PipelineStatus
            steps={pipelineState.steps}
            current_step={pipelineState.current_step}
            error={pipelineState.error}
          />
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-baikal-gray rounded-xl p-1 w-fit">
        {(["script", "scenes", "render"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-baikal-gray-light text-white"
                : "text-baikal-muted hover:text-white"
            )}
          >
            {tab === "script" ? "대본" : tab === "scenes" ? "씬 구성" : "렌더링"}
          </button>
        ))}
      </div>

      {/* 대본 탭 */}
      {activeTab === "script" && (
        <div className="space-y-4">
          {!isScriptDone ? (
            <div className="text-center py-12 text-baikal-muted">
              대본 생성 대기 중...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-baikal-text mb-2">
                  🎣 후크 (첫 3초)
                </label>
                <input
                  value={editedHook}
                  onChange={(e) => setEditedHook(e.target.value)}
                  className="w-full bg-baikal-gray border border-baikal-gray-light rounded-xl px-4 py-3 text-white focus:outline-none focus:border-baikal-cyan transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-baikal-text mb-2">
                  📝 본문 대본
                </label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                  className="w-full bg-baikal-gray border border-baikal-gray-light rounded-xl px-4 py-3 text-white focus:outline-none focus:border-baikal-cyan transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-baikal-text mb-2">
                  📣 CTA
                </label>
                <input
                  value={editedCta}
                  onChange={(e) => setEditedCta(e.target.value)}
                  className="w-full bg-baikal-gray border border-baikal-gray-light rounded-xl px-4 py-3 text-white focus:outline-none focus:border-baikal-cyan transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => saveScriptMutation.mutate()}
                  disabled={saveScriptMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-baikal-gray-light text-white rounded-xl text-sm hover:bg-baikal-gray transition-colors"
                >
                  <Save size={14} />
                  저장
                </button>
                <button
                  onClick={() => ttsMutation.mutate()}
                  disabled={ttsMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-baikal-cyan text-baikal-navy font-semibold rounded-xl text-sm hover:bg-baikal-cyan-dark transition-colors"
                >
                  <Mic size={14} />
                  {ttsMutation.isPending ? "TTS 생성중..." : "TTS 생성"}
                </button>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-baikal-gray border border-baikal-gray-light text-baikal-muted rounded-xl text-sm hover:text-white cursor-pointer transition-colors">
                  <Upload size={14} />
                  녹음 업로드
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && id) {
                        try {
                          await pipelineApi.uploadAudio(id, file);
                          toast.success("오디오 파일이 업로드되었습니다!");
                        } catch {
                          toast.error("오디오 업로드 실패.");
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* 씬 탭 */}
      {activeTab === "scenes" && (
        <div className="space-y-3">
          {!isScenesDone ? (
            <div className="text-center py-12 text-baikal-muted">
              씬 분해 대기 중...
            </div>
          ) : (
            scenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} projectId={id!} />
            ))
          )}
        </div>
      )}

      {/* 렌더 탭 */}
      {activeTab === "render" && (
        <div className="space-y-4">
          <div className="bg-baikal-gray rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">렌더링 설정</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-baikal-muted mb-1">해상도</p>
                <p className="text-white font-medium">1080 × 1920 (9:16)</p>
              </div>
              <div>
                <p className="text-baikal-muted mb-1">프레임레이트</p>
                <p className="text-white font-medium">30 FPS</p>
              </div>
              <div>
                <p className="text-baikal-muted mb-1">배경 컬러</p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#0A1628] border border-baikal-gray-light" />
                  <p className="text-white font-medium">#0A1628 (바이칼 네이비)</p>
                </div>
              </div>
              <div>
                <p className="text-baikal-muted mb-1">자막 색상</p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#00D4FF] border border-baikal-gray-light" />
                  <p className="text-white font-medium">#00D4FF (바이칼 시안)</p>
                </div>
              </div>
            </div>
          </div>

          {isRenderDone ? (
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/renders/${id}`)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-baikal-cyan text-baikal-navy font-bold rounded-xl hover:bg-baikal-cyan-dark transition-colors"
              >
                <ExternalLink size={18} />
                렌더 결과 보기
              </button>
              <button
                onClick={() => setShowRenderConfig(true)}
                disabled={renderMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-baikal-gray border border-baikal-gray-light text-baikal-muted rounded-xl text-sm hover:text-white transition-colors disabled:opacity-50"
              >
                <Settings size={15} />
                {renderMutation.isPending ? "렌더링 시작중..." : "다시 렌더링"}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowRenderConfig(true)}
                disabled={renderMutation.isPending || !isTtsDone}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-baikal-cyan text-baikal-navy font-bold rounded-xl hover:bg-baikal-cyan-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings size={18} />
                {renderMutation.isPending ? "렌더링 시작중..." : "렌더링 설정 및 시작"}
              </button>
              {!isTtsDone && (
                <p className="text-baikal-muted text-sm text-center">
                  TTS 생성 또는 녹음 업로드 후 렌더링할 수 있습니다
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* 렌더 설정 다이얼로그 */}
      <RenderConfigDialog
        open={showRenderConfig}
        onOpenChange={setShowRenderConfig}
        onConfirm={handleStartRender}
      />
    </div>
  );
}

// 씬 카드 컴포넌트
function SceneCard({ scene, projectId }: { scene: Scene; projectId: string }) {
  const [caption, setCaption] = useState(scene.caption_text);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Scene>) =>
      pipelineApi.updateScene(projectId, scene.id, data),
    onSuccess: () => {
      toast.success("씬이 업데이트되었습니다!");
      qc.invalidateQueries({ queryKey: ["scenes", projectId] });
    },
    onError: () => toast.error("씬 업데이트 실패."),
  });

  return (
    <div className="bg-baikal-gray rounded-xl p-4 border border-baikal-gray-light">
      <div className="flex items-center justify-between mb-3">
        <span className="text-baikal-cyan font-bold text-sm">
          씬 #{scene.scene_order}
        </span>
        <span className="text-baikal-muted text-xs">{scene.duration_sec}초</span>
      </div>
      <p className="text-baikal-muted text-xs mb-2">{scene.description}</p>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => {
          if (caption !== scene.caption_text) {
            updateMutation.mutate({ caption_text: caption });
          }
        }}
        rows={2}
        className="w-full bg-baikal-gray-light border border-transparent rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-baikal-cyan transition-colors resize-none"
      />
    </div>
  );
}

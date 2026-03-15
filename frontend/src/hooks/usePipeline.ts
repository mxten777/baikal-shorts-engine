import { useEffect, useRef, useCallback } from "react";
import { pipelineApi } from "@/api/pipeline";
import { useProjectStore } from "@/stores/projectStore";
import type { PipelineState, PipelineStep, StepStatus } from "@/types";
import { PIPELINE_STEPS } from "@/types";

export function usePipeline(projectId: string | undefined) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { pipelineState, setPipelineState } = useProjectStore();

  const initState = useCallback((): PipelineState => ({
    steps: Object.fromEntries(
      PIPELINE_STEPS.map((s) => [s, "pending"])
    ) as Record<PipelineStep, "pending" | "running" | "done" | "failed">,
    current_step: null,
  }), []);

  // 마운트 시 DB에서 기존 파이프라인 상태 로드 (projectId 변경 시 초기화 후 재조회)
  useEffect(() => {
    if (!projectId) return;
    // 이전 프로젝트 상태 즉시 초기화
    setPipelineState(initState());
    pipelineApi.getStatus(projectId)
      .then((state) => {
        setPipelineState(state);
        // 진행 중인 단계가 있으면 SSE 연결
        const isRunning = Object.values(state.steps).some((s) => s === "running");
        if (isRunning) connect();
      })
      .catch(() => {
        // 상태 없으면 초기값 유지
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const connect = useCallback(() => {
    if (!projectId) return;

    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = pipelineApi.createStream(projectId);
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as {
          step: PipelineStep | null;
          steps: Record<PipelineStep, StepStatus>;
          error?: string;
        };
        setPipelineState({
          steps: data.steps,
          current_step: data.step,
          error: data.error,
        });

        // 모든 단계 완료/실패 시 SSE 종료
        const allDone = Object.values(data.steps).every(
          (s) => s === "done" || s === "failed"
        );
        if (allDone) {
          es.close();
        }
      } catch {
        // JSON 파싱 오류 무시
      }
    };

    es.onerror = () => {
      es.close();
    };
  }, [projectId, setPipelineState, initState]);

  const startPipeline = useCallback(async () => {
    if (!projectId) return;
    setPipelineState(initState());
    await pipelineApi.run(projectId);
    connect();
  }, [projectId, connect, setPipelineState, initState]);

  // 컴포넌트 언마운트 시 SSE 연결 정리
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return {
    pipelineState,
    startPipeline,
    reconnect: connect,
  };
}

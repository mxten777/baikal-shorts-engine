import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import type { PipelineStep, StepStatus } from "@/types";
import { PIPELINE_STEPS, PIPELINE_STEP_LABELS } from "@/types";

interface PipelineStatusProps {
  steps: Record<PipelineStep, StepStatus>;
  current_step: PipelineStep | null;
  error?: string;
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={18} className="text-baikal-cyan" />;
    case "running":
      return <Loader2 size={18} className="text-baikal-cyan animate-spin" />;
    case "failed":
      return <XCircle size={18} className="text-red-400" />;
    default:
      return <Circle size={18} className="text-baikal-muted" />;
  }
}

export function PipelineStatus({
  steps,
  current_step,
  error,
}: PipelineStatusProps) {
  return (
    <div className="bg-baikal-gray rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">파이프라인 진행</h3>

      <div className="flex items-center gap-1 flex-wrap">
        {PIPELINE_STEPS.map((step, i) => {
          const status = steps[step] ?? "pending";
          const isCurrent = current_step === step;

          return (
            <React.Fragment key={step}>
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                  isCurrent && "bg-baikal-gray-light",
                  status === "done" && "opacity-80"
                )}
              >
                <StepIcon status={status} />
                <span
                  className={cn(
                    "font-medium",
                    status === "done"
                      ? "text-baikal-cyan"
                      : status === "running"
                      ? "text-white"
                      : status === "failed"
                      ? "text-red-400"
                      : "text-baikal-muted"
                  )}
                >
                  {PIPELINE_STEP_LABELS[step]}
                </span>
              </div>

              {i < PIPELINE_STEPS.length - 1 && (
                <ChevronRight size={14} className="text-baikal-muted" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-red-400 text-xs bg-red-900/20 rounded-lg px-3 py-2">
          오류: {error}
        </p>
      )}
    </div>
  );
}

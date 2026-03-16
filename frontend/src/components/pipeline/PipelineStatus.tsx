import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  ChevronRight,
  Sparkles,
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
      return <CheckCircle2 size={20} className="text-baikal-cyan drop-shadow-glow" />;
    case "running":
      return <Loader2 size={20} className="text-baikal-cyan animate-spin" />;
    case "failed":
      return <XCircle size={20} className="text-red-400" />;
    default:
      return <Circle size={20} className="text-baikal-muted" />;
  }
}

export function PipelineStatus({
  steps,
  current_step,
  error,
}: PipelineStatusProps) {
  return (
    <div className="relative bg-gradient-to-br from-baikal-gray/60 to-baikal-gray/40 rounded-2xl p-6 border border-baikal-gray-light/50 shadow-card backdrop-blur-sm overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-baikal-cyan/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={18} className="text-baikal-cyan animate-pulse" />
          <h3 className="text-white font-bold text-base">파이프라인 진행</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PIPELINE_STEPS.map((step, i) => {
            const status = steps[step] ?? "pending";
            const isCurrent = current_step === step;

            return (
              <React.Fragment key={step}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm transition-all duration-300",
                    isCurrent && "bg-baikal-cyan/10 shadow-glow-sm scale-105",
                    status === "done" && "opacity-90 bg-baikal-gray-light/30",
                    status === "pending" && "opacity-60"
                  )}
                >
                  <StepIcon status={status} />
                  <span
                    className={cn(
                      "font-semibold transition-colors",
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
                  <ChevronRight 
                    size={16} 
                    className={cn(
                      "transition-colors",
                      status === "done" ? "text-baikal-cyan" : "text-baikal-muted"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 bg-gradient-to-r from-red-900/30 to-red-900/20 border border-red-400/30 rounded-xl px-4 py-3 flex items-start gap-2 animate-scale-in">
            <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-400 text-sm">
              오류: {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

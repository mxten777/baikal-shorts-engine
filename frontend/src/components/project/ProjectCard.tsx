import React from "react";
import { Link } from "react-router-dom";
import { cn, formatDate, truncate } from "@/lib/utils";
import type { Project } from "@/types";
import { CONTENT_TYPE_LABELS } from "@/types";
import { ChevronRight, Loader2, CheckCircle2, XCircle, Film } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

function StatusBadge({ status }: { status: Project["status"] }) {
  switch (status) {
    case "done":
      return (
        <span className="flex items-center gap-1 text-xs text-baikal-cyan">
          <CheckCircle2 size={12} /> 완료
        </span>
      );
    case "processing":
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-400">
          <Loader2 size={12} className="animate-spin" /> 처리중
        </span>
      );
    case "ready":
      return (
        <span className="flex items-center gap-1 text-xs text-baikal-cyan font-semibold">
          <CheckCircle2 size={12} /> 렌더링 대기
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <XCircle size={12} /> 실패
        </span>
      );
    default:
      return (
        <span className="text-xs text-baikal-muted">초안</span>
      );
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="group flex items-center justify-between px-5 py-4 bg-baikal-gray rounded-xl border border-baikal-gray-light hover:border-baikal-cyan/50 transition-all">
      <Link to={`/projects/${project.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-baikal-gray-light text-baikal-cyan">
            {CONTENT_TYPE_LABELS[project.content_type]}
          </span>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-white font-semibold truncate">{project.title}</p>
        <p className="text-baikal-muted text-xs mt-1">
          {truncate(project.source_text, 80)}
        </p>
      </Link>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <span className="text-baikal-muted text-xs">
          {formatDate(project.created_at)}
        </span>
        {project.status === "done" && (
          <Link
            to={`/renders/${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-baikal-cyan text-baikal-navy rounded-lg text-xs font-bold hover:bg-baikal-cyan-dark transition-colors"
          >
            <Film size={13} />
            결과 보기
          </Link>
        )}
        <Link to={`/projects/${project.id}`}>
          <ChevronRight
            size={16}
            className="text-baikal-muted group-hover:text-baikal-cyan transition-colors"
          />
        </Link>
      </div>
    </div>
  );
}

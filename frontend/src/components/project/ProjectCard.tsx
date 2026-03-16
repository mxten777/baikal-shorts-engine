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
    <div className="group relative flex items-center justify-between px-6 py-5 bg-gradient-to-r from-baikal-gray/60 to-baikal-gray/40 rounded-2xl border border-baikal-gray-light/50 hover:border-baikal-cyan/50 card-hover backdrop-blur-sm shadow-card hover:shadow-card-hover overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-baikal-cyan/0 via-baikal-cyan/5 to-baikal-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <Link to={`/projects/${project.id}`} className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-baikal-gray-light to-baikal-gray text-baikal-cyan border border-baikal-cyan/30 shadow-glow-sm">
            {CONTENT_TYPE_LABELS[project.content_type]}
          </span>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-white font-bold text-base truncate mb-1 group-hover:text-baikal-cyan-light transition-colors">{project.title}</p>
        <p className="text-baikal-muted text-sm leading-relaxed">
          {truncate(project.source_text, 80)}
        </p>
      </Link>
      <div className="flex items-center gap-4 ml-6 shrink-0 relative z-10">
        <span className="text-baikal-muted-dark text-xs font-medium">
          {formatDate(project.created_at)}
        </span>
        {project.status === "done" && (
          <Link
            to={`/renders/${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy rounded-lg text-xs font-bold hover:shadow-glow transition-all duration-300 btn-shine"
          >
            <Film size={14} />
            결과 보기
          </Link>
        )}
        <Link to={`/projects/${project.id}`} className="hover:scale-110 transition-transform duration-200">
          <ChevronRight
            size={20}
            className="text-baikal-muted group-hover:text-baikal-cyan transition-colors"
          />
        </Link>
      </div>
    </div>
  );
}

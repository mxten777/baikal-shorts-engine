import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { projectsApi } from "@/api/projects";
import { ProjectCard } from "@/components/project/ProjectCard";
import { Plus, Search, X } from "lucide-react";
import type { ContentType } from "@/types";

const STATUS_FILTERS = [
  { label: "전체", value: "" },
  { label: "처리중", value: "processing" },
  { label: "렌더링 대기", value: "ready" },
  { label: "완료", value: "done" },
  { label: "실패", value: "failed" },
];

const CONTENT_TYPE_FILTERS: Array<{ label: string; value: ContentType | "" }> = [
  { label: "전체", value: "" },
  { label: "문제제기", value: "PROBLEM" },
  { label: "해결제시", value: "SOLUTION" },
  { label: "구축사례", value: "CASE" },
  { label: "비교형", value: "COMPARE" },
  { label: "영업전환", value: "SALES" },
  { label: "대표브랜딩", value: "BRAND" },
];

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", statusFilter, contentTypeFilter, searchQuery],
    queryFn: () =>
      projectsApi.list({
        status: statusFilter || undefined,
        content_type: contentTypeFilter || undefined,
        search: searchQuery || undefined,
      }),
    refetchInterval: 10_000, // 10초마다 자동 갱신
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  return (
    <div className="animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">쇼츠 프로젝트</h1>
          <p className="text-baikal-muted text-sm">
            총 <span className="text-baikal-cyan font-semibold">{projects.length}개</span> 프로젝트
          </p>
        </div>
        <Link
          to="/new"
          className="group relative flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold rounded-xl hover:shadow-glow transition-all duration-300 text-sm btn-shine overflow-hidden"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          새 프로젝트
        </Link>
      </div>

      {/* 검색창 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative group">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-baikal-cyan/60 group-focus-within:text-baikal-cyan transition-colors"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목 또는 원문 내용 검색..."
            className="w-full pl-12 pr-10 py-3 bg-baikal-gray/50 text-white placeholder-baikal-muted rounded-xl border border-baikal-gray-light/50 focus:border-baikal-cyan focus:bg-baikal-gray focus:outline-none text-sm transition-all duration-300 input-glow"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-baikal-muted hover:text-white hover:scale-110 transition-all duration-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* 필터 탭 */}
      <div className="space-y-4 mb-8">
        {/* 상태 필터 */}
        <div>
          <p className="text-xs text-baikal-muted mb-2.5 font-semibold uppercase tracking-wide">상태</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
                  statusFilter === f.value
                    ? "bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold shadow-glow-sm scale-105"
                    : "bg-baikal-gray/50 text-baikal-muted hover:text-white hover:bg-baikal-gray hover:scale-105 hover:shadow-lg"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 타입 필터 */}
        <div>
          <p className="text-xs text-baikal-muted mb-2.5 font-semibold uppercase tracking-wide">콘텐츠 유형</p>
          <div className="flex gap-2 flex-wrap">
            {CONTENT_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setContentTypeFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
                  contentTypeFilter === f.value
                    ? "bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold shadow-glow-sm scale-105"
                    : "bg-baikal-gray/50 text-baikal-muted hover:text-white hover:bg-baikal-gray hover:scale-105 hover:shadow-lg"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-baikal-cyan/30 border-t-baikal-cyan rounded-full animate-spin" />
            <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-baikal-cyan rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-scale-in">
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-baikal-gray to-baikal-gray-dark flex items-center justify-center mb-4 shadow-glow">
            <Search size={28} className="text-baikal-cyan" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-baikal-cyan/10 to-transparent" />
          </div>
          <p className="text-white font-bold text-lg mb-2">프로젝트가 없습니다</p>
          <p className="text-baikal-muted text-sm mb-6 max-w-sm">
            원문 텍스트를 입력해서 첫 쇼츠를 만들어보세요
          </p>
          <Link
            to="/new"
            className="px-6 py-3 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold rounded-xl text-sm hover:shadow-glow transition-all duration-300 btn-shine"
          >
            새 프로젝트 시작
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p, index) => (
            <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

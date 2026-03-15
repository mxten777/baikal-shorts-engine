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
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">쇼츠 프로젝트</h1>
          <p className="text-baikal-muted text-sm mt-1">
            총 {projects.length}개 프로젝트
          </p>
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-baikal-cyan text-baikal-navy font-semibold rounded-xl hover:bg-baikal-cyan-dark transition-colors text-sm"
        >
          <Plus size={16} />새 프로젝트
        </Link>
      </div>

      {/* 검색창 */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-baikal-muted"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목 또는 원문 내용 검색..."
            className="w-full pl-11 pr-10 py-2.5 bg-baikal-gray text-white placeholder-baikal-muted rounded-xl border border-baikal-gray-light focus:border-baikal-cyan focus:outline-none text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-baikal-muted hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* 필터 탭 */}
      <div className="space-y-3 mb-6">
        {/* 상태 필터 */}
        <div>
          <p className="text-xs text-baikal-muted mb-2 font-medium">상태</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  statusFilter === f.value
                    ? "bg-baikal-cyan text-baikal-navy font-semibold"
                    : "bg-baikal-gray text-baikal-muted hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 타입 필터 */}
        <div>
          <p className="text-xs text-baikal-muted mb-2 font-medium">콘텐츠 유형</p>
          <div className="flex gap-2 flex-wrap">
            {CONTENT_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setContentTypeFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  contentTypeFilter === f.value
                    ? "bg-baikal-cyan text-baikal-navy font-semibold"
                    : "bg-baikal-gray text-baikal-muted hover:text-white"
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
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-baikal-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-baikal-gray flex items-center justify-center mb-4">
            <Search size={24} className="text-baikal-muted" />
          </div>
          <p className="text-white font-semibold mb-2">프로젝트가 없습니다</p>
          <p className="text-baikal-muted text-sm mb-6">
            원문 텍스트를 입력해서 첫 쇼츠를 만들어보세요
          </p>
          <Link
            to="/new"
            className="px-5 py-2.5 bg-baikal-cyan text-baikal-navy font-semibold rounded-xl text-sm"
          >
            새 프로젝트 시작
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

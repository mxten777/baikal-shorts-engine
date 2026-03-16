import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { projectsApi } from "@/api/projects";
import { ContentTypeSelector } from "@/components/project/ContentTypeSelector";
import type { ContentType } from "@/types";
import { ArrowLeft, Upload, Sparkles } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export default function NewProject() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("SOLUTION");

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      toast.success("프로젝트가 생성되었습니다!");
      navigate(`/projects/${project.id}`);
    },
    onError: () => {
      toast.error("프로젝트 생성 실패. 다시 시도해주세요.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sourceText.trim()) return;
    createMutation.mutate({ title, source_text: sourceText, content_type: contentType });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSourceText(text);
  };

  const charCount = sourceText.length;

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* 헤더 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-baikal-muted hover:text-baikal-cyan text-sm mb-6 transition-all duration-300 hover:gap-3 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        돌아가기
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">새 쇼츠 프로젝트</h1>
        <p className="text-baikal-muted">AI가 자동으로 30초 쇼츠를 기획하고 제작합니다</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">\n        {/* 제목 */}
        <div className="animate-slide-in" style={{ animationDelay: '100ms' }}>
          <label className="block text-sm font-semibold text-baikal-text mb-3">
            프로젝트 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: AI 플랫폼 구축 사례 쇼츠"
            className="w-full bg-baikal-gray/50 border border-baikal-gray-light/50 rounded-xl px-5 py-3.5 text-white placeholder:text-baikal-muted focus:outline-none focus:border-baikal-cyan focus:bg-baikal-gray transition-all duration-300 input-glow"
            required
          />
        </div>\n        {/* 콘텐츠 유형 */}
        <div className="animate-slide-in" style={{ animationDelay: '200ms' }}>
          <label className="block text-sm font-semibold text-baikal-text mb-3">
            콘텐츠 유형
          </label>
          <ContentTypeSelector value={contentType} onChange={setContentType} />
        </div>\n        {/* 원문 입력 */}
        <div className="animate-slide-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-baikal-text">
              원문 텍스트
            </label>
            <label className="flex items-center gap-2 text-xs text-baikal-cyan cursor-pointer hover:text-baikal-cyan-light transition-colors group">
              <Upload size={14} className="group-hover:scale-110 transition-transform" />
              파일 업로드 (TXT/DOCX)
              <input
                type="file"
                accept=".txt,.md,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <div className="relative">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="사업계획서, 프로젝트 소개서, 서비스 설명문 등 원문 텍스트를 붙여넣으세요.&#10;AI가 자동으로 30초 쇼츠 기획과 대본을 생성합니다."
              rows={12}
              className="w-full bg-baikal-gray/50 border border-baikal-gray-light/50 rounded-xl px-5 py-4 text-white placeholder:text-baikal-muted focus:outline-none focus:border-baikal-cyan focus:bg-baikal-gray transition-all duration-300 resize-none input-glow leading-relaxed"
              required
            />
            <div className="absolute bottom-4 right-5 flex items-center gap-3">
              <span className={cn(
                "text-xs font-medium transition-colors",
                charCount > 0 ? "text-baikal-cyan" : "text-baikal-muted-dark"
              )}>
                {charCount.toLocaleString()}자
              </span>
            </div>
          </div>
        </div>\n        {/* 제출 */}
        <button
          type="submit"
          disabled={
            createMutation.isPending || !title.trim() || !sourceText.trim()
          }
          className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold rounded-xl hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none btn-shine overflow-hidden group animate-slide-in"
          style={{ animationDelay: '400ms' }}
        >
          {createMutation.isPending ? (
            <>
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 border-3 border-baikal-navy/30 border-t-baikal-navy rounded-full animate-spin" />
              </div>
              생성 중...
            </>
          ) : (
            <>
              <Sparkles size={20} className="group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
              파이프라인 시작
            </>
          )}
        </button>\n        {createMutation.isError && (
          <div className="bg-red-900/20 border border-red-400/30 rounded-xl p-4 animate-scale-in">
            <p className="text-red-400 text-sm">
              {(createMutation.error as Error).message}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

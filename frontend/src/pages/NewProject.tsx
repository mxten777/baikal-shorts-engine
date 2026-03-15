import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { projectsApi } from "@/api/projects";
import { ContentTypeSelector } from "@/components/project/ContentTypeSelector";
import type { ContentType } from "@/types";
import { ArrowLeft, Upload, Sparkles } from "lucide-react";

export default function NewProject() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("SOLUTION");

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      navigate(`/projects/${project.id}`);
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
    <div className="max-w-2xl">
      {/* 헤더 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-baikal-muted hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        돌아가기
      </button>

      <h1 className="text-2xl font-bold text-white mb-8">새 쇼츠 프로젝트</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-baikal-text mb-2">
            프로젝트 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: AI 플랫폼 구축 사례 쇼츠"
            className="w-full bg-baikal-gray border border-baikal-gray-light rounded-xl px-4 py-3 text-white placeholder:text-baikal-muted focus:outline-none focus:border-baikal-cyan transition-colors"
            required
          />
        </div>

        {/* 콘텐츠 유형 */}
        <div>
          <label className="block text-sm font-medium text-baikal-text mb-2">
            콘텐츠 유형
          </label>
          <ContentTypeSelector value={contentType} onChange={setContentType} />
        </div>

        {/* 원문 입력 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-baikal-text">
              원문 텍스트
            </label>
            <label className="flex items-center gap-1.5 text-xs text-baikal-cyan cursor-pointer hover:text-baikal-cyan-dark transition-colors">
              <Upload size={13} />
              파일 업로드 (TXT/DOCX)
              <input
                type="file"
                accept=".txt,.md,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="사업계획서, 프로젝트 소개서, 서비스 설명문 등 원문 텍스트를 붙여넣으세요.
AI가 자동으로 30초 쇼츠 기획과 대본을 생성합니다."
            rows={10}
            className="w-full bg-baikal-gray border border-baikal-gray-light rounded-xl px-4 py-3 text-white placeholder:text-baikal-muted focus:outline-none focus:border-baikal-cyan transition-colors resize-none"
            required
          />
          <p className="text-baikal-muted text-xs mt-1.5 text-right">
            {charCount.toLocaleString()}자
          </p>
        </div>

        {/* 제출 */}
        <button
          type="submit"
          disabled={
            createMutation.isPending || !title.trim() || !sourceText.trim()
          }
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-baikal-cyan text-baikal-navy font-bold rounded-xl hover:bg-baikal-cyan-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-baikal-navy border-t-transparent rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              파이프라인 시작
            </>
          )}
        </button>

        {createMutation.isError && (
          <p className="text-red-400 text-sm text-center">
            {(createMutation.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}

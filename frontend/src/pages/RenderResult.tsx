import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { renderApi } from "@/api/render";
import type { RenderOutput } from "@/types";
import { Download, Youtube, Instagram, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export default function RenderResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const { data: renderJob, error } = useQuery({
    queryKey: ["renderJob", id],
    queryFn: () => renderApi.getStatus(id!),
    enabled: !!id && pollingEnabled,
    refetchInterval: 3000,
    retry: false,
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ["renderOutputs", id],
    queryFn: () => renderApi.getDownloadUrls(id!),
    enabled: renderJob?.status === "done",
  });

  useEffect(() => {
    if (renderJob?.status === "done" || renderJob?.status === "failed") {
      setPollingEnabled(false);
    }
  }, [renderJob?.status]);

  const is404 = !!error;
  const youtubeOutput = outputs.find((o) => o.channel === "youtube");
  const instagramOutput = outputs.find((o) => o.channel === "instagram");

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(`/projects/${id}`)}
        className="flex items-center gap-2 text-baikal-muted hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        프로젝트로 돌아가기
      </button>
      <h1 className="text-2xl font-bold text-white mb-8">렌더 결과</h1>

      {/* 렌더 작업 없음 (404) */}
      {is404 && (
        <div className="bg-baikal-gray rounded-xl p-6 mb-6 text-center">
          <p className="text-baikal-muted mb-4">렌더링이 아직 시작되지 않았습니다.</p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-5 py-2.5 bg-baikal-cyan text-baikal-navy font-bold rounded-lg hover:opacity-90"
          >
            프로젝트로 이동해서 렌더링 시작
          </button>
        </div>
      )}

      {/* 진행 상태 */}
      {!is404 && renderJob?.status !== "done" && renderJob?.status !== "failed" && (
        <div className="bg-baikal-gray rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="text-baikal-cyan animate-spin" size={20} />
            <span className="text-white font-semibold">렌더링 중...</span>
          </div>
          <div className="w-full bg-baikal-gray-light rounded-full h-2">
            <div
              className="bg-baikal-cyan h-2 rounded-full transition-all duration-500"
              style={{ width: `${renderJob?.progress ?? 0}%` }}
            />
          </div>
          <p className="text-baikal-muted text-xs mt-2">
            {renderJob?.progress ?? 0}% 완료
          </p>
        </div>
      )}

      {/* 완료 */}
      {renderJob?.status === "done" && (
        <>
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="text-baikal-cyan" size={20} />
            <span className="text-white font-semibold">렌더링 완료!</span>
          </div>

          {/* 영상 미리보기 */}
          {renderJob.output_url && (
            <div className="mb-6">
              <video
                src={renderJob.output_url}
                controls
                className="w-full rounded-xl"
                style={{ maxHeight: "60vh" }}
              />
            </div>
          )}

          {/* 썸네일 텍스트 옵션 */}
          {youtubeOutput && (
            <div className="bg-baikal-gray rounded-xl p-5 mb-5">
              <h3 className="text-white font-semibold text-sm mb-3">
                🖼 썸네일 텍스트
              </h3>
              <p className="text-baikal-cyan font-bold">
                {youtubeOutput.thumbnail_text}
              </p>
            </div>
          )}

          {/* 다운로드 패키지 */}
          <div className="space-y-3">
            {youtubeOutput && (
              <OutputCard
                channel="youtube"
                output={youtubeOutput}
                icon={<Youtube size={18} />}
                label="유튜브 쇼츠"
                onUpload={() => renderApi.uploadToYoutube(id!)}
              />
            )}
            {instagramOutput && (
              <OutputCard
                channel="instagram"
                output={instagramOutput}
                icon={<Instagram size={18} />}
                label="인스타그램 릴스"
                onUpload={() => renderApi.uploadToInstagram(id!)}
              />
            )}
          </div>
        </>
      )}

      {!is404 && renderJob?.status === "failed" && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5">
          <p className="text-red-400 font-semibold">렌더링 실패</p>
          <p className="text-red-300/70 text-sm mt-1 mb-3">
            프로젝트 페이지에서 다시 시도해주세요.
          </p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg text-sm hover:bg-red-500/30"
          >
            프로젝트로 이동
          </button>
        </div>
      )}
    </div>
  );
}

interface OutputCardProps {
  channel: string;
  output: RenderOutput;
  icon: React.ReactNode;
  label: string;
  onUpload: () => Promise<unknown>;
}

function OutputCard({ output, icon, label, onUpload }: OutputCardProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const result = await onUpload();
      setUploadedUrl((result as { url: string }).url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-baikal-gray rounded-xl p-5 border border-baikal-gray-light">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-baikal-cyan">{icon}</span>
        <h3 className="text-white font-semibold text-sm">{label}</h3>
      </div>

      {/* 해시태그 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {output.hashtags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-baikal-gray-light text-baikal-cyan rounded-full"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        <a
          href={output.video_url}
          download
          className="flex items-center gap-2 px-4 py-2 bg-baikal-gray-light text-white rounded-xl text-sm hover:bg-baikal-navy transition-colors"
        >
          <Download size={14} />
          다운로드
        </a>
        {!uploadedUrl ? (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-baikal-cyan text-baikal-navy font-semibold rounded-xl text-sm hover:bg-baikal-cyan-dark transition-colors disabled:opacity-50"
          >
            {uploading ? "업로드중..." : "바로 업로드"}
          </button>
        ) : (
          <span className="text-baikal-cyan text-sm flex items-center gap-1">
            <CheckCircle2 size={14} /> 업로드 완료
          </span>
        )}
      </div>
    </div>
  );
}

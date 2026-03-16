import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { renderApi } from "@/api/render";
import type { RenderOutput } from "@/types";
import { Download, Youtube, Instagram, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/useToast";

export default function RenderResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const handleThumbnailDownload = () => {
    // 백엔드 API를 통한 다운로드
    const downloadUrl = `http://localhost:8000/api/v1/render/${id}/thumbnail/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'thumbnail.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 성공 메시지 표시
    toast.success("썸네일이 다운로드되었습니다!");
  };

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
    <div className="max-w-4xl animate-fade-in">
      <button
        onClick={() => navigate(`/projects/${id}`)}
        className="flex items-center gap-2 text-baikal-muted hover:text-baikal-cyan text-sm mb-6 transition-all duration-300 hover:gap-3 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        프로젝트로 돌아가기
      </button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">렌더 결과</h1>
        <p className="text-baikal-muted">쇼츠 영상 및 출력 결과를 확인하세요</p>
      </div>

      {/* 렌더 작업 없음 (404) */}
      {is404 && (
        <div className="bg-gradient-to-br from-baikal-gray/60 to-baikal-gray/40 rounded-2xl p-8 mb-6 text-center border border-baikal-gray-light/50 shadow-card animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-baikal-cyan/20 to-baikal-cyan/10 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-baikal-cyan" />
          </div>
          <p className="text-baikal-muted mb-4 text-lg">렌더링이 아직 시작되지 않았습니다.</p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-6 py-3 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold rounded-xl hover:shadow-glow transition-all duration-300 btn-shine"
          >
            프로젝트로 이동해서 렌더링 시작
          </button>
        </div>
      )}

      {/* 진행 상태 */}
      {!is404 && renderJob?.status !== "done" && renderJob?.status !== "failed" && (
        <div className="relative bg-gradient-to-br from-baikal-gray/60 to-baikal-gray/40 rounded-2xl p-8 mb-6 border border-baikal-gray-light/50 shadow-card backdrop-blur-sm overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-baikal-cyan/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-10 h-10">
                <Loader2 className="text-baikal-cyan animate-spin" size={32} />
                <div className="absolute inset-0 text-baikal-cyan/30 animate-ping">
                  <Loader2 size={32} />
                </div>
              </div>
              <div>
                <span className="text-white font-bold text-lg">렌더링 중...</span>
                <p className="text-baikal-muted text-sm mt-0.5">영상을 생성하고 있습니다</p>
              </div>
            </div>
            <div className="relative w-full bg-baikal-gray-dark rounded-full h-3 overflow-hidden">
              <div
                className="absolute inset-0 bg-gradient-to-r from-baikal-cyan via-baikal-cyan-light to-baikal-cyan h-3 rounded-full transition-all duration-500 shadow-glow"
                style={{ width: `${renderJob?.progress ?? 0}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-baikal-cyan text-sm font-bold">
                {renderJob?.progress ?? 0}% 완료
              </p>
              <p className="text-baikal-muted text-xs">
                예상 소요 시간: 60-90초
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 완료 */}
      {renderJob?.status === "done" && (
        <>
          <div className="flex items-center gap-3 mb-6 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark flex items-center justify-center shadow-glow">
              <CheckCircle2 size={20} className="text-baikal-navy" />
            </div>
            <div>
              <span className="text-white font-bold text-lg">렌더링 완료!</span>
              <p className="text-baikal-muted text-sm">영상을 확인해보세요</p>
            </div>
          </div>

          {/* 영상 미리보기 */}
          {renderJob.output_url && (
            <div className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <video
                src={renderJob.output_url}
                controls
                className="w-full rounded-2xl shadow-card border border-baikal-gray-light/50 bg-black"
                style={{ maxHeight: "70vh" }}
              />
            </div>
          )}

          {/* 썸네일 미리보기 */}
          {renderJob.thumbnail_url && (
            <div className="bg-gradient-to-br from-baikal-gray/60 to-baikal-gray/40 rounded-2xl p-6 mb-5 border border-baikal-gray-light/50 shadow-card backdrop-blur-sm animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <span className="text-2xl">🖼️</span>
                  썸네일 이미지
                </h3>
                <button
                  onClick={handleThumbnailDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-baikal-cyan/20 to-baikal-cyan/10 text-baikal-cyan border border-baikal-cyan/30 rounded-xl text-sm font-semibold hover:bg-baikal-cyan hover:text-baikal-navy transition-all duration-300 hover:shadow-glow"
                >
                  <Download size={16} />
                  다운로드
                </button>
              </div>
              <div className="flex justify-center">
                <img
                  src={renderJob.thumbnail_url}
                  alt="썸네일"
                  className="max-w-xs rounded-xl border border-baikal-cyan/20 shadow-glow"
                />
              </div>
              <p className="text-baikal-muted text-sm mt-4 text-center">
                YouTube/Instagram 업로드 시 사용할 썸네일입니다
              </p>
            </div>
          )}

          {/* 썸네일 텍스트 옵션 */}
          {youtubeOutput && (
            <div className="bg-gradient-to-br from-baikal-gray/60 to-baikal-gray/40 rounded-2xl p-6 mb-5 border border-baikal-gray-light/50 shadow-card backdrop-blur-sm animate-fade-in" style={{ animationDelay: '300ms' }}>
              <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                썸네일 텍스트
              </h3>
              <p className="text-baikal-cyan font-bold text-lg">
                {youtubeOutput.thumbnail_text}
              </p>
            </div>
          )}

          {/* 다운로드 패키지 */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
            {youtubeOutput && (
              <OutputCard
                channel="youtube"
                output={youtubeOutput}
                icon={<Youtube size={20} />}
                label="유튜브 쇼츠"
                onUpload={() => renderApi.uploadToYoutube(id!)}
              />
            )}
            {instagramOutput && (
              <OutputCard
                channel="instagram"
                output={instagramOutput}
                icon={<Instagram size={20} />}
                label="인스타그램 릴스"
                onUpload={() => renderApi.uploadToInstagram(id!)}
              />
            )}
          </div>
        </>
      )}

      {!is404 && renderJob?.status === "failed" && (
        <div className="bg-gradient-to-r from-red-900/30 to-red-900/20 border border-red-400/30 rounded-2xl p-6 shadow-card animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle size={20} className="text-red-400" />
            </div>
            <p className="text-red-400 font-bold text-lg">렌더링 실패</p>
          </div>
          <p className="text-red-300/70 text-sm mb-4">
            프로젝트 페이지에서 다시 시도해주세요.
          </p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-5 py-2.5 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-all duration-300"
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
      toast.success("영상이 업로드되었습니다!");
    } catch {
      toast.error("업로드 실패. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-baikal-gray/60 to-baikal-gray/40 rounded-2xl p-6 border border-baikal-gray-light/50 shadow-card hover:shadow-card-hover transition-all duration-300 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-baikal-cyan/20 to-baikal-cyan/10 flex items-center justify-center border border-baikal-cyan/30">
          <span className="text-baikal-cyan">{icon}</span>
        </div>
        <h3 className="text-white font-bold text-base">{label}</h3>
      </div>

      {/* 해시태그 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {output.hashtags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-3 py-1 bg-baikal-gray-dark text-baikal-cyan rounded-full border border-baikal-cyan/20 font-medium"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        <a
          href={output.video_url}
          download
          onClick={() => toast.success("영상 다운로드를 시작합니다!")}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-baikal-gray-light to-baikal-gray text-white rounded-xl text-sm font-semibold hover:from-baikal-cyan/20 hover:to-baikal-cyan/10 hover:text-baikal-cyan border border-baikal-gray-light hover:border-baikal-cyan/30 transition-all duration-300"
        >
          <Download size={16} />
          다운로드
        </a>
        {!uploadedUrl ? (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold rounded-xl text-sm hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-shine overflow-hidden"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-baikal-navy/30 border-t-baikal-navy rounded-full animate-spin" />
                업로드중...
              </>
            ) : (
              "바로 업로드"
            )}
          </button>
        ) : (
          <span className="text-baikal-cyan text-sm flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="animate-scale-in" /> 업로드 완료
          </span>
        )}
      </div>
    </div>
  );
}

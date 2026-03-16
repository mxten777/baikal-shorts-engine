import React, { useState } from "react";
import { X } from "lucide-react";

export interface RenderConfig {
  resolution: string;
  fps: number;
  bg_color: string;
  accent_color: string;
  caption_color: string;
  caption_font_size: number;
  caption_position: "top" | "center" | "bottom";
  thumbnail_style: "gradient" | "tech" | "minimal" | "bold";
}

const DEFAULT_CONFIG: RenderConfig = {
  resolution: "1080x1920",
  fps: 30,
  bg_color: "#0A1628",
  accent_color: "#00D4FF",
  caption_color: "#FFFFFF",
  caption_font_size: 52,
  caption_position: "bottom",
  thumbnail_style: "gradient",
};

interface RenderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: RenderConfig) => void;
}

export function RenderConfigDialog({ open, onOpenChange, onConfirm }: RenderConfigDialogProps) {
  const [config, setConfig] = useState<RenderConfig>(DEFAULT_CONFIG);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(config);
    onOpenChange(false);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-baikal-gray/80 to-baikal-navy/80 rounded-2xl border border-baikal-gray-light/50 max-w-2xl w-full max-h-[90vh] overflow-hidden m-4 shadow-glow backdrop-blur-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-baikal-gray-light/50 bg-gradient-to-r from-baikal-cyan/5 to-transparent">
          <div>
            <h2 className="text-2xl font-bold text-white">렌더링 설정</h2>
            <p className="text-baikal-muted text-sm mt-1">영상 출력 옵션을 커스터마이징하세요</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-baikal-muted hover:text-white hover:bg-baikal-gray-light rounded-lg p-2 transition-all duration-300 hover:rotate-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 해상도 */}
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <label className="text-sm text-baikal-text font-semibold">해상도</label>
            <select
              value={config.resolution}
              onChange={(e) => setConfig({ ...config, resolution: e.target.value })}
              className="w-full px-4 py-3 bg-baikal-navy/50 text-white rounded-xl border border-baikal-gray-light/50 focus:border-baikal-cyan focus:bg-baikal-navy focus:outline-none transition-all duration-300 input-glow"
            >
              <option value="1080x1920">1080×1920 (9:16 세로)</option>
              <option value="1080x1350">1080×1350 (4:5 Instagram)</option>
              <option value="1080x1080">1080×1080 (1:1 정사각형)</option>
            </select>
          </div>

          {/* FPS */}
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <label className="text-sm text-baikal-text font-semibold">프레임레이트 (FPS)</label>
            <select
              value={config.fps}
              onChange={(e) => setConfig({ ...config, fps: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-baikal-navy/50 text-white rounded-xl border border-baikal-gray-light/50 focus:border-baikal-cyan focus:bg-baikal-navy focus:outline-none transition-all duration-300 input-glow"
            >
              <option value={24}>24 FPS (영화)</option>
              <option value={30}>30 FPS (표준)</option>
              <option value={60}>60 FPS (고품질)</option>
            </select>
          </div>

          {/* 배경색 */}
          <div className="space-y-2">
            <label className="text-sm text-baikal-muted font-medium">배경색</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={config.bg_color}
                onChange={(e) => setConfig({ ...config, bg_color: e.target.value })}
                className="h-11 w-20 rounded-lg border border-baikal-gray-light cursor-pointer"
              />
              <input
                type="text"
                value={config.bg_color}
                onChange={(e) => setConfig({ ...config, bg_color: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-baikal-navy text-white rounded-xl border border-baikal-gray-light focus:border-baikal-cyan focus:outline-none"
                placeholder="#0A1628"
              />
            </div>
          </div>

          {/* 강조색 */}
          <div className="space-y-2">
            <label className="text-sm text-baikal-muted font-medium">강조색 (브랜드 컬러)</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={config.accent_color}
                onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                className="h-11 w-20 rounded-lg border border-baikal-gray-light cursor-pointer"
              />
              <input
                type="text"
                value={config.accent_color}
                onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-baikal-navy text-white rounded-xl border border-baikal-gray-light focus:border-baikal-cyan focus:outline-none"
                placeholder="#00D4FF"
              />
            </div>
          </div>

          {/* 자막 색상 */}
          <div className="space-y-2">
            <label className="text-sm text-baikal-muted font-medium">자막 색상</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={config.caption_color}
                onChange={(e) => setConfig({ ...config, caption_color: e.target.value })}
                className="h-11 w-20 rounded-lg border border-baikal-gray-light cursor-pointer"
              />
              <input
                type="text"
                value={config.caption_color}
                onChange={(e) => setConfig({ ...config, caption_color: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-baikal-navy text-white rounded-xl border border-baikal-gray-light focus:border-baikal-cyan focus:outline-none"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* 자막 폰트 크기 */}
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '350ms' }}>
            <label className="text-sm text-baikal-text font-semibold flex items-center justify-between">
              <span>자막 폰트 크기</span>
              <span className="text-baikal-cyan">{config.caption_font_size}px</span>
            </label>
            <input
              type="range"
              min="24"
              max="120"
              step="4"
              value={config.caption_font_size}
              onChange={(e) => setConfig({ ...config, caption_font_size: Number(e.target.value) })}
              className="w-full h-2 bg-baikal-navy/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-baikal-cyan [&::-webkit-slider-thumb]:to-baikal-cyan-dark [&::-webkit-slider-thumb]:shadow-glow [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
            />
          </div>

          {/* 자막 위치 */}
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <label className="text-sm text-baikal-text font-semibold">자막 위치</label>
            <select
              value={config.caption_position}
              onChange={(e) => setConfig({ ...config, caption_position: e.target.value as "top" | "center" | "bottom" })}
              className="w-full px-4 py-3 bg-baikal-navy/50 text-white rounded-xl border border-baikal-gray-light/50 focus:border-baikal-cyan focus:bg-baikal-navy focus:outline-none transition-all duration-300 input-glow"
            >
              <option value="top">상단</option>
              <option value="center">중앙</option>
              <option value="bottom">하단</option>
            </select>
          </div>

          {/* 썸네일 스타일 */}
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '450ms' }}>
            <label className="text-sm text-baikal-text font-semibold">썸네일 스타일</label>
            <select
              value={config.thumbnail_style}
              onChange={(e) => setConfig({ ...config, thumbnail_style: e.target.value as "gradient" | "tech" | "minimal" | "bold" })}
              className="w-full px-4 py-3 bg-baikal-navy/50 text-white rounded-xl border border-baikal-gray-light/50 focus:border-baikal-cyan focus:bg-baikal-navy focus:outline-none transition-all duration-300 input-glow"
            >
              <option value="gradient">🌈 그라디언트 (추천)</option>
              <option value="tech">⚡ 테크 스타일</option>
              <option value="minimal">✨ 미니멀</option>
              <option value="bold">💪 대담한 스타일</option>
            </select>
            <p className="text-xs text-baikal-muted-dark mt-2">
              YouTube/Instagram 업로드용 썸네일 이미지 스타일을 선택하세요
            </p>
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex justify-between p-6 border-t border-baikal-gray-light/50 bg-baikal-navy/30">
          <button
            onClick={handleReset}
            className="px-5 py-2.5 text-baikal-muted hover:text-baikal-cyan transition-all duration-300 text-sm font-semibold hover:scale-105"
          >
            기본값으로 초기화
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 bg-baikal-gray-light text-white rounded-xl hover:bg-baikal-gray transition-all duration-300 text-sm font-semibold border border-baikal-gray-light hover:border-baikal-cyan/30"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 bg-gradient-to-r from-baikal-cyan to-baikal-cyan-dark text-baikal-navy font-bold rounded-xl hover:shadow-glow transition-all duration-300 text-sm btn-shine overflow-hidden"
            >
              적용하고 렌더링 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

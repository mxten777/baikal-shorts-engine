import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { InstagramConnect } from "@/components/instagram/InstagramConnect";

/**
 * 설정 페이지
 * 
 * - 소셜 미디어 연동 (Instagram, YouTube)
 * - API 키 관리
 * - 렌더링 기본 설정
 */
export default function Settings() {
  // 임시 사용자 ID (실제로는 로그인 시스템에서 가져와야 함)
  const userId = "default_user";

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-baikal-gray-light flex items-center justify-center">
          <SettingsIcon size={24} className="text-baikal-cyan" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">설정</h1>
          <p className="text-baikal-muted">계정 연동 및 서비스 설정 관리</p>
        </div>
      </div>

      {/* 소셜 미디어 연동 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">소셜 미디어 연동</h2>
        <div className="space-y-4">
          <InstagramConnect userId={userId} />
          
          {/* YouTube 연동 (향후 추가) */}
          <div className="bg-baikal-gray rounded-2xl border border-baikal-gray-light p-6 opacity-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">YouTube</h3>
                <p className="text-sm text-baikal-muted">Shorts 자동 업로드</p>
              </div>
            </div>
            <p className="text-sm text-baikal-muted">준비 중...</p>
          </div>
        </div>
      </section>

      {/* API 설정 (향후 추가) */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">API 설정</h2>
        <div className="bg-baikal-gray rounded-2xl border border-baikal-gray-light p-6 opacity-50">
          <p className="text-sm text-baikal-muted">API 키 및 환경 설정은 서버 측에서 관리됩니다.</p>
        </div>
      </section>

      {/* 기본 설정 (향후 추가) */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">기본 렌더링 설정</h2>
        <div className="bg-baikal-gray rounded-2xl border border-baikal-gray-light p-6 opacity-50">
          <p className="text-sm text-baikal-muted">
            기본 해상도, FPS, 색상 등의 설정을 지정할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

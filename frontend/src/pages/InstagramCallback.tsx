import React, { useEffect } from "react";

/**
 * Instagram OAuth 콜백 페이지
 * 
 * Instagram 인증 후 리다이렉트되는 페이지
 * 인증 코드를 추출하여 부모 창으로 전달
 */
export function InstagramCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const errorReason = params.get("error_reason");

    if (error) {
      console.error("Instagram OAuth Error:", error, errorReason);
      window.close();
      return;
    }

    if (code) {
      // 부모 창으로 인증 코드 전달
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "INSTAGRAM_OAUTH_CALLBACK",
            code,
          },
          window.location.origin
        );
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-baikal-navy">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-baikal-cyan mx-auto mb-4"></div>
        <p className="text-white">Instagram 인증 처리 중...</p>
      </div>
    </div>
  );
}

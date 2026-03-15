import React, { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { instagramApi } from "@/api/instagram";
import { Instagram, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface InstagramConnectProps {
  userId: string;
}

export function InstagramConnect({ userId }: InstagramConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{
    username: string;
    account_type: string;
    media_count: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const checkConnection = async () => {
    try {
      const info = await instagramApi.getAccountInfo(userId);
      setIsConnected(true);
      setAccountInfo(info);
    } catch (error) {
      setIsConnected(false);
      setAccountInfo(null);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const { auth_url, state } = await instagramApi.getAuthUrl();
      
      // OAuth 플로우 시작
      const width = 600;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      
      const popup = window.open(
        auth_url,
        "_blank",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // 팝업에서 콜백 메시지 수신 대기
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === "INSTAGRAM_OAUTH_CALLBACK") {
          const { code } = event.data;
          
          try {
            const result = await instagramApi.handleCallback({
              code,
              state,
              user_id: userId,
            });
            
            if (result.success) {
              toast.success("Instagram 계정이 연동되었습니다.");
              await checkConnection();
            }
          } catch (error) {
            toast.error("Instagram 연동에 실패했습니다.");
          } finally {
            popup?.close();
            setIsLoading(false);
          }
        }
      };

      window.addEventListener("message", messageHandler);
      
      // 팝업 닫힘 감지
      const popupTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(popupTimer);
          window.removeEventListener("message", messageHandler);
          setIsLoading(false);
        }
      }, 500);
    } catch (error) {
      toast.error("Instagram 인증 시작에 실패했습니다.");
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsLoading(true);
    try {
      const result = await instagramApi.refreshToken(userId);
      if (result.success) {
        toast.success("Instagram 토큰이 갱신되었습니다.");
      }
    } catch (error) {
      toast.error("토큰 갱신에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-baikal-gray rounded-2xl border border-baikal-gray-light p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center">
            <Instagram size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Instagram</h3>
            <p className="text-sm text-baikal-muted">Reels 자동 업로드</p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">연동됨</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-baikal-muted">
            <XCircle size={20} />
            <span className="text-sm font-medium">미연동</span>
          </div>
        )}
      </div>

      {isConnected && accountInfo ? (
        <div className="space-y-3">
          <div className="bg-baikal-navy rounded-xl p-4">
            <div className="text-sm text-baikal-muted mb-1">계정명</div>
            <div className="text-white font-medium">@{accountInfo.username}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-baikal-navy rounded-xl p-4">
              <div className="text-sm text-baikal-muted mb-1">계정 유형</div>
              <div className="text-white font-medium">{accountInfo.account_type}</div>
            </div>
            <div className="bg-baikal-navy rounded-xl p-4">
              <div className="text-sm text-baikal-muted mb-1">게시물 수</div>
              <div className="text-white font-medium">{accountInfo.media_count}</div>
            </div>
          </div>

          <button
            onClick={handleRefreshToken}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-baikal-gray-light text-baikal-muted rounded-xl hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            토큰 갱신
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Instagram size={18} />
          {isLoading ? "연동 중..." : "Instagram 연동하기"}
        </button>
      )}

      <p className="mt-3 text-xs text-baikal-muted">
        * Instagram 비즈니스 계정이 필요합니다
      </p>
    </div>
  );
}


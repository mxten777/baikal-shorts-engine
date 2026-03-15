/**
 * Instagram OAuth 및 Reels 업로드 API 클라이언트
 */
import { apiClient } from "./client";

export interface InstagramAuthUrl {
  auth_url: string;
  state: string;
}

export interface InstagramCallbackRequest {
  code: string;
  state: string;
  user_id: string;
}

export interface InstagramCallbackResponse {
  success: boolean;
  message: string;
  instagram_user_id?: string;
}

export interface InstagramAccount {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

export interface UploadReelRequest {
  user_id: string;
  video_url: string;
  caption: string;
}

export interface UploadReelResponse {
  success: boolean;
  post_id: string;
  message: string;
}

export const instagramApi = {
  /**
   * Instagram OAuth 인증 URL 가져오기
   */
  getAuthUrl: async (): Promise<InstagramAuthUrl> => {
    const response = await apiClient.get("/auth/instagram/auth/url");
    return response.data;
  },

  /**
   * Instagram OAuth 콜백 처리
   */
  handleCallback: async (data: InstagramCallbackRequest): Promise<InstagramCallbackResponse> => {
    const response = await apiClient.post("/auth/instagram/auth/callback", data);
    return response.data;
  },

  /**
   * 연동된 Instagram 계정 정보 조회
   */
  getAccountInfo: async (userId: string): Promise<InstagramAccount> => {
    const response = await apiClient.get(`/auth/instagram/account/${userId}`);
    return response.data;
  },

  /**
   * Instagram Reels 업로드
   */
  uploadReel: async (data: UploadReelRequest): Promise<UploadReelResponse> => {
    const response = await apiClient.post("/auth/instagram/upload/reel", data);
    return response.data;
  },

  /**
   * Instagram 액세스 토큰 갱신
   */
  refreshToken: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/auth/instagram/auth/refresh/${userId}`);
    return response.data;
  },
};

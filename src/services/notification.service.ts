import { httpClient, ApiResponse } from './http.client';

// Đồng nhất với web FE: FoodMarket-FE/src/services/notification.service.ts
export interface NotificationResponse {
  id: number;
  title: string;
  message: string;       // web FE dùng "message", không phải "body"
  evidence?: string;
  createAt: string;      // web FE dùng "createAt", không phải "createdAt"
  receiverType?: string;
  isRead?: boolean;
  adminId?: number;
  adminName?: string;
}

class NotificationService {
  // web FE dùng '/api/notifications/my' — có prefix /api/ vì base URL là /api/v1
  // nên path thực tế là /api/v1/api/notifications/my? Không — xem lại:
  // API_BASE_URL = 'http://localhost:8080/api/v1'
  // web FE gọi httpClient.get('/api/notifications/my')
  // → full URL: http://localhost:8080/api/v1/api/notifications/my  ← đây là URL web FE dùng
  async getMyNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    return httpClient.get<NotificationResponse[]>('/api/notifications/my');
  }

  async markAsRead(id: number): Promise<ApiResponse<void>> {
    return httpClient.put<void>(`/api/notifications/${id}/read`, {});
  }
}

export const notificationService = new NotificationService();

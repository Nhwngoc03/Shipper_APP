import { API_BASE_URL, TOKEN_KEY, USER_KEY } from './api.config';
import { httpClient, ApiResponse } from './http.client';
import { chatService } from './chat.service';
import { storage } from './storage';

export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { token: string; authenticated: boolean; }

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  logoUrl?: string;
  status?: string;
  roleName?: string;
  vehicleNumber?: string;
  ratingAverage?: number;
}

class AuthService {
  async login(req: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, data };
    if (data.result?.token) {
      // Kiểm tra role — chỉ cho SHIPPER login vào app này
      const payload = JSON.parse(atob(data.result.token.split('.')[1]));
      const role: string = payload?.scope || payload?.role || '';
      if (!role.includes('SHIPPER')) {
        throw { status: 403, data: { message: 'Ứng dụng này chỉ dành cho Shipper. Vui lòng dùng ứng dụng khác.' } };
      }
      await storage.setItem(TOKEN_KEY, data.result.token);
    }
    return data;
  }

  async getMyInfo(): Promise<ApiResponse<UserResponse>> {
    return httpClient.get<UserResponse>('/users/me');
  }

  async logout(): Promise<void> {
    // Disconnect WebSocket trước khi xóa token — tránh dùng connection cũ khi login lại
    chatService.disconnect();
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
  }

  async getToken(): Promise<string | null> {
    return storage.getItem(TOKEN_KEY);
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}

export const authService = new AuthService();

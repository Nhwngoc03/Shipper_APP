import { API_BASE_URL, TOKEN_KEY, USER_KEY } from './api.config';
import { httpClient, ApiResponse } from './http.client';
import { chatService } from './chat.service';

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
      localStorage.setItem(TOKEN_KEY, data.result.token);
    }
    return data;
  }

  async getMyInfo(): Promise<ApiResponse<UserResponse>> {
    return httpClient.get<UserResponse>('/users/me');
  }

  logout(): void {
    // Disconnect WebSocket trước khi xóa token — tránh dùng connection cũ khi login lại
    chatService.disconnect();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();

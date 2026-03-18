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
  license?: string;
  ratingAverage?: number;
  bankName?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
  licenseImageUrl?: string;
  vehicleDocImageUrl?: string;
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

  async updateMyInfo(data: {
    fullName?: string;
    phoneNumber?: string;
    address?: string;
    vehicleNumber?: string;
    license?: string;
    bankName?: string;
    bankAccount?: string;
    bankAccountHolder?: string;
  }): Promise<ApiResponse<UserResponse>> {
    return httpClient.put<UserResponse>('/users/me', data);
  }

  async updateMyImages(
    avatarFile?: { uri: string; name: string; type: string } | null,
    licenseFile?: { uri: string; name: string; type: string } | null,
    vehicleDocFile?: { uri: string; name: string; type: string } | null,
  ): Promise<ApiResponse<UserResponse>> {
    const formData = new FormData();
    const appendFile = async (key: string, file: { uri: string; name: string; type: string }) => {
      if (file.uri.startsWith('blob:')) {
        const blob = await fetch(file.uri).then(r => r.blob());
        formData.append(key, blob, file.name);
      } else {
        formData.append(key, { uri: file.uri, name: file.name, type: file.type } as any);
      }
    };
    if (avatarFile) await appendFile('logoUrl', avatarFile);
    if (licenseFile) await appendFile('licenseImage', licenseFile);
    if (vehicleDocFile) await appendFile('vehicleDocImage', vehicleDocFile);

    const token = await this.getToken();
    const res = await fetch(`${API_BASE_URL}/users/me/images`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, data };
    return data;
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

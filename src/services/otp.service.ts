import { httpClient, ApiResponse } from './http.client';

export interface OtpResponse { email?: string; verified?: boolean; }

class OtpService {
  async sendOtp(email: string): Promise<ApiResponse<OtpResponse>> {
    return httpClient.post<OtpResponse>('/otp-verification/send-otp', { email });
  }

  async verifyOtp(email: string, otp: string): Promise<ApiResponse<OtpResponse>> {
    return httpClient.post<OtpResponse>('/otp-verification/verify-otp', { email, otp });
  }
}

export const otpService = new OtpService();

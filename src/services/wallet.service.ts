import { httpClient, ApiResponse } from './http.client';

export interface ShipperWalletResponse {
  id: number;
  shipperId: number;
  status: string;
  totalBalance: number;
  frozenBalance: number;
  totalRevenueAllTime: number;
  totalWithdrawn: number;
  createAt: string;
}

export interface ShipperWithdrawRequest {
  amount: number;
  reason?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
}

export interface ShipperWithdrawResponse {
  id: number;
  amount: number;
  fee: number;
  receiveAmount: number;
  reason: string;
  status: string;
  adminNote?: string;
  processedAt?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  qrCodeUrl?: string;
  checkoutUrl?: string;
}

class WalletService {
  async getMyWallet(): Promise<ApiResponse<ShipperWalletResponse>> {
    return httpClient.get<ShipperWalletResponse>('/wallets/shipper/me');
  }

  async createWithdrawRequest(data: ShipperWithdrawRequest): Promise<ApiResponse<ShipperWithdrawResponse>> {
    return httpClient.post<ShipperWithdrawResponse>('/wallets/shipper/withdraw-requests', data);
  }

  async getMyWithdrawRequests(): Promise<ApiResponse<ShipperWithdrawResponse[]>> {
    return httpClient.get<ShipperWithdrawResponse[]>('/wallets/shipper/withdraw-requests/my');
  }
}

export const walletService = new WalletService();

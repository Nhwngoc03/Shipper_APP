import { httpClient, ApiResponse } from './http.client';
import { API_BASE_URL } from './api.config';

export interface AvailableOrderResponse {
  orderId: number;
  shopName: string;
  shopAddress: string;
  shopPhone?: string | null;
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  shippingFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  estimatedDeliveryDate: string | null;
  shipToShopKm: number | null;
  shopToBuyerKm: number | null;
  distanceKm: number | null;
}

export interface ShipperOrderResponse {
  orderId: number;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  shippingFee: number;
  status: string;
  createdAt: string;
  estimatedDeliveryDate: string | null;
  note: string | null;
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  shippingLatitude?: number | null;
  shippingLongitude?: number | null;
}

export interface ShipperLocationResponse {
  shipperId: number;
  shipperName: string;
  orderId: number;
  latitude: number;
  longitude: number;
  updatedAt: string;
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  destLatitude?: number | null;
  destLongitude?: number | null;
}

export interface UpdateOrderStatusRequest {
  status: 'DELIVERED' | 'FAILED';
  note?: string;
}

export interface ShipperRegisterRequest {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  address: string;
  license: string;
  vehicleNumber: string;
}

class ShipperService {
  async register(data: ShipperRegisterRequest): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ ...data, roleName: 'SHIPPER' }));
    const res = await fetch(`${API_BASE_URL}/users/register`, { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok) throw { status: res.status, data: json };
    return json;
  }

  async getNearbyOrders(lat: number, lng: number): Promise<ApiResponse<AvailableOrderResponse[]>> {
    return httpClient.get<AvailableOrderResponse[]>(`/shipper/orders/nearby?lat=${lat}&lng=${lng}`);
  }

  async acceptOrder(orderId: number): Promise<ApiResponse<ShipperOrderResponse>> {
    return httpClient.post<ShipperOrderResponse>(`/shipper/orders/${orderId}/accept`, {});
  }

  async updateOrderStatus(orderId: number, req: UpdateOrderStatusRequest): Promise<ApiResponse<ShipperOrderResponse>> {
    return httpClient.post<ShipperOrderResponse>(`/shipper/orders/${orderId}/status`, req);
  }

  async getMyOrders(): Promise<ApiResponse<ShipperOrderResponse[]>> {
    return httpClient.get<ShipperOrderResponse[]>('/shipper/orders/my');
  }

  async getShipperLocation(orderId: number): Promise<ApiResponse<ShipperLocationResponse>> {
    return httpClient.get<ShipperLocationResponse>(`/shipper/location/order/${orderId}`);
  }
}

export const shipperService = new ShipperService();

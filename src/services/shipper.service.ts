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
  bankName?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
}

class ShipperService {
  async register(
    data: ShipperRegisterRequest,
    avatarFile?: { uri: string; name: string; type: string } | null,
    licenseFile?: { uri: string; name: string; type: string } | null,
    vehicleDocFile?: { uri: string; name: string; type: string } | null,
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ ...data, roleName: 'SHIPPER' }));

    if (avatarFile) {
      // Web: fetch blob từ object URL
      if (avatarFile.uri.startsWith('blob:')) {
        const blob = await fetch(avatarFile.uri).then(r => r.blob());
        formData.append('logoUrl', blob, avatarFile.name);
      } else {
        formData.append('logoUrl', { uri: avatarFile.uri, name: avatarFile.name, type: avatarFile.type } as any);
      }
    }

    if (licenseFile) {
      if (licenseFile.uri.startsWith('blob:')) {
        const blob = await fetch(licenseFile.uri).then(r => r.blob());
        formData.append('licenseImage', blob, licenseFile.name);
      } else {
        formData.append('licenseImage', { uri: licenseFile.uri, name: licenseFile.name, type: licenseFile.type } as any);
      }
    }

    if (vehicleDocFile) {
      if (vehicleDocFile.uri.startsWith('blob:')) {
        const blob = await fetch(vehicleDocFile.uri).then(r => r.blob());
        formData.append('vehicleDocImage', blob, vehicleDocFile.name);
      } else {
        formData.append('vehicleDocImage', { uri: vehicleDocFile.uri, name: vehicleDocFile.name, type: vehicleDocFile.type } as any);
      }
    }

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

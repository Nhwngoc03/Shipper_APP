// ===================== API CONFIG =====================
// Chạy web (Vite): dùng localhost. Đổi thành IP máy nếu dùng thiết bị thật.
export const API_BASE_URL = 'http://localhost:8080/api/v1';

export const TOKEN_KEY = 'shipper_token';
export const USER_KEY = 'shipper_user';

export const WS_BASE_URL = API_BASE_URL.endsWith('/api/v1')
  ? API_BASE_URL.slice(0, -7)
  : API_BASE_URL;

import { Platform } from 'react-native';

// ===================== API CONFIG =====================
// Nếu là Android Emulator, dùng 10.0.2.2
// Nếu là Web hoặc iOS Emulator, dùng localhost
// Nếu dùng máy thật, hãy thay bằng IP máy tính (vd: 192.168.1.132)
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }
  return 'http://localhost:8080/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export const TOKEN_KEY = 'shipper_token';
export const USER_KEY = 'shipper_user';

export const WS_BASE_URL = API_BASE_URL.endsWith('/api/v1')
  ? API_BASE_URL.slice(0, -7)
  : API_BASE_URL;
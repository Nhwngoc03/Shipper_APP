import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, Modal, Platform, Alert
} from 'react-native';
import { Camera, Shield, CheckCircle, AlertCircle, Eye, ArrowLeft, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { authService, UserResponse } from '../services';

interface DriverVerificationNativeProps {
  onBack: () => void;
}

type ImageFile = { uri: string; name: string; type: string };

// ─── Hàm chọn ảnh: xử lý riêng Web và iOS/Android ───────────────────────────
async function pickImage(onError?: (msg: string) => void): Promise<ImageFile | null> {
  // ── Web ──────────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      // Gắn vào DOM để đảm bảo hoạt động trên mọi trình duyệt
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = (e: any) => {
        document.body.removeChild(input);
        const file = e.target.files?.[0];
        if (!file) { resolve(null); return; }
        resolve({ uri: URL.createObjectURL(file), name: file.name, type: file.type });
      };
      input.oncancel = () => {
        document.body.removeChild(input);
        resolve(null);
      };
      input.click();
    });
  }

  // ── iOS / Android ─────────────────────────────────────────────────────────────
  return new Promise((resolve) => {
    Alert.alert(
      'Chọn ảnh',
      'Chọn nguồn ảnh',
      [
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              onError?.('Cần cấp quyền truy cập camera');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              resolve({
                uri: asset.uri,
                name: asset.fileName ?? 'photo.jpg',
                type: asset.mimeType ?? 'image/jpeg',
              });
            } else {
              resolve(null);
            }
          },
        },
        {
          text: 'Thư viện ảnh',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              onError?.('Cần cấp quyền truy cập thư viện ảnh');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              resolve({
                uri: asset.uri,
                name: asset.fileName ?? 'photo.jpg',
                type: asset.mimeType ?? 'image/jpeg',
              });
            } else {
              resolve(null);
            }
          },
        },
        { text: 'Huỷ', style: 'cancel', onPress: () => resolve(null) },
      ],
    );
  });
}

// ─── Helper: chuẩn hoá URL ảnh từ server ─────────────────────────────────────
// Một số backend trả về URL tương đối (vd: "/uploads/abc.jpg")
// Hàm này đảm bảo luôn là URL đầy đủ
function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  // Nếu là đường dẫn tương đối, ghép với base URL của API
  // ⚠️ Thay BASE_URL bên dưới thành URL thực tế của backend bạn
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
  return `${BASE_URL}${url}`;
}

export default function DriverVerificationNative({ onBack }: DriverVerificationNativeProps) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [licenseFile, setLicenseFile] = useState<ImageFile | null>(null);
  const [vehicleDocFile, setVehicleDocFile] = useState<ImageFile | null>(null);

  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');

  useEffect(() => {
    authService.getMyInfo()
      .then(res => { if (res.result) setUser(res.result); })
      .catch(() => setError('Không thể tải thông tin'))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = !!(licenseFile || vehicleDocFile);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setError('');
    try {
      const res = await authService.updateMyImages(null, licenseFile, vehicleDocFile);
      if (res.result) setUser(res.result);
      setLicenseFile(null);
      setVehicleDocFile(null);
      setSuccess('Cập nhật giấy tờ thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.data?.message || 'Cập nhật thất bại. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;
  }

  const isVerified = user?.status === 'ACTIVE';

  // Ưu tiên ảnh mới chọn, fallback về ảnh từ server (đã chuẩn hoá URL)
  const licensePreview = licenseFile?.uri || normalizeImageUrl(user?.licenseImageUrl);
  const vehicleDocPreview = vehicleDocFile?.uri || normalizeImageUrl(user?.vehicleDocImageUrl);

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.statusBanner, isVerified ? styles.statusBannerGreen : styles.statusBannerYellow]}>
          {isVerified
            ? <CheckCircle size={28} color="#10b981" />
            : <AlertCircle size={28} color="#f59e0b" />}
          <View style={styles.statusText}>
            <Text style={[styles.statusTitle, isVerified ? styles.statusTitleGreen : styles.statusTitleYellow]}>
              {isVerified ? 'Tài xế đã được xác minh' : 'Chờ xác minh'}
            </Text>
            <Text style={styles.statusSub}>
              {isVerified
                ? 'Hồ sơ của bạn đã được Admin phê duyệt'
                : 'Vui lòng cung cấp đầy đủ giấy tờ để được duyệt'}
            </Text>
          </View>
        </View>

        {/* Feedback */}
        {success ? (
          <View style={styles.successBox}>
            <CheckCircle size={14} color="#10b981" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={14} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* License image */}
        <DocCard
          title="Bằng lái xe"
          description="Ảnh mặt trước bằng lái xe còn hiệu lực"
          previewUri={licensePreview}
          hasNewFile={!!licenseFile}
          onPick={async () => {
            const f = await pickImage(setError);
            if (f) setLicenseFile(f);
          }}
          onView={() => {
            if (licensePreview) {
              setViewerImage(licensePreview);
              setViewerTitle('Bằng lái xe');
            }
          }}
        />

        {/* Vehicle doc image */}
        <DocCard
          title="Giấy tờ xe"
          description="Đăng ký xe / giấy phép lưu hành"
          previewUri={vehicleDocPreview}
          hasNewFile={!!vehicleDocFile}
          onPick={async () => {
            const f = await pickImage(setError);
            if (f) setVehicleDocFile(f);
          }}
          onView={() => {
            if (vehicleDocPreview) {
              setViewerImage(vehicleDocPreview);
              setViewerTitle('Giấy tờ xe');
            }
          }}
        />

        {/* Save button */}
        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <><Upload size={18} color="white" /><Text style={styles.saveBtnText}>Cập nhật giấy tờ</Text></>}
          </TouchableOpacity>
        )}

        <View style={styles.noteBox}>
          <Shield size={16} color="#64748b" />
          <Text style={styles.noteText}>
            Giấy tờ của bạn được bảo mật và chỉ dùng để xác minh danh tính tài xế.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={() => setViewerImage(null)}>
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{viewerTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
          {viewerImage && (
            <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );
}

function DocCard({
  title, description, previewUri, hasNewFile, onPick, onView,
}: {
  title: string;
  description: string;
  previewUri?: string;
  hasNewFile: boolean;
  onPick: () => void;
  onView: () => void;
}) {
  return (
    <View style={styles.docCard}>
      <View style={styles.docCardHeader}>
        <View>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docDesc}>{description}</Text>
        </View>
        {hasNewFile && (
          <View style={styles.newBadge}><Text style={styles.newBadgeText}>Mới</Text></View>
        )}
      </View>

      {previewUri ? (
        <TouchableOpacity style={styles.previewWrap} onPress={onView} activeOpacity={0.85}>
          <Image
            source={{ uri: previewUri }}
            style={styles.previewImage}
            onError={() => {/* ảnh lỗi sẽ không crash app */}}
          />
          <View style={styles.previewOverlay}>
            <Eye size={20} color="white" />
            <Text style={styles.previewOverlayText}>Xem ảnh</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyPreview}>
          <Camera size={32} color="#cbd5e1" />
          <Text style={styles.emptyPreviewText}>Chưa có ảnh</Text>
        </View>
      )}

      <TouchableOpacity style={styles.pickBtn} onPress={onPick}>
        <Camera size={16} color="#10b981" />
        <Text style={styles.pickBtnText}>{previewUri ? 'Thay ảnh mới' : 'Chọn ảnh'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginTop: 20, marginBottom: 16,
    padding: 16, borderRadius: 16,
  },
  statusBannerGreen: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#6ee7b7' },
  statusBannerYellow: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d' },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  statusTitleGreen: { color: '#065f46' },
  statusTitleYellow: { color: '#92400e' },
  statusSub: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#d1fae5', marginHorizontal: 20, marginBottom: 12,
    padding: 12, borderRadius: 12,
  },
  successText: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', marginHorizontal: 20, marginBottom: 12,
    padding: 12, borderRadius: 12,
  },
  errorText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  docCard: {
    backgroundColor: 'white', marginHorizontal: 20, marginBottom: 16,
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  docCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  docTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  docDesc: { fontSize: 12, fontWeight: '500', color: '#94a3b8' },
  newBadge: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: 'white' },
  previewWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  previewImage: { width: '100%', height: 180, resizeMode: 'cover' },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10,
  },
  previewOverlayText: { fontSize: 13, fontWeight: '700', color: 'white' },
  emptyPreview: {
    height: 140, backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  emptyPreviewText: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  pickBtnText: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  saveBtn: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: '#10b981',
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 20, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 14,
  },
  noteText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#64748b', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 48,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: 'white' },
  viewerImage: { flex: 1, width: '100%' },
});
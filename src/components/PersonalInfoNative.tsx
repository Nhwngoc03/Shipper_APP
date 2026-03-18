import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Image, Platform, Alert
} from 'react-native';
import {
  User, Phone, MapPin, Truck, FileText, CreditCard,
  Edit3, Check, X, Camera, Mail, Star
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { authService, UserResponse } from '../services';

interface PersonalInfoNativeProps {
  onBack: () => void;
}

export default function PersonalInfoNative({ onBack: _onBack }: PersonalInfoNativeProps) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    fullName: '', phoneNumber: '', address: '',
    vehicleNumber: '', license: '',
    bankName: '', bankAccount: '', bankAccountHolder: '',
  });

  useEffect(() => {
    authService.getMyInfo()
      .then(res => {
        const u = res.result;
        if (u) {
          setUser(u);
          setForm({
            fullName: u.fullName || '',
            phoneNumber: u.phoneNumber || '',
            address: u.address || '',
            vehicleNumber: u.vehicleNumber || '',
            license: u.license || '',
            bankName: u.bankName || '',
            bankAccount: u.bankAccount || '',
            bankAccountHolder: u.bankAccountHolder || '',
          });
        }
      })
      .catch(() => setError('Không thể tải thông tin'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.fullName.trim()) { setError('Họ tên không được để trống'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await authService.updateMyInfo({
        fullName: form.fullName, phoneNumber: form.phoneNumber, address: form.address,
        vehicleNumber: form.vehicleNumber, license: form.license,
        bankName: form.bankName, bankAccount: form.bankAccount, bankAccountHolder: form.bankAccountHolder,
      });
      if (res.result) setUser(res.result);
      setEditing(false);
      setSuccess('Cập nhật thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setForm({
        fullName: user.fullName || '', phoneNumber: user.phoneNumber || '', address: user.address || '',
        vehicleNumber: user.vehicleNumber || '', license: user.license || '',
        bankName: user.bankName || '', bankAccount: user.bankAccount || '', bankAccountHolder: user.bankAccountHolder || '',
      });
    }
    setEditing(false);
    setError('');
  };

  // ─── Hàm upload ảnh sau khi chọn (dùng chung cho web và native) ───
  const uploadAvatar = async (uri: string, name: string, type: string) => {
    try {
      const res = await authService.updateMyImages({ uri, name, type }, null, null);
      if (res.result) {
        setUser(res.result);
        setSuccess('Cập nhật ảnh thành công!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Cập nhật ảnh thất bại');
    }
  };

  // ─── Chọn ảnh: xử lý riêng cho Web và iOS/Android ───
  const handlePickAvatar = async () => {
    // ── Web ──────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const uri = URL.createObjectURL(file);
        await uploadAvatar(uri, file.name, file.type);
      };
      input.click();
      return;
    }

    // ── iOS / Android ─────────────────────────────────────────────────
    // Hỏi người dùng muốn chụp ảnh hay chọn từ thư viện
    Alert.alert(
      'Cập nhật ảnh đại diện',
      'Chọn nguồn ảnh',
      [
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              setError('Cần cấp quyền truy cập camera');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await uploadAvatar(
                asset.uri,
                asset.fileName ?? 'avatar.jpg',
                asset.mimeType ?? 'image/jpeg',
              );
            }
          },
        },
        {
          text: 'Chọn từ thư viện',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              setError('Cần cấp quyền truy cập thư viện ảnh');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await uploadAvatar(
                asset.uri,
                asset.fileName ?? 'avatar.jpg',
                asset.mimeType ?? 'image/jpeg',
              );
            }
          },
        },
        { text: 'Huỷ', style: 'cancel' },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;
  }

  const avatarUri = user?.logoUrl
    || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';

  const sections = [
    {
      title: 'Thông tin cơ bản',
      fields: [
        { key: 'fullName' as const, label: 'Họ và tên', icon: User, placeholder: 'Nguyễn Văn A' },
        { key: 'phoneNumber' as const, label: 'Số điện thoại', icon: Phone, placeholder: '090 123 4567', keyboard: 'phone-pad' as any },
        { key: 'address' as const, label: 'Địa chỉ', icon: MapPin, placeholder: '123 Đường ABC, Quận 1' },
      ],
    },
    {
      title: 'Thông tin xe',
      fields: [
        { key: 'vehicleNumber' as const, label: 'Biển số xe', icon: Truck, placeholder: '29H1-12345' },
        { key: 'license' as const, label: 'Số bằng lái', icon: FileText, placeholder: 'B2-123456' },
      ],
    },
    {
      title: 'Thông tin ngân hàng',
      fields: [
        { key: 'bankName' as const, label: 'Tên ngân hàng', icon: CreditCard, placeholder: 'Vietcombank' },
        { key: 'bankAccount' as const, label: 'Số tài khoản', icon: CreditCard, placeholder: '1234567890', keyboard: 'numeric' as any },
        { key: 'bankAccountHolder' as const, label: 'Tên chủ tài khoản', icon: User, placeholder: 'NGUYEN VAN A' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {editing && (
            <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAvatar}>
              <Camera size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerName}>{user?.fullName || 'Tài xế'}</Text>
        <Text style={styles.headerEmail}>{user?.email || ''}</Text>
        <View style={styles.headerBadges}>
          {user?.ratingAverage != null && (
            <View style={styles.badge}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.badgeText}>{user.ratingAverage.toFixed(1)}</Text>
            </View>
          )}
          <View style={[styles.badge, user?.status === 'ACTIVE' ? styles.badgeGreen : styles.badgeGray]}>
            <Text style={[styles.badgeText, user?.status === 'ACTIVE' ? styles.badgeTextGreen : styles.badgeTextGray]}>
              {user?.status === 'ACTIVE' ? 'Đang hoạt động' : user?.status === 'PENDING' ? 'Chờ duyệt' : user?.status || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Email read-only */}
      <View style={styles.readOnlyRow}>
        <View style={styles.readOnlyIcon}><Mail size={16} color="#94a3b8" /></View>
        <View style={styles.readOnlyContent}>
          <Text style={styles.readOnlyLabel}>Email</Text>
          <Text style={styles.readOnlyValue}>{user?.email || '—'}</Text>
        </View>
        <View style={styles.lockedBadge}><Text style={styles.lockedText}>Cố định</Text></View>
      </View>

      {success ? (
        <View style={styles.successBox}><Check size={14} color="#10b981" /><Text style={styles.successText}>{success}</Text></View>
      ) : null}
      {error ? (
        <View style={styles.errorBox}><X size={14} color="#ef4444" /><Text style={styles.errorText}>{error}</Text></View>
      ) : null}

      {/* Sections */}
      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.fields.map((field, idx) => {
              const Icon = field.icon;
              const value = form[field.key];
              return (
                <View key={field.key} style={[styles.fieldRow, idx < section.fields.length - 1 && styles.fieldRowBorder]}>
                  <View style={styles.fieldIcon}><Icon size={16} color="#10b981" /></View>
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    {editing ? (
                      <TextInput
                        style={styles.fieldInput} value={value} onChangeText={set(field.key)}
                        placeholder={field.placeholder} keyboardType={(field as any).keyboard || 'default'}
                        placeholderTextColor="#cbd5e1" autoCapitalize="none"
                      />
                    ) : (
                      <Text style={[styles.fieldValue, !value && styles.fieldValueEmpty]}>{value || '—'}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* Actions */}
      <View style={styles.actions}>
        {editing ? (
          <>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
              <X size={18} color="#64748b" /><Text style={styles.cancelBtnText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="white" />
                : <><Check size={18} color="white" /><Text style={styles.saveBtnText}>Lưu thay đổi</Text></>}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Edit3 size={18} color="white" /><Text style={styles.editBtnText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: 'white', alignItems: 'center',
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4, marginBottom: 20,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#d1fae5' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white',
  },
  headerName: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  headerEmail: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 10 },
  headerBadges: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#fef3c7' },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeGray: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  badgeTextGreen: { color: '#065f46' },
  badgeTextGray: { color: '#64748b' },
  readOnlyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white',
    marginHorizontal: 20, marginBottom: 8, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  readOnlyIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  readOnlyContent: { flex: 1 },
  readOnlyLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  readOnlyValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  lockedBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  lockedText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#d1fae5', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 12 },
  successText: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 12 },
  errorText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sectionCard: {
    backgroundColor: 'white', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden',
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 },
  fieldValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  fieldValueEmpty: { color: '#cbd5e1', fontStyle: 'italic' },
  fieldInput: { fontSize: 14, fontWeight: '600', color: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#10b981', paddingVertical: 2, paddingHorizontal: 0 },
  actions: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 8 },
  editBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  editBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  cancelBtnText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
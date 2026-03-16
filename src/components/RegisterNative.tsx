import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { Phone, Lock, User, ArrowRight, FileText, Truck, Mail } from 'lucide-react-native';
import { shipperService } from '../services';

interface RegisterNativeProps {
  onRegister: () => void;
}

export default function RegisterNative({ onRegister }: RegisterNativeProps) {
  const [form, setForm] = useState({
    fullName: '', email: '', phoneNumber: '',
    password: '', confirmPassword: '',
    address: '', vehicleNumber: '', license: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    const { fullName, email, phoneNumber, password, confirmPassword, address, vehicleNumber, license } = form;
    if (!fullName || !email || !phoneNumber || !password || !vehicleNumber) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await shipperService.register({ fullName, email, phoneNumber, password, address, vehicleNumber, license });
      onRegister();
    } catch (err: any) {
      setError(err?.data?.message || 'Đăng ký thất bại. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; placeholder: string; icon: any; secure?: boolean; keyboard?: any }[] = [
    { key: 'fullName', label: 'Họ và tên *', placeholder: 'Nguyễn Văn A', icon: User },
    { key: 'email', label: 'Email *', placeholder: 'shipper@example.com', icon: Mail, keyboard: 'email-address' },
    { key: 'phoneNumber', label: 'Số điện thoại *', placeholder: '090 123 4567', icon: Phone, keyboard: 'phone-pad' },
    { key: 'password', label: 'Mật khẩu *', placeholder: '••••••••', icon: Lock, secure: true },
    { key: 'confirmPassword', label: 'Xác nhận mật khẩu *', placeholder: '••••••••', icon: Lock, secure: true },
    { key: 'address', label: 'Địa chỉ', placeholder: '123 Đường ABC, Quận 1', icon: FileText },
    { key: 'vehicleNumber', label: 'Biển số xe *', placeholder: '29H1-12345', icon: Truck },
    { key: 'license', label: 'Số bằng lái', placeholder: 'B2-123456', icon: FileText },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {fields.map(f => {
        const Icon = f.icon;
        return (
          <View key={f.key} style={styles.formGroup}>
            <Text style={styles.label}>{f.label}</Text>
            <View style={styles.inputContainer}>
              <Icon size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChangeText={set(f.key)}
                secureTextEntry={f.secure}
                keyboardType={f.keyboard || 'default'}
                autoCapitalize="none"
                placeholderTextColor="#cbd5e1"
              />
            </View>
          </View>
        );
      })}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <><Text style={styles.submitButtonText}>Đăng ký tài xế</Text><ArrowRight size={20} color="white" /></>
        }
      </TouchableOpacity>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          Bằng cách đăng ký, bạn đồng ý với{' '}
          <Text style={styles.termsLink}>Điều khoản dịch vụ</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 20 },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 12, fontWeight: '700', color: '#64748b',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 16,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12,
    fontSize: 14, fontWeight: '600', color: '#0f172a',
  },
  errorText: {
    color: '#ef4444', fontSize: 13, fontWeight: '600',
    marginBottom: 12, textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 8, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  submitButtonDisabled: { backgroundColor: '#6ee7b7' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  termsContainer: { marginBottom: 40, alignItems: 'center' },
  termsText: { fontSize: 12, fontWeight: '500', color: '#64748b', textAlign: 'center' },
  termsLink: { color: '#10b981', fontWeight: '700' },
});

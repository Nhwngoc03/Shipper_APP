import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { Phone, Lock, User, ArrowRight, FileText, Truck, Mail, CheckCircle } from 'lucide-react-native';
import { shipperService, otpService } from '../services';
import OTPVerificationNative from './OTPVerificationNative';

interface RegisterNativeProps {
  onRegister: () => void; // quay về tab login
}

export default function RegisterNative({ onRegister }: RegisterNativeProps) {
  const [form, setForm] = useState({
    fullName: '', email: '', phoneNumber: '',
    password: '', confirmPassword: '',
    address: '', vehicleNumber: '', license: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    const { fullName, email, phoneNumber, password, confirmPassword, vehicleNumber } = form;
    if (!fullName || !email || !phoneNumber || !password || !vehicleNumber) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp'); return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự'); return;
    }
    setError('');
    setLoading(true);
    try {
      await otpService.sendOtp(email);
      setShowOtp(true);
    } catch (e: any) {
      setError(e?.data?.message || 'Không thể gửi OTP. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    setLoading(true);
    try {
      const { fullName, email, phoneNumber, password, address, vehicleNumber, license } = form;
      await shipperService.register({ fullName, email, phoneNumber, password, address, vehicleNumber, license });
      setShowOtp(false);
      setDone(true);
    } catch (e: any) {
      setError(e?.data?.message || 'Đăng ký thất bại. Thử lại sau.');
      setShowOtp(false);
    } finally {
      setLoading(false);
    }
  };

  // Màn success — chờ admin duyệt
  if (done) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <CheckCircle size={48} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>Đăng ký thành công!</Text>
        <Text style={styles.successSub}>
          Hồ sơ của bạn đang chờ Admin duyệt.{'\n'}
          Bạn sẽ nhận thông báo qua email khi được chấp thuận.
        </Text>
        <TouchableOpacity style={styles.backToLoginBtn} onPress={onRegister}>
          <Text style={styles.backToLoginTxt}>Về trang đăng nhập</Text>
          <ArrowRight size={18} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  if (showOtp) {
    return (
      <OTPVerificationNative
        email={form.email}
        onVerified={handleOtpVerified}
        onBack={() => setShowOtp(false)}
      />
    );
  }

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
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <><Text style={styles.submitButtonText}>Tiếp theo</Text><ArrowRight size={20} color="white" /></>
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
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  submitButton: { backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  submitButtonDisabled: { backgroundColor: '#6ee7b7' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  termsContainer: { marginBottom: 40, alignItems: 'center' },
  termsText: { fontSize: 12, fontWeight: '500', color: '#64748b', textAlign: 'center' },
  termsLink: { color: '#10b981', fontWeight: '700' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 80 },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  successSub: { fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  backToLoginBtn: { backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backToLoginTxt: { color: 'white', fontSize: 15, fontWeight: '800' },
});

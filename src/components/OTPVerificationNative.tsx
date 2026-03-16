import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { Mail, ArrowRight, RefreshCw } from 'lucide-react-native';
import { otpService } from '../services';

interface OTPVerificationNativeProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OTPVerificationNative({ email, onVerified, onBack }: OTPVerificationNativeProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      await otpService.sendOtp(email);
      setSuccess('Đã gửi lại mã OTP!');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.data?.message || 'Không thể gửi OTP. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Vui lòng nhập đủ 6 số'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await otpService.verifyOtp(email, code);
      if (res.result?.verified) {
        setSuccess('Xác thực thành công!');
        setTimeout(() => onVerified(), 800);
      } else {
        setError('Mã OTP không đúng. Thử lại.');
        setOtp(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } catch (e: any) {
      setError(e?.data?.message || 'Mã OTP không đúng. Thử lại.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Mail size={32} color="#10b981" />
        </View>

        <Text style={styles.title}>Xác thực Email</Text>
        <Text style={styles.sub}>Đã gửi mã OTP đến</Text>
        <Text style={styles.email}>{email}</Text>

        {error ? <View style={styles.errBox}><Text style={styles.errTxt}>{error}</Text></View> : null}
        {success ? <View style={styles.okBox}><Text style={styles.okTxt}>{success}</Text></View> : null}

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => { inputs.current[i] = r; }}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={v => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!loading}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendBtn}>
              <RefreshCw size={14} color="#10b981" />
              <Text style={styles.resendTxt}>Gửi lại mã OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownTxt}>Gửi lại sau <Text style={styles.countdownNum}>{countdown}s</Text></Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, (loading || otp.join('').length !== 6) && styles.verifyBtnOff]}
          onPress={handleVerify}
          disabled={loading || otp.join('').length !== 6}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <><Text style={styles.verifyTxt}>XÁC THỰC</Text><ArrowRight size={18} color="white" /></>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} disabled={loading} style={styles.backBtn}>
          <Text style={styles.backTxt}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  iconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  sub: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  email: { fontSize: 13, fontWeight: '700', color: '#10b981', marginBottom: 20 },
  errBox: { width: '100%', backgroundColor: '#fef2f2', borderRadius: 12, padding: 10, marginBottom: 12 },
  errTxt: { fontSize: 12, fontWeight: '600', color: '#ef4444', textAlign: 'center' },
  okBox: { width: '100%', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 10, marginBottom: 12 },
  okTxt: { fontSize: 12, fontWeight: '600', color: '#10b981', textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  otpInput: { width: 44, height: 52, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#0f172a', backgroundColor: '#f8fafc' },
  otpInputFilled: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  resendRow: { marginBottom: 20 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resendTxt: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  countdownTxt: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
  countdownNum: { fontWeight: '700', color: '#374151' },
  verifyBtn: { width: '100%', backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  verifyBtnOff: { backgroundColor: '#d1fae5' },
  verifyTxt: { color: 'white', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  backBtn: { paddingVertical: 8 },
  backTxt: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { authService } from '../services';

interface LoginNativeProps {
  onLogin: () => void;
}

export default function LoginNative({ onLogin }: LoginNativeProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.login({ email, password });
      onLogin();
    } catch (err: any) {
      const msg = err?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="shipper@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputContainer}>
          <Lock size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <>
              <Text style={styles.submitButtonText}>Đăng nhập</Text>
              <ArrowRight size={20} color="white" />
            </>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.forgotButton}>
        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: { paddingHorizontal: 20, paddingVertical: 30 },
  formGroup: { marginBottom: 20 },
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
    flex: 1, paddingVertical: 16, paddingHorizontal: 12,
    fontSize: 14, fontWeight: '600', color: '#0f172a',
  },
  errorText: {
    color: '#ef4444', fontSize: 13, fontWeight: '600',
    marginBottom: 12, textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  submitButtonDisabled: { backgroundColor: '#6ee7b7' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  forgotButton: { marginTop: 16, alignItems: 'center' },
  forgotText: { fontSize: 14, fontWeight: '600', color: '#10b981' },
});

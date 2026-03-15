import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput,
  StyleSheet,
  ScrollView
} from 'react-native';
import { 
  Phone, 
  Lock, 
  User, 
  ArrowRight,
  Camera,
  Upload,
  FileText,
  Truck
} from 'lucide-react-native';

interface RegisterNativeProps {
  onRegister: () => void;
}

export default function RegisterNative({ onRegister }: RegisterNativeProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [personalPhoto, setPersonalPhoto] = useState(false);
  const [licensePhoto, setLicensePhoto] = useState(false);
  const [certificatePhoto, setCertificatePhoto] = useState(false);

  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Họ và tên</Text>
        <View style={styles.inputContainer}>
          <User size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Số điện thoại</Text>
        <View style={styles.inputContainer}>
          <Phone size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="090 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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

      <View style={styles.formGroup}>
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <View style={styles.inputContainer}>
          <Lock size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Biển số xe</Text>
        <View style={styles.inputContainer}>
          <Truck size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="29 H1 - 12345"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Photo Upload Section */}
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>📸 Tải lên tài liệu</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ảnh cá nhân</Text>
        <TouchableOpacity 
          style={[styles.uploadButton, personalPhoto && styles.uploadButtonSuccess]}
          onPress={() => setPersonalPhoto(!personalPhoto)}
        >
          <Camera size={20} color={personalPhoto ? '#10b981' : '#94a3b8'} />
          <Text style={[styles.uploadButtonText, personalPhoto && styles.uploadButtonTextSuccess]}>
            {personalPhoto ? 'Đã tải lên' : 'Chọn ảnh cá nhân'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ảnh bằng lái xe</Text>
        <TouchableOpacity 
          style={[styles.uploadButton, licensePhoto && styles.uploadButtonSuccess]}
          onPress={() => setLicensePhoto(!licensePhoto)}
        >
          <FileText size={20} color={licensePhoto ? '#10b981' : '#94a3b8'} />
          <Text style={[styles.uploadButtonText, licensePhoto && styles.uploadButtonTextSuccess]}>
            {licensePhoto ? 'Đã tải lên' : 'Chọn ảnh bằng lái'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Cà vẹt xe/Giấy đăng ký</Text>
        <TouchableOpacity 
          style={[styles.uploadButton, certificatePhoto && styles.uploadButtonSuccess]}
          onPress={() => setCertificatePhoto(!certificatePhoto)}
        >
          <Upload size={20} color={certificatePhoto ? '#10b981' : '#94a3b8'} />
          <Text style={[styles.uploadButtonText, certificatePhoto && styles.uploadButtonTextSuccess]}>
            {certificatePhoto ? 'Đã tải lên' : 'Chọn ảnh cà vẹt'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.submitButton}
        onPress={onRegister}
      >
        <Text style={styles.submitButtonText}>Đăng ký tài xế</Text>
        <ArrowRight size={20} color="white" />
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
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginVertical: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  uploadButtonSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  uploadButtonTextSuccess: {
    color: '#10b981',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  termsContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  termsLink: {
    color: '#10b981',
    fontWeight: '700',
  },
});

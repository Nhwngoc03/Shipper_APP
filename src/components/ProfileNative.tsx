import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image, ActivityIndicator
} from 'react-native';
import {
  User, Settings, Shield, CreditCard, HelpCircle,
  LogOut, ChevronRight, Award, Wallet, ArrowLeft, Star
} from 'lucide-react-native';
import IncomeNative from './IncomeNative';
import WalletNative from './WalletNative';
import PersonalInfoNative from './PersonalInfoNative';
import DriverVerificationNative from './DriverVerificationNative';
import { authService, UserResponse } from '../services';

interface ProfileNativeProps {
  onLogout: () => void;
}

export default function ProfileNative({ onLogout }: ProfileNativeProps) {
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getMyInfo()
      .then(res => setUser(res.result || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  if (selectedMenu === 'verify') {
    return (
      <View style={styles.incomeContainer}>
        <TouchableOpacity style={styles.incomeHeader} onPress={() => setSelectedMenu(null)}>
          <ArrowLeft size={24} color="#0f172a" />
          <Text style={styles.incomeHeaderTitle}>Xác minh tài xế</Text>
        </TouchableOpacity>
        <DriverVerificationNative onBack={() => setSelectedMenu(null)} />
      </View>
    );
  }

  if (selectedMenu === 'personal') {
    return (
      <View style={styles.incomeContainer}>
        <TouchableOpacity style={styles.incomeHeader} onPress={() => setSelectedMenu(null)}>
          <ArrowLeft size={24} color="#0f172a" />
          <Text style={styles.incomeHeaderTitle}>Quay lại</Text>
        </TouchableOpacity>
        <PersonalInfoNative onBack={() => setSelectedMenu(null)} />
      </View>
    );
  }

  if (selectedMenu === 'income') {
    return (
      <View style={styles.incomeContainer}>
        <TouchableOpacity style={styles.incomeHeader} onPress={() => setSelectedMenu(null)}>
          <ArrowLeft size={24} color="#0f172a" />
          <Text style={styles.incomeHeaderTitle}>Quay lại</Text>
        </TouchableOpacity>
        <IncomeNative />
      </View>
    );
  }

  if (selectedMenu === 'wallet') {
    return (
      <View style={styles.incomeContainer}>
        <TouchableOpacity style={styles.incomeHeader} onPress={() => setSelectedMenu(null)}>
          <ArrowLeft size={24} color="#0f172a" />
          <Text style={styles.incomeHeaderTitle}>Quay lại</Text>
        </TouchableOpacity>
        <WalletNative />
      </View>
    );
  }

  const menuItems = [
    { icon: User, label: 'Thông tin cá nhân', sub: 'Cập nhật hồ sơ của bạn', id: 'personal' },
    { icon: Shield, label: 'Xác minh tài xế', sub: 'Bằng lái, giấy tờ xe', status: 'Đã xác minh', id: 'verify' },
    { icon: Wallet, label: 'Ví của tôi', sub: 'Số dư & rút tiền', id: 'wallet' },
    { icon: CreditCard, label: 'Thu nhập', sub: 'Xem lịch sử giao dịch', id: 'income' },
    { icon: Settings, label: 'Cài đặt ứng dụng', sub: 'Thông báo, ngôn ngữ', id: 'settings' },
    { icon: HelpCircle, label: 'Trung tâm hỗ trợ', sub: 'Câu hỏi thường gặp, liên hệ', id: 'support' },
  ];

  const avatarUri = user?.logoUrl
    || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={styles.badgeContainer}>
            <Award size={18} color="white" />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#10b981" style={{ marginVertical: 12 }} />
        ) : (
          <>
            <Text style={styles.profileName}>{user?.fullName || 'Tài xế'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <Text style={styles.profileRole}>Đối tác tài xế</Text>
          </>
        )}

        <View style={styles.statsContainer}>
          {user?.vehicleNumber && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.vehicleNumber}</Text>
              <Text style={styles.statLabel}>Biển số xe</Text>
            </View>
          )}
          {user?.ratingAverage != null && (
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.statValue}>{user.ratingAverage.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Đánh giá</Text>
            </View>
          )}
          {user?.phoneNumber && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.phoneNumber}</Text>
              <Text style={styles.statLabel}>Điện thoại</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if (item.id === 'personal') setSelectedMenu('personal');
                else if (item.id === 'verify') setSelectedMenu('verify');
                else if (item.id === 'income') setSelectedMenu('income');
                else if (item.id === 'wallet') setSelectedMenu('wallet');
              }}
            >
              <View style={styles.menuIconContainer}>
                <Icon size={20} color="#10b981" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.status && <Text style={styles.menuStatus}>{item.status}</Text>}
                <ChevronRight size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  incomeContainer: { flex: 1, backgroundColor: '#f8fafc' },
  incomeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  incomeHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  profileHeader: {
    backgroundColor: 'white', paddingHorizontal: 20,
    paddingTop: 30, paddingBottom: 24, alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 20,
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#d1fae5' },
  badgeContainer: {
    position: 'absolute', bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'white',
  },
  profileName: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 4 },
  profileRole: { fontSize: 13, fontWeight: '600', color: '#10b981', marginBottom: 20 },
  statsContainer: {
    flexDirection: 'row', justifyContent: 'space-around', width: '100%',
    paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuContainer: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  menuItem: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  menuIconContainer: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  menuSub: { fontSize: 12, fontWeight: '500', color: '#94a3b8' },
  menuRight: { alignItems: 'flex-end', gap: 4 },
  menuStatus: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  logoutButton: {
    marginHorizontal: 20, marginBottom: 40, backgroundColor: '#fee2e2',
    borderRadius: 16, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12, justifyContent: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
});

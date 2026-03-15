import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image
} from 'react-native';
import {
  User,
  Settings,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Award,
  Star,
  Wallet,
  ArrowLeft
} from 'lucide-react-native';
import IncomeNative from './IncomeNative';

interface ProfileNativeProps {
  onLogout: () => void;
}

export default function ProfileNative({ onLogout }: ProfileNativeProps) {
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  if (selectedMenu === 'income') {
    return (
      <View style={styles.incomeContainer}>
        <TouchableOpacity 
          style={styles.incomeHeader}
          onPress={() => setSelectedMenu(null)}
        >
          <ArrowLeft size={24} color="#0f172a" />
          <Text style={styles.incomeHeaderTitle}>Quay lại</Text>
        </TouchableOpacity>
        <IncomeNative />
      </View>
    );
  }

  const menuItems = [
    { icon: User, label: 'Thông tin cá nhân', sub: 'Cập nhật hồ sơ của bạn', id: 'personal' },
    { icon: Shield, label: 'Xác minh tài xế', sub: 'Bằng lái, giấy tờ xe', status: 'Đã xác minh', id: 'verify' },
    { icon: Wallet, label: 'Thu nhập', sub: 'Xem lịch sử giao dịch', id: 'income' },
    { icon: CreditCard, label: 'Phương thức thanh toán', sub: 'Liên kết ngân hàng, ví', id: 'payment' },
    { icon: Settings, label: 'Cài đặt ứng dụng', sub: 'Thông báo, ngôn ngữ', id: 'settings' },
    { icon: HelpCircle, label: 'Trung tâm hỗ trợ', sub: 'Câu hỏi thường gặp, liên hệ', id: 'support' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <View style={styles.badgeContainer}>
            <Award size={18} color="white" />
          </View>
        </View>

        <Text style={styles.profileName}>Nguyễn Văn Nam</Text>
        <Text style={styles.profileRole}>Đối tác tài xế Bạch kim</Text>

        <View style={styles.statsContainer}>
          
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2,481</Text>
            <Text style={styles.statLabel}>Tổng đơn</Text>
          </View>
          
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => {
                if (item.id === 'income') {
                  setSelectedMenu('income');
                }
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

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <LogOut size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  incomeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  incomeHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#d1fae5',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  menuContainer: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  menuRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  menuStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
});

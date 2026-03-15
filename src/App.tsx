import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Image, 
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  Navigation, 
  Bike, 
  Home as HomeIcon, 
  Truck, 
  Star, 
  MessageSquare, 
  Phone, 
  LayoutGrid, 
  History, 
  Wallet, 
  Bell, 
  User,
  LogOut,
  Plus,
  Minus
} from 'lucide-react-native';
import IncomeNative from './components/IncomeNative';
import AuthNative from './components/AuthNative';
import HomeNative from './components/HomeNative';
import NotificationsNative from './components/NotificationsNative';
import ProfileNative from './components/ProfileNative';
import MessagingNative from './components/MessagingNative';
import ChatDetailNative from './components/ChatDetailNative';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    return <AuthNative onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderContent = () => {
    if (activeTab === 'messaging' && selectedChatId) {
      return (
        <ChatDetailNative 
          onBack={() => setSelectedChatId(null)}
        />
      );
    }

    switch (activeTab) {
      case 'home': return <HomeNative onAcceptOrder={() => setActiveTab('activity')} />;
      case 'income': return <IncomeNative />;
      case 'messaging': return <MessagingNative onSelectChat={(id) => setSelectedChatId(id)} />;
      case 'notifications': return <NotificationsNative />;
      case 'profile': return <ProfileNative onLogout={() => setIsLoggedIn(false)} />;
      case 'activity':
      default:
        return (
          <View style={styles.activityContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9J2b_5l4uE5CpkIapSGK6lvqCM2wcKgpX-laATFrK9N08HEMDA85t4YMgOMecKAAGjc6Ob8rSLBYQcc2cUinVLZbrFTPlnN9tHEYDaCOw3xbjuLDqnwkE5RjlMBG9xL3igF8n1cVCxCOVnSoAPXTMhm_iA4VF-c0-0i_7NxPYlW0wxfREb7CFuzAi1LAxgR7tzVVpbDvLVMkki73rC90D7irJZWNqyBaJTRg1PcG0CSjgjR4yG_PYAJqEidQyCujdn2eS1IAGb-bB' }}
              style={styles.map}
            />
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Truck size={24} color="#10b981" />
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusTitle}>Đang giao hàng</Text>
                  <Text style={styles.statusSubtitle}>Dự kiến: 10:45 AM</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Phone size={20} color="white" />
                <Text style={styles.callButtonText}>Gọi khách hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'home': return 'Trang chủ';
      case 'income': return 'Thu nhập';
      case 'messaging': return selectedChatId ? 'Tin nhắn' : 'Tin nhắn';
      case 'notifications': return 'Thông báo';
      case 'profile': return 'Cá nhân';
      case 'activity': return 'Hoạt động';
      default: return 'Shipper Pro';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop' }} 
            style={styles.avatarSmall}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {renderContent()}
      </View>

      <View style={styles.bottomNav}>
        <NavItem icon={<LayoutGrid size={24} />} label="Trang chủ" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <NavItem icon={<History size={24} />} label="Hoạt động" active={activeTab === 'activity'} onPress={() => setActiveTab('activity')} />
        <NavItem icon={<MessageSquare size={24} />} label="Tin nhắn" active={activeTab === 'messaging'} onPress={() => setActiveTab('messaging')} />
        <NavItem icon={<Bell size={24} />} label="Thông báo" active={activeTab === 'notifications'} onPress={() => setActiveTab('notifications')} />
        <NavItem icon={<User size={24} />} label="Cá nhân" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>
    </SafeAreaView>
  );
}

function NavItem({ icon, label, active, onPress }: { icon: any, label: string, active: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      {React.cloneElement(icon, { color: active ? '#10b981' : '#94a3b8' })}
      <Text style={[styles.navLabel, { color: active ? '#10b981' : '#94a3b8' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
  },
  mainContent: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    height: 80,
    backgroundColor: 'white',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  incomeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 15,
  },
  cardText: {
    fontSize: 14,
    color: '#475569',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  notificationContent: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  notificationText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profileRole: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  orderAddress: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  acceptButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  activityContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statusCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTextContainer: {
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  callButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
  },
  callButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  }
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, StatusBar, Platform
} from 'react-native';
import { LayoutGrid, MessageSquare, Bell, User, Truck } from 'lucide-react-native';
import AuthNative from './components/AuthNative';
import OrdersNative from './components/OrdersNative';
import ActiveOrdersNative from './components/ActiveOrdersNative';
import NotificationsNative from './components/NotificationsNative';
import ProfileNative from './components/ProfileNative';
import MessagingNative from './components/MessagingNative';
import ChatDetailNative from './components/ChatDetailNative';
import SplashScreen from './components/SplashScreen';
import { authService } from './services';
import { Conversation } from './services/chat.service';

type Tab = 'home' | 'active' | 'messaging' | 'notifications' | 'profile';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (authService.isLoggedIn()) {
      setIsLoggedIn(true);
      authService.getMyInfo().then(res => {
        if (res.result?.id) setCurrentUserId(Number(res.result.id));
      }).catch(() => {});
    }
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    return <AuthNative onLogin={() => {
      setIsLoggedIn(true);
      authService.getMyInfo().then(res => {
        if (res.result?.id) setCurrentUserId(Number(res.result.id));
      }).catch(() => {});
    }} />;
  }

  const renderContent = () => {
    if (activeTab === 'messaging' && selectedConv && currentUserId) {
      return (
        <ChatDetailNative
          conversation={selectedConv}
          currentUserId={currentUserId}
          onBack={() => setSelectedConv(null)}
        />
      );
    }
    switch (activeTab) {
      case 'home': return <OrdersNative onAcceptOrder={() => setActiveTab('active')} />;
      case 'active': return <ActiveOrdersNative onOrderCompleted={() => {}} />;
      case 'messaging': return <MessagingNative onSelectChat={(conv) => setSelectedConv(conv)} />;
      case 'notifications': return <NotificationsNative />;
      case 'profile': return <ProfileNative onLogout={() => { setIsLoggedIn(false); setCurrentUserId(null); }} />;
    }
  };

  const getHeaderTitle = (): string => {
    if (activeTab === 'messaging' && selectedConv) return selectedConv.otherUserName;
    const titles: Record<Tab, string> = {
      home: 'Don hang moi',
      active: 'Dang giao',
      messaging: 'Tin nhan',
      notifications: 'Thong bao',
      profile: 'Ca nhan',
    };
    return titles[activeTab];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }}
            style={styles.avatarSmall}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {renderContent()}
      </View>

      <View style={styles.bottomNav}>
        <NavItem icon={<LayoutGrid size={24} />} label="Don moi" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <NavItem icon={<Truck size={24} />} label="Dang giao" active={activeTab === 'active'} onPress={() => setActiveTab('active')} />
        <NavItem icon={<MessageSquare size={24} />} label="Tin nhan" active={activeTab === 'messaging'} onPress={() => { setSelectedConv(null); setActiveTab('messaging'); }} />
        <NavItem icon={<Bell size={24} />} label="Thong bao" active={activeTab === 'notifications'} onPress={() => setActiveTab('notifications')} />
        <NavItem icon={<User size={24} />} label="Ca nhan" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>
    </SafeAreaView>
  );
}

function NavItem({ icon, label, active, onPress }: {
  icon: React.ReactElement<{ color?: string }>; label: string; active: boolean; onPress: () => void;
}) {
  const color = active ? '#10b981' : '#94a3b8';
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      {React.cloneElement(icon, { color })}
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    height: 60, backgroundColor: 'white',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9' },
  mainContent: { flex: 1 },
  bottomNav: {
    height: 80, backgroundColor: 'white',
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },
});

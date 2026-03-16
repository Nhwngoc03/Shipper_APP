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
import ShipperMapNative from './components/ShipperMapNative';
import { authService } from './services';
import { Conversation } from './services/chat.service';
import { ShipperOrderResponse } from './services';

type Tab = 'home' | 'active' | 'messaging' | 'notifications' | 'profile';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [mapOrder, setMapOrder] = useState<ShipperOrderResponse | null>(null);
  // ✅ Thêm state vị trí shipper
  const [shipperPos, setShipperPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (authService.isLoggedIn()) {
      setIsLoggedIn(true);
      authService.getMyInfo().then(res => {
        if (res.result?.id) setCurrentUserId(Number(res.result.id));
      }).catch(() => {});
    }
  }, []);

  // ✅ Lấy GPS khi đã login
  useEffect(() => {
    if (!isLoggedIn) return;
    navigator.geolocation?.getCurrentPosition(
      pos => setShipperPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
    // Watch liên tục để luôn có vị trí mới nhất
    const watchId = navigator.geolocation?.watchPosition(
      pos => setShipperPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchId != null) navigator.geolocation?.clearWatch(watchId);
    };
  }, [isLoggedIn]);

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
      case 'active': return (
        <ActiveOrdersNative
          onOrderCompleted={() => {}}
          onOpenMap={(order) => setMapOrder(order)}
        />
      );
      case 'messaging': return <MessagingNative onSelectChat={(conv) => setSelectedConv(conv)} />;
      case 'notifications': return <NotificationsNative />;
      case 'profile': return (
        <ProfileNative onLogout={() => { setIsLoggedIn(false); setCurrentUserId(null); }} />
      );
    }
  };

  const getHeaderTitle = (): string => {
    if (activeTab === 'messaging' && selectedConv) return selectedConv.otherUserName;
    const titles: Record<Tab, string> = {
      home: 'Đơn hàng mới',
      active: 'Đang giao',
      messaging: 'Tin nhắn',
      notifications: 'Thông báo',
      profile: 'Cá nhân',
    };
    return titles[activeTab];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Full screen map — đè lên toàn bộ UI khi bấm "Xem bản đồ" */}
      {mapOrder && (
        <View style={{ position: 'absolute', inset: 0, zIndex: 999 } as any}>
          <ShipperMapNative
            orderId={mapOrder.orderId}
            shopLat={mapOrder.shopLatitude ?? 10.7769}
            shopLng={mapOrder.shopLongitude ?? 106.7009}
            destLat={mapOrder.shippingLatitude ?? 10.787}
            destLng={mapOrder.shippingLongitude ?? 106.711}
            recipientName={mapOrder.recipientName}
            // ✅ Truyền vị trí shipper thật vào map
            shipperLat={shipperPos?.lat}
            shipperLng={shipperPos?.lng}
            onBack={() => setMapOrder(null)}
            onOrderCompleted={() => setMapOrder(null)}
          />
        </View>
      )}

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
        <NavItem icon={<LayoutGrid size={24} />} label="Đơn mới" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <NavItem icon={<Truck size={24} />} label="Đang giao" active={activeTab === 'active'} onPress={() => setActiveTab('active')} />
        <NavItem icon={<MessageSquare size={24} />} label="Tin nhắn" active={activeTab === 'messaging'} onPress={() => { setSelectedConv(null); setActiveTab('messaging'); }} />
        <NavItem icon={<Bell size={24} />} label="Thông báo" active={activeTab === 'notifications'} onPress={() => setActiveTab('notifications')} />
        <NavItem icon={<User size={24} />} label="Cá nhân" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
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
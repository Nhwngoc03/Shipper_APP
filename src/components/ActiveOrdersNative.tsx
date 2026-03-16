import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import {
  Truck, MapPin, Phone, CheckCircle, XCircle,
  Navigation, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react-native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { shipperService, ShipperOrderResponse, API_BASE_URL, TOKEN_KEY } from '../services';
import FakeGPSNative from './FakeGPSNative';

const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

// Lấy base URL (bỏ /api/v1 ở cuối nếu có)
const WS_BASE_URL = API_BASE_URL.endsWith('/api/v1')
  ? API_BASE_URL.slice(0, -7)
  : API_BASE_URL;

interface ActiveOrdersNativeProps {
  onOrderCompleted?: () => void;
}

export default function ActiveOrdersNative({ onOrderCompleted }: ActiveOrdersNativeProps) {
  const [orders, setOrders] = useState<ShipperOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedFakeGPS, setExpandedFakeGPS] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [shipperPos, setShipperPos] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  // GPS tracking state
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<'off' | 'starting' | 'active' | 'error'>('off');

  // ✅ Dùng STOMP client thay vì raw WebSocket
  const stompRef = useRef<Client | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const posRef = useRef(shipperPos);

  // Sync posRef khi shipperPos thay đổi
  useEffect(() => {
    posRef.current = shipperPos;
  }, [shipperPos]);

  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await shipperService.getMyOrders();
      setOrders((res.result || []).filter(o => o.status === 'SHIPPING'));
    } catch {
      setError('Không thể tải đơn đang giao');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setShipperPos(p);
        posRef.current = p;
      },
      () => {}
    );
    fetchOrders();
    return () => stopTracking();
  }, []);

  // ✅ startTracking dùng STOMP over SockJS
  const startTracking = (orderId: number) => {
    setTrackingOrderId(orderId);
    setTrackingStatus('starting');

    // Watch GPS
    watchIdRef.current = navigator.geolocation?.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setShipperPos(p);
        posRef.current = p;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    ) ?? null;

    const token = localStorage.getItem(TOKEN_KEY);

    const client = new Client({
      // ✅ SockJS thay vì native WebSocket
      webSocketFactory: () => new SockJS(`${WS_BASE_URL}/api/v1/ws`),

      // ✅ Auth header đúng cách
      connectHeaders: token
        ? { Authorization: `Bearer ${token}` }
        : {},

      onConnect: () => {
        setTrackingStatus('active');

        // Gửi location mỗi 3 giây
        intervalRef.current = setInterval(() => {
          const pos = posRef.current;
          if (!pos || !client.connected) return;

          client.publish({
            destination: '/app/shipper/location',
            body: JSON.stringify({
              orderId,
              latitude: pos.lat,
              longitude: pos.lng,
            }),
          });
        }, 3000);
      },

      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame);
        setTrackingStatus('error');
      },

      onDisconnect: () => {
        setTrackingStatus(prev => prev === 'active' ? 'error' : prev);
      },

      onWebSocketError: (event) => {
        console.error('[WS] WebSocket error:', event);
        setTrackingStatus('error');
      },
    });

    client.activate();
    stompRef.current = client;
  };

  // ✅ stopTracking dùng deactivate()
  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (stompRef.current) {
      // Gửi gpsOff trước khi disconnect nếu đang tracking
      if (stompRef.current.connected && trackingOrderId !== null) {
        stompRef.current.publish({
          destination: '/app/shipper/location',
          body: JSON.stringify({
            orderId: trackingOrderId,
            gpsOff: true,
          }),
        });
      }
      stompRef.current.deactivate();
      stompRef.current = null;
    }
    setTrackingStatus('off');
    setTrackingOrderId(null);
  };

  const handleComplete = async (orderId: number, status: 'DELIVERED' | 'FAILED') => {
    setCompleting(orderId);
    try {
      await shipperService.updateOrderStatus(orderId, { status });
      if (trackingOrderId === orderId) stopTracking();
      setOrders(prev => prev.filter(o => o.orderId !== orderId));
      onOrderCompleted?.();
    } catch {
      setError('Không thể cập nhật trạng thái đơn hàng');
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải đơn đang giao...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchOrders(true)}
          tintColor="#10b981"
        />
      }
    >
      <View style={styles.header}>
        <Truck size={24} color="#10b981" />
        <Text style={styles.headerTitle}>Đơn đang giao</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AlertCircle size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {orders.length === 0 && !error ? (
        <View style={styles.emptyBox}>
          <Truck size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>Không có đơn đang giao</Text>
          <Text style={styles.emptySubText}>Kéo xuống để làm mới</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {orders.map(order => {
            const shopLat = order.shopLatitude ?? DEFAULT_LAT;
            const shopLng = order.shopLongitude ?? DEFAULT_LNG;
            const destLat = order.shippingLatitude ?? DEFAULT_LAT + 0.01;
            const destLng = order.shippingLongitude ?? DEFAULT_LNG + 0.01;
            const isFakeOpen = expandedFakeGPS === order.orderId;
            const isTracking = trackingOrderId === order.orderId;

            return (
              <View key={order.orderId} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderId}>Đơn #{order.orderId}</Text>
                    <Text style={styles.recipientName}>{order.recipientName}</Text>
                  </View>
                  <Text style={styles.fee}>{order.shippingFee?.toLocaleString('vi-VN')}đ</Text>
                </View>

                <View style={styles.addrBox}>
                  <View style={styles.addrRow}>
                    <MapPin size={14} color="#ef4444" />
                    <Text style={styles.addrText} numberOfLines={2}>{order.shippingAddress}</Text>
                  </View>
                  <View style={styles.addrRow}>
                    <Phone size={14} color="#64748b" />
                    <Text style={styles.addrText}>{order.recipientPhone}</Text>
                  </View>
                </View>

                {/* GPS tracking status */}
                <View style={[
                  styles.gpsStatus,
                  isTracking && trackingStatus === 'active' ? styles.gpsActive :
                  isTracking && trackingStatus === 'starting' ? styles.gpsStarting :
                  isTracking && trackingStatus === 'error' ? styles.gpsError :
                  styles.gpsOff
                ]}>
                  {isTracking && trackingStatus === 'active' ? (
                    <>
                      <View style={styles.gpsDot} />
                      <Text style={styles.gpsActiveText}>Đang phát GPS live</Text>
                      <Text style={styles.gpsCoordsText}>
                        {shipperPos.lat.toFixed(4)}, {shipperPos.lng.toFixed(4)}
                      </Text>
                    </>
                  ) : isTracking && trackingStatus === 'starting' ? (
                    <>
                      <ActivityIndicator size="small" color="#d97706" />
                      <Text style={styles.gpsStartingText}>Đang kết nối...</Text>
                    </>
                  ) : isTracking && trackingStatus === 'error' ? (
                    <>
                      <AlertCircle size={14} color="#ef4444" />
                      <Text style={styles.gpsErrorText}>Mất kết nối WebSocket</Text>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} color="#94a3b8" />
                      <Text style={styles.gpsOffText}>GPS chưa bật</Text>
                    </>
                  )}
                </View>

                {/* GPS + action buttons */}
                <View style={styles.actionRow}>
                  {!isTracking ? (
                    <TouchableOpacity
                      style={[styles.gpsBtn, trackingStatus !== 'off' && styles.btnDisabled]}
                      onPress={() => startTracking(order.orderId)}
                      disabled={trackingStatus !== 'off'}
                    >
                      <Navigation size={16} color="white" />
                      <Text style={styles.actionBtnText}>Bật GPS</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.gpsStopBtn} onPress={stopTracking}>
                      <Navigation size={16} color="#374151" />
                      <Text style={styles.gpsStopText}>Dừng GPS</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.deliveredBtn, completing === order.orderId && styles.btnDisabled]}
                    onPress={() => handleComplete(order.orderId, 'DELIVERED')}
                    disabled={completing === order.orderId}
                  >
                    {completing === order.orderId
                      ? <ActivityIndicator size="small" color="white" />
                      : <><CheckCircle size={16} color="white" /><Text style={styles.actionBtnText}>Đã giao</Text></>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.failedBtn, completing === order.orderId && styles.btnDisabled]}
                    onPress={() => handleComplete(order.orderId, 'FAILED')}
                    disabled={completing === order.orderId}
                  >
                    <XCircle size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* FakeGPS toggle */}
                <TouchableOpacity
                  style={styles.fakeGPSToggle}
                  onPress={() => setExpandedFakeGPS(isFakeOpen ? null : order.orderId)}
                >
                  <Text style={styles.fakeGPSToggleText}>
                    🎭 {isFakeOpen ? 'Ẩn' : 'Mở'} Demo GPS (Fake GPS)
                  </Text>
                  {isFakeOpen
                    ? <ChevronUp size={16} color="#10b981" />
                    : <ChevronDown size={16} color="#10b981" />
                  }
                </TouchableOpacity>

                {isFakeOpen && (
                  <FakeGPSNative
                    orderId={order.orderId}
                    shopLat={shopLat}
                    shopLng={shopLng}
                    destLat={destLat}
                    destLng={destLng}
                    shipperLat={shipperPos.lat}
                    shipperLng={shipperPos.lng}
                    onLocationUpdate={(lat, lng) => {
                      setShipperPos({ lat, lng });
                      posRef.current = { lat, lng };
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', flex: 1 },
  countBadge: {
    backgroundColor: '#10b981', width: 28, height: 28,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  countText: { color: 'white', fontSize: 13, fontWeight: '800' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', marginHorizontal: 20, marginBottom: 12,
    padding: 12, borderRadius: 12,
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#94a3b8', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#cbd5e1', marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  orderCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, gap: 12,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  recipientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  fee: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  addrBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 8 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addrText: { fontSize: 13, color: '#475569', fontWeight: '500', flex: 1 },
  gpsStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  gpsActive: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#a7f3d0' },
  gpsStarting: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  gpsError: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  gpsOff: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  gpsActiveText: { fontSize: 12, fontWeight: '700', color: '#065f46', flex: 1 },
  gpsStartingText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  gpsErrorText: { fontSize: 12, fontWeight: '700', color: '#ef4444', flex: 1 },
  gpsOffText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  gpsCoordsText: { fontSize: 10, fontFamily: 'monospace', color: '#10b981' },
  actionRow: { flexDirection: 'row', gap: 8 },
  gpsBtn: {
    flex: 1, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  gpsStopBtn: {
    flex: 1, backgroundColor: '#e2e8f0', borderRadius: 12, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  gpsStopText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  deliveredBtn: {
    flex: 1, backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  failedBtn: {
    backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 10,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  fakeGPSToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fefce8', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#fde68a', borderStyle: 'dashed',
  },
  fakeGPSToggleText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400e' },
});
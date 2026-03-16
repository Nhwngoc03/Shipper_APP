import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import {
  MapPin, Clock, Package, Zap, ChevronRight,
  Navigation, RefreshCw, AlertCircle, Store
} from 'lucide-react-native';
import { shipperService, AvailableOrderResponse } from '../services';

interface OrdersNativeProps {
  onAcceptOrder: (orderId: number) => void;
}

const fmtCur = (n: number) =>
  n?.toLocaleString('vi-VN') + 'đ';

const fmtDist = (km: number | null | undefined) => {
  if (km == null) return '?';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

const fmtTime = (d: string) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 1) return 'Vừa xong';
  if (diff < 60) return `${diff} phút trước`;
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export default function OrdersNative({ onAcceptOrder }: OrdersNativeProps) {
  const [orders, setOrders] = useState<AvailableOrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<number | null>(null);

  const getLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 10.7769, lng: 106.7009 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 10.7769, lng: 106.7009 }),
        { timeout: 5000 }
      );
    });
  }, []);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const loc = location || await getLocation();
      if (!location) setLocation(loc);
      const res = await shipperService.getNearbyOrders(loc.lat, loc.lng);
      setOrders(res.result || []);
    } catch {
      setError('Không thể tải đơn hàng. Kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, getLocation]);

  useEffect(() => { fetchOrders(); }, []);

  const handleAccept = async (orderId: number) => {
    setAccepting(orderId);
    try {
      await shipperService.acceptOrder(orderId);
      setAcceptSuccess(orderId);
      setOrders(prev => prev.filter(o => o.orderId !== orderId));
      setTimeout(() => setAcceptSuccess(null), 3000);
      onAcceptOrder(orderId);
    } catch (err: any) {
      setError(
        err?.data?.message === 'ORDER_ALREADY_TAKEN'
          ? 'Đơn đã được nhận bởi shipper khác!'
          : 'Không thể nhận đơn. Thử lại sau.'
      );
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tìm đơn hàng gần bạn...</Text>
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
      {/* Status Banner */}
      <View style={styles.statusBanner}>
        <View style={styles.statusContent}>
          <View style={styles.statusIcon}>
            <Zap size={20} color="white" />
          </View>
          <View>
            <Text style={styles.statusLabel}>Trạng thái</Text>
            <Text style={styles.statusTitle}>Đang trực tuyến</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchOrders(true)}>
          <RefreshCw size={18} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Đơn hàng mới</Text>
          {location && (
            <View style={styles.locationBadge}>
              <Navigation size={12} color="#10b981" />
              <Text style={styles.locationText}>GPS đang hoạt động</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>
          📍 {orders.length} đơn gần bạn
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Orders List */}
      <View style={styles.ordersList}>
        {orders.length === 0 && !error ? (
          <View style={styles.emptyBox}>
            <Package size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có đơn hàng mới</Text>
            <Text style={styles.emptySubText}>Kéo xuống để làm mới</Text>
          </View>
        ) : (
          orders.map((order) => {
            const totalKm =
              order.shipToShopKm != null && order.shopToBuyerKm != null
                ? order.shipToShopKm + order.shopToBuyerKm
                : null;

            return (
              <View key={order.orderId} style={styles.orderCard}>

                {/* ── Top: thời gian + phí ship ── */}
                <View style={styles.cardTop}>
                  <View style={styles.timeBadge}>
                    <Clock size={11} color="#64748b" />
                    <Text style={styles.timeText}>{fmtTime(order.createdAt)}</Text>
                  </View>
                  <Text style={styles.feeText}>{fmtCur(order.shippingFee)}</Text>
                </View>

                {/* ── Route: shipper → shop → buyer ── */}
                <View style={styles.routeBox}>
                  {/* Đường kẻ dọc */}
                  <View style={styles.routeLine} />

                  {/* Điểm lấy hàng (SHOP) */}
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, styles.routeDotOrange]} />
                    <View style={styles.routeContent}>
                      <Text style={styles.routeLabel}>LẤY HÀNG TẠI SHOP</Text>
                      <Text style={styles.routeName}>{order.shopName}</Text>
                      <Text style={styles.routeAddr} numberOfLines={2}>{order.shopAddress}</Text>
                      {/* Khoảng cách shipper → shop */}
                      <View style={styles.distRow}>
                        <Navigation size={11} color="#f97316" />
                        <Text style={styles.distTextOrange}>
                          {fmtDist(order.shipToShopKm)} từ vị trí bạn
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Điểm giao hàng (BUYER) */}
                  <View style={[styles.routeRow, { marginTop: 16 }]}>
                    <View style={[styles.routeDot, styles.routeDotBlue]} />
                    <View style={styles.routeContent}>
                      <Text style={styles.routeLabel}>GIAO ĐẾN</Text>
                      <Text style={styles.routeName}>{order.recipientName}</Text>
                      <Text style={styles.routeAddr} numberOfLines={2}>{order.shippingAddress}</Text>
                      {/* Khoảng cách shop → buyer */}
                      <View style={styles.distRow}>
                        <Navigation size={11} color="#3b82f6" />
                        <Text style={styles.distTextBlue}>
                          {fmtDist(order.shopToBuyerKm)} từ shop
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* ── Tổng quãng đường ── */}
                <View style={styles.totalDistBox}>
                  <Text style={styles.totalDistLabel}>Tổng quãng đường</Text>
                  <Text style={styles.totalDistValue}>{fmtDist(totalKm)}</Text>
                </View>

                {/* ── Nút nhận đơn ── */}
                <TouchableOpacity
                  style={[
                    styles.acceptButton,
                    accepting === order.orderId && styles.acceptButtonLoading,
                    acceptSuccess === order.orderId && styles.acceptButtonSuccess,
                  ]}
                  onPress={() => handleAccept(order.orderId)}
                  disabled={accepting === order.orderId}
                  activeOpacity={0.85}
                >
                  {accepting === order.orderId ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : acceptSuccess === order.orderId ? (
                    <Text style={styles.acceptButtonText}>✅ Đã nhận!</Text>
                  ) : (
                    <>
                      <Text style={styles.acceptButtonText}>Nhận đơn này</Text>
                      <ChevronRight size={16} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },

  // Status banner
  statusBanner: {
    backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  statusLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
  statusTitle: { fontSize: 16, fontWeight: '900', color: 'white' },
  refreshBtn: {
    width: 40, height: 40, backgroundColor: 'white',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 4, textTransform: 'uppercase' },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  locationText: { fontSize: 11, fontWeight: '700', color: '#10b981' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', marginHorizontal: 20, marginBottom: 12,
    padding: 12, borderRadius: 12,
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', flex: 1 },

  // List
  ordersList: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#94a3b8', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#cbd5e1', marginTop: 4 },

  // Card
  orderCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, gap: 14,
  },

  // Card top row
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  timeText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  feeText: { fontSize: 22, fontWeight: '900', color: '#10b981' },

  // Route section
  routeBox: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 14,
    position: 'relative',
  },
  routeLine: {
    position: 'absolute', left: 21, top: 28, bottom: 28,
    width: 1, borderLeftWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed',
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: 'white',
    marginTop: 3, flexShrink: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  routeDotOrange: { backgroundColor: '#f97316' },
  routeDotBlue: { backgroundColor: '#3b82f6' },
  routeContent: { flex: 1 },
  routeLabel: {
    fontSize: 9, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
  },
  routeName: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 1 },
  routeAddr: { fontSize: 11, fontWeight: '500', color: '#64748b', lineHeight: 16 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  distTextOrange: { fontSize: 11, fontWeight: '800', color: '#f97316' },
  distTextBlue: { fontSize: 11, fontWeight: '800', color: '#3b82f6' },

  // Total distance
  totalDistBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  totalDistLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalDistValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

  // Accept button
  acceptButton: {
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  acceptButtonLoading: { backgroundColor: '#6ee7b7' },
  acceptButtonSuccess: { backgroundColor: '#22c55e' },
  acceptButtonText: { color: 'white', fontSize: 14, fontWeight: '800' },
});
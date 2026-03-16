import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { Truck, MapPin, Phone, AlertCircle, Map } from 'lucide-react-native';
import { shipperService, ShipperOrderResponse } from '../services';
import ShipperMapNative from './ShipperMapNative';

const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

interface ActiveOrdersNativeProps {
  onOrderCompleted?: () => void;
  onOpenMap?: (order: ShipperOrderResponse) => void;
}

export default function ActiveOrdersNative({ onOrderCompleted, onOpenMap }: ActiveOrdersNativeProps) {
  const [orders, setOrders] = useState<ShipperOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [mapOrder, setMapOrder] = useState<ShipperOrderResponse | null>(null);

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

  useEffect(() => { fetchOrders(); }, []);

  const handleOrderCompleted = (orderId: number) => {
    setOrders(prev => prev.filter(o => o.orderId !== orderId));
    setMapOrder(null);
    onOrderCompleted?.();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải đơn đang giao...</Text>
      </View>
    );
  }

  if (mapOrder) {
    return (
      <ShipperMapNative
        orderId={mapOrder.orderId}
        shopLat={mapOrder.shopLatitude ?? DEFAULT_LAT}
        shopLng={mapOrder.shopLongitude ?? DEFAULT_LNG}
        destLat={mapOrder.shippingLatitude ?? DEFAULT_LAT + 0.01}
        destLng={mapOrder.shippingLongitude ?? DEFAULT_LNG + 0.01}
        recipientName={mapOrder.recipientName}
        onBack={() => setMapOrder(null)}
        onOrderCompleted={handleOrderCompleted}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#10b981" />
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
          {orders.map(order => (
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
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => onOpenMap ? onOpenMap(order) : setMapOrder(order)}
              >
                <Map size={16} color="white" />
                <Text style={styles.mapBtnText}>🗺️ Xem bản đồ & chỉ đường</Text>
              </TouchableOpacity>
            </View>
          ))}
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
  mapBtn: {
    backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});

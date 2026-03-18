import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { Truck, MapPin, Phone, AlertCircle, Map, CheckCircle, XCircle } from 'lucide-react-native';
import { shipperService, ShipperOrderResponse } from '../services';
import ShipperMapNative from './ShipperMapNative';

const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

type TabType = 'SHIPPING' | 'DELIVERED' | 'FAILED';

interface ActiveOrdersNativeProps {
  onOrderCompleted?: () => void;
  onOpenMap?: (order: ShipperOrderResponse) => void;
}

export default function ActiveOrdersNative({ onOrderCompleted, onOpenMap }: ActiveOrdersNativeProps) {
  const [activeTab, setActiveTab] = useState<TabType>('SHIPPING');
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
      setOrders(res.result || []);
    } catch {
      setError('Không thể tải đơn hàng');
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

  const filtered = orders.filter(o => o.status === activeTab);

  const tabs: { key: TabType; label: string; icon: any; color: string }[] = [
    { key: 'SHIPPING', label: 'Đang giao', icon: Truck, color: '#10b981' },
    { key: 'DELIVERED', label: 'Đã giao', icon: CheckCircle, color: '#3b82f6' },
    { key: 'FAILED', label: 'Thất bại', icon: XCircle, color: '#ef4444' },
  ];

  const countOf = (status: TabType) => orders.filter(o => o.status === status).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
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
    <View style={styles.wrapper}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = countOf(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { borderBottomColor: tab.color, borderBottomWidth: 3 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={16} color={isActive ? tab.color : '#94a3b8'} />
              <Text style={[styles.tabText, isActive && { color: tab.color }]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? tab.color : '#e2e8f0' }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? 'white' : '#64748b' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#10b981" />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {filtered.length === 0 && !error ? (
          <View style={styles.emptyBox}>
            {activeTab === 'SHIPPING' && <Truck size={48} color="#cbd5e1" />}
            {activeTab === 'DELIVERED' && <CheckCircle size={48} color="#cbd5e1" />}
            {activeTab === 'FAILED' && <XCircle size={48} color="#cbd5e1" />}
            <Text style={styles.emptyText}>
              {activeTab === 'SHIPPING' ? 'Không có đơn đang giao'
                : activeTab === 'DELIVERED' ? 'Chưa có đơn đã giao'
                : 'Không có đơn thất bại'}
            </Text>
            <Text style={styles.emptySubText}>Kéo xuống để làm mới</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(order => (
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
                {/* Chỉ hiện nút bản đồ cho đơn đang giao */}
                {activeTab === 'SHIPPING' && (
                  <TouchableOpacity
                    style={styles.mapBtn}
                    onPress={() => onOpenMap ? onOpenMap(order) : setMapOrder(order)}
                  >
                    <Map size={16} color="white" />
                    <Text style={styles.mapBtnText}>🗺️ Xem bản đồ & chỉ đường</Text>
                  </TouchableOpacity>
                )}
                {/* Badge trạng thái cho đơn đã xong */}
                {activeTab === 'DELIVERED' && (
                  <View style={styles.statusBadgeGreen}>
                    <CheckCircle size={14} color="#10b981" />
                    <Text style={styles.statusBadgeGreenText}>Giao thành công</Text>
                  </View>
                )}
                {activeTab === 'FAILED' && (
                  <View style={styles.statusBadgeRed}>
                    <XCircle size={14} color="#ef4444" />
                    <Text style={styles.statusBadgeRedText}>Giao thất bại</Text>
                    {order.note ? <Text style={styles.noteText}> • {order.note}</Text> : null}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },
  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },
  // Content
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', marginHorizontal: 20, marginTop: 16,
    padding: 12, borderRadius: 12,
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#94a3b8', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#cbd5e1', marginTop: 4 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
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
  statusBadgeGreen: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#d1fae5', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  statusBadgeGreenText: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  statusBadgeRed: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  statusBadgeRedText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  noteText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
});

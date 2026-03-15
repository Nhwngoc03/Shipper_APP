import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList
} from 'react-native';
import {
  MapPin,
  Clock,
  DollarSign,
  Package,
  Utensils,
  ShoppingBag,
  Zap,
  ChevronRight
} from 'lucide-react-native';

interface Order {
  id: string;
  type: 'food' | 'package' | 'grocery';
  pickup: string;
  dropoff: string;
  distance: string;
  duration: string;
  earnings: string;
  store: string;
}

const availableOrders: Order[] = [
  {
    id: 'VN8829400',
    type: 'food',
    store: 'Phúc Long Coffee & Tea',
    pickup: '42 Trần Cao Vân, Quận 3',
    dropoff: '15 Lê Thánh Tôn, Quận 1',
    distance: '2.4 km',
    duration: '12 phút',
    earnings: '25.000đ'
  },
  {
    id: 'VN8829401',
    type: 'package',
    store: 'Giao hàng nhanh',
    pickup: '182 Lê Đại Hành, Quận 11',
    dropoff: '55 Nguyễn Huệ, Quận 1',
    distance: '5.8 km',
    duration: '22 phút',
    earnings: '42.000đ'
  },
  {
    id: 'VN8829402',
    type: 'grocery',
    store: 'WinMart+',
    pickup: '20 Cộng Hòa, Tân Bình',
    dropoff: '120 Hoàng Văn Thụ, Phú Nhuận',
    distance: '3.1 km',
    duration: '15 phút',
    earnings: '32.000đ'
  },
];

interface HomeNativeProps {
  onAcceptOrder: (id: string) => void;
}

export default function HomeNative({ onAcceptOrder }: HomeNativeProps) {
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'food': return <Utensils size={20} color="#f59e0b" />;
      case 'package': return <Package size={20} color="#3b82f6" />;
      case 'grocery': return <ShoppingBag size={20} color="#ec4899" />;
      default: return <Package size={20} color="#6b7280" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'food': return 'Thức ăn';
      case 'package': return 'Kiện hàng';
      case 'grocery': return 'Tạp hóa';
      default: return 'Giao hàng';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
        
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Đơn hàng mới</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{availableOrders.length} đơn gần bạn</Text>
          </View>
        </View>
      </View>

      {/* Orders List */}
      <View style={styles.ordersList}>
        {availableOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View style={styles.orderTitleContainer}>
                <View style={styles.typeIconBg}>
                  {getTypeIcon(order.type)}
                </View>
                <View style={styles.orderTitleContent}>
                  <Text style={styles.orderType}>{getTypeLabel(order.type)}</Text>
                  <Text style={styles.orderStore}>{order.store}</Text>
                </View>
              </View>
              <View style={styles.orderPrice}>
                <Text style={styles.priceLabel}>Thu nhập</Text>
                <Text style={styles.priceValue}>{order.earnings}</Text>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailItem}>
                <MapPin size={16} color="#10b981" />
                <View>
                  <Text style={styles.detailLabel}>Lấy hàng</Text>
                  <Text style={styles.detailText}>{order.pickup}</Text>
                </View>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailItem}>
                <MapPin size={16} color="#ef4444" />
                <View>
                  <Text style={styles.detailLabel}>Giao hàng</Text>
                  <Text style={styles.detailText}>{order.dropoff}</Text>
                </View>
              </View>
            </View>

            <View style={styles.orderFooter}>
              <View style={styles.footerInfo}>
                <View style={styles.footerItem}>
                  <Clock size={14} color="#64748b" />
                  <Text style={styles.footerText}>{order.duration}</Text>
                </View>
                <View style={styles.footerItem}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.footerText}>{order.distance}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => onAcceptOrder(order.id)}
              >
                <Text style={styles.acceptButtonText}>Nhận đơn</Text>
                <ChevronRight size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusBanner: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
  },
  offlineButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  offlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  ordersList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  typeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderTitleContent: {
    flex: 1,
  },
  orderType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  orderStore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderPrice: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
  },
  orderDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

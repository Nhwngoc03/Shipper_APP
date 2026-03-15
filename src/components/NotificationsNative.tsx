import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native';
import {
  Bell,
  Package,
  Tag,
  Info,
  ChevronRight
} from 'lucide-react-native';

const notifications = [
  {
    id: 1,
    title: 'Đơn hàng đã hoàn thành',
    description: 'Bạn đã hoàn thành đơn hàng #VN8829310. Thu nhập 45.000đ đã được cộng vào ví.',
    time: '2 phút trước',
    type: 'order',
    unread: true
  },
  {
    id: 2,
    title: 'Khuyến mãi mới cho tài xế',
    description: 'Hoàn thành 10 đơn hàng trong ngày để nhận thêm 100.000đ tiền thưởng.',
    time: '1 giờ trước',
    type: 'promo',
    unread: true
  },
  {
    id: 3,
    title: 'Cập nhật chính sách',
    description: 'Chúng tôi vừa cập nhật điều khoản dịch vụ cho đối tác tài xế. Vui lòng xem chi tiết.',
    time: '5 giờ trước',
    type: 'info',
    unread: false
  },
  {
    id: 4,
    title: 'Đánh giá 5 sao',
    description: 'Khách hàng vừa đánh giá bạn 5 sao cho đơn hàng #VN8829285.',
    time: 'Hôm qua',
    type: 'order',
    unread: false
  }
];

export default function NotificationsNative() {
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'order': return <Package size={20} color="#10b981" />;
      case 'promo': return <Tag size={20} color="#f59e0b" />;
      case 'info': return <Info size={20} color="#3b82f6" />;
      default: return <Bell size={20} color="#94a3b8" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'order': return '#d1fae5';
      case 'promo': return '#fef3c7';
      case 'info': return '#dbeafe';
      default: return '#f1f5f9';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Thông báo</Text>
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>2 mới</Text>
        </View>
      </View>

      {/* Notifications List */}
      <View style={styles.notificationsList}>
        {notifications.map((notif) => (
          <TouchableOpacity key={notif.id} style={[
            styles.notificationCard,
            notif.unread && styles.notificationCardUnread
          ]}>
            <View style={[styles.iconContainer, { backgroundColor: getTypeColor(notif.type) }]}>
              {getTypeIcon(notif.type)}
            </View>

            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notif.title}</Text>
                {notif.unread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationDescription}>{notif.description}</Text>
              <Text style={styles.notificationTime}>{notif.time}</Text>
            </View>

            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  unreadBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  notificationsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: '#f0fdf4',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  notificationDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
});

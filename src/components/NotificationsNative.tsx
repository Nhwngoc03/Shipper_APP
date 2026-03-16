import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import { notificationService, NotificationResponse } from '../services';

export default function NotificationsNative() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await notificationService.getMyNotifications();
      setNotifications(res.result || []);
    } catch {
      // fallback to empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await notificationService.markAsRead(id); } catch {}
  };

  const getTypeIcon = () => <Bell size={20} color="#10b981" />;
  const getTypeBg = () => '#d1fae5';

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#10b981" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Thong bao</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} moi</Text>
          </View>
        )}
      </View>

      <View style={styles.list}>
        {notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bell size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chua co thong bao</Text>
          </View>
        ) : (
          notifications.map(notif => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.card, !notif.isRead && styles.cardUnread]}
              onPress={() => handleRead(notif.id)}
            >
              <View style={[styles.iconBox, { backgroundColor: getTypeBg() }]}>
                {getTypeIcon()}
              </View>
              <View style={styles.content}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{notif.title}</Text>
                  {!notif.isRead && <View style={styles.dot} />}
                </View>
                <Text style={styles.cardBody}>{notif.message}</Text>
                <Text style={styles.cardTime}>
                  {new Date(notif.createAt).toLocaleString('vi-VN', {
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                  })}
                </Text>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  unreadBadge: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  unreadBadgeText: { fontSize: 12, fontWeight: '700', color: 'white' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#94a3b8', marginTop: 16 },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardUnread: { backgroundColor: '#f0fdf4' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  cardBody: { fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6, lineHeight: 18 },
  cardTime: { fontSize: 11, fontWeight: '500', color: '#94a3b8' },
});

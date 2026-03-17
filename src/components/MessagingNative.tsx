import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { MessageSquare, Search, ChevronRight } from 'lucide-react-native';
import { chatService, Conversation } from '../services/chat.service';

interface MessagingNativeProps {
  onSelectChat: (conv: Conversation) => void;
}

const ADMIN_USER_ID = 1;
const SUPPORT_NAME = 'Trung tâm hỗ trợ';

const formatTime = (iso: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin}ph`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}g`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
};

const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();

const getRoleLabel = (role: string) => {
  switch (role?.toUpperCase()) {
    case 'BUYER': return 'Khách hàng';
    case 'SHOP_OWNER': return 'Chủ shop';
    case 'ADMIN': return 'Hỗ trợ';
    default: return role || '';
  }
};

export default function MessagingNative({ onSelectChat }: MessagingNativeProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const convs = await chatService.getConversations();

      // Ghim Admin/Support lên đầu — đồng nhất với web FE ChatPage
      const adminConv = convs.find(c => c.otherUserId === ADMIN_USER_ID);
      let result: Conversation[];

      if (!adminConv) {
        const supportPlaceholder: Conversation = {
          id: -1, roomKey: '',
          otherUserId: ADMIN_USER_ID,
          otherUserName: SUPPORT_NAME,
          otherUserRole: 'ADMIN',
          lastMessage: 'Bắt đầu trò chuyện với trung tâm hỗ trợ',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
        };
        result = [supportPlaceholder, ...convs];
      } else {
        const updated = { ...adminConv, otherUserName: SUPPORT_NAME };
        result = [updated, ...convs.filter(c => c.otherUserId !== ADMIN_USER_ID)];
      }

      setConversations(result);
    } catch {
      // giữ nguyên nếu lỗi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, []);

  const filtered = conversations.filter(c =>
    c.otherUserName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header + Search */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <MessageSquare size={22} color="#10b981" />
          <View>
            <Text style={styles.headerTitle}>Tin nhắn</Text>
            <Text style={styles.headerSub}>{conversations.length} cuộc trò chuyện</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm cuộc trò chuyện..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadConversations(true)} tintColor="#10b981" />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <MessageSquare size={40} color="#e2e8f0" />
            <Text style={styles.emptyText}>{search ? 'Không tìm thấy' : 'Chưa có tin nhắn'}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(conv => (
              <TouchableOpacity
                key={conv.id}
                style={[styles.card, conv.unreadCount > 0 && styles.cardUnread]}
                onPress={() => onSelectChat(conv)}
              >
                {/* Avatar */}
                <View style={[styles.avatar, conv.otherUserId === ADMIN_USER_ID && styles.avatarAdmin]}>
                  <Text style={[styles.avatarText, conv.otherUserId === ADMIN_USER_ID && styles.avatarTextAdmin]}>
                    {getInitial(conv.otherUserName)}
                  </Text>
                  {conv.unreadCount > 0 && (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{conv.otherUserName}</Text>
                    <Text style={styles.time}>{formatTime(conv.lastMessageAt)}</Text>
                  </View>
                  <View style={styles.subRow}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{getRoleLabel(conv.otherUserRole)}</Text>
                    </View>
                    <Text
                      style={[styles.lastMsg, conv.unreadCount > 0 && styles.lastMsgUnread]}
                      numberOfLines={1}
                    >
                      {conv.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: {
    backgroundColor: 'white', paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0f172a' },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardUnread: { backgroundColor: '#f0fdf4' },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
  },
  avatarAdmin: { backgroundColor: '#d1fae5' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#64748b' },
  avatarTextAdmin: { color: '#10b981' },
  unreadDot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#ef4444', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white', paddingHorizontal: 3,
  },
  unreadDotText: { fontSize: 9, fontWeight: '800', color: 'white' },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  time: { fontSize: 11, fontWeight: '500', color: '#94a3b8' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  roleText: { fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  lastMsg: { flex: 1, fontSize: 12, fontWeight: '500', color: '#94a3b8' },
  lastMsgUnread: { fontWeight: '700', color: '#374151' },
});

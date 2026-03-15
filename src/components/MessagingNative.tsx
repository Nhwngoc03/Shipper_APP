import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image
} from 'react-native';
import {
  MessageSquare,
  Clock,
  ChevronRight
} from 'lucide-react-native';

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  status: 'online' | 'offline' | 'delivering';
}

interface MessagingNativeProps {
  onSelectChat: (conversationId: number) => void;
}

const mockConversations: Conversation[] = [
  {
    id: 1,
    name: 'Nguyễn Văn B',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    lastMessage: 'Cảm ơn bạn! 😊',
    timestamp: '10 phút trước',
    unread: 0,
    status: 'delivering',
  },
  {
    id: 2,
    name: 'Trần Thị C',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=600&auto=format&fit=crop',
    lastMessage: 'Bạn đã tới chưa?',
    timestamp: '30 phút trước',
    unread: 2,
    status: 'online',
  },
  {
    id: 3,
    name: 'Lê Văn D',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    lastMessage: 'Đơn hàng được giao thành công',
    timestamp: '2 giờ trước',
    unread: 0,
    status: 'offline',
  },
  {
    id: 4,
    name: 'Phạm Thị E',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop',
    lastMessage: 'Ok, tôi sẽ đợi bạn ở cửa',
    timestamp: 'Hôm qua',
    unread: 0,
    status: 'offline',
  },
];

export default function MessagingNative({ onSelectChat }: MessagingNativeProps) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'online': return '#10b981';
      case 'delivering': return '#f59e0b';
      case 'offline': return '#94a3b8';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'online': return 'Online';
      case 'delivering': return 'Đang giao';
      case 'offline': return 'Offline';
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <MessageSquare size={24} color="#10b981" />
          <View>
            <Text style={styles.headerTitle}>Tin nhắn</Text>
            <Text style={styles.headerSubtitle}>Quản lý trò chuyện</Text>
          </View>
        </View>
      </View>

      {/* Conversations List */}
      <View style={styles.conversationsList}>
        {mockConversations.map((conversation) => (
          <TouchableOpacity
            key={conversation.id}
            style={styles.conversationCard}
            onPress={() => onSelectChat(conversation.id)}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: conversation.avatar }}
                style={styles.avatar}
              />
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(conversation.status) }
                ]}
              />
            </View>

            <View style={styles.conversationContent}>
              <View style={styles.nameRow}>
                <Text style={styles.conversationName}>{conversation.name}</Text>
                <Text style={styles.conversationTime}>{conversation.timestamp}</Text>
              </View>
              <View style={styles.messageRow}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {conversation.lastMessage}
                </Text>
                {conversation.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conversation.unread}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.statusText}>{getStatusLabel(conversation.status)}</Text>
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
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  conversationsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  conversationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  conversationTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  unreadBadge: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
});

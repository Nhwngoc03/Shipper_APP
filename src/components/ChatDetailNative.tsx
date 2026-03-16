import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react-native';
import { chatService, Conversation, ChatMessage } from '../services/chat.service';

interface ChatDetailNativeProps {
  conversation: Conversation;
  currentUserId: number;
  onBack: () => void;
}

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const formatDateLabel = (iso: string) => {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hom nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hom qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
};

const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();

export default function ChatDetailNative({ conversation, currentUserId, onBack }: ChatDetailNativeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    let mounted = true;
    chatService.getChatHistory(conversation.otherUserId)
      .then(h => { if (mounted) { setMessages(h); setLoading(false); scrollToBottom(); } })
      .catch(() => { if (mounted) { setError('Khong tai duoc tin nhan'); setLoading(false); } });

    chatService.connect(() => {
      chatService.subscribeToConversation(currentUserId, conversation.otherUserId, (msg) => {
        if (!mounted) return;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id && m.id !== 0)) return prev;
          return [...prev.filter(m => m.id !== 0), msg];
        });
        scrollToBottom();
      });
    });

    chatService.markAsRead(conversation.otherUserId).catch(() => {});

    return () => {
      mounted = false;
      chatService.unsubscribeFromConversation(currentUserId, conversation.otherUserId);
    };
  }, [conversation.otherUserId, currentUserId, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      chatService.sendMessage({ receiverId: conversation.otherUserId, content: text });
      const optimistic: ChatMessage = {
        id: 0,
        conversationId: conversation.id,
        senderId: currentUserId,
        senderName: 'Toi',
        content: text,
        sentAt: new Date().toISOString(),
        isRead: false,
      };
      setMessages(prev => [...prev, optimistic]);
      scrollToBottom();
    } finally { setSending(false); }
  }, [input, sending, conversation, currentUserId, scrollToBottom]);

  const grouped: { label: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const label = formatDateLabel(msg.sentAt);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.msgs.push(msg);
    else grouped.push({ label, msgs: [msg] });
  });

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{getInitial(conversation.otherUserName)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{conversation.otherUserName}</Text>
          <Text style={styles.headerRole}>{conversation.otherUserRole}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Bat dau cuoc tro chuyen</Text>
          </View>
        ) : grouped.map(group => (
          <View key={group.label}>
            <View style={styles.dateLabelRow}>
              <Text style={styles.dateLabel}>{group.label}</Text>
            </View>
            {group.msgs.map(msg => {
              const isMine = msg.senderId === currentUserId;
              return (
                <View key={msg.id === 0 ? 'opt-' + msg.sentAt : msg.id} style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                  {!isMine && (
                    <View style={styles.bubbleAvatar}>
                      <Text style={styles.bubbleAvatarText}>{getInitial(msg.senderName)}</Text>
                    </View>
                  )}
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.content}</Text>
                    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(msg.sentAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nhap tin nhan..."
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Send size={18} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '900', color: '#10b981' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  headerRole: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 8,
  },
  errorText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  dateLabelRow: { alignItems: 'center', marginVertical: 12 },
  dateLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 6 },
  bubbleRowMine: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
  },
  bubbleAvatarText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: '#10b981', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: 'white', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontWeight: '500', color: '#0f172a', lineHeight: 20 },
  bubbleTextMine: { color: 'white' },
  bubbleTime: { fontSize: 10, fontWeight: '500', color: '#94a3b8', marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontWeight: '500', color: '#0f172a',
    maxHeight: 100, borderWidth: 1, borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#d1fae5' },
});

// Dong nhat voi FoodMarket-FE/src/services/chat.service.ts
// REST:
//   GET  /chat/conversations
//   GET  /chat/history/{otherUserId}
//   PATCH /chat/read/{otherUserId}
// WebSocket: SockJS + STOMP qua /api/v1/ws

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { httpClient } from "./http.client";
import { API_BASE_URL, TOKEN_KEY } from "./api.config";
import { storage } from "./storage";

export interface Conversation {
  id: number;
  roomKey: string;
  otherUserId: number;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface ChatMessageRequest {
  receiverId: number;
  content: string;
}

class ChatService {
  private stompClient: Client | null = null;
  private subscriptions: Map<string, { unsubscribe: () => void }> = new Map();

  async getConversations(): Promise<Conversation[]> {
    const res = await httpClient.get<Conversation[]>("/chat/conversations");
    return res.result ?? [];
  }

  async getChatHistory(otherUserId: number): Promise<ChatMessage[]> {
    const res = await httpClient.get<ChatMessage[]>(`/chat/history/${otherUserId}`);
    return res.result ?? [];
  }

  async markAsRead(otherUserId: number): Promise<void> {
    await httpClient.patch(`/chat/read/${otherUserId}`);
  }

  async connect(onConnected: () => void, onError?: (err: unknown) => void): Promise<void> {
    if (this.stompClient?.connected) { onConnected(); return; }

    const token = await storage.getItem(TOKEN_KEY);
    const baseUrl = API_BASE_URL.endsWith("/api/v1")
      ? API_BASE_URL.slice(0, -7)
      : API_BASE_URL;

    const client = new Client({
      webSocketFactory: () => new (SockJS as unknown as new (url: string) => WebSocket)(`${baseUrl}/api/v1/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => { onConnected(); },
      onStompError: (frame) => { if (onError) onError(frame); },
    });

    client.activate();
    this.stompClient = client;
  }

  sendMessage(req: ChatMessageRequest): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(req),
    });
  }

  subscribeToConversation(myId: number, otherUserId: number, onMessage: (msg: ChatMessage) => void): void {
    if (!this.stompClient) return;
    const roomKey = `${Math.min(myId, otherUserId)}_${Math.max(myId, otherUserId)}`;
    const topic = `/topic/chat.${roomKey}`;
    if (this.subscriptions.has(topic)) return;
    const sub = this.stompClient.subscribe(topic, (msg) => {
      try { onMessage(JSON.parse(msg.body)); } catch {}
    });
    this.subscriptions.set(topic, sub);
  }

  unsubscribeFromConversation(myId: number, otherUserId: number): void {
    const roomKey = `${Math.min(myId, otherUserId)}_${Math.max(myId, otherUserId)}`;
    const topic = `/topic/chat.${roomKey}`;
    const sub = this.subscriptions.get(topic);
    if (sub) { sub.unsubscribe(); this.subscriptions.delete(topic); }
  }

  disconnect(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions.clear();
    if (this.stompClient) { this.stompClient.deactivate(); this.stompClient = null; }
  }

  get isConnected(): boolean { return !!this.stompClient?.connected; }
}

export const chatService = new ChatService();

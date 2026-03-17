import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native';
import { Navigation, Play, Square, MapPin } from 'lucide-react-native';
// ✅ Dùng đúng @stomp/stompjs + SockJS giống web FE — SimpleSTOMP không tương thích SockJS endpoint
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL, TOKEN_KEY } from '../services';
import { storage } from '../services/storage';

interface Coord { lat: number; lng: number; }

interface FakeGPSNativeProps {
  orderId: number;
  shopLat: number;
  shopLng: number;
  destLat: number;
  destLng: number;
  shipperLat?: number;
  shipperLng?: number;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

type Speed = 'fast' | 'normal' | 'slow';
type Phase = 'idle' | 'loading' | 'to_shop' | 'at_shop' | 'to_buyer' | 'done';

const SPEED_MS: Record<Speed, number> = { fast: 1000, normal: 3000, slow: 5000 };

function nearbyPoint(lat: number, lng: number, offsetKm = 0.5): Coord {
  const offset = offsetKm / 111;
  return { lat: lat + offset, lng: lng + offset };
}

async function fetchRoute(from: Coord, to: Coord): Promise<Coord[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return [];
    return data.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => ({ lat, lng }));
  } catch {
    // Fallback: straight line 10 bước
    return Array.from({ length: 11 }, (_, i) => ({
      lat: from.lat + (to.lat - from.lat) * (i / 10),
      lng: from.lng + (to.lng - from.lng) * (i / 10),
    }));
  }
}

export default function FakeGPSNative({
  orderId, shopLat, shopLng, destLat, destLng,
  shipperLat, shipperLng, onLocationUpdate
}: FakeGPSNativeProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [currentPos, setCurrentPos] = useState<Coord | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepInfo, setStepInfo] = useState('');
  const [speed, setSpeed] = useState<Speed>('normal');
  const [startPos, setStartPos] = useState<Coord | null>(
    shipperLat && shipperLng ? { lat: shipperLat, lng: shipperLng } : null
  );

  // ✅ Dùng @stomp/stompjs Client giống web
  const stompClientRef = useRef<Client | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lấy GPS thật khi mount
  useEffect(() => {
    if (startPos) return;
    navigator.geolocation?.getCurrentPosition(
      pos => setStartPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setStartPos(nearbyPoint(shopLat, shopLng)),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // ✅ Gửi location qua STOMP — đồng nhất với web FE Fakegps.tsx
  const sendLocation = useCallback((lat: number, lng: number) => {
    onLocationUpdate?.(lat, lng);
    const client = stompClientRef.current;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/shipper/location',
      body: JSON.stringify({
        orderId,
        latitude: lat,
        longitude: lng,
        isFake: true,
      }),
    });
  }, [orderId, onLocationUpdate]);

  // ✅ Kết nối WebSocket dùng Client + SockJS giống web
  const connectWS = useCallback((): Promise<void> => {
    return new Promise(async (resolve) => {
      const token = await storage.getItem(TOKEN_KEY);
      const baseUrl = API_BASE_URL.endsWith('/api/v1')
        ? API_BASE_URL.slice(0, -7)
        : API_BASE_URL;

      const client = new Client({
        // ✅ SockJS thay vì raw WebSocket — BE Spring Boot yêu cầu SockJS
        webSocketFactory: () => new (SockJS as any)(`${baseUrl}/api/v1/ws`),
        reconnectDelay: 0,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        onConnect: () => {
          setWsStatus('connected');
          resolve();
        },
        onStompError: () => {
          setWsStatus('disconnected');
          resolve(); // vẫn tiếp tục chạy dù WS lỗi
        },
        onDisconnect: () => {
          setWsStatus('disconnected');
        },
      });

      setWsStatus('connecting');
      client.activate();
      stompClientRef.current = client;

      // Timeout 5s nếu không connect được
      setTimeout(resolve, 5000);
    });
  }, []);

  const runRoute = useCallback((route: Coord[], label: string, onDone: () => void) => {
    let idx = 0;
    const total = route.length;
    const tick = () => {
      if (idx >= total) { onDone(); return; }
      const pt = route[idx];
      setCurrentPos(pt);
      sendLocation(pt.lat, pt.lng);
      setProgress(Math.round((idx / Math.max(total - 1, 1)) * 100));
      setStepInfo(`${label} • ${idx + 1}/${total}`);
      idx++;
      intervalRef.current = setTimeout(tick, SPEED_MS[speed]);
    };
    tick();
  }, [sendLocation, speed]);

  const startFakeGPS = async () => {
    const origin = startPos || nearbyPoint(shopLat, shopLng);
    setPhase('loading');
    setProgress(0);

    try {
      const [route1, route2] = await Promise.all([
        fetchRoute(origin, { lat: shopLat, lng: shopLng }),
        fetchRoute({ lat: shopLat, lng: shopLng }, { lat: destLat, lng: destLng }),
      ]);

      if (!route1.length || !route2.length) {
        setPhase('idle');
        return;
      }

      // ✅ Kết nối STOMP over SockJS
      await connectWS();

      // Gửi vị trí xuất phát trước (giống web FE Fakegps.tsx)
      sendLocation(origin.lat, origin.lng);
      await new Promise(r => setTimeout(r, 1500));

      // Phase 1: Shipper → Shop
      setPhase('to_shop');
      runRoute(route1, '🏪 Đến shop', () => {
        setPhase('at_shop');
        setStepInfo('🏪 Đang lấy hàng...');
        setProgress(0);
        setTimeout(() => {
          // Phase 2: Shop → Buyer
          setPhase('to_buyer');
          runRoute(route2, '🏠 Giao hàng', () => {
            setPhase('done');
            setStepInfo('✅ Đã giao hàng!');
            setProgress(100);
          });
        }, 2000);
      });

    } catch {
      setPhase('idle');
      setWsStatus('disconnected');
    }
  };

  const stopFakeGPS = () => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    setPhase('idle');
    setWsStatus('disconnected');
    setCurrentPos(null);
    setProgress(0);
    setStepInfo('');
  };

  useEffect(() => () => stopFakeGPS(), []);

  const isRunning = phase !== 'idle' && phase !== 'done' && phase !== 'loading';
  const isDone = phase === 'done';

  const phaseLabel: Record<Phase, string> = {
    idle: 'Chưa chạy',
    loading: 'Đang tải đường đi...',
    to_shop: 'Shipper đang đến shop',
    at_shop: 'Đang lấy hàng tại shop',
    to_buyer: 'Đang giao đến nhà khách',
    done: 'Đã giao hàng thành công!',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Navigation size={18} color="#10b981" />
          <View>
            <Text style={styles.title}>Fake GPS Demo</Text>
            <Text style={styles.subtitle}>Cho giảng viên xem thử</Text>
          </View>
        </View>
        <View style={[styles.wsBadge,
          wsStatus === 'connected' ? styles.wsConnected :
          wsStatus === 'connecting' ? styles.wsConnecting : styles.wsOff
        ]}>
          <View style={[styles.wsDot,
            wsStatus === 'connected' ? styles.wsDotGreen :
            wsStatus === 'connecting' ? styles.wsDotYellow : styles.wsDotGray
          ]} />
          <Text style={styles.wsText}>
            {wsStatus === 'connected' ? 'WS Live' : wsStatus === 'connecting' ? 'Kết nối...' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* GPS start position */}
      <View style={[styles.gpsRow, startPos ? styles.gpsRowActive : styles.gpsRowInactive]}>
        <MapPin size={12} color={startPos ? '#10b981' : '#94a3b8'} />
        <Text style={[styles.gpsText, startPos ? styles.gpsTextActive : styles.gpsTextInactive]}>
          {startPos
            ? `Xuất phát: ${startPos.lat.toFixed(5)}, ${startPos.lng.toFixed(5)}`
            : 'Chưa có GPS — dùng vị trí gần shop'}
        </Text>
      </View>

      {/* Phase chips */}
      <View style={styles.phaseRow}>
        {(['to_shop', 'at_shop', 'to_buyer'] as Phase[]).map((p, i) => (
          <React.Fragment key={p}>
            <View style={[
              styles.phaseChip,
              phase === p && styles.phaseChipActive,
              isDone && styles.phaseChipDone
            ]}>
              <Text style={[styles.phaseChipText, (phase === p || isDone) && styles.phaseChipTextActive]}>
                {p === 'to_shop' ? '🏍️ Shop' : p === 'at_shop' ? '🏪 Lấy' : '🏠 Giao'}
              </Text>
            </View>
            {i < 2 && <View style={styles.phaseLine} />}
          </React.Fragment>
        ))}
      </View>

      {/* Status */}
      <Text style={styles.phaseStatus}>{phaseLabel[phase]}</Text>

      {/* Progress */}
      {(isRunning || isDone) && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{stepInfo} — {progress}%</Text>
        </View>
      )}

      {/* Current coords */}
      {currentPos && (
        <View style={styles.coordBox}>
          <Navigation size={12} color="#10b981" />
          <Text style={styles.coordText}>
            {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
          </Text>
        </View>
      )}

      {/* Speed selector */}
      {phase === 'idle' && (
        <View style={styles.speedRow}>
          <Text style={styles.speedLabel}>Tốc độ:</Text>
          {([
            { key: 'fast' as Speed, label: '🐇 Nhanh' },
            { key: 'normal' as Speed, label: '🚗 Vừa' },
            { key: 'slow' as Speed, label: '🐢 Chậm' },
          ]).map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.speedBtn, speed === s.key && styles.speedBtnActive]}
              onPress={() => setSpeed(s.key)}
            >
              <Text style={[styles.speedBtnText, speed === s.key && styles.speedBtnTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Control button */}
      {phase === 'idle' || phase === 'done' ? (
        <TouchableOpacity style={styles.startBtn} onPress={startFakeGPS}>
          <Play size={16} color="white" />
          <Text style={styles.btnText}>{isDone ? 'Chạy lại' : 'Bắt đầu giả lập GPS'}</Text>
        </TouchableOpacity>
      ) : phase === 'loading' ? (
        <View style={styles.loadingBtn}>
          <ActivityIndicator size="small" color="#92400e" />
          <Text style={styles.loadingBtnText}>Đang tải đường đi...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.stopBtn} onPress={stopFakeGPS}>
          <Square size={16} color="white" />
          <Text style={styles.btnText}>Dừng giả lập</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.disclaimer}>
        ⚠️ Chỉ dùng để demo — không thay thế GPS thật khi giao hàng thực tế
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#bbf7d0', gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '800', color: '#065f46' },
  subtitle: { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  wsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  wsConnected: { backgroundColor: '#d1fae5' },
  wsConnecting: { backgroundColor: '#fef3c7' },
  wsOff: { backgroundColor: '#f1f5f9' },
  wsDot: { width: 6, height: 6, borderRadius: 3 },
  wsDotGreen: { backgroundColor: '#10b981' },
  wsDotYellow: { backgroundColor: '#f59e0b' },
  wsDotGray: { backgroundColor: '#94a3b8' },
  wsText: { fontSize: 9, fontWeight: '800', color: '#374151', textTransform: 'uppercase' },
  gpsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  gpsRowActive: { backgroundColor: '#d1fae5' },
  gpsRowInactive: { backgroundColor: '#f1f5f9' },
  gpsText: { fontSize: 11, fontWeight: '600', flex: 1 },
  gpsTextActive: { color: '#065f46' },
  gpsTextInactive: { color: '#94a3b8' },
  phaseRow: { flexDirection: 'row', alignItems: 'center' },
  phaseChip: {
    flex: 1, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#e2e8f0', alignItems: 'center',
  },
  phaseChipActive: { backgroundColor: '#10b981' },
  phaseChipDone: { backgroundColor: '#3b82f6' },
  phaseChipText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  phaseChipTextActive: { color: 'white' },
  phaseLine: { width: 8, height: 2, backgroundColor: '#e2e8f0' },
  phaseStatus: { fontSize: 12, fontWeight: '700', color: '#047857', textAlign: 'center' },
  progressWrap: { gap: 4 },
  progressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  coordBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: 8,
  },
  coordText: { fontSize: 10, fontFamily: 'monospace', color: '#374151' },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  speedLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },
  speedBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#e2e8f0',
  },
  speedBtnActive: { backgroundColor: '#10b981' },
  speedBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  speedBtnTextActive: { color: 'white' },
  startBtn: {
    backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  stopBtn: {
    backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  loadingBtn: {
    backgroundColor: '#fef3c7', borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  loadingBtnText: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  btnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  disclaimer: { fontSize: 9, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' },
});
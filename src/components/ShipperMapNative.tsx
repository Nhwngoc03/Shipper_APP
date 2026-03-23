import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import {
  ArrowLeft, Navigation, Play, Square,
  Zap, ChevronDown, ChevronUp, CheckCircle, XCircle,
} from 'lucide-react-native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import * as Location from 'expo-location';
import { API_BASE_URL, TOKEN_KEY, shipperService } from '../services';
import { storage } from '../services/storage';

// ─── Platform-aware map ───────────────────────────────────────────────────────
// Web  → Leaflet DOM (MapViewWeb)
// Native → Leaflet inside WebView (MapViewNative) — không cần Google Maps key!
const MapViewWeb = Platform.OS === 'web' ? require('./MapViewWeb').default : null;
const MapViewNativeComp = Platform.OS !== 'web' ? require('./MapViewNative').default : null;
// ─────────────────────────────────────────────────────────────────────────────

interface ShipperMapProps {
  orderId: number;
  shopLat: number;
  shopLng: number;
  destLat: number;
  destLng: number;
  shipperLat?: number;
  shipperLng?: number;
  recipientName?: string;
  onBack: () => void;
  onOrderCompleted?: (orderId: number) => void;
}

interface Coord { lat: number; lng: number; }
type Phase = 'idle' | 'loading' | 'to_shop' | 'at_shop' | 'to_buyer' | 'done';
type Speed = 'fast' | 'normal' | 'slow';
const SPEED_MS: Record<Speed, number> = { fast: 1000, normal: 3000, slow: 5000 };

/** Tính khoảng cách (mét) giữa 2 toạ độ — Haversine */
function distanceMeters(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sin2Lat = Math.sin(dLat / 2) ** 2;
  const sin2Lng = Math.sin(dLng / 2) ** 2;
  const x = sin2Lat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sin2Lng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearbyPoint(lat: number, lng: number, offsetKm = 0.5): Coord {
  const offset = offsetKm / 111;
  return { lat: lat + offset, lng: lng + offset };
}

async function fetchRoute(from: Coord, to: Coord): Promise<Coord[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return [];
    return data.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => ({ lat, lng }));
  } catch {
    return Array.from({ length: 11 }, (_, i) => ({
      lat: from.lat + (to.lat - from.lat) * (i / 10),
      lng: from.lng + (to.lng - from.lng) * (i / 10),
    }));
  }
}

export default function ShipperMapNative({
  orderId, shopLat, shopLng, destLat, destLng,
  shipperLat, shipperLng, recipientName, onBack, onOrderCompleted,
}: ShipperMapProps) {

  // ── Real GPS ───────────────────────────────────────────────────────────────
  const [trackingStatus, setTrackingStatus] = useState<'off' | 'starting' | 'active' | 'error'>('off');
  const [currentPos, setCurrentPos] = useState<Coord | null>(
    shipperLat && shipperLng ? { lat: shipperLat, lng: shipperLng } : null
  );
  const stompRef = useRef<Client | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<any>(null); // LocationSubscription (native) | number (web)
  const posRef = useRef<Coord | null>(currentPos);

  // ── FakeGPS ────────────────────────────────────────────────────────────────
  const [fakeOpen, setFakeOpen] = useState(false);
  const [fakePhase, setFakePhase] = useState<Phase>('idle');
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeStepInfo, setFakeStepInfo] = useState('');
  const [fakeSpeed, setFakeSpeed] = useState<Speed>('normal');
  const [fakePos, setFakePos] = useState<Coord | null>(null);
  // arrivedShop: truyền xuống map để trim route đúng phase
  const [arrivedShop, setArrivedShop] = useState(false);
  /** true khi shipper đã đến điểm giao hàng của buyer */
  const [arrivedBuyer, setArrivedBuyer] = useState(false);

  const fakeStompRef = useRef<Client | null>(null);
  const fakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [completing, setCompleting] = useState<'DELIVERED' | 'FAILED' | null>(null);

  const startPos = currentPos || nearbyPoint(shopLat, shopLng);
  const displayPos = fakePos || currentPos || startPos;

  // ── startTracking — dùng expo-location trên native, geolocation trên web ──
  const startTracking = async () => {
    setTrackingStatus('starting');

    if (Platform.OS !== 'web') {
      // Native: xin quyền → expo-location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setTrackingStatus('error'); return; }

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setCurrentPos(p);
          posRef.current = p;
        }
      );
      watchIdRef.current = sub; // .remove() để dừng
    } else {
      // Web: navigator.geolocation
      watchIdRef.current = navigator.geolocation?.watchPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPos(p);
          posRef.current = p;
        },
        () => { },
        { enableHighAccuracy: true, maximumAge: 3000 }
      ) ?? null;
    }

    // STOMP WebSocket — giữ nguyên 100%
    const token = await storage.getItem(TOKEN_KEY);
    const baseUrl = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL.slice(0, -7) : API_BASE_URL;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseUrl}/api/v1/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        setTrackingStatus('active');
        intervalRef.current = setInterval(() => {
          const pos = posRef.current;
          if (!pos || !client.connected) return;
          client.publish({
            destination: '/app/shipper/location',
            body: JSON.stringify({ orderId, latitude: pos.lat, longitude: pos.lng }),
          });
        }, 3000);
      },
      onStompError: () => setTrackingStatus('error'),
      onDisconnect: () => setTrackingStatus(prev => prev === 'active' ? 'error' : prev),
    });
    client.activate();
    stompRef.current = client;
  };

  const stopTracking = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    if (watchIdRef.current !== null) {
      if (typeof watchIdRef.current === 'number') {
        navigator.geolocation?.clearWatch(watchIdRef.current); // web
      } else {
        watchIdRef.current.remove?.(); // expo-location LocationSubscription
      }
      watchIdRef.current = null;
    }

    if (stompRef.current) {
      if (stompRef.current.connected) {
        stompRef.current.publish({
          destination: '/app/shipper/location',
          body: JSON.stringify({ orderId, gpsOff: true }),
        });
      }
      stompRef.current.deactivate();
      stompRef.current = null;
    }
    setTrackingStatus('off');
  };

  // ── FakeGPS — giữ nguyên 100% ─────────────────────────────────────────────
  const connectFakeWS = async (): Promise<void> => {
    return new Promise(async (resolve) => {
      const token = await storage.getItem(TOKEN_KEY);
      const baseUrl = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL.slice(0, -7) : API_BASE_URL;
      const client = new Client({
        webSocketFactory: () => new (SockJS as any)(`${baseUrl}/api/v1/ws`),
        reconnectDelay: 0,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        onConnect: () => resolve(),
        onStompError: () => resolve(),
      });
      client.activate();
      fakeStompRef.current = client;
      setTimeout(resolve, 5000);
    });
  };

  const sendFakeLocation = (lat: number, lng: number) => {
    const client = fakeStompRef.current;
    if (!client?.connected) return;
    client.publish({
      destination: '/app/shipper/location',
      body: JSON.stringify({ orderId, latitude: lat, longitude: lng, isFake: true }),
    });
  };

  const runFakeRoute = (route: Coord[], label: string, onDone: () => void) => {
    let idx = 0;
    const total = route.length;
    const tick = () => {
      if (idx >= total) { onDone(); return; }
      const pt = route[idx];
      setFakePos(pt);
      sendFakeLocation(pt.lat, pt.lng);
      setFakeProgress(Math.round((idx / Math.max(total - 1, 1)) * 100));
      setFakeStepInfo(`${label} • ${idx + 1}/${total}`);
      idx++;
      fakeTimerRef.current = setTimeout(tick, SPEED_MS[fakeSpeed]);
    };
    tick();
  };

  const startFakeGPS = async () => {
    const origin = startPos;
    setFakePhase('loading');
    setFakeProgress(0);
    setArrivedShop(false);

    try {
      const [route1, route2] = await Promise.all([
        fetchRoute(origin, { lat: shopLat, lng: shopLng }),
        fetchRoute({ lat: shopLat, lng: shopLng }, { lat: destLat, lng: destLng }),
      ]);
      if (!route1.length || !route2.length) { setFakePhase('idle'); return; }

      await connectFakeWS();
      sendFakeLocation(origin.lat, origin.lng);
      await new Promise(r => setTimeout(r, 1500));

      setFakePhase('to_shop');
      runFakeRoute(route1, '🏪 Đến shop', () => {
        setFakePhase('at_shop');
        setFakeStepInfo('🏪 Đang lấy hàng...');
        setFakeProgress(0);
        setArrivedShop(true); // ← báo map chuyển sang trim phase 2
        setTimeout(() => {
          setFakePhase('to_buyer');
          runFakeRoute(route2, '🏠 Giao hàng', () => {
            setFakePhase('done');
            setFakeStepInfo('✅ Đã đến nơi giao hàng!');
            setFakeProgress(100);
            setArrivedBuyer(true); // ← mở khoá 2 nút
          });
        }, 2000);
      });
    } catch {
      setFakePhase('idle');
    }
  };

  const stopFakeGPS = () => {
    if (fakeTimerRef.current) clearTimeout(fakeTimerRef.current);
    if (fakeStompRef.current) { fakeStompRef.current.deactivate(); fakeStompRef.current = null; }
    setFakePhase('idle');
    setFakePos(null);
    setFakeProgress(0);
    setFakeStepInfo('');
    setArrivedShop(false);
    setArrivedBuyer(false);
  };

  // ── Complete order ─────────────────────────────────────────────────────────
  const handleComplete = async (status: 'DELIVERED' | 'FAILED') => {
    setCompleting(status);
    try {
      await shipperService.updateOrderStatus(orderId, { status });
      stopTracking();
      stopFakeGPS();
      onOrderCompleted?.(orderId);
      onBack();
    } catch {
      setCompleting(null);
    }
  };

  useEffect(() => () => { stopTracking(); stopFakeGPS(); }, []);

  // Nếu dùng GPS thật, check khoảng cách so với điểm giao hàng
  useEffect(() => {
    if (arrivedBuyer) return; // Đã đến rồi thì thôi
    const pos = fakePos || currentPos;
    if (!pos) return;
    const dist = distanceMeters(pos, { lat: destLat, lng: destLng });
    if (dist <= 150) setArrivedBuyer(true);
  }, [fakePos, currentPos, arrivedBuyer, destLat, destLng]);

  const isFakeRunning = fakePhase !== 'idle' && fakePhase !== 'done' && fakePhase !== 'loading';
  const isFakeDone = fakePhase === 'done';

  const fakePhaseLabel: Record<Phase, string> = {
    idle: 'Chưa chạy',
    loading: 'Đang tải đường đi...',
    to_shop: 'Đang đến shop lấy hàng',
    at_shop: 'Đang lấy hàng tại shop',
    to_buyer: 'Đang giao đến nhà khách',
    done: 'Đã giao hàng thành công!',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Bản đồ giao hàng</Text>
          <Text style={styles.headerSub}>
            Đơn #{orderId}{recipientName ? ` • ${recipientName}` : ''}
          </Text>
        </View>
        <View style={[
          styles.wsBadge,
          trackingStatus === 'active' ? styles.wsActive :
            trackingStatus === 'starting' ? styles.wsStarting : styles.wsOff,
        ]}>
          <View style={[
            styles.wsDot,
            trackingStatus === 'active' ? styles.wsDotGreen :
              trackingStatus === 'starting' ? styles.wsDotYellow : styles.wsDotGray,
          ]} />
          <Text style={styles.wsText}>
            {trackingStatus === 'active' ? 'Live' : trackingStatus === 'starting' ? '...' : 'Off'}
          </Text>
        </View>
      </View>

      {/* Map — Platform aware */}
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          MapViewWeb && (
            <MapViewWeb
              shipperLat={displayPos.lat}
              shipperLng={displayPos.lng}
              shopLat={shopLat}
              shopLng={shopLng}
              destLat={destLat}
              destLng={destLng}
              arrivedShop={arrivedShop}
            />
          )
        ) : (
          // Android / iOS: Leaflet trong WebView, tile OpenStreetMap, không cần key
          MapViewNativeComp && (
            <MapViewNativeComp
              shipperLat={displayPos.lat}
              shipperLng={displayPos.lng}
              shopLat={shopLat}
              shopLng={shopLng}
              destLat={destLat}
              destLng={destLng}
              arrivedShop={arrivedShop}
            />
          )
        )}

        {/* Legend */}
        <View style={styles.legendOverlay} pointerEvents="none">
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendText}>→ Shop</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>→ Nhà</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <ScrollView style={styles.controls} showsVerticalScrollIndicator={false}>

        {/* Tọa độ */}
        <View style={styles.coordBox}>
          <Navigation size={12} color="#10b981" />
          <Text style={styles.coordText}>
            {displayPos.lat.toFixed(5)}, {displayPos.lng.toFixed(5)}
          </Text>
        </View>

        {/* GPS Thật */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Thật</Text>
          <View style={[
            styles.gpsStatus,
            trackingStatus === 'active' ? styles.gpsActive :
              trackingStatus === 'starting' ? styles.gpsStarting :
                trackingStatus === 'error' ? styles.gpsError : styles.gpsOff,
          ]}>
            {trackingStatus === 'active' ? (
              <><View style={styles.gpsDot} /><Text style={styles.gpsActiveText}>Đang phát GPS live cho buyer theo dõi</Text></>
            ) : trackingStatus === 'starting' ? (
              <><ActivityIndicator size="small" color="#d97706" /><Text style={styles.gpsStartingText}>Đang kết nối...</Text></>
            ) : trackingStatus === 'error' ? (
              <Text style={styles.gpsErrorText}>Mất kết nối — thử lại</Text>
            ) : (
              <><Navigation size={14} color="#94a3b8" /><Text style={styles.gpsOffText}>Chưa bật GPS</Text></>
            )}
          </View>
          {trackingStatus === 'off' || trackingStatus === 'error' ? (
            <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
              <Navigation size={16} color="white" />
              <Text style={styles.btnText}>Bật GPS thật</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={stopTracking}>
              <Square size={16} color="white" />
              <Text style={styles.btnText}>Dừng GPS</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hoàn thành đơn */}
        <View style={styles.completeRow}>
          <TouchableOpacity
            style={[styles.deliveredBtn, (completing !== null || !arrivedBuyer) && styles.btnDisabled]}
            onPress={() => handleComplete('DELIVERED')}
            disabled={completing !== null || !arrivedBuyer}
          >
            {completing === 'DELIVERED'
              ? <ActivityIndicator size="small" color="white" />
              : <><CheckCircle size={16} color="white" /><Text style={styles.completeBtnText}>Đã giao hàng</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.failedBtn, (completing !== null || !arrivedBuyer) && styles.btnDisabled]}
            onPress={() => handleComplete('FAILED')}
            disabled={completing !== null || !arrivedBuyer}
          >
            {completing === 'FAILED'
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <><XCircle size={16} color="#ef4444" /><Text style={styles.failedBtnText}>Giao thất bại</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* FakeGPS */}
        <TouchableOpacity style={styles.fakeToggle} onPress={() => setFakeOpen(v => !v)}>
          <View style={styles.fakeToggleLeft}>
            <View style={styles.fakeIcon}><Zap size={14} color="#92400e" /></View>
            <Text style={styles.fakeToggleText}>🎭 Demo GPS (Fake GPS)</Text>
          </View>
          {fakeOpen ? <ChevronUp size={16} color="#92400e" /> : <ChevronDown size={16} color="#92400e" />}
        </TouchableOpacity>

        {fakeOpen && (
          <View style={styles.fakeSection}>
            <View style={styles.phaseRow}>
              {(['to_shop', 'at_shop', 'to_buyer'] as Phase[]).map((p, i) => (
                <React.Fragment key={p}>
                  <View style={[
                    styles.phaseChip,
                    fakePhase === p && styles.phaseChipActive,
                    isFakeDone && styles.phaseChipDone,
                  ]}>
                    <Text style={[styles.phaseChipText, (fakePhase === p || isFakeDone) && styles.phaseChipTextActive]}>
                      {p === 'to_shop' ? '🏍️ Shop' : p === 'at_shop' ? '🏪 Lấy' : '🏠 Giao'}
                    </Text>
                  </View>
                  {i < 2 && <View style={styles.phaseLine} />}
                </React.Fragment>
              ))}
            </View>

            <Text style={styles.phaseStatus}>{fakePhaseLabel[fakePhase]}</Text>

            {(isFakeRunning || isFakeDone) && (
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${fakeProgress}%` as any }]} />
                </View>
                <Text style={styles.progressText}>{fakeStepInfo} — {fakeProgress}%</Text>
              </View>
            )}

            {fakePhase === 'idle' && (
              <View style={styles.speedRow}>
                <Text style={styles.speedLabel}>Tốc độ:</Text>
                {([
                  { key: 'fast' as Speed, label: '🐇 Nhanh' },
                  { key: 'normal' as Speed, label: '🚗 Vừa' },
                  { key: 'slow' as Speed, label: '🐢 Chậm' },
                ]).map(s => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.speedBtn, fakeSpeed === s.key && styles.speedBtnActive]}
                    onPress={() => setFakeSpeed(s.key)}
                  >
                    <Text style={[styles.speedBtnText, fakeSpeed === s.key && styles.speedBtnTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {fakePhase === 'idle' || fakePhase === 'done' ? (
              <TouchableOpacity style={styles.fakeStartBtn} onPress={startFakeGPS}>
                <Play size={15} color="white" />
                <Text style={styles.btnText}>{isFakeDone ? 'Chạy lại' : 'Bắt đầu giả lập GPS'}</Text>
              </TouchableOpacity>
            ) : fakePhase === 'loading' ? (
              <View style={styles.loadingBtn}>
                <ActivityIndicator size="small" color="#92400e" />
                <Text style={styles.loadingBtnText}>Đang tải đường đi...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.fakeStopBtn} onPress={stopFakeGPS}>
                <Square size={15} color="white" />
                <Text style={styles.btnText}>Dừng giả lập</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.disclaimer}>⚠️ Chỉ dùng để demo — không thay thế GPS thật</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// Styles giữ nguyên 100%
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  wsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  wsActive: { backgroundColor: '#d1fae5' },
  wsStarting: { backgroundColor: '#fef3c7' },
  wsOff: { backgroundColor: '#f1f5f9' },
  wsDot: { width: 6, height: 6, borderRadius: 3 },
  wsDotGreen: { backgroundColor: '#10b981' },
  wsDotYellow: { backgroundColor: '#f59e0b' },
  wsDotGray: { backgroundColor: '#94a3b8' },
  wsText: { fontSize: 10, fontWeight: '800', color: '#374151', textTransform: 'uppercase' },
  mapWrapper: { height: 320, backgroundColor: '#e2e8f0', position: 'relative' },
  legendOverlay: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 8, gap: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 20, height: 3, borderRadius: 2 },
  legendText: { fontSize: 10, fontWeight: '700', color: '#374151' },
  controls: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  coordBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#d1fae5', borderRadius: 10, padding: 8, marginBottom: 10,
  },
  coordText: { fontSize: 11, fontFamily: 'monospace', color: '#065f46', fontWeight: '600' },
  section: {
    backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  gpsStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  gpsActive: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#a7f3d0' },
  gpsStarting: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  gpsError: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  gpsOff: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  gpsActiveText: { fontSize: 12, fontWeight: '700', color: '#065f46', flex: 1 },
  gpsStartingText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  gpsErrorText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  gpsOffText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  startBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  stopBtn: {
    backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  btnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  completeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  deliveredBtn: {
    flex: 1, backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  failedBtn: {
    flex: 1, backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: '#fecaca',
  },
  completeBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  failedBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  notArrivedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff7ed', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#fed7aa', marginTop: -4, marginBottom: 4,
  },
  notArrivedText: { fontSize: 11, fontWeight: '600', color: '#c2410c', flex: 1, textAlign: 'center' },
  fakeToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fefce8', borderRadius: 14, padding: 12, marginBottom: 4,
    borderWidth: 1, borderColor: '#fde68a', borderStyle: 'dashed',
  },
  fakeToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fakeIcon: { width: 28, height: 28, backgroundColor: '#fef3c7', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fakeToggleText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  fakeSection: {
    backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  phaseRow: { flexDirection: 'row', alignItems: 'center' },
  phaseChip: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center' },
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
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  speedLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },
  speedBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#e2e8f0' },
  speedBtnActive: { backgroundColor: '#10b981' },
  speedBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  speedBtnTextActive: { color: 'white' },
  fakeStartBtn: {
    backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  fakeStopBtn: {
    backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  loadingBtn: {
    backgroundColor: '#fef3c7', borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  loadingBtnText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  disclaimer: { fontSize: 10, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' },
});
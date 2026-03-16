import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform
} from 'react-native';
import {
  ArrowLeft, Navigation, Play, Square,
  Zap, ChevronDown, ChevronUp, CheckCircle, XCircle
} from 'lucide-react-native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL, TOKEN_KEY, shipperService } from '../services';

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
  // ---- GPS tracking (real) ----
  const [trackingStatus, setTrackingStatus] = useState<'off' | 'starting' | 'active' | 'error'>('off');
  const [currentPos, setCurrentPos] = useState<Coord | null>(
    shipperLat && shipperLng ? { lat: shipperLat, lng: shipperLng } : null
  );
  const stompRef = useRef<Client | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const posRef = useRef<Coord | null>(currentPos);

  // ---- FakeGPS ----
  const [fakeOpen, setFakeOpen] = useState(false);
  const [fakePhase, setFakePhase] = useState<Phase>('idle');
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeStepInfo, setFakeStepInfo] = useState('');
  const [fakeSpeed, setFakeSpeed] = useState<Speed>('normal');
  const [fakePos, setFakePos] = useState<Coord | null>(null);
  const fakeStompRef = useRef<Client | null>(null);
  const fakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Map (Leaflet via DOM) ----
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const shipperMarkerRef = useRef<any>(null);
  const routeLayer1Ref = useRef<any>(null);
  const routeLayer2Ref = useRef<any>(null);
  const mapInitRef = useRef(false);

  // ✅ Route trim refs — giống buyer Tracking
  const fullRoute1Ref = useRef<[number, number][]>([]);
  const fullRoute2Ref = useRef<[number, number][]>([]);
  const arrivedShopRef = useRef(false);
  const lastIdx1Ref = useRef(0);
  const lastIdx2Ref = useRef(0);
  const routeFetchingRef = useRef(false);

  const startPos = currentPos || nearbyPoint(shopLat, shopLng);
  const [completing, setCompleting] = useState<'DELIVERED' | 'FAILED' | null>(null);

  // ---- Leaflet CSS (web only) ----
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.querySelector('link[href*="leaflet.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  // ---- Init map (web only) ----
  const initMap = useCallback((lat: number, lng: number) => {
    if (Platform.OS !== 'web') return;
    if (!mapRef.current || mapInitRef.current) return;
    mapInitRef.current = true;
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current!, { center: [lat, lng], zoom: 14 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(map);

      // Shipper marker
      const shipperIcon = L.divIcon({
        html: `<div style="width:44px;height:44px;background:#3B82F6;border:3px solid white;border-radius:12px;
            display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(59,130,246,0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 3h15v13H1z"/><path d="m16 8 4 0 3 3 0 5-3 0"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg></div>
          <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
            background:#1D4ED8;color:white;padding:2px 8px;border-radius:12px;
            font-size:10px;font-weight:900;white-space:nowrap;">Bạn</div>`,
        className: '', iconSize: [44, 44], iconAnchor: [22, 22],
      });
      shipperMarkerRef.current = L.marker([lat, lng], { icon: shipperIcon }).addTo(map);

      // Shop marker
      const shopIcon = L.divIcon({
        html: `<div style="width:38px;height:38px;background:#F97316;border:3px solid white;border-radius:10px;
            display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);
            background:#EA580C;color:white;padding:2px 8px;border-radius:10px;
            font-size:9px;font-weight:900;white-space:nowrap;">Lấy hàng</div>`,
        className: '', iconSize: [38, 38], iconAnchor: [19, 19],
      });
      L.marker([shopLat, shopLng], { icon: shopIcon }).addTo(map);

      // Dest marker
      const destIcon = L.divIcon({
        html: `<div style="width:38px;height:38px;background:#22C55E;border:3px solid white;border-radius:50%;
            display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(34,197,94,0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/></svg></div>
          <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);
            background:#16A34A;color:white;padding:2px 8px;border-radius:10px;
            font-size:9px;font-weight:900;white-space:nowrap;">Giao hàng</div>`,
        className: '', iconSize: [38, 38], iconAnchor: [19, 19],
      });
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map);

      leafletMapRef.current = map;

      map.fitBounds(
        L.latLngBounds([[lat, lng], [shopLat, shopLng], [destLat, destLng]]),
        { padding: [60, 60], animate: true }
      );

      // Vẽ route lần đầu
      drawRoutes(L, map, lat, lng);
    });
  }, [shopLat, shopLng, destLat, destLng]);

  // ✅ findForward — tìm điểm gần nhất trên route (giống buyer)
  const findForward = (route: [number, number][], lat: number, lng: number, from: number): number => {
    let minD = Infinity, minI = from;
    for (let i = from; i < route.length; i++) {
      const d = (route[i][0] - lat) ** 2 + (route[i][1] - lng) ** 2;
      if (d < minD) { minD = d; minI = i; }
    }
    return minI;
  };

  // ✅ trimRoute — cắt đường đã đi (giống buyer Tracking)
  const trimRoute = useCallback((sLat: number, sLng: number) => {
    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;
      const NEAR = 0.004; // ~440m — ngưỡng coi là đã đến shop

      if (!arrivedShopRef.current) {
        // Phase 1: shipper → shop
        const r1 = fullRoute1Ref.current;
        if (r1.length > 1) {
          const idx = findForward(r1, sLat, sLng, lastIdx1Ref.current);
          lastIdx1Ref.current = idx;
          const rem = r1.slice(idx);
          if (routeLayer1Ref.current) { try { map.removeLayer(routeLayer1Ref.current); } catch {} routeLayer1Ref.current = null; }

          const dShop = Math.sqrt((sLat - shopLat) ** 2 + (sLng - shopLng) ** 2);
          if (dShop < NEAR || rem.length < 2) {
            // Đã đến shop → chuyển sang phase 2
            arrivedShopRef.current = true;
          } else {
            routeLayer1Ref.current = L.polyline(rem, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
          }
        }
      } else {
        // Phase 2: shop → buyer
        const r2 = fullRoute2Ref.current;
        if (r2.length > 1) {
          const idx = findForward(r2, sLat, sLng, lastIdx2Ref.current);
          lastIdx2Ref.current = idx;
          const rem = r2.slice(idx);
          if (routeLayer2Ref.current) { try { map.removeLayer(routeLayer2Ref.current); } catch {} routeLayer2Ref.current = null; }
          if (rem.length >= 2) {
            routeLayer2Ref.current = L.polyline(rem, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(map);
          }
        }
      }
    });
  }, [shopLat, shopLng]);

  // ✅ drawRoutes — fetch 1 lần, sau đó chỉ trimRoute
  const drawRoutes = async (L: any, map: any, sLat: number, sLng: number) => {
    // Nếu đã có route → chỉ trim
    if (fullRoute1Ref.current.length > 0 || fullRoute2Ref.current.length > 0) {
      trimRoute(sLat, sLng);
      return;
    }
    // Đang fetch → bỏ qua
    if (routeFetchingRef.current) return;
    routeFetchingRef.current = true;

    try {
      const [r1, r2] = await Promise.all([
        fetch(`https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${shopLng},${shopLat}?overview=full&geometries=geojson`),
        fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);

      if (d1.routes?.length) {
        fullRoute1Ref.current = d1.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
        if (routeLayer1Ref.current) { try { map.removeLayer(routeLayer1Ref.current); } catch {} }
        routeLayer1Ref.current = L.polyline(fullRoute1Ref.current, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
      }
      if (d2.routes?.length) {
        fullRoute2Ref.current = d2.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
        if (routeLayer2Ref.current) { try { map.removeLayer(routeLayer2Ref.current); } catch {} }
        routeLayer2Ref.current = L.polyline(fullRoute2Ref.current, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(map);
      }
    } catch {
    } finally {
      routeFetchingRef.current = false;
    }
  };

  // Init map khi mount
  useEffect(() => {
    const timer = setTimeout(() => initMap(startPos.lat, startPos.lng), 300);
    return () => clearTimeout(timer);
  }, []);

  // Update marker + trimRoute khi vị trí thay đổi
  const updateMarker = useCallback((lat: number, lng: number) => {
    if (shipperMarkerRef.current) {
      shipperMarkerRef.current.setLatLng([lat, lng]);
      if (leafletMapRef.current) {
        leafletMapRef.current.panTo([lat, lng], { animate: true, duration: 0.8 });
      }
    }
    // ✅ Trim route mỗi khi vị trí cập nhật
    if (fullRoute1Ref.current.length > 0 || fullRoute2Ref.current.length > 0) {
      trimRoute(lat, lng);
    }
  }, [trimRoute]);

  useEffect(() => {
    if (currentPos) updateMarker(currentPos.lat, currentPos.lng);
  }, [currentPos]);

  useEffect(() => {
    if (fakePos) updateMarker(fakePos.lat, fakePos.lng);
  }, [fakePos]);

  // Cleanup map
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
      mapInitRef.current = false;
      fullRoute1Ref.current = [];
      fullRoute2Ref.current = [];
      arrivedShopRef.current = false;
      lastIdx1Ref.current = 0;
      lastIdx2Ref.current = 0;
      routeFetchingRef.current = false;
    };
  }, []);

  // ---- Real GPS tracking ----
  const startTracking = () => {
    setTrackingStatus('starting');
    watchIdRef.current = navigator.geolocation?.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(p);
        posRef.current = p;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    ) ?? null;

    const token = localStorage.getItem(TOKEN_KEY);
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
    if (watchIdRef.current !== null) { navigator.geolocation?.clearWatch(watchIdRef.current); watchIdRef.current = null; }
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

  // ---- FakeGPS ----
  const connectFakeWS = (): Promise<void> => {
    return new Promise((resolve) => {
      const token = localStorage.getItem(TOKEN_KEY);
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

    // ✅ Reset trim state khi chạy lại fake GPS
    arrivedShopRef.current = false;
    lastIdx1Ref.current = 0;
    lastIdx2Ref.current = 0;
    fullRoute1Ref.current = [];
    fullRoute2Ref.current = [];
    routeFetchingRef.current = false;

    try {
      const [route1, route2] = await Promise.all([
        fetchRoute(origin, { lat: shopLat, lng: shopLng }),
        fetchRoute({ lat: shopLat, lng: shopLng }, { lat: destLat, lng: destLng }),
      ]);
      if (!route1.length || !route2.length) { setFakePhase('idle'); return; }

      // ✅ Lưu full route để trimRoute dùng
      fullRoute1Ref.current = route1.map(c => [c.lat, c.lng] as [number, number]);
      fullRoute2Ref.current = route2.map(c => [c.lat, c.lng] as [number, number]);

      // Vẽ cả 2 route lúc đầu
      import('leaflet').then((L) => {
        const map = leafletMapRef.current;
        if (!map) return;
        if (routeLayer1Ref.current) { try { map.removeLayer(routeLayer1Ref.current); } catch {} }
        if (routeLayer2Ref.current) { try { map.removeLayer(routeLayer2Ref.current); } catch {} }
        routeLayer1Ref.current = L.polyline(fullRoute1Ref.current, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
        routeLayer2Ref.current = L.polyline(fullRoute2Ref.current, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(map);
      });

      await connectFakeWS();
      sendFakeLocation(origin.lat, origin.lng);
      await new Promise(r => setTimeout(r, 1500));
      setFakePhase('to_shop');
      runFakeRoute(route1, '🏪 Đến shop', () => {
        setFakePhase('at_shop');
        setFakeStepInfo('🏪 Đang lấy hàng...');
        setFakeProgress(0);
        arrivedShopRef.current = true; // ✅ Báo đã đến shop
        setTimeout(() => {
          setFakePhase('to_buyer');
          runFakeRoute(route2, '🏠 Giao hàng', () => {
            setFakePhase('done');
            setFakeStepInfo('✅ Đã giao hàng!');
            setFakeProgress(100);
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
  };

  useEffect(() => () => { stopTracking(); stopFakeGPS(); }, []);

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

  const isFakeRunning = fakePhase !== 'idle' && fakePhase !== 'done' && fakePhase !== 'loading';
  const isFakeDone = fakePhase === 'done';

  const fakePhaseLabel: Record<Phase, string> = {
    idle: 'Chưa chạy', loading: 'Đang tải đường đi...',
    to_shop: 'Đang đến shop lấy hàng', at_shop: 'Đang lấy hàng tại shop',
    to_buyer: 'Đang giao đến nhà khách', done: 'Đã giao hàng thành công!',
  };

  const displayPos = fakePos || currentPos;

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
          trackingStatus === 'starting' ? styles.wsStarting : styles.wsOff
        ]}>
          <View style={[
            styles.wsDot,
            trackingStatus === 'active' ? styles.wsDotGreen :
            trackingStatus === 'starting' ? styles.wsDotYellow : styles.wsDotGray
          ]} />
          <Text style={styles.wsText}>
            {trackingStatus === 'active' ? 'Live' : trackingStatus === 'starting' ? '...' : 'Off'}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <div ref={mapRef as any} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Bản đồ chỉ hỗ trợ trên web</Text>
          </View>
        )}
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
        {displayPos && (
          <View style={styles.coordBox}>
            <Navigation size={12} color="#10b981" />
            <Text style={styles.coordText}>
              {displayPos.lat.toFixed(5)}, {displayPos.lng.toFixed(5)}
            </Text>
          </View>
        )}

        {/* Real GPS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Thật</Text>
          <View style={[
            styles.gpsStatus,
            trackingStatus === 'active' ? styles.gpsActive :
            trackingStatus === 'starting' ? styles.gpsStarting :
            trackingStatus === 'error' ? styles.gpsError : styles.gpsOff
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
            style={[styles.deliveredBtn, completing !== null && styles.btnDisabled]}
            onPress={() => handleComplete('DELIVERED')}
            disabled={completing !== null}
          >
            {completing === 'DELIVERED'
              ? <ActivityIndicator size="small" color="white" />
              : <><CheckCircle size={16} color="white" /><Text style={styles.completeBtnText}>Đã giao hàng</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.failedBtn, completing !== null && styles.btnDisabled]}
            onPress={() => handleComplete('FAILED')}
            disabled={completing !== null}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
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
  btnDisabled: { opacity: 0.5 },
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
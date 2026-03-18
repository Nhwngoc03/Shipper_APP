// MapViewNative.tsx
// Leaflet chạy bên trong react-native-webview — không cần Google Maps API key
// Hoạt động với Expo Go (expo start --android/ios) — không cần rebuild native
import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapViewNativeProps {
  shipperLat: number;
  shipperLng: number;
  shopLat: number;
  shopLng: number;
  destLat: number;
  destLng: number;
  arrivedShop?: boolean;
}

// ─── HTML string chứa toàn bộ Leaflet ───────────────────────────────────────
// Leaflet load từ CDN, tile từ OpenStreetMap (miễn phí, không cần key)
function buildMapHTML(
  shipperLat: number, shipperLng: number,
  shopLat: number, shopLng: number,
  destLat: number, destLng: number,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// ── Khởi tạo map ──────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: true, attributionControl: false });

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// ── Helpers ───────────────────────────────────────────────────────────────
function divIcon(html, size, anchor) {
  return L.divIcon({ html, className: '', iconSize: size, iconAnchor: anchor });
}

// ── Markers ───────────────────────────────────────────────────────────────
const shipperIcon = divIcon(
  \`<div style="width:44px;height:44px;background:#3B82F6;border:3px solid white;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(59,130,246,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 3h15v13H1z"/><path d="m16 8 4 0 3 3 0 5-3 0"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg></div>
  <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);background:#1D4ED8;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:900;white-space:nowrap;">Bạn</div>\`,
  [44, 44], [22, 22]
);

const shopIcon = divIcon(
  \`<div style="width:38px;height:38px;background:#F97316;border:3px solid white;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg></div>
  <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:#EA580C;color:white;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:900;white-space:nowrap;">Lấy hàng</div>\`,
  [38, 38], [19, 19]
);

const destIcon = divIcon(
  \`<div style="width:38px;height:38px;background:#22C55E;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(34,197,94,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg></div>
  <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:#16A34A;color:white;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:900;white-space:nowrap;">Giao hàng</div>\`,
  [38, 38], [19, 19]
);

// Đặt markers
const shipperMarker = L.marker([${shipperLat}, ${shipperLng}], { icon: shipperIcon }).addTo(map);
L.marker([${shopLat}, ${shopLng}], { icon: shopIcon }).addTo(map);
L.marker([${destLat}, ${destLng}], { icon: destIcon }).addTo(map);

// Fit bounds ban đầu
map.fitBounds(
  [[${shipperLat}, ${shipperLng}], [${shopLat}, ${shopLng}], [${destLat}, ${destLng}]],
  { padding: [50, 50], animate: false }
);

// ── Route layers ──────────────────────────────────────────────────────────
let routeLayer1 = null;
let routeLayer2 = null;
let fullRoute1  = [];
let fullRoute2  = [];
let arrivedShop = false;
let lastIdx1    = 0;
let lastIdx2    = 0;

// Fetch routes từ OSRM (miễn phí, không cần key)
async function fetchRoute(fromLng, fromLat, toLng, toLat) {
  try {
    const r = await fetch(
      'https://router.project-osrm.org/route/v1/driving/'
      + fromLng + ',' + fromLat + ';'
      + toLng   + ',' + toLat
      + '?overview=full&geometries=geojson'
    );
    const d = await r.json();
    if (!d.routes || !d.routes.length) return [];
    return d.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
  } catch(e) {
    // Fallback đường thẳng
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      pts.push([
        fromLat + (toLat - fromLat) * i / 10,
        fromLng + (toLng - fromLng) * i / 10,
      ]);
    }
    return pts;
  }
}

(async function loadRoutes() {
  const [r1, r2] = await Promise.all([
    fetchRoute(${shipperLng}, ${shipperLat}, ${shopLng}, ${shopLat}),
    fetchRoute(${shopLng}, ${shopLat}, ${destLng}, ${destLat}),
  ]);
  if (r1.length > 1) {
    fullRoute1 = r1;
    routeLayer1 = L.polyline(fullRoute1, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
  }
  if (r2.length > 1) {
    fullRoute2 = r2;
    routeLayer2 = L.polyline(fullRoute2, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(map);
  }
})();

// ── Trim route (cắt phần đã đi) ──────────────────────────────────────────
function findForward(route, lat, lng, from) {
  var minD = Infinity, minI = from;
  for (var i = from; i < route.length; i++) {
    var d = Math.pow(route[i][0] - lat, 2) + Math.pow(route[i][1] - lng, 2);
    if (d < minD) { minD = d; minI = i; }
  }
  return minI;
}

function trimRoute(sLat, sLng) {
  var NEAR = 0.004;
  if (!arrivedShop) {
    if (fullRoute1.length > 1) {
      var idx = findForward(fullRoute1, sLat, sLng, lastIdx1);
      lastIdx1 = idx;
      var rem = fullRoute1.slice(idx);
      if (routeLayer1) { map.removeLayer(routeLayer1); routeLayer1 = null; }
      var dShop = Math.sqrt(Math.pow(sLat - ${shopLat}, 2) + Math.pow(sLng - ${shopLng}, 2));
      if (dShop < NEAR || rem.length < 2) {
        arrivedShop = true;
      } else {
        routeLayer1 = L.polyline(rem, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
      }
    }
  } else {
    if (fullRoute2.length > 1) {
      var idx2 = findForward(fullRoute2, sLat, sLng, lastIdx2);
      lastIdx2 = idx2;
      var rem2 = fullRoute2.slice(idx2);
      if (routeLayer2) { map.removeLayer(routeLayer2); routeLayer2 = null; }
      if (rem2.length >= 2) {
        routeLayer2 = L.polyline(rem2, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(map);
      }
    }
  }
}

// ── Nhận message từ React Native ─────────────────────────────────────────
// React Native gửi: { type: 'UPDATE_POS', lat, lng, arrivedShop }
//                   { type: 'RESET_ROUTES' }
document.addEventListener('message', handleMessage);
window.addEventListener('message', handleMessage);

function handleMessage(event) {
  try {
    var msg = JSON.parse(event.data);

    if (msg.type === 'UPDATE_POS') {
      var lat = msg.lat;
      var lng = msg.lng;

      // Cập nhật marker shipper
      shipperMarker.setLatLng([lat, lng]);
      map.panTo([lat, lng], { animate: true, duration: 0.8 });

      // Sync arrivedShop từ React Native
      if (msg.arrivedShop !== undefined) {
        arrivedShop = msg.arrivedShop;
      }

      // Trim route
      if (fullRoute1.length > 0 || fullRoute2.length > 0) {
        trimRoute(lat, lng);
      }
    }

    if (msg.type === 'RESET_ROUTES') {
      if (routeLayer1) { map.removeLayer(routeLayer1); routeLayer1 = null; }
      if (routeLayer2) { map.removeLayer(routeLayer2); routeLayer2 = null; }
      fullRoute1  = [];
      fullRoute2  = [];
      arrivedShop = false;
      lastIdx1    = 0;
      lastIdx2    = 0;
    }
  } catch(e) {}
}
</script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapViewNativeComponent({
  shipperLat, shipperLng,
  shopLat, shopLng,
  destLat, destLng,
  arrivedShop = false,
}: MapViewNativeProps) {
  const webViewRef  = useRef<WebView>(null);
  const initialHTML = useRef(
    buildMapHTML(shipperLat, shipperLng, shopLat, shopLng, destLat, destLng)
  );

  // Khi vị trí shipper thay đổi → postMessage vào WebView
  useEffect(() => {
    const msg = JSON.stringify({
      type: 'UPDATE_POS',
      lat: shipperLat,
      lng: shipperLng,
      arrivedShop,
    });
    webViewRef.current?.injectJavaScript(`
      (function() {
        var e = new MessageEvent('message', { data: ${JSON.stringify(msg)} });
        document.dispatchEvent(e);
      })();
      true;
    `);
  }, [shipperLat, shipperLng, arrivedShop]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: initialHTML.current }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        // Cho phép WebView load tile từ OpenStreetMap
        mixedContentMode="always"
        // Tắt bounce scroll trên iOS để map không bị giật
        bounces={false}
        scrollEnabled={false}
        // Hiển thị loading khi map đang load
        startInLoadingState
        // Quan trọng: cho phép load CDN bên ngoài
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e2e8f0' },
  webview:   { flex: 1, backgroundColor: 'transparent' },
});
// MapViewWeb.tsx — Leaflet thuần, chỉ chạy trên web (giữ nguyên 100%)
import { useEffect, useRef, useCallback } from 'react';

interface MapViewWebProps {
  shipperLat: number;
  shipperLng: number;
  shopLat: number;
  shopLng: number;
  destLat: number;
  destLng: number;
  arrivedShop?: boolean;
}

export default function MapViewWeb({
  shipperLat, shipperLng,
  shopLat, shopLng,
  destLat, destLng,
  arrivedShop = false,
}: MapViewWebProps) {
  const mapRef           = useRef<HTMLDivElement>(null);
  const leafletMapRef    = useRef<any>(null);
  const shipperMarkerRef = useRef<any>(null);
  const routeLayer1Ref   = useRef<any>(null);
  const routeLayer2Ref   = useRef<any>(null);
  const mapInitRef       = useRef(false);
  const fullRoute1Ref    = useRef<[number, number][]>([]);
  const fullRoute2Ref    = useRef<[number, number][]>([]);
  const arrivedShopRef   = useRef(arrivedShop);
  const lastIdx1Ref      = useRef(0);
  const lastIdx2Ref      = useRef(0);
  const routeFetchingRef = useRef(false);

  useEffect(() => { arrivedShopRef.current = arrivedShop; }, [arrivedShop]);

  // Leaflet CSS
  useEffect(() => {
    if (document.querySelector('link[href*="leaflet.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  const findForward = (route: [number, number][], lat: number, lng: number, from: number): number => {
    let minD = Infinity, minI = from;
    for (let i = from; i < route.length; i++) {
      const d = (route[i][0] - lat) ** 2 + (route[i][1] - lng) ** 2;
      if (d < minD) { minD = d; minI = i; }
    }
    return minI;
  };

  const trimRoute = useCallback((sLat: number, sLng: number) => {
    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;
      const NEAR = 0.004;
      if (!arrivedShopRef.current) {
        const r1 = fullRoute1Ref.current;
        if (r1.length > 1) {
          const idx = findForward(r1, sLat, sLng, lastIdx1Ref.current);
          lastIdx1Ref.current = idx;
          const rem = r1.slice(idx);
          if (routeLayer1Ref.current) { try { map.removeLayer(routeLayer1Ref.current); } catch {} routeLayer1Ref.current = null; }
          const dShop = Math.sqrt((sLat - shopLat) ** 2 + (sLng - shopLng) ** 2);
          if (dShop < NEAR || rem.length < 2) {
            arrivedShopRef.current = true;
          } else {
            routeLayer1Ref.current = L.polyline(rem, { color: '#F97316', weight: 5, opacity: 0.85 }).addTo(map);
          }
        }
      } else {
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

  const drawRoutes = async (L: any, map: any, sLat: number, sLng: number) => {
    if (fullRoute1Ref.current.length > 0 || fullRoute2Ref.current.length > 0) { trimRoute(sLat, sLng); return; }
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
    } catch {} finally { routeFetchingRef.current = false; }
  };

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInitRef.current) return;
    mapInitRef.current = true;
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current!, { center: [shipperLat, shipperLng], zoom: 14 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

      const shipperIcon = L.divIcon({
        html: `<div style="width:44px;height:44px;background:#3B82F6;border:3px solid white;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(59,130,246,0.5);"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="m16 8 4 0 3 3 0 5-3 0"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div><div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);background:#1D4ED8;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:900;white-space:nowrap;">Bạn</div>`,
        className: '', iconSize: [44, 44], iconAnchor: [22, 22],
      });
      shipperMarkerRef.current = L.marker([shipperLat, shipperLng], { icon: shipperIcon }).addTo(map);

      const shopIcon = L.divIcon({
        html: `<div style="width:38px;height:38px;background:#F97316;border:3px solid white;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,0.5);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:#EA580C;color:white;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:900;white-space:nowrap;">Lấy hàng</div>`,
        className: '', iconSize: [38, 38], iconAnchor: [19, 19],
      });
      L.marker([shopLat, shopLng], { icon: shopIcon }).addTo(map);

      const destIcon = L.divIcon({
        html: `<div style="width:38px;height:38px;background:#22C55E;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(34,197,94,0.5);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:#16A34A;color:white;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:900;white-space:nowrap;">Giao hàng</div>`,
        className: '', iconSize: [38, 38], iconAnchor: [19, 19],
      });
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map);

      leafletMapRef.current = map;
      map.fitBounds(
        L.latLngBounds([[shipperLat, shipperLng], [shopLat, shopLng], [destLat, destLng]]),
        { padding: [60, 60], animate: true }
      );
      drawRoutes(L, map, shipperLat, shipperLng);
    });
  }, []);

  useEffect(() => { const t = setTimeout(initMap, 300); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!leafletMapRef.current || !shipperMarkerRef.current) return;
    shipperMarkerRef.current.setLatLng([shipperLat, shipperLng]);
    leafletMapRef.current.panTo([shipperLat, shipperLng], { animate: true, duration: 0.8 });
    if (fullRoute1Ref.current.length > 0 || fullRoute2Ref.current.length > 0) trimRoute(shipperLat, shipperLng);
  }, [shipperLat, shipperLng, trimRoute]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
      mapInitRef.current = false;
      fullRoute1Ref.current = []; fullRoute2Ref.current = [];
      arrivedShopRef.current = false; lastIdx1Ref.current = 0; lastIdx2Ref.current = 0;
      routeFetchingRef.current = false;
    };
  }, []);

  return <div ref={mapRef as any} style={{ width: '100%', height: '100%' }} />;
}
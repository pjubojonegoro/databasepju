import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useAppStore } from '../../store/useAppStore';
import { fetchLampuDataGeoJSON, fetchPanelDataGeoJSON } from '../../services/supabase';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

const MapboxViewer: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    setSelectedPoint, flyToState,
    basemapStyle, showBatasDesa, activeDataset, asetKategori,
    setDisplayedCount
  } = useAppStore();

  // Keep a ref so applyFilters can always reach the latest state
  const filterStateRef = useRef({ activeDataset, asetKategori, setDisplayedCount });

  const mapDataRef = useRef<{ combinedFeatures: any[], ruasJalanData: any } | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: basemapStyle,
      center: [111.88, -7.15], // Bojonegoro roughly
      zoom: 10,
      touchZoomRotate: false,
    });

    const addSourcesAndLayers = () => {
      const m = map.current;
      const data = mapDataRef.current;
      if (!m || !data) return;

      try {
        // 1. BATAS DESA — Vector Tiles (Paling Bawah)
        const TILESET_ID = 'dhamarar.7ub66eyv';
        const LAYER_NAME = 'batasdesabojonegoro_filtered-896hj9';
        const PALETTE = [
          '#f87171', '#fb923c', '#fbbf24', '#a3e635',
          '#4ade80', '#34d399', '#2dd4bf', '#38bdf8',
          '#818cf8', '#a78bfa', '#e879f9', '#f472b6'
        ];

        // Deterministic hash: same desa name → always same colour
        const getDesaColor = (name: string): string => {
          let h = 0;
          for (let i = 0; i < name.length; i++) {
            h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
          }
          return PALETTE[Math.abs(h) % PALETTE.length];
        };

        // Apply colours to all currently visible desa features
        const colorizeDesaFeatures = () => {
          if (!m.getSource('batas-desa')) return;
          const features = m.querySourceFeatures('batas-desa', { sourceLayer: LAYER_NAME });
          features.forEach(f => {
            const id = f.id as string | number;
            if (id === undefined || id === null) return;
            m.setFeatureState(
              { source: 'batas-desa', sourceLayer: LAYER_NAME, id },
              { fillColor: getDesaColor(String(id)) }
            );
          });
        };

        if (!m.getSource('batas-desa')) {
          m.addSource('batas-desa', {
            type: 'vector',
            url: `mapbox://${TILESET_ID}`,
            // promoteId makes NAMAOBJ the stable feature ID across zoom levels
            promoteId: { [LAYER_NAME]: 'NAMAOBJ' }
          });

          // Colorize when source data arrives and whenever the viewport changes
          m.on('sourcedata', (e: mapboxgl.MapSourceDataEvent) => {
            if (e.sourceId === 'batas-desa' && m.isSourceLoaded('batas-desa')) {
              colorizeDesaFeatures();
            }
          });
          m.on('moveend', colorizeDesaFeatures);
        }

        if (!m.getLayer('batas-desa-layer')) {
          m.addLayer({
            id: 'batas-desa-layer',
            type: 'fill',
            source: 'batas-desa',
            'source-layer': LAYER_NAME,
            layout: { visibility: showBatasDesa ? 'visible' : 'none' },
            paint: {
              // Colour comes from feature-state set by getDesaColor — stable across zoom
              'fill-color': ['coalesce', ['feature-state', 'fillColor'], '#818cf8'],
              'fill-opacity': 0.3,
              'fill-outline-color': '#ffffff'
            }
          });
        }

        if (!m.getLayer('batas-desa-outline')) {
          m.addLayer({
            id: 'batas-desa-outline',
            type: 'line',
            source: 'batas-desa',
            'source-layer': LAYER_NAME,
            layout: { visibility: showBatasDesa ? 'visible' : 'none' },
            paint: {
              'line-color': '#ffffff',
              'line-width': 2,
              'line-opacity': 0.8
            }
          });
        }

        if (!m.getLayer('batas-desa-label')) {
          m.addLayer({
            id: 'batas-desa-label',
            type: 'symbol',
            source: 'batas-desa',
            'source-layer': LAYER_NAME,
            layout: {
              visibility: showBatasDesa ? 'visible' : 'none',
              'text-field': ['get', 'NAMOBJ'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 14],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-ignore-placement': false,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0, 0, 0, 0.7)',
              'text-halo-width': 2
            }
          });
        }

        // 2. RUAS JALAN (Tengah)
        if (data.ruasJalanData) {
          if (!m.getSource('ruas-jalan')) {
            m.addSource('ruas-jalan', { type: 'geojson', data: data.ruasJalanData });
          }
          if (!m.getLayer('ruas-jalan-layer')) {
            m.addLayer({
              id: 'ruas-jalan-layer',
              type: 'line',
              source: 'ruas-jalan',
              layout: { visibility: 'visible' },
              paint: {
                'line-color': '#000000',
                'line-width': 3,
                'line-opacity': 0.5
              }
            });
          }
        }

        // 3. TITIK LAMPU/PANEL (Paling Atas)
        if (!m.getSource('all-points')) {
          m.addSource('all-points', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: data.combinedFeatures }
          });
        }

        if (!m.getLayer('points-layer')) {
          m.addLayer({
            id: 'points-layer',
            type: 'circle',
            source: 'all-points',
            paint: {
              'circle-color': [
                'match',
                ['get', '_sourceTable'],
                'lampu', '#f39d12',
                'panel', '#3498db',
                '#ffffff'
              ],
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                4, 3, 10, 3, 15, 4, 20, 6
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 1
            },
          });

          m.on('mouseenter', 'points-layer', () => { m.getCanvas().style.cursor = 'pointer'; });
          m.on('mouseleave', 'points-layer', () => { m.getCanvas().style.cursor = ''; });
          m.on('click', 'points-layer', (e) => {
            if (!e.features || e.features.length === 0) return;
            setSelectedPoint(e.features[0].properties as any);
          });
        }

        applyFilters();
      } catch (err) {
        console.error("Failed to add sources and layers to map:", err);
      }
    };

    map.current.on('style.load', () => {
      // Re-add sources and layers when style changes
      if (mapDataRef.current) addSourcesAndLayers();
    });

    const loadInitialData = async () => {
      try {
        const [lampuData, panelData] = await Promise.all([
          fetchLampuDataGeoJSON(),
          fetchPanelDataGeoJSON()
        ]);
        const combinedFeatures = [...lampuData.features, ...panelData.features];
        setDisplayedCount(combinedFeatures.length);

        // Batas desa kini dari vector tiles — tidak perlu fetch file JS

        let ruasJalanData = null;
        try {
          // Import conditionally to avoid initial load block if top-level
          const { kml } = await import('@tmcw/togeojson');
          const res = await fetch('/ruasjalan.kml');
          if (res.ok) {
            const text = await res.text();
            const dom = new DOMParser().parseFromString(text, 'text/xml');
            ruasJalanData = kml(dom);
          }
        } catch (e) {
          console.error("Failed to load ruasjalan.kml", e);
        }

        mapDataRef.current = { combinedFeatures, ruasJalanData };
        useAppStore.getState().setGlobalSearchData({
          points: combinedFeatures,
          batasDesa: [], // served via vector tiles — no local features needed
          ruasJalan: ruasJalanData?.features || []
        });
        addSourcesAndLayers();
        setIsLoading(false);
      } catch (err: any) {
        console.error('Map loading error:', err);
        setError(err.message || 'Failed to load map data');
        setIsLoading(false);
      }
    };

    map.current.on('load', loadInitialData);

    return () => {
      if (map.current) map.current.remove();
      map.current = null;
    };
  }, []); // Mount only once

  const applyFilters = () => {
    if (!map.current || !map.current.getLayer('points-layer')) return;

    const { activeDataset: ds, asetKategori: kat, setDisplayedCount: setCount } = filterStateRef.current;

    const filterList: any[] = ['all'];

    if (ds === 'Lampu') {
      filterList.push(['==', ['get', '_sourceTable'], 'lampu']);
    } else if (ds === 'Panel') {
      filterList.push(['==', ['get', '_sourceTable'], 'panel']);
    }

    if (kat !== 'Semua') {
      filterList.push(['==', ['get', 'kategori'], kat]);
    }

    // Safe application of mapbox filter. If it's just ['all'], we set null.
    map.current.setFilter('points-layer', filterList.length > 1 ? filterList : null);

    // Update displayed count to match visible features
    if (mapDataRef.current) {
      const visible = mapDataRef.current.combinedFeatures.filter((f: any) => {
        const src = f.properties?._sourceTable;
        const kgr = f.properties?.kategori;
        if (ds === 'Lampu' && src !== 'lampu') return false;
        if (ds === 'Panel' && src !== 'panel') return false;
        if (kat !== 'Semua' && kgr !== kat) return false;
        return true;
      });
      setCount(visible.length);
    }
  };

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setStyle(basemapStyle);
    }
  }, [basemapStyle]);

  // Keep the ref in sync so applyFilters always uses fresh values
  useEffect(() => {
    filterStateRef.current = { activeDataset, asetKategori, setDisplayedCount };
    applyFilters();
  }, [activeDataset, asetKategori]);

  useEffect(() => {
    if (map.current) {
      if (map.current.getLayer('batas-desa-layer')) {
        map.current.setLayoutProperty('batas-desa-layer', 'visibility', showBatasDesa ? 'visible' : 'none');
      }
      if (map.current.getLayer('batas-desa-outline')) {
        map.current.setLayoutProperty('batas-desa-outline', 'visibility', showBatasDesa ? 'visible' : 'none');
      }
      if (map.current.getLayer('batas-desa-label')) {
        map.current.setLayoutProperty('batas-desa-label', 'visibility', showBatasDesa ? 'visible' : 'none');
      }
    }
  }, [showBatasDesa]);

  useEffect(() => {
    if (map.current && flyToState) {
      map.current.flyTo({ center: [flyToState.lng, flyToState.lat], zoom: 16 });
    }
  }, [flyToState]);

  return (
    <div className="w-full h-full relative z-0">
      <div ref={mapContainer} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-xl border border-red-400 shadow-lg z-50 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default MapboxViewer;

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useAppStore } from '../../store/useAppStore';
import { fetchLampuDataGeoJSON, fetchPanelDataGeoJSON, supabase } from '../../services/supabase';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

const MapboxViewer: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    setSelectedPoint, flyToState,
    basemapStyle, showBatasDesa, activeDataset, asetKategori, tahunPasang,
    setDisplayedCount, selectedPoint, isEditMode
  } = useAppStore();

  // Keep a ref so applyFilters can always reach the latest state
  const filterStateRef = useRef({ activeDataset, asetKategori, tahunPasang, setDisplayedCount });

  const mapDataRef = useRef<{ combinedFeatures: any[], ruasJalanData: any } | null>(null);

  const draggableMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectedPointRef = useRef(selectedPoint);

  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  useEffect(() => {
    if (!map.current) return;
    
    if (!isEditMode || !selectedPoint) {
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.remove();
        draggableMarkerRef.current = null;
      }
      return;
    }

    if (!draggableMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 bg-amber-500/90 rounded-full border-4 border-white shadow-xl cursor-grab hover:scale-110 transition-transform flex items-center justify-center';
      el.innerHTML = '<div class="w-1.5 h-1.5 bg-white rounded-full"></div>';
      
      draggableMarkerRef.current = new mapboxgl.Marker({ 
        element: el,
        draggable: true 
      });

      draggableMarkerRef.current.on('dragstart', () => {
        el.classList.add('cursor-grabbing');
        el.classList.remove('cursor-grab');
      });

      draggableMarkerRef.current.on('dragend', async () => {
        el.classList.remove('cursor-grabbing');
        el.classList.add('cursor-grab');
        
        const sp = selectedPointRef.current;
        if (!sp) return;
        const lngLat = draggableMarkerRef.current?.getLngLat();
        if (lngLat) {
           const confirmSave = window.confirm(`Apakah Anda yakin ingin menyimpan posisi baru ini?`);
           if (confirmSave) {
              try {
                 const table = sp._sourceTable as 'lampu' | 'panel';
                 const { error } = await supabase
                    .from(table)
                    .update({ longitude: lngLat.lng, latitude: lngLat.lat })
                    .eq('id', sp.id);
                 
                 if (error) throw error;
                 
                 if (mapDataRef.current) {
                    const features = mapDataRef.current.combinedFeatures;
                    const idx = features.findIndex((f: any) => f.properties.id === sp.id && f.properties._sourceTable === sp._sourceTable);
                    if (idx !== -1) {
                       features[idx].geometry.coordinates = [lngLat.lng, lngLat.lat];
                       features[idx].properties.longitude = lngLat.lng;
                       features[idx].properties.latitude = lngLat.lat;
                       
                       const source = map.current?.getSource('all-points') as mapboxgl.GeoJSONSource;
                       if (source) {
                          source.setData({ type: 'FeatureCollection', features });
                       }
                    }
                 }
                 
                 setSelectedPoint({ ...sp, longitude: lngLat.lng, latitude: lngLat.lat });
              } catch (err: any) {
                 console.error(err);
                 alert('Error saving position: ' + err.message);
                 draggableMarkerRef.current?.setLngLat([sp.longitude, sp.latitude]);
              }
           } else {
              draggableMarkerRef.current?.setLngLat([sp.longitude, sp.latitude]);
           }
        }
      });
    }

    draggableMarkerRef.current
      .setLngLat([selectedPoint.longitude, selectedPoint.latitude])
      .addTo(map.current);

  }, [selectedPoint, isEditMode]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: basemapStyle,
      center: [111.88, -7.15], // Bojonegoro roughly
      zoom: 10,
      touchZoomRotate: true,
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
          '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
          '#f58231', '#42d4f4', '#f032e6', '#fabed4',
          '#469990', '#dcbeff', '#9A6324', '#fffac8',
          '#800000', '#aaffc3', '#808000', '#ffd8b1',
          '#000075', '#a9a9a9', '#e6beff', '#1abc9c',
          '#ff6b6b', '#48dbfb', '#ffeaa7', '#6c5ce7',
        ];

        // Deterministic hash: same desa name → always same colour
        const getDesaColor = (name: string): string => {
          let h = 0;
          for (let i = 0; i < name.length; i++) {
            h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
          }
          return PALETTE[Math.abs(h) % PALETTE.length];
        };

        // Dynamically build a match expression from loaded vector features
        const knownDesaNames = new Set<string>();
        const applyDesaColors = () => {
          if (!m.getLayer('batas-desa-layer')) return;
          const features = m.querySourceFeatures('batas-desa', { sourceLayer: LAYER_NAME });
          let hasNew = false;
          features.forEach(f => {
            const name = f.properties?.NAMOBJ || f.properties?.NAMAOBJ;
            if (name && !knownDesaNames.has(name)) {
              knownDesaNames.add(name);
              hasNew = true;
            }
          });
          if (!hasNew && knownDesaNames.size > 0) return;

          if (knownDesaNames.size > 0) {
            const matchExpr: any[] = ['match', ['coalesce', ['get', 'NAMOBJ'], ['get', 'NAMAOBJ']]];
            knownDesaNames.forEach(name => {
              matchExpr.push(name, getDesaColor(name));
            });
            matchExpr.push('#818cf8'); // fallback
            m.setPaintProperty('batas-desa-layer', 'fill-color', matchExpr as mapboxgl.ExpressionSpecification);
          }
        };

        if (!m.getSource('batas-desa')) {
          m.addSource('batas-desa', {
            type: 'vector',
            url: `mapbox://${TILESET_ID}`,
          });

          m.on('sourcedata', (e: mapboxgl.MapSourceDataEvent) => {
            if (e.sourceId === 'batas-desa' && m.isSourceLoaded('batas-desa')) {
              applyDesaColors();
            }
          });
          m.on('moveend', applyDesaColors);
          m.on('idle', applyDesaColors);
        }

        if (!m.getLayer('batas-desa-layer')) {
          m.addLayer({
            id: 'batas-desa-layer',
            type: 'fill',
            source: 'batas-desa',
            'source-layer': LAYER_NAME,
            layout: { visibility: showBatasDesa ? 'visible' : 'none' },
            paint: {
              'fill-color': '#818cf8',
              'fill-opacity': 0.2,
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
              'line-color': '#000000',
              'line-width': 1,
              'line-opacity': 0.5
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
              'text-size': ['interpolate', ['linear'], ['zoom'], 9, 7, 14, 10],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'symbol-avoid-edges': true,
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
            e.originalEvent.stopPropagation();
            setSelectedPoint(e.features[0].properties as any);
          });

          // Klik di area kosong peta → tutup popup
          m.on('click', (e) => {
            const features = m.queryRenderedFeatures(e.point, { layers: ['points-layer'] });
            if (!features || features.length === 0) {
              setSelectedPoint(null);
            }
          });
        }

        // 4. LABEL TITIK — muncul hanya saat zoom sangat dekat
        if (!m.getLayer('points-label')) {
          m.addLayer({
            id: 'points-label',
            type: 'symbol',
            source: 'all-points',
            minzoom: 15,
            layout: {
              'text-field': [
                'case',
                ['==', ['get', '_sourceTable'], 'lampu'],
                ['coalesce', ['get', 'kode'], ''],
                ['==', ['get', '_sourceTable'], 'panel'],
                ['coalesce', ['get', 'nama_pelanggan'], ''],
                ''
              ],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 18, 13],
              'text-anchor': 'top',
              'text-offset': [0, 0.8],
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'text-max-width': 12,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': [
                'match',
                ['get', '_sourceTable'],
                'lampu', '#f39d12',
                'panel', '#3498db',
                '#000000'
              ],
              'text-halo-width': 1.5,
              'text-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.5, 1],
            }
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

    const { activeDataset: ds, asetKategori: kat, tahunPasang: th, setDisplayedCount: setCount } = filterStateRef.current;

    const filterList: any[] = ['all'];

    if (ds === 'Lampu') {
      filterList.push(['==', ['get', '_sourceTable'], 'lampu']);
    } else if (ds === 'Panel') {
      filterList.push(['==', ['get', '_sourceTable'], 'panel']);
    }

    if (kat !== 'Semua') {
      filterList.push(['==', ['get', 'kategori'], kat]);
    }

    if (th !== 'Semua') {
      filterList.push([
        'any',
        ['==', ['get', 'thpasang'], th],
        ['==', ['get', 'thpasang'], Number(th)]
      ]);
    }

    // Safe application of mapbox filter. If it's just ['all'], we set null.
    const resolvedFilter = filterList.length > 1 ? filterList : null;
    map.current.setFilter('points-layer', resolvedFilter);
    if (map.current.getLayer('points-label')) {
      map.current.setFilter('points-label', resolvedFilter);
    }

    // Update displayed count to match visible features
    if (mapDataRef.current) {
      const visible = mapDataRef.current.combinedFeatures.filter((f: any) => {
        const src = f.properties?._sourceTable;
        const kgr = f.properties?.kategori;
        if (ds === 'Lampu' && src !== 'lampu') return false;
        if (ds === 'Panel' && src !== 'panel') return false;
        if (kat !== 'Semua' && kgr !== kat) return false;
        if (th !== 'Semua' && String(f.properties?.thpasang) !== th) return false;
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
    filterStateRef.current = { activeDataset, asetKategori, tahunPasang, setDisplayedCount };
    applyFilters();
  }, [activeDataset, asetKategori, tahunPasang]);

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

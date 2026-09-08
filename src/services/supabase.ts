import { createClient } from '@supabase/supabase-js';
import type { PjuPoint, PanelPoint, GeoJSONFeatureCollection } from '../types';
import { getCachedGeoJSON, setCachedGeoJSON, clearGeoJSONCache } from './dbCache';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables: Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

// In-memory cache for instant session access
let memoryCachedLampuGeoJSON: GeoJSONFeatureCollection | null = null;
let memoryCachedPanelGeoJSON: GeoJSONFeatureCollection | null = null;

export async function clearAllLocalCache() {
  memoryCachedLampuGeoJSON = null;
  memoryCachedPanelGeoJSON = null;
  await clearGeoJSONCache();
}

/**
 * Fetches data from public.lampu_satudata and transforms it into a GeoJSON FeatureCollection.
 * Menggunakan persistent caching di IndexedDB:
 * - Cek IndexedDB terlebih dahulu.
 * - Bandingkan jumlah baris (count) & max(id) di database dengan metadata cache.
 * - Hanya mengunduh ulang 33k titik jika data di database benar-benar berubah atau forceRefresh=true.
 */
export async function fetchLampuDataGeoJSON(forceRefresh = false): Promise<GeoJSONFeatureCollection> {
  if (!forceRefresh && memoryCachedLampuGeoJSON) {
    return memoryCachedLampuGeoJSON;
  }

  // 1. Cek cache lokal di IndexedDB
  const cached = await getCachedGeoJSON<GeoJSONFeatureCollection>('lampu_satudata');

  if (!forceRefresh && cached) {
    try {
      // Verifikasi sangat cepat via HTTP HEAD (count) & 1 row max(id)
      const [countRes, maxIdRes] = await Promise.all([
        supabase.from('lampu_satudata').select('*', { count: 'exact', head: true }),
        supabase.from('lampu_satudata').select('id').order('id', { ascending: false }).limit(1)
      ]);

      const currentCount = countRes.count ?? 0;
      const currentMaxId = maxIdRes.data?.[0]?.id ?? 0;

      // Jika data di database tidak berubah, gunakan cache lokal (0 bytes download!)
      if (cached.meta.count === currentCount && cached.meta.maxId === currentMaxId) {
        console.log(`[Cache Hit] Data lampu_satudata tetap sama (${currentCount} titik). Menggunakan cache IndexedDB.`);
        memoryCachedLampuGeoJSON = cached.data;
        return cached.data;
      }

      console.log(`[Cache Refresh] Perubahan terdeteksi pada lampu_satudata (DB: ${currentCount}, Cache: ${cached.meta.count}). Memperbarui cache...`);
    } catch (err) {
      console.warn('Gagal memverifikasi perubahan DB lampu_satudata, menggunakan cache lokal:', err);
      memoryCachedLampuGeoJSON = cached.data;
      return cached.data;
    }
  }

  // 2. Unduh dataset lengkap dari lampu_satudata
  const [countRes, maxIdRes, dataRes] = await Promise.all([
    supabase.from('lampu_satudata').select('*', { count: 'exact', head: true }),
    supabase.from('lampu_satudata').select('id').order('id', { ascending: false }).limit(1),
    supabase
      .from('lampu_satudata')
      .select('id, latitude, longitude, kode, kategori, jenis_lampu, tiang, thpasang, desakel, kecamatan, foto, panel, ruas, kondisi_lampu, kondisi_tiang, daya, status_jalan')
      .limit(50000)
  ]);

  if (dataRes.error) {
    console.error('Error fetching lampu_satudata data:', dataRes.error);
    if (cached) {
      console.warn('Menggunakan data cache karena request database gagal.');
      memoryCachedLampuGeoJSON = cached.data;
      return cached.data;
    }
    throw dataRes.error;
  }

  const features = (dataRes.data as PjuPoint[]).filter(p => p.longitude && p.latitude).map((point) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [Number(point.longitude), Number(point.latitude)] as [number, number],
    },
    properties: { ...point, _sourceTable: 'lampu' as const },
  }));

  const result: GeoJSONFeatureCollection = { type: 'FeatureCollection', features };
  memoryCachedLampuGeoJSON = result;

  // Simpan ke IndexedDB
  const count = countRes.count ?? dataRes.data.length;
  const maxId = maxIdRes.data?.[0]?.id ?? 0;
  await setCachedGeoJSON('lampu_satudata', result, { count, maxId });

  return result;
}

/**
 * Fetches data from public.panel and transforms it into a GeoJSON FeatureCollection
 */
export async function fetchPanelDataGeoJSON(forceRefresh = false): Promise<GeoJSONFeatureCollection> {
  if (!forceRefresh && memoryCachedPanelGeoJSON) {
    return memoryCachedPanelGeoJSON;
  }

  const cached = await getCachedGeoJSON<GeoJSONFeatureCollection>('panel');

  if (!forceRefresh && cached) {
    try {
      const [countRes, maxIdRes] = await Promise.all([
        supabase.from('panel').select('*', { count: 'exact', head: true }),
        supabase.from('panel').select('id').order('id', { ascending: false }).limit(1)
      ]);

      const currentCount = countRes.count ?? 0;
      const currentMaxId = maxIdRes.data?.[0]?.id ?? 0;

      if (cached.meta.count === currentCount && cached.meta.maxId === currentMaxId) {
        console.log(`[Cache Hit] Data panel tetap sama (${currentCount} titik). Menggunakan cache IndexedDB.`);
        memoryCachedPanelGeoJSON = cached.data;
        return cached.data;
      }
    } catch (err) {
      console.warn('Gagal memverifikasi perubahan DB panel, menggunakan cache lokal:', err);
      memoryCachedPanelGeoJSON = cached.data;
      return cached.data;
    }
  }

  const [countRes, maxIdRes, dataRes] = await Promise.all([
    supabase.from('panel').select('*', { count: 'exact', head: true }),
    supabase.from('panel').select('id').order('id', { ascending: false }).limit(1),
    supabase
      .from('panel')
      .select('id, latitude, longitude, nama_pelanggan, id_pelanggan, kategori, no_meter, daya, jml_lampu, total_daya, alamat, thpasang, desakel, kecamatan, foto')
      .limit(50000)
  ]);

  if (dataRes.error) {
    console.error('Error fetching Panel data:', dataRes.error);
    if (cached) {
      memoryCachedPanelGeoJSON = cached.data;
      return cached.data;
    }
    throw dataRes.error;
  }

  const features = (dataRes.data as PanelPoint[]).filter(p => p.longitude && p.latitude).map((point) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [Number(point.longitude), Number(point.latitude)] as [number, number],
    },
    properties: { ...point, _sourceTable: 'panel' as const },
  }));

  const result: GeoJSONFeatureCollection = { type: 'FeatureCollection', features };
  memoryCachedPanelGeoJSON = result;

  const count = countRes.count ?? dataRes.data.length;
  const maxId = maxIdRes.data?.[0]?.id ?? 0;
  await setCachedGeoJSON('panel', result, { count, maxId });

  return result;
}

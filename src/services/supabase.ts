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

export type DataUpdateListener = (type: 'lampu' | 'panel', data: GeoJSONFeatureCollection) => void;
const updateListeners = new Set<DataUpdateListener>();

export function subscribeDataUpdate(listener: DataUpdateListener): () => void {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}

function notifyDataUpdated(type: 'lampu' | 'panel', data: GeoJSONFeatureCollection) {
  updateListeners.forEach((fn) => {
    try {
      fn(type, data);
    } catch (err) {
      console.error('Error in data update listener:', err);
    }
  });
}

let isRevalidatingLampu = false;
let isRevalidatingPanel = false;

/**
 * Background revalidation for lampu_satudata (Stale-While-Revalidate pattern).
 * Verifies with Supabase in background without blocking initial instant load.
 */
async function revalidateLampuInBackground(cachedMeta: { count: number; maxId: number }) {
  if (isRevalidatingLampu) return;
  isRevalidatingLampu = true;

  try {
    const [countRes, maxIdRes] = await Promise.all([
      supabase.from('lampu_satudata').select('*', { count: 'exact', head: true }),
      supabase.from('lampu_satudata').select('id').order('id', { ascending: false }).limit(1)
    ]);

    const currentCount = countRes.count ?? 0;
    const currentMaxId = maxIdRes.data?.[0]?.id ?? 0;

    if (cachedMeta.count === currentCount && cachedMeta.maxId === currentMaxId) {
      console.log(`[Cache Hit Background] Data lampu_satudata valid & up-to-date (${currentCount} titik).`);
      return;
    }

    console.log(`[Background Sync] Perubahan terdeteksi pada lampu_satudata (DB: ${currentCount}, Cache: ${cachedMeta.count}). Mengunduh pembaruan di latar belakang...`);

    const dataRes = await supabase
      .from('lampu_satudata')
      .select('id, latitude, longitude, kode, kategori, jenis_lampu, tiang, thpasang, desakel, kecamatan, foto, panel, ruas, kondisi_lampu, kondisi_tiang, daya, status_jalan')
      .limit(50000);

    if (dataRes.data && !dataRes.error) {
      const features = (dataRes.data as PjuPoint[]).filter(p => p.longitude && p.latitude).map((point) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(point.longitude), Number(point.latitude)] as [number, number],
        },
        properties: { ...point, _sourceTable: 'lampu' as const },
      }));

      const newGeoJSON: GeoJSONFeatureCollection = { type: 'FeatureCollection', features };
      memoryCachedLampuGeoJSON = newGeoJSON;
      await setCachedGeoJSON('lampu_satudata', newGeoJSON, { count: currentCount || dataRes.data.length, maxId: currentMaxId });
      notifyDataUpdated('lampu', newGeoJSON);
      console.log(`[Background Sync Complete] lampu_satudata diperbarui di peta (${features.length} titik).`);
    }
  } catch (err) {
    console.warn('[Background Sync Warning] Gagal memeriksa pembaruan lampu_satudata:', err);
  } finally {
    isRevalidatingLampu = false;
  }
}

/**
 * Background revalidation for panel (Stale-While-Revalidate pattern).
 */
async function revalidatePanelInBackground(cachedMeta: { count: number; maxId: number }) {
  if (isRevalidatingPanel) return;
  isRevalidatingPanel = true;

  try {
    const [countRes, maxIdRes] = await Promise.all([
      supabase.from('panel').select('*', { count: 'exact', head: true }),
      supabase.from('panel').select('id').order('id', { ascending: false }).limit(1)
    ]);

    const currentCount = countRes.count ?? 0;
    const currentMaxId = maxIdRes.data?.[0]?.id ?? 0;

    if (cachedMeta.count === currentCount && cachedMeta.maxId === currentMaxId) {
      console.log(`[Cache Hit Background] Data panel valid & up-to-date (${currentCount} titik).`);
      return;
    }

    console.log(`[Background Sync] Perubahan terdeteksi pada panel (DB: ${currentCount}, Cache: ${cachedMeta.count}). Mengunduh pembaruan di latar belakang...`);

    const dataRes = await supabase
      .from('panel')
      .select('id, latitude, longitude, nama_pelanggan, id_pelanggan, kategori, no_meter, daya, jml_lampu, total_daya, alamat, thpasang, desakel, kecamatan, foto')
      .limit(50000);

    if (dataRes.data && !dataRes.error) {
      const features = (dataRes.data as PanelPoint[]).filter(p => p.longitude && p.latitude).map((point) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(point.longitude), Number(point.latitude)] as [number, number],
        },
        properties: { ...point, _sourceTable: 'panel' as const },
      }));

      const newGeoJSON: GeoJSONFeatureCollection = { type: 'FeatureCollection', features };
      memoryCachedPanelGeoJSON = newGeoJSON;
      await setCachedGeoJSON('panel', newGeoJSON, { count: currentCount || dataRes.data.length, maxId: currentMaxId });
      notifyDataUpdated('panel', newGeoJSON);
      console.log(`[Background Sync Complete] panel diperbarui di peta (${features.length} titik).`);
    }
  } catch (err) {
    console.warn('[Background Sync Warning] Gagal memeriksa pembaruan panel:', err);
  } finally {
    isRevalidatingPanel = false;
  }
}

/**
 * Fetches data from public.lampu_satudata.
 * INSTANT LOAD: Jika ada cache lokal di IndexedDB, langsung dikembalikan dalam hitungan milidetik
 * tanpa menunggu network verification / blocking user.
 * Revalidasi ke Supabase berjalan di latar belakang (Stale-While-Revalidate).
 */
export async function fetchLampuDataGeoJSON(forceRefresh = false): Promise<GeoJSONFeatureCollection> {
  if (!forceRefresh && memoryCachedLampuGeoJSON) {
    return memoryCachedLampuGeoJSON;
  }

  // 1. Cek cache lokal di IndexedDB untuk LOAD INSTAN
  const cached = await getCachedGeoJSON<GeoJSONFeatureCollection>('lampu_satudata');

  if (!forceRefresh && cached && cached.data) {
    memoryCachedLampuGeoJSON = cached.data;
    console.log(`[Instant Load] Menggunakan cache lokal lampu_satudata (${cached.data.features?.length || cached.meta?.count || 0} titik).`);
    
    // Jadwalkan revalidasi background setelah render awal selesai (tidak memblokir UI)
    setTimeout(() => {
      revalidateLampuInBackground(cached.meta);
    }, 1200);

    return cached.data;
  }

  // 2. Jika tidak ada cache (pertama kali dibuka) atau forceRefresh = true:
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

  const count = countRes.count ?? dataRes.data.length;
  const maxId = maxIdRes.data?.[0]?.id ?? 0;
  await setCachedGeoJSON('lampu_satudata', result, { count, maxId });

  return result;
}

/**
 * Fetches data from public.panel.
 * INSTANT LOAD: Mengembalikan cache IndexedDB seketika tanpa blocking.
 */
export async function fetchPanelDataGeoJSON(forceRefresh = false): Promise<GeoJSONFeatureCollection> {
  if (!forceRefresh && memoryCachedPanelGeoJSON) {
    return memoryCachedPanelGeoJSON;
  }

  const cached = await getCachedGeoJSON<GeoJSONFeatureCollection>('panel');

  if (!forceRefresh && cached && cached.data) {
    memoryCachedPanelGeoJSON = cached.data;
    console.log(`[Instant Load] Menggunakan cache lokal panel (${cached.data.features?.length || cached.meta?.count || 0} titik).`);

    setTimeout(() => {
      revalidatePanelInBackground(cached.meta);
    }, 1500);

    return cached.data;
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

/**
 * Updates a point in local IndexedDB and in-memory cache immediately
 * when saved in edit mode.
 */
export async function updateCachedPoint(
  sourceTable: string | undefined,
  id: number | string,
  updates: { longitude: number; latitude: number; [key: string]: any }
) {
  const cacheKey = sourceTable === 'lampu' ? 'lampu_satudata' : 'panel';
  const mem = sourceTable === 'lampu' ? memoryCachedLampuGeoJSON : memoryCachedPanelGeoJSON;
  if (mem) {
    const feat = mem.features.find((f: any) => f.properties?.id === id);
    if (feat) {
      feat.geometry.coordinates = [updates.longitude, updates.latitude];
      Object.assign(feat.properties, updates);
    }
  }

  const cached = await getCachedGeoJSON<GeoJSONFeatureCollection>(cacheKey);
  if (cached && cached.data) {
    const feat = cached.data.features.find((f: any) => f.properties?.id === id);
    if (feat) {
      feat.geometry.coordinates = [updates.longitude, updates.latitude];
      Object.assign(feat.properties, updates);
      await setCachedGeoJSON(cacheKey, cached.data, cached.meta);
    }
  }
}

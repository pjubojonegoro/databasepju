import { createClient } from '@supabase/supabase-js';
import type { PjuPoint, PanelPoint, GeoJSONFeatureCollection } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Fetches data from public.lampu and transforms it into a GeoJSON FeatureCollection
 */
export async function fetchLampuDataGeoJSON(): Promise<GeoJSONFeatureCollection> {
  const { data, error } = await supabase
    .from('lampu')
    .select('*')
    .limit(50000);

  if (error) {
    console.error('Error fetching Lampu data:', error);
    throw error;
  }

  const features = (data as PjuPoint[]).filter(p => p.longitude && p.latitude).map((point) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [Number(point.longitude), Number(point.latitude)] as [number, number],
    },
    properties: { ...point, _sourceTable: 'lampu' as const },
  }));

  return { type: 'FeatureCollection', features };
}

/**
 * Fetches data from public.panel and transforms it into a GeoJSON FeatureCollection
 */
export async function fetchPanelDataGeoJSON(): Promise<GeoJSONFeatureCollection> {
  const { data, error } = await supabase
    .from('panel')
    .select('*')
    .limit(50000);

  if (error) {
    console.error('Error fetching Panel data:', error);
    throw error;
  }

  const features = (data as PanelPoint[]).filter(p => p.longitude && p.latitude).map((point) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [Number(point.longitude), Number(point.latitude)] as [number, number],
    },
    properties: { ...point, _sourceTable: 'panel' as const },
  }));

  return { type: 'FeatureCollection', features };
}

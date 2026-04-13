export interface PjuPoint {
  id: number;
  panel: string | null;
  kategori: string | null;
  kode: string | null;
  jenis_lampu: string | null;
  tiang: string | null;
  thpasang: number | null;
  desakel: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  latitude: number;
  longitude: number;
}

export interface PanelPoint {
  id: number;
  id_pelanggan: string | null;
  kategori: string | null;
  nama_pelanggan: string | null;
  no_meter: string | null;
  daya: string | null;
  jml_lampu: string | null;
  total_daya: string | null;
  alamat: string | null;
  thpasang: string | null;
  desakel: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  latitude: number;
  longitude: number;
  location?: any; // PostGIS geography
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: (PjuPoint | PanelPoint) & { _sourceTable: 'lampu' | 'panel' };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

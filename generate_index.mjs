import fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';

console.log('Reading KML file...');
const kmlStr = fs.readFileSync('./public/ruasjalan.kml', 'utf-8');

console.log('Parsing XML...');
const dom = new DOMParser().parseFromString(kmlStr, 'text/xml');

console.log('Converting to GeoJSON...');
const geojson = kml(dom);

console.log('Extracting index data...');
let ruasSearch = [];

if (geojson && geojson.features) {
  ruasSearch = geojson.features.map((r) => {
    const coords = r.geometry?.coordinates;
    let target = null;
    if (coords) {
      if (r.geometry.type === 'LineString') target = coords[0];
      else if (r.geometry.type === 'MultiLineString') target = coords[0][0];
      else if (r.geometry.type === 'Polygon') target = coords[0][0];
      else if (r.geometry.type === 'MultiPolygon') target = coords[0][0][0];
    }
    return {
      name: String(r.properties?.NAMAJALAN || ''),
      lng: target ? target[0] : 0,
      lat: target ? target[1] : 0
    };
  }).filter((r) => r.name);
}

fs.writeFileSync('./public/ruasjalan_index.json', JSON.stringify(ruasSearch));
console.log(`Saved index with ${ruasSearch.length} items to public/ruasjalan_index.json`);

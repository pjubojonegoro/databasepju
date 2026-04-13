# Project Requirements: PJU WebGIS Dashboard

## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project
Title: PJU WebGIS Dashboard
ID: 18047256398414133685

## Screens:
1. PJU WebGIS Admin Dashboard
   ID: a335453286c04301a05a71fc3bad6758

2. PJU Mobile Explorer
   ID: 1e79fe7f3b394a8e98edda97a00675dd

Use a utility like `curl -L` to download the hosted URLs.

---

## 1. Project Overview
Build a high-performance WebGIS application to visualize and manage 50,000 Street Light (Penerangan Jalan Umum / PJU) points. The application must run smoothly on both Desktop (Admin view) and Mobile (Explorer view) without performance bottlenecks.

## 2. Tech Stack
* **Frontend Framework:** React (Next.js or Vite)
* **Map Engine:** Mapbox GL JS
* **Backend / Database:** Supabase (PostgreSQL)
* **Styling:** TailwindCSS
* **UI Components:** `react-spring-bottom-sheet` (for Mobile), AG Grid / TanStack Table (for Desktop)

## 3. Core Constraints & Rendering Strategy
* **NO CLUSTERING:** All 50,000 points must be rendered simultaneously on the map.
* **NO HTML MARKERS:** Do NOT use standard DOM-based HTML Mapbox Markers (`new mapboxgl.Marker()`). This will crash the browser.
* **WEBGL RENDERING:** You MUST use Mapbox WebGL Layers (`addLayer` with type `circle` or `symbol`) and a GeoJSON source (`addSource`) to render the points efficiently.

## 4. Data Model (Supabase Schema)
The application relies on the `public.lampu` table in Supabase.
**Table Schema:**
* `id` (bigint) - Primary Key
* `panel` (text)
* `kategori` (text)
* `kode` (text)
* `jenis_lampu` (text)
* `tiang` (text)
* `thpasang` (numeric)
* `desakel` (text)
* `kecamatan` (text)
* `kabupaten` (text)
* `latitude` (double precision)
* `longitude` (double precision)

**Crucial Data Fetching Instruction for AI:** When fetching from Supabase, the raw tabular data MUST be transformed into a valid **GeoJSON FeatureCollection** before being passed to the Mapbox `addSource` data property. The `longitude` and `latitude` fields must map to the GeoJSON `geometry.coordinates`. The rest of the fields should map to the `properties` object of each feature.

## 5. UI/UX Requirements

### A. Desktop View (Admin Dashboard)
* **Layout:** Split-screen layout.
* **Left Panel:** A Data Table displaying the `public.lampu` properties (kode, jenis_lampu, tiang, panel, kecamatan, dll). Includes filtering and pagination.
* **Right Panel:** Full-height Mapbox instance.
* **Interactivity:** * Clicking a row in the table triggers a `flyTo` animation on the map to the specific `latitude`/`longitude`.
  * Clicking a WebGL point on the map highlights the point and displays a detail card or popup with the point's full properties.

### B. Mobile View (Mobile Explorer)
* **Layout:** Full-screen Mapbox map.
* **UI Elements:** Floating action buttons for geolocation or layer toggles. Floating search bar at the top.
* **Interactivity (Bottom Sheet):** * Do NOT use standard Mapbox popups.
  * When a user taps a point on the map, open a modern, draggable **Bottom Sheet** from the bottom of the screen to display all properties of that specific PJU point.

## 6. Implementation Steps
1. Parse the Stitch UI screens to scaffold the React components and Tailwind layouts.
2. Initialize the Supabase client and create a data-fetching function that pulls the `public.lampu` data and converts it into a GeoJSON FeatureCollection. Use mock data matching the schema during initial layout building if needed.
3. Initialize the Mapbox component with the GeoJSON source and set up the `circle` layer rendering logic to handle 50k points.
4. Build the responsive layout switcher (Admin Dashboard for Desktop screens, Mobile Explorer for Mobile screens).
5. Implement state management to connect the Data Table (Desktop) or Map Clicks (Mobile) to the respective UI changes (flyTo, Bottom Sheet).
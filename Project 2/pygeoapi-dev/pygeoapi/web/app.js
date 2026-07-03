const API = "http://localhost:5000/collections";

var map = L.map("map").setView([52.7, 4.9], 8);

// BASE MAPA
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

const layerConfigs = [
  { name: "admin", label: "Administrative Boundaries", color: "red", fill: true },
  { name: "roads", label: "Roads", color: "blue" },
  { name: "healthcare", label: "Healthcare", color: "purple" },
  { name: "schools", label: "Schools", color: "orange" },
  { name: "waterways", label: "Waterways", color: "cyan" },
  { name: "buildings", label: "Buildings", color: "gray", fill: true },
  { name: "greenspaces", label: "Green Spaces", color: "green", fill: true },

  { name: "schools_near_waterways", label: "Query: Schools near waterways", color: "pink" },
  { name: "schools_in_amsterdam_city", label: "Query: Schools in Amsterdam", color: "yellow" },
  { name: "healthcare_facilities_in_buildings", label: "Query: Healthcare facilities in buildings", color: "black" },
  { name: "roads_through_greenspaces", label: "Query: Roads through greenspaces", color: "lime" },
  { name: "waterways_crossing_admin_boundaries", label: "Query: Waterways crossing admin boundaries", color: "brown" },
  { name: "greenspaces_in_amsterdam_city", label: "Query: Greenspaces in Amsterdam", color: "darkgreen", fill: true }
];

var overlayLayers = {};
var layerControl;


function getGeometryStyle(cfg, geometryType) {
  const base = {
    color: cfg.color,
    weight: 2
  };

  switch (geometryType) {
    case "Polygon":
    case "MultiPolygon":
      return {
        ...base,
        fillOpacity: cfg.fill ? 0.2 : 0
      };

    case "LineString":
    case "MultiLineString":
      return {
        ...base,
        weight: 3
      };

    default:
      return base;
  }
}

function createPopupContent(cfg, properties = {}) {
  const rows = Object.entries(properties)
    .map(([key, value]) => `<b>${key}:</b> ${value}`)
    .join("<br>");

  return `<h4>${cfg.label}</h4>${rows}`;
}

function createGeoJsonLayer(cfg, data) {
  return L.geoJSON(data, {
    style: (feature) =>
      getGeometryStyle(cfg, feature.geometry.type),

    pointToLayer: (feature, latlng) => {
      const type = feature.geometry.type;

      if (type === "Point" || type === "MultiPoint") {
        return L.circleMarker(latlng, {
          radius: 3,
          weight: 1,
          color: "#000",
          fillColor: cfg.color,
          fillOpacity: 0.8,
        });
      }
    },

    onEachFeature: (feature, layer) => {
      layer.bindPopup(
        createPopupContent(cfg, feature.properties)
      );
    }
  });
}
function refreshLayerControl() {
  if (layerControl) {
    map.removeControl(layerControl);
  }

  layerControl = L.control.layers(null, overlayLayers, {
    collapsed: false
  }).addTo(map);
}

async function loadLayer(cfg) {
  try {
    const res = await fetch(`${API}/${cfg.name}/items?limit=1000`);
    const data = await res.json();

    const layer = createGeoJsonLayer(cfg, data);

    overlayLayers[cfg.label] = layer;
    layer.addTo(map);

    refreshLayerControl();
  } catch (err) {
    console.error(`Failed to load layer: ${cfg.name}`, err);
  }
}

let initialized = false;

function initLayers() {

  if (initialized) return;
  initialized = true;

  layerConfigs.forEach(loadLayer);

  refreshLayerControl();
}



initLayers();

var legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");

  const title = document.createElement("h4");
  title.textContent = "Legend";
  div.appendChild(title);

  layerConfigs.forEach(cfg => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const box = document.createElement("span");
    box.className = "legend-box";
    box.style.background = cfg.color;

    const label = document.createElement("span");
    label.textContent = cfg.label;

    item.appendChild(box);
    item.appendChild(label);
    div.appendChild(item);
  });

  return div;
};

legend.addTo(map);
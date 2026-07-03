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

  // { name: "schools_near_waterways", label: "Query: Schools near waterways", color: "pink" },
  // { name: "schools_in_amsterdam_city", label: "Query: Schools in Amsterdam", color: "yellow" },
  // { name: "healthcare_facilities_in_buildings", label: "Query: Healthcare facilities in buildings", color: "black" },
  // { name: "roads_through_greenspaces", label: "Query: Roads through greenspaces", color: "lime" },
  // { name: "waterways_crossing_admin_boundaries", label: "Query: Waterways crossing admin boundaries", color: "brown" },
  // { name: "greenspaces_in_amsterdam_city", label: "Query: Greenspaces in Amsterdam", color: "darkgreen", fill: true }
];

var overlayLayers = {};
var layerControl;

let schoolsNearWaterwaysLayer = null;

async function runSchoolsNearWaterways() {

    const distance =
        document.getElementById("distanceInput").value;

    const response =
        await fetch(
            `http://localhost:5001/schools-near-waterways?distance=${distance}`
        );

    const data = await response.json();

    if (schoolsNearWaterwaysLayer) {
        map.removeLayer(schoolsNearWaterwaysLayer);
    }

    schoolsNearWaterwaysLayer = L.geoJSON(data, {

        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 3,
                color: "hotpink",
                fillOpacity: 1
            });
        },

        onEachFeature: function (feature, layer) {

            let html = "";

            for (const key in feature.properties) {
                html += `<b>${key}</b>: ${feature.properties[key]}<br>`;
            }

            layer.bindPopup(html);
        }
    });

    schoolsNearWaterwaysLayer.addTo(map);

    // ovo  je dodato samo kako bi se nakon promene uslova uklonio stari sloj u legendi i slojevima
    // i dodao novi ali sa ispravnim nazivom, kao npr "Schools near waterways (100m)" ili "Schools near waterways (50m)"
    for (let key in overlayLayers) {
        if (key.startsWith("Schools near waterways")) {
            delete overlayLayers[key];
        }
    }

    const layerName = `Schools near waterways (${distance}m)`;

    overlayLayers[layerName] = schoolsNearWaterwaysLayer;

    refreshLayerControl();
}

document
.getElementById(
    "runSpatialQuery"
)
.addEventListener(
    "click",
    runSchoolsNearWaterways
);


const droughtLayer = L.imageOverlay(
  "http://localhost:5001/raster-image",
  [
    [52.263955, 4.717255],
    [52.506609, 5.085297]
    
  ],
  {
    opacity: 0.6
  }
);

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

  overlayLayers["Drought Map"] = droughtLayer;
  droughtLayer.addTo(map);

  refreshLayerControl();
}


let maxSpeedLayer = null;

async function runMaxSpeedFilter() {

    const minSpeed =
        document.getElementById("speedInput").value;

    const response =
        await fetch(
            `http://localhost:5001/roads-maxspeed?min_speed=${minSpeed}`
        );

    const data = await response.json();

    //uklanjanje starog sloja ako postoji, da bi se dodao novi sa ispravnim nazivom
    if (maxSpeedLayer) {
        map.removeLayer(maxSpeedLayer);
    }

    maxSpeedLayer = L.geoJSON(data, {

        style: {
            color: "red",
            weight: 3
        },

        onEachFeature: function (feature, layer) {
            layer.bindPopup(
                Object.entries(feature.properties)
                    .map(([k, v]) => `<b>${k}</b>: ${v}`)
                    .join("<br>")
            );
        }
    });

    maxSpeedLayer.addTo(map);

    // kao i u prethodnoj funkciji, uklanja se stari sloj iz legendi i slojeva i dodaje novi sa ispravnim nazivom
    // kao npr "Roads maxspeed ≥ 50" ili "Roads maxspeed ≥ 100"
    for (let key in overlayLayers) {
        if (key.startsWith("Roads maxspeed")) {
            delete overlayLayers[key];
        }
    }

    const layerName = `Roads maxspeed ≥ ${minSpeed}`;

    overlayLayers[layerName] = maxSpeedLayer;

    refreshLayerControl();
}

document
.getElementById("runSpeedFilter")
.addEventListener("click", runMaxSpeedFilter);


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
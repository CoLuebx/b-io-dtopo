// Initialisation de la carte
var map = L.map("map").setView([46.603354, 1.888334], 6);

// Ajout des tuiles CartoDB Positron en noir et blanc
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
  detectRetina: true,
}).addTo(map);

// Variables pour stocker les couches de polygones et de cours d'eau
var geojsonLayer, departmentsLayer, riversLayer;
var selectedBasin = null; // Pour garder une référence du bassin versant sélectionné

// Fonction pour styliser les bassins versants et les départements
function style(feature) {
  return {
    fillColor: "#ffffff", // Blanc avec opacité
    weight: 2, // Épaisseur des contours
    opacity: 1,
    color: "#000000", // Couleur des contours
    dashArray: null,
    fillOpacity: 0.7, // Opacité à 70%
  };
}

// Fonction pour styliser les cours d'eau en blanc
function riverStyleWhite(feature) {
  return {
    color: "#ffffff", // Blanc pour les cours d'eau
    weight: 1, // Épaisseur par défaut
    opacity: 1,
  };
}

// Fonction pour chaque polygone (bassins versants)
function onEachFeature(feature, layer) {
  layer.on("click", function (e) {
    if (selectedBasin) {
      geojsonLayer.resetStyle(selectedBasin);
    }

    layer.setStyle({
      fillColor: "#000000",
      fillOpacity: 1,
      color: "#000000",
      weight: 2,
    });

    selectedBasin = layer;

    var layerText = capitalizeWords(
      feature.properties.layer || feature.properties.nom
    );
    layer.bindPopup(layerText).openPopup();

    resetOtherLayers(geojsonLayer, layer);
    resetOtherLayers(departmentsLayer, layer);

    var layerValue = feature.properties.layer;
    var filename = `${layerValue}.json.geojson`;

    if (riversLayer) {
      map.removeLayer(riversLayer);
    }

    fetch(filename)
      .then((response) => response.json())
      .then((data) => {
        riversLayer = L.geoJSON(data, {
          style: riverStyleWhite,
          onEachFeature: onEachRiverFeature,
        }).addTo(map);
      })
      .catch((err) => console.error(err));
  });
}

// Fonction pour chaque département
function onEachDepartmentFeature(feature, layer) {
  layer.on("click", function (e) {
    layer.setStyle({
      fillColor: "#000000",
      fillOpacity: 1,
      color: "#000000",
      weight: 2,
    });

    var departmentText = capitalizeWords(feature.properties.nom);
    layer.bindPopup(departmentText).openPopup();

    resetOtherLayers(departmentsLayer, layer);
    resetOtherLayers(geojsonLayer, layer);
  });
}

// Fonction pour chaque cours d'eau
function onEachRiverFeature(feature, layer) {
  layer.on("click", function (e) {
    // Mettre en surbrillance le cours d'eau sélectionné en rouge et doubler son épaisseur
    layer.setStyle({
      color: "#ff0000", // Rouge pour la sélection
      weight: layer.options.weight * 2,
    });

    // Afficher le popup avec le nom du cours d'eau
    var nameText = feature.properties.NomEntiteH;
    console.log(nameText);

    // Lier le popup au layer
    layer.bindPopup(nameText);

    // Ouvrir le popup avec un léger délai
    setTimeout(function () {
      layer.openPopup();
    }, 100);

    // Réinitialiser le style des autres cours d'eau
    if (riversLayer) {
      riversLayer.eachLayer(function (l) {
        if (l != layer) {
          l.setStyle(riverStyleWhite(l.feature));
          l.closePopup(); // Fermer les autres popups
        }
      });
    }
  });

  // Ajouter une couche supplémentaire pour augmenter la zone cliquable
  var clickLayer = L.polyline(layer.getLatLngs(), {
    color: "transparent",
    weight: layer.options.weight * 5, // Augmenter davantage la zone cliquable
    pane: "shadowPane",
  }).addTo(map);

  clickLayer.on("click", function () {
    layer.fire("click"); // Déclencher l'événement de clic sur la couche principale
  });
}

// Fonction pour réinitialiser le style des autres couches
function resetOtherLayers(layerGroup, currentLayer) {
  if (layerGroup) {
    layerGroup.eachLayer(function (l) {
      if (l != currentLayer && l != selectedBasin) {
        // Ne pas réinitialiser le bassin versant sélectionné
        layerGroup.resetStyle(l);
        l.closePopup();
        l.isDarkened = false;
      }
    });
  }
}

// Fonction pour capitaliser la première lettre de chaque mot
function capitalizeWords(str) {
  return str.replace(/\b\w/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// Chargement des fichiers GeoJSON avec style pour les bassins versants
geojsonLayer = new L.GeoJSON.AJAX("bassins_versants.geojson", {
  onEachFeature: onEachFeature,
  style: style,
}).addTo(map);

// Chargement du fichier GeoJSON avec style pour les départements
departmentsLayer = new L.GeoJSON.AJAX("departements.geojson", {
  onEachFeature: onEachDepartmentFeature,
  style: style,
});

// Variable pour stocker le marqueur de la ville
var cityMarker = null;

// Fonction pour rechercher la ville et ajouter un marqueur
function searchCity() {
  var city = document.getElementById("address-input").value;
  var url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&city=${city}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        var lat = parseFloat(data[0].lat);
        var lon = parseFloat(data[0].lon);

        if (cityMarker !== null) {
          map.removeLayer(cityMarker);
        }

        cityMarker = L.marker([lat, lon]).addTo(map);
        cityMarker
          .bindPopup(data[0].display_name.split(",")[0], { closeButton: false })
          .openPopup();
      } else {
        alert("Ville non trouvée");
      }
    })
    .catch((err) => console.error(err));
}

// Fonction pour basculer entre les bassins versants et les départements
function switchLayer() {
  if (map.hasLayer(geojsonLayer)) {
    map.removeLayer(geojsonLayer);
    if (riversLayer) {
      map.removeLayer(riversLayer);
    }
    map.addLayer(departmentsLayer);
  } else {
    map.removeLayer(departmentsLayer);
    map.addLayer(geojsonLayer);
  }
}

// Fonction pour masquer le popup lorsque l'on clique ailleurs sur la carte
map.on("click", function () {
  if (riversLayer) {
    riversLayer.eachLayer(function (layer) {
      layer.closePopup();
    });
  }

  if (departmentsLayer) {
    departmentsLayer.eachLayer(function (layer) {
      layer.closePopup();
      departmentsLayer.resetStyle(layer);
    });
  }

  if (geojsonLayer) {
    geojsonLayer.eachLayer(function (layer) {
      if (layer != selectedBasin) {
        // Ne pas réinitialiser le bassin versant sélectionné
        layer.closePopup();
        geojsonLayer.resetStyle(layer);
      }
    });
  }
});

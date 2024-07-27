// Initialisation de la carte
var map = L.map('map').setView([46.603354, 1.888334], 6);

// Ajout des tuiles CartoDB Positron en noir et blanc
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    detectRetina: true
}).addTo(map);

// Variables pour stocker les couches de polygones et de cours d'eau
var geojsonLayer, departmentsLayer, riversLayer;

// Fonction pour styliser les bassins versants et les départements
function style(feature) {
    return {
        fillColor: '#ffffff', // Blanc avec opacité
        weight: 2, // Épaisseur des contours
        opacity: 1,
        color: '#000000', // Couleur des contours
        dashArray: null,
        fillOpacity: 0.7 // Opacité à 70%
    };
}

// Fonction pour styliser les cours d'eau en blanc
function riverStyleWhite(feature) {
    return {
        color: '#ffffff', // Blanc pour les cours d'eau
        weight: 1, // Épaisseur par défaut
        opacity: 1
    };
}

// Fonction pour générer une couleur en fonction de la valeur de "layer" ou "nom"
function generateColor(attribute) {
    var hash = 0;
    for (var i = 0; i < attribute.length; i++) {
        hash = attribute.charCodeAt(i) + ((hash << 5) - hash);
    }
    var color = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

// Fonction pour assombrir la couleur
function darkenColor(color) {
    var darkenFactor = 0.7;
    var r = Math.round(parseInt(color.slice(1, 3), 16) * darkenFactor);
    var g = Math.round(parseInt(color.slice(3, 5), 16) * darkenFactor);
    var b = Math.round(parseInt(color.slice(5, 7), 16) * darkenFactor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Fonction pour chaque polygone (bassins versants)
function onEachFeature(feature, layer) {
    layer.on('click', function(e) {
        layer.setStyle({
            fillColor: '#000000',
            fillOpacity: 1,
            color: '#000000',
            weight: 2
        });

        var layerText = capitalizeWords(feature.properties.layer || feature.properties.nom);
        layer.bindPopup(layerText).openPopup();

        resetOtherLayers(geojsonLayer, layer);
        resetOtherLayers(departmentsLayer, layer);

        var layerValue = feature.properties.layer;
        var filename = `${layerValue}.json.geojson`;

        if (riversLayer) {
            map.removeLayer(riversLayer);
        }

        fetch(filename)
            .then(response => response.json())
            .then(data => {
                riversLayer = L.geoJSON(data, {
                    style: riverStyleWhite,
                    onEachFeature: onEachRiverFeature
                }).addTo(map);
            })
            .catch(err => console.error(err));
    });
}

// Fonction pour chaque département
function onEachDepartmentFeature(feature, layer) {
    layer.on('click', function(e) {
        layer.setStyle({
            fillColor: '#000000',
            fillOpacity: 1,
            color: '#000000',
            weight: 2
        });

        var departmentText = capitalizeWords(feature.properties.nom);
        layer.bindPopup(departmentText).openPopup();

        resetOtherLayers(departmentsLayer, layer);
        resetOtherLayers(geojsonLayer, layer);
    });
}

// Fonction pour chaque cours d'eau
function onEachRiverFeature(feature, layer) {
    layer.on('click', function(e) {
        console.log(feature.properties.NomEntiteH);

        layer.setStyle({
            color: '#ff0000',
            weight: layer.options.weight * 2
        });

        var nameText = feature.properties.NomEntiteH;
        layer.bindPopup(nameText).openPopup();

        resetOtherLayers(riversLayer, layer);
    });

    var clickLayer = L.polyline(layer.getLatLngs(), {
        color: 'transparent',
        weight: layer.options.weight * 5,
        pane: 'shadowPane'
    }).addTo(map);

    clickLayer.on('click', function() {
        layer.fire('click');
    });
}

// Fonction pour réinitialiser le style des autres couches
function resetOtherLayers(layerGroup, currentLayer) {
    if (layerGroup) {
        layerGroup.eachLayer(function(l) {
            if (l != currentLayer) {
                layerGroup.resetStyle(l);
                l.closePopup();
                l.isDarkened = false;
            }
        });
    }
}

// Fonction pour capitaliser la première lettre de chaque mot
function capitalizeWords(str) {
    return str.replace(/\b\w/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

// Chargement des fichiers GeoJSON avec style pour les bassins versants
geojsonLayer = new L.GeoJSON.AJAX("bassins_versants.geojson", {
    onEachFeature: onEachFeature,
    style: style
}).addTo(map);

// Chargement du fichier GeoJSON avec style pour les départements
departmentsLayer = new L.GeoJSON.AJAX("departements.geojson", {
    onEachFeature: onEachDepartmentFeature,
    style: style
});

// Variable pour stocker le marqueur de la ville
var cityMarker = null;

// Fonction pour rechercher la ville et ajouter un marqueur
function searchCity() {
    var city = document.getElementById('address-input').value;
    var url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&city=${city}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                var lat = parseFloat(data[0].lat);
                var lon = parseFloat(data[0].lon);

                if (cityMarker !== null) {
                    map.removeLayer(cityMarker);
                }

                cityMarker = L.marker([lat, lon]).addTo(map);
                cityMarker.bindPopup(data[0].display_name.split(",")[0], { closeButton: false }).openPopup();
            } else {
                alert('Ville non trouvée');
            }
        })
        .catch(err => console.error(err));
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
map.on('click', function () {
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
            layer.closePopup();
            geojsonLayer.resetStyle(layer);
        });
    }
});

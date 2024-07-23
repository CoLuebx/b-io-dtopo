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
var geojsonLayer, riversLayer, departmentsLayer;
var riversVisible = true;

// Fonction pour chaque polygone
function onEachFeature(feature, layer) {
    layer.on('click', function(e) {
        if (!layer.isDarkened) {
            // Rendre le polygone plus foncé lors du clic
            layer.setStyle({
                fillColor: darkenColor(layer.options.fillColor),
                fillOpacity: 0.9
            });
            layer.isDarkened = true; // Marquer le polygone comme assombri
        }

        // Formater le texte du popup
        var layerText = capitalizeWords(feature.properties.layer || feature.properties.nom);

        // Afficher le popup avec l'attribut "layer" ou "nom"
        layer.bindPopup(layerText).openPopup();

        // Réinitialiser le style des autres polygones
        if (geojsonLayer) {
            geojsonLayer.eachLayer(function(l) {
                if (l != layer) {
                    geojsonLayer.resetStyle(l);
                    l.isDarkened = false; // Réinitialiser l'état d'assombrissement des autres polygones
                }
            });
        }
        if (departmentsLayer) {
            departmentsLayer.eachLayer(function(l) {
                if (l != layer) {
                    departmentsLayer.resetStyle(l);
                    l.isDarkened = false; // Réinitialiser l'état d'assombrissement des autres polygones
                }
            });
        }
    });
}

// Fonction pour générer une couleur en fonction de la valeur de "layer" ou "nom"
function generateColor(attribute) {
    // Utiliser une fonction de hachage simple pour générer une couleur unique pour chaque valeur
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
    // Convertir la couleur hexadécimale en une couleur plus foncée
    var darkenFactor = 0.7; // Facteur d'assombrissement (0.7 = 70% de la couleur d'origine)
    var r = Math.round(parseInt(color.slice(1, 3), 16) * darkenFactor);
    var g = Math.round(parseInt(color.slice(3, 5), 16) * darkenFactor);
    var b = Math.round(parseInt(color.slice(5, 7), 16) * darkenFactor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Fonction pour styliser les bassins versants
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

// Fonction pour styliser les départements
function departmentStyle(feature) {
    return {
        fillColor: '#ffffff', // Blanc avec opacité
        weight: 2, // Épaisseur des contours
        opacity: 1,
        color: '#000000', // Couleur des contours
        dashArray: null,
        fillOpacity: 0.7 // Opacité à 70%
    };
}

// Fonction pour styliser les cours d'eau en fonction de la classe
function riverStyle(feature) {
    var weight;
    if (feature.properties.classe == 1) {
        weight = 5; // Classe 1, épaisseur de 5
    } else if (feature.properties.classe == 2) {
        weight = 3; // Classe 2, épaisseur de 3
    } else if (feature.properties.classe == 3) {
        weight = 1; // Classe 3, épaisseur de 1
    } else if (feature.properties.classe == 4) {
        weight = 0.5; // Classe 4, épaisseur de 0.5
    } else {
        weight = 1; // Valeur par défaut
    }

    return {
        color: generateColor(feature.properties.layer), // Utiliser la même couleur que les polygones
        weight: weight,
        opacity: 1
    };
}

// Fonction pour chaque cours d'eau
function onEachRiver(feature, layer) {
    layer.on('click', function(e) {
        // Rendre le cours d'eau rouge lorsqu'il est cliqué
        layer.setStyle({
            color: '#ff0000'
        });

        // Afficher le popup avec le nom du cours d'eau
        var nameText = feature.properties.NomEntiteH;
        layer.bindPopup(nameText).openPopup();

        // Réinitialiser le style des autres cours d'eau
        riversLayer.eachLayer(function(l) {
            if (l != layer) {
                l.setStyle(riverStyle(l.feature));
            }
        });
    });

    // Ajouter une couche supplémentaire pour augmenter la zone cliquable
    var clickLayer = L.polyline(layer.getLatLngs(), {
        color: 'transparent',
        weight: layer.options.weight * 3, // Augmenter la zone cliquable
        pane: 'clickable'
    }).addTo(map);

    clickLayer.on('click', function() {
        layer.fire('click'); // Déclencher l'événement de clic sur la couche principale
    });
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
    style: style
}).addTo(map); // Ajouter les bassins versants par défaut

// Chargement du fichier GeoJSON pour les cours d'eau
riversLayer = new L.GeoJSON.AJAX("cours_eau.geojson", {
    onEachFeature: onEachRiver,
    style: riverStyle
}).addTo(map); // Ajouter les cours d'eau par défaut

// Chargement du fichier GeoJSON avec style pour les départements
departmentsLayer = new L.GeoJSON.AJAX("departements.geojson", {
    onEachFeature: onEachFeature,
    style: departmentStyle
});

// Variable pour stocker le marqueur de la ville
var cityMarker = null;

// Fonction pour rechercher la ville et mettre en surbrillance le polygone correspondant
function searchCity() {
    var city = document.getElementById('address-input').value;
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&city=' + city;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                var lat = parseFloat(data[0].lat);
                var lon = parseFloat(data[0].lon);

                // Supprimer l'ancien marqueur de la ville s'il existe
                if (cityMarker !== null) {
                    map.removeLayer(cityMarker);
                }

                // Ajouter un nouveau marqueur pour la ville
                cityMarker = L.marker([lat, lon]).addTo(map);
                cityMarker.bindPopup(data[0].display_name.split(",")[0], {closeButton: false}).openPopup();

                // Simuler un clic à l'emplacement de la ville trouvée
                simulateClick(lat, lon);

                // Centrer la carte sur la ville trouvée
                map.setView([lat, lon], 12);
            } else {
                alert('Ville non trouvée');
            }
        })
        .catch(err => console.error(err));
}

// Fonction pour simuler un clic à une position spécifique
function simulateClick(lat, lon) {
    var point = map.latLngToContainerPoint([lat, lon]);
    var event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: point.x,
        clientY: point.y
    });
    map.getContainer().dispatchEvent(event);
}

// Fonction pour basculer entre les bassins versants (avec cours d'eau) et les départements
function switchLayer() {
    if (map.hasLayer(geojsonLayer) || map.hasLayer(riversLayer)) {
        map.removeLayer(geojsonLayer);
        map.removeLayer(riversLayer);
        if (!map.hasLayer(departmentsLayer)) {
            map.addLayer(departmentsLayer);
        }
    } else {
        map.removeLayer(departmentsLayer);
        if (!map.hasLayer(geojsonLayer)) {
            map.addLayer(geojsonLayer);
        }
        if (!map.hasLayer(riversLayer)) {
            map.addLayer(riversLayer);
        }
    }
}

// Fonction pour afficher/masquer les cours d'eau
function toggleRivers() {
    if (map.hasLayer(riversLayer)) {
        map.removeLayer(riversLayer);
    } else {
        map.addLayer(riversLayer);
    }
}

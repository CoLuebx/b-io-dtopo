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

// Fonction pour chaque polygone
function onEachFeature(feature, layer) {
    layer.on('click', function(e) {
        // Rendre le polygone entièrement noir lors du clic
        layer.setStyle({
            fillColor: '#000000',
            fillOpacity: 1,
            color: '#000000',
            weight: 2
        });

        // Formater le texte du popup
        var layerText = capitalizeWords(feature.properties.layer);

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

        // Extraire l'attribut "layer" du polygone cliqué
        var layerValue = feature.properties.layer;
        var filename = layerValue + ".json.geojson";

        // Afficher les cours d'eau correspondants
        if (riversLayer) {
            map.removeLayer(riversLayer);
        }
        fetch(filename)
            .then(response => response.json())
            .then(data => {
                riversLayer = L.geoJSON(data, {
                    style: riverStyleWhite, // Utiliser un style différent pour les cours d'eau
                    onEachFeature: onEachRiverFeature
                }).addTo(map);
            })
            .catch(err => console.error(err));
    });
}

// Fonction pour styliser les cours d'eau en blanc
function riverStyleWhite(feature) {
    return {
        color: '#ffffff', // Blanc pour les cours d'eau
        weight: 0.5, // Épaisseur par défaut
        opacity: 1
    };
}

// Fonction pour chaque cours d'eau
function onEachRiverFeature(feature, layer) {
    layer.on('click', function(e) {
        // Mettre en surbrillance le cours d'eau sélectionné en rouge et doubler son épaisseur
        layer.setStyle({
            color: '#ff0000', // Rouge pour la sélection
            weight: layer.options.weight * 2
        });

        // Afficher le popup avec le nom du cours d'eau
        var nameText = feature.properties.NomEntiteH;
        console.log(nameText);
        
        // Lier le popup au layer
        layer.bindPopup(nameText);

        // Ouvrir le popup avec un léger délai
        setTimeout(function() {
            layer.openPopup();
        }, 100);
        

        // Réinitialiser le style des autres cours d'eau
        if (riversLayer) {
            riversLayer.eachLayer(function(l) {
                if (l != layer) {
                    l.setStyle(riverStyleWhite(l.feature));
                    l.closePopup(); // Fermer les autres popups
                }
            });
        }
    });

    // Ajouter une couche supplémentaire pour augmenter la zone cliquable
    var clickLayer = L.polyline(layer.getLatLngs(), {
        color: 'transparent',
        weight: layer.options.weight * 5, // Augmenter davantage la zone cliquable
        pane: 'shadowPane'
    }).addTo(map);

    clickLayer.on('click', function() {
        layer.fire('click'); // Déclencher l'événement de clic sur la couche principale
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

// Fonction pour styliser les bassins versants et les départements
function style(feature) {
    return {
        fillColor: '#ffffff', // Blanc avec opacité
        weight: 1, // Épaisseur des contours
        opacity: 1,
        color: '#000000', // Couleur des contours
        dashArray: null,
        fillOpacity: 0.7 // Opacité à 70%
    };
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
}).addTo(map); // Ajouter les bassins versants par défaut

// Chargement du fichier GeoJSON avec style pour les départements
departmentsLayer = new L.GeoJSON.AJAX("departements.geojson", {
    onEachFeature: onEachFeature,
    style: style
});

// Variable pour stocker le marqueur de la ville
var cityMarker = null;

// Fonction pour rechercher la ville et ajouter un marqueur
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
        if (!map.hasLayer(departmentsLayer)) {
            map.addLayer(departmentsLayer);
        }
    } else {
        map.removeLayer(departmentsLayer);
        if (!map.hasLayer(geojsonLayer)) {
            map.addLayer(geojsonLayer);
        }
    }
}

// Fonction pour masquer le popup lorsque l'on clique ailleurs sur la carte
map.on('click', function() {
    if (riversLayer) {
        riversLayer.eachLayer(function(layer) {
            layer.closePopup();
        });
    }
});

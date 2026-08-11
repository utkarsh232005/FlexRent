// Read map data from the #map element's data attributes
// (avoids putting EJS expressions inside <script> tags)
const mapEl = document.getElementById("map");
const mapToken = mapEl.dataset.token;
const listingCoords = JSON.parse(mapEl.dataset.coords);
const listingTitle = mapEl.dataset.title;


mapboxgl.accessToken = mapToken;

const hasStoredCoords =
    Array.isArray(listingCoords) &&
    !(listingCoords[0] === 0 && listingCoords[1] === 0);

function initMap(center, zoom) {
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    new mapboxgl.Marker({ color: "#ff385c" })
        .setLngLat(center)
        .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<strong>${listingTitle}</strong>`
            )
        )
        .addTo(map);
}

if (hasStoredCoords) {
    // Fast path: coordinates already stored in MongoDB
    initMap(listingCoords, 10);
} else {
    // Fallback: geocode client-side for old listings with [0,0] defaults
    fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(listingTitle)}.json?access_token=${mapToken}&limit=1`
    )
        .then((res) => res.json())
        .then((data) => {
            if (data.features && data.features.length > 0) {
                initMap(data.features[0].center, 10);
            } else {
                new mapboxgl.Map({
                    container: "map",
                    style: "mapbox://styles/mapbox/streets-v12",
                    center: [78.9629, 20.5937],
                    zoom: 4,
                });
            }
        })
        .catch(() => {
            new mapboxgl.Map({
                container: "map",
                style: "mapbox://styles/mapbox/streets-v12",
                center: [78.9629, 20.5937],
                zoom: 4,
            });
        });
}
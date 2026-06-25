let map;
let pickupLatLng = null;
let dropLatLng = null;
let pickupMarker = null;
let dropMarker = null;
let routingLine = null; // Map par rasta dikhane ke liye

// 1. ROUTING LOGIC
function handleRouting() {
    const hash = window.location.hash;
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    if (hash === '#rider') {
        document.getElementById('riderPortal').style.display = 'block';
        initializeMap(); 
    } else if (hash === '#driver') {
        document.getElementById('driverPortal').style.display = 'block';
    } else if (hash === '#admin') {
        document.getElementById('adminPortal').style.display = 'block';
    } else {
        document.getElementById('mainMenu').style.display = 'block';
    }
}

function openPortal(portalName) {
    window.location.hash = portalName;
}

function goBack() {
    window.location.hash = ''; 
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);


// 2. MAP INITIALIZATION & CLICK SELECTION
function initializeMap() {
    if (!map) {
        // Rudrapur, Uttarakhand default coordinates [28.98, 79.40]
        map = L.map('map').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        // Map par click karne ka event listener
        map.on('click', handleMapClick);
    }
    setTimeout(() => { map.invalidateSize(); }, 300);
}

// Map click control karne ka main logic
async function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const instructionBox = document.getElementById('mapInstruction');

    // Case 1: Agar Pickup select nahi hua hai
    if (!pickupLatLng) {
        pickupLatLng = e.latlng;
        pickupMarker = L.marker([lat, lng], {title: "Pickup"}).addTo(map).bindPopup("Pickup Point").openPopup();
        instructionBox.innerHTML = "Ab map par click karke <b>Drop Location</b> select karein.";
        
        // Reverse Geocoding API (Latitude/Longitude se Address Name nikalna)
        document.getElementById('pickupLocation').value = "Fetching address...";
        const address = await fetchAddressName(lat, lng);
        document.getElementById('pickupLocation').value = address;
    } 
    // Case 2: Agar Pickup ho chuka hai par Drop baaki hai
    else if (!dropLatLng) {
        dropLatLng = e.latlng;
        dropMarker = L.marker([lat, lng], {title: "Drop"}).addTo(map).bindPopup("Drop Point").openPopup();
        instructionBox.innerHTML = "Locations selected! Sahi distance aur fare niche check karein.";
        
        document.getElementById('dropLocation').value = "Fetching address...";
        const address = await fetchAddressName(lat, lng);
        document.getElementById('dropLocation').value = address;

        // Ab dono points mil gaye, toh actual Road Distance aur Fare calculate karein
        calculateRealRouteAndFare();
    }
}

// Reset Map Locations
function resetLocations() {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropMarker) map.removeLayer(dropMarker);
    if (routingLine) map.removeLayer(routingLine);
    
    pickupLatLng = null;
    dropLatLng = null;
    pickupMarker = null;
    dropMarker = null;
    routingLine = null;
    
    document.getElementById('pickupLocation').value = "";
    document.getElementById('dropLocation').value = "";
    document.getElementById('distanceDisplay').innerText = "0.0 km";
    document.getElementById('totalFareDisplay').innerText = "₹0.00";
    document.getElementById('mapInstruction').innerHTML = "Map par click karke <b>Pickup Location</b> select karein.";
}

// Free Nominatim API address lane ke liye
async function fetchAddressName(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (error) {
        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
}


// 3. REAL DISTANCE & FARE CALCULATION (OSRM API)
async function calculateRealRouteAndFare() {
    if (!pickupLatLng || !dropLatLng) return;

    const pLng = pickupLatLng.lng;
    const pLat = pickupLatLng.lat;
    const dLng = dropLatLng.lng;
    const dLat = dropLatLng.lat;

    // Free OpenSource Routing Machine (OSRM) API to get real road distance
    const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceInKm = (route.distance / 1000).toFixed(1); // Metres ko KM mein convert kiya
            
            document.getElementById('distanceDisplay').innerText = `${distanceInKm} km`;

            // FARE CALCULATION LOGIC BASED ON KILOMETERS
            const baseFare = 30; // Shuruati 2 km ke liye fixed price
            const perKmRate = 12; // 12 rupaye par kilometer rate
            let finalFare = baseFare + (distanceInKm * perKmRate);
            
            finalFare = Math.round(finalFare); // Round figure price
            document.getElementById('totalFareDisplay').innerText = `₹${finalFare}.00`;

            // Map par dono locations ke beech road line draw karna
            if (routingLine) map.removeLayer(routingLine);
            routingLine = L.geoJSON(route.geometry, {
                style: { color: '#007bff', weight: 5, opacity: 0.7 }
            }).addTo(map);

            // Zoom map to fit both markers
            const group = new L.featureGroup([pickupMarker, dropMarker]);
            map.fitBounds(group.getBounds().pad(0.2));

        } else {
            alert("Road route nahi mil paya. Kripya dhyan se map par points select karein.");
        }
    } catch (error) {
        console.error("Routing error:", error);
        alert("Distance calculate karne mein dikkat aayi. Net check karein.");
    }
}


// 4. LIVE BOOKING & OTP VERIFICATION SYSTEM
function requestLiveBooking() {
    const name = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('mobileNumber').value.trim();
    const fare = document.getElementById('totalFareDisplay').innerText;
    const distance = document.getElementById('distanceDisplay').innerText;

    if (!pickupLatLng || !dropLatLng || fare === "₹0.00") {
        alert("Kripya pehle map par Pickup aur Drop locations tick karein!");
        return;
    }
    if (!name || !phone) {
        alert("Kripya apna Naam aur Mobile Number dalein!");
        return;
    }
    if (phone.length < 10) {
        alert("Kripya ek valid 10-digit mobile number dalein!");
        return;
    }

    // RANDOM 4-DIGIT OTP GENERATION
    const generatedOTP = Math.floor(1000 + Math.random() * 9000);

    // Yeh OTP aap apne Firebase database mein save karwa sakte hain booking id ke sath
    // taaki jab driver app mein pickup confirm karega toh yahi OTP verify ho sake.
    alert(`🎉 Booking Successful!\n\nDistance: ${distance}\nFare: ${fare}\n\n🔐 OTP sent to ${phone}: [ ${generatedOTP} ]\n\nYeh OTP rider jab driver ke sath baithega tab use batana hoga.`);
    
    // Yahan aap apna Firebase database push logic code daal sakte hain, example:
    // database.ref('bookings/').push({ name, phone, fare, distance, otp: generatedOTP, status: 'pending' });
    
    resetLocations(); // Booking ke baad map reset
}

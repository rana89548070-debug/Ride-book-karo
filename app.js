// Global Map & Booking State Variables
let map;
let pickupLatLng = null;
let dropLatLng = null;
let pickupMarker = null;
let dropMarker = null;
let routingLine = null;

// Simulated Real-Time Database State (Dono portals ko aapas me link karne ke liye)
let isDriverOnline = false; 
let currentLiveBooking = null; 

// ================= 1. PAGE ROUTING & SPA MANAGEMENT =================
function handleRouting() {
    const hash = window.location.hash;

    // Saare page sections ko pehle hide karein
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // Hash ke hisab se sahi page section show karein
    if (hash === '#rider') {
        document.getElementById('riderPortal').style.display = 'block';
        initializeMap(); 
    } else if (hash === '#driver') {
        document.getElementById('driverPortal').style.display = 'block';
        updateDriverUI(); 
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

// Routing Events Listener
window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);


// ================= 2. LEAFLET MAP & REVERSE GEOCODING (NOMINATIM) =================
function initializeMap() {
    if (!map) {
        // Default View: Rudrapur Area [28.98, 79.40] aur Zoom level 13
        map = L.map('map').setView([28.98, 79.40], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Map par click listener lagaya
        map.on('click', handleMapClick);
    }
    
    // Map gray screen glitch ko fix karne ke liye delay reset trigger
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

async function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const instructionBox = document.getElementById('mapInstruction');

    // Condition 1: Pehla click = Pickup Point
    if (!pickupLatLng) {
        pickupLatLng = e.latlng;
        pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup("Pickup Point").openPopup();
        instructionBox.innerHTML = "Ab map par click karke <b>Drop Location</b> select karein.";
        
        document.getElementById('pickupLocation').value = "Fetching address...";
        const address = await fetchAddressName(lat, lng);
        document.getElementById('pickupLocation').value = address;
    } 
    // Condition 2: Doosra click = Drop Point
    else if (!dropLatLng) {
        dropLatLng = e.latlng;
        dropMarker = L.marker([lat, lng]).addTo(map).bindPopup("Drop Point").openPopup();
        instructionBox.innerHTML = "Locations selected! Sahi distance aur fare niche check karein.";
        
        document.getElementById('dropLocation').value = "Fetching address...";
        const address = await fetchAddressName(lat, lng);
        document.getElementById('dropLocation').value = address;

        // Route aur Price calculation trigger karein
        calculateRealRouteAndFare();
    }
}

// Nominatim Reverse Geocoding: Coordinates se real human-readable address nikalna
async function fetchAddressName(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (error) {
        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
}

// Reset Map & Fields
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


// ================= 3. ROAD DISTANCE & FARE CALCULATION (OSRM API) =================
async function calculateRealRouteAndFare() {
    if (!pickupLatLng || !dropLatLng) return;

    const pLng = pickupLatLng.lng;
    const pLat = pickupLatLng.lat;
    const dLng = dropLatLng.lng;
    const dLat = dropLatLng.lat;

    // Free OpenSource Routing Machine (OSRM) API to get driving roads distance
    const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceInKm = (route.distance / 1000).toFixed(1); // Metres ko KM me convert kiya
            
            document.getElementById('distanceDisplay').innerText = `${distanceInKm} km`;

            // Fare Calculation: ₹30 Base Fare + ₹12 Per KM
            const baseFare = 30;
            const perKmRate = 12;
            let finalFare = baseFare + (distanceInKm * perKmRate);
            finalFare = Math.round(finalFare); // Round figure pricing

            document.getElementById('totalFareDisplay').innerText = `₹${finalFare}.00`;

            // Map par driving route blue path trace karna
            if (routingLine) map.removeLayer(routingLine);
            routingLine = L.geoJSON(route.geometry, {
                style: { color: '#007bff', weight: 5, opacity: 0.7 }
            }).addTo(map);

            // Dono markers ko screen viewport ke frame me fit karna
            const group = new L.featureGroup([pickupMarker, dropMarker]);
            map.fitBounds(group.getBounds().pad(0.2));

        } else {
            alert("Road route nahi mil paya. Kripya dhyan se map par points select karein.");
        }
    } catch (error) {
        console.error("Routing error:", error);
        alert("Distance calculate karne mein dikkat aayi. Apna network check karein.");
    }
}


// ================= 4. RAPIDO CAPTAIN: DRIVER STATE MANAGEMENT =================
function toggleDuty() {
    isDriverOnline = !isDriverOnline;
    updateDriverUI();
}

function updateDriverUI() {
    const btn = document.getElementById('dutyBtn');
    const offlineState = document.getElementById('driverOfflineState');
    const searchingState = document.getElementById('driverSearchingState');
    const reqCard = document.getElementById('rideRequestCard');
    const activeCard = document.getElementById('activeRideCard');

    // Sabhi sub-states ko pehle khali/hide karein
    offlineState.style.display = "none";
    searchingState.style.display = "none";
    reqCard.style.display = "none";
    activeCard.style.display = "none";

    if (!isDriverOnline) {
        btn.innerText = "GO ONLINE";
        btn.style.backgroundColor = "#28a745"; 
        offlineState.style.display = "block";
    } else {
        btn.innerText = "GO OFFLINE";
        btn.style.backgroundColor = "#dc3545"; 

        // State A: Agar koi booking abhi tak nahi aayi hai toh Searching Animation dikhao
        if (!currentLiveBooking) {
            searchingState.style.display = "block";
        } 
        // State B: Jab customer ride bhej de toh Incoming Request Card pop up hoga
        else if (currentLiveBooking.status === "requested") {
            document.getElementById('reqPickup').innerText = currentLiveBooking.pickup;
            document.getElementById('reqDrop').innerText = currentLiveBooking.drop;
            document.getElementById('reqFare').innerText = currentLiveBooking.fare;
            reqCard.style.display = "block";
        } 
        // State C: Driver ke accept karte hi OTP boarding box khulega
        else if (currentLiveBooking.status === "accepted") {
            activeCard.style.display = "block";
        }
    }
}


// ================= 5. LIVE BOOKING & REAL-TIME SMS OTP SYSTEM =================
function requestLiveBooking() {
    const name = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('mobileNumber').value.trim();
    const fare = document.getElementById('totalFareDisplay').innerText;
    const pickup = document.getElementById('pickupLocation').value;
    const drop = document.getElementById('dropLocation').value;

    if (!pickup || !drop || fare === "₹0.00") {
        alert("Kripya pehle map par click karke Pickup aur Drop locations tick karein!");
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

    // 4-Digit Secure Random OTP Generation
    const generatedOTP = Math.floor(1000 + Math.random() * 9000);

    // Global simulation state update (Firebase real-time set structure)
    currentLiveBooking = {
        name: name,
        phone: phone,
        fare: fare,
        pickup: pickup,
        drop: drop,
        otp: generatedOTP,
        status: "requested"
    };

    // INSTANT REAL-TIME SMS MESSAGE TOAST DROPDOWN DISPLAY
    const smsBox = document.getElementById('smsNotification');
    document.getElementById('smsMessageContent').innerText = `📬 GoBike Pro: Hi ${name}, your booking OTP is [ ${generatedOTP} ]. Share this with Captain only after sitting on bike.`;
    smsBox.style.display = "block";
    
    // 8 Seconds ke baad SMS toast top-screen se automatic hide ho jayega
    setTimeout(() => {
        smsBox.style.display = "none";
    }, 8000);

    alert("🎉 Booking Request Sent! Aapki screen par real-time OTP message bhej diya gaya hai.");
    
    resetLocations(); // Map reset karein dusri booking ke liye
    goBack(); // Back to main dashboard menu
}

function acceptRide() {
    if (!currentLiveBooking) return;
    
    // State push: requested ko badal kar accepted kiya
    currentLiveBooking.status = "accepted";
    updateDriverUI();
}

function startRide() {
    const enteredOTP = document.getElementById('otpInput').value.trim();

    if (!currentLiveBooking) return;

    // Real-time server side checking calculation
    if (enteredOTP == currentLiveBooking.otp) {
        alert("✅ OTP Verified Successfully! Ride Started. Happy Journey!");
        currentLiveBooking = null; // Ride safely start hone par cache clear
        document.getElementById('otpInput').value = ""; // Input text clear
        updateDriverUI(); // Captain wapas searching loop state me chala jayega
    } else {
        alert("❌ Galat OTP! Kripya customer se pooch kar sahi code enter karein.");
    }
}

// =========================================================================
// GLOBAL ARCHITECTURE & STATE MANAGEMENT VARIABLES
// =========================================================================
let map = null;
let pickupLatLng = null;
let dropLatLng = null;
let pickupMarker = null;
let dropMarker = null;
let routingLine = null;

let driverMap = null;
let dPickupMarker = null;
let dDropMarker = null;
let dRoutingLine = null;

let isDriverOnline = false; 
let currentLiveBooking = null; 
let netAdminCommission = 0; 
let driverWalletBalance = 0; 
let selectedPaymentMode = 'cash'; 
let cachedDistance = 0;
let cachedFare = 0;

// New State Variables for Timer & Swipe
let offerTimer = null;
let timeLeft = 10;

// =========================================================================
// 1. SINGLE PAGE ROUTING & DASHBOARD SPA CONTROLLER
// =========================================================================
function handleRouting() {
    const hash = window.location.hash;
    document.querySelectorAll('.page-section').forEach(section => { section.style.display = 'none'; });
    document.getElementById('driverWalletDisplay').innerText = `₹${driverWalletBalance}.00`;

    if (hash === '#rider') {
        document.getElementById('riderPortal').style.display = 'block';
        initializeMap(); 
    } else if (hash === '#driver') {
        document.getElementById('driverPortal').style.display = 'block';
        updateDriverUI(); 
    } else if (hash === '#admin') {
        document.getElementById('adminPortal').style.display = 'block';
        document.getElementById('adminNetCommission').innerText = `₹${netAdminCommission}.00`;
    } else {
        document.getElementById('mainMenu').style.display = 'block';
    }
}

function openPortal(portalName) { window.location.hash = portalName; }
function goBack() { window.location.hash = ''; }

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);

// =========================================================================
// 2. LEAFLET MAP & OSRM LOGIC (Same as before)
// =========================================================================
function initializeMap() {
    if (!map) {
        map = L.map('map').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        map.on('click', handleMapClick);
    }
    setTimeout(() => { map.invalidateSize(); }, 300);
}

async function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    if (!pickupLatLng) {
        pickupLatLng = e.latlng;
        pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>Pickup</b>").openPopup();
        document.getElementById('pickupLocation').value = "Pickup set";
    } else if (!dropLatLng) {
        dropLatLng = e.latlng;
        dropMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>Drop</b>").openPopup();
        document.getElementById('dropLocation').value = "Drop set";
        calculateRealRouteAndFare();
    }
}

async function calculateRealRouteAndFare() {
    if (!pickupLatLng || !dropLatLng) return;
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLatLng.lng},${pickupLatLng.lat};${dropLatLng.lng},${dropLatLng.lat}?overview=full&geometries=geojson`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === "Ok" && data.routes.length > 0) {
            const route = data.routes[0];
            cachedDistance = (route.distance / 1000).toFixed(1);
            cachedFare = Math.round(30 + (cachedDistance * 12));
            document.getElementById('distanceDisplay').innerText = `${cachedDistance} km`;
            document.getElementById('totalFareDisplay').innerText = `₹${cachedFare}.00`;
        }
    } catch (e) { console.error(e); }
}

// =========================================================================
// 3. CAPTAIN PORTAL LOGIC (TIMER + SWIPE + MAP)
// =========================================================================
function toggleDuty() {
    isDriverOnline = !isDriverOnline;
    updateDriverUI();
}

// 10 Second Countdown Timer Function
function startOfferCountdown() {
    timeLeft = 10;
    const timerDisplay = document.getElementById('countdownTimer');
    timerDisplay.innerText = `${timeLeft}s`;
    
    offerTimer = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = `${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(offerTimer);
            alert("⏰ Ride Time Out!");
            currentLiveBooking = null; // Remove the ride
            updateDriverUI();
        }
    }, 1000);
}

// Swipe to Accept Mechanics
function initSwipeMechanism() {
    const handle = document.getElementById('swipeTrigger');
    const track = document.getElementById('swipeTrack');
    let isDragging = false;
    let startX = 0;

    handle.onmousedown = (e) => { isDragging = true; startX = e.clientX; };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        let diff = e.clientX - startX;
        if (diff > 0 && diff < (track.offsetWidth - handle.offsetWidth)) {
            handle.style.left = diff + "px";
        }
        if (diff > (track.offsetWidth - handle.offsetWidth - 20)) {
            isDragging = false;
            clearInterval(offerTimer); // Stop timer
            acceptRide();
        }
    };
    document.onmouseup = () => { isDragging = false; handle.style.left = "2px"; };
}

function updateDriverUI() {
    const btn = document.getElementById('dutyBtn');
    const offlineState = document.getElementById('driverOfflineState');
    const searchingState = document.getElementById('driverSearchingState');
    const reqCard = document.getElementById('rideRequestCard');
    const activeCard = document.getElementById('activeRideCard');

    // Reset visibility
    offlineState.style.display = "none";
    searchingState.style.display = "none";
    reqCard.style.display = "none";
    activeCard.style.display = "none";
    document.getElementById('driverMap').style.display = "none";

    if (!isDriverOnline) {
        btn.innerText = "GO ONLINE"; btn.style.backgroundColor = "#28a745";
        offlineState.style.display = "block";
    } else {
        btn.innerText = "GO OFFLINE"; btn.style.backgroundColor = "#dc3545";
        
        if (!currentLiveBooking) {
            searchingState.style.display = "block";
        } else if (currentLiveBooking.status === "requested") {
            document.getElementById('reqPickup').innerText = currentLiveBooking.pickup;
            document.getElementById('reqDrop').innerText = currentLiveBooking.drop;
            reqCard.style.display = "block";
            startOfferCountdown(); // Start the 10s timer
            initSwipeMechanism(); // Activate swipe
        } else if (currentLiveBooking.status === "accepted") {
            activeCard.style.display = "block";
            document.getElementById('driverMap').style.display = "block";
        }
    }
}

// =========================================================================
// 4. TRIP CONTROL FUNCTIONS
// =========================================================================
function requestLiveBooking() {
    // Basic validation
    const name = document.getElementById('fullName').value;
    if(!name) return alert("Enter Name");
    
    currentLiveBooking = {
        name: name,
        pickup: document.getElementById('pickupLocation').value,
        drop: document.getElementById('dropLocation').value,
        status: "requested",
        otp: 1234,
        pickupCoords: pickupLatLng,
        dropCoords: dropLatLng
    };
    alert("Ride Requested!");
    goBack();
}

function acceptRide() {
    if (!currentLiveBooking) return;
    currentLiveBooking.status = "accepted";
    // Initialize Live Map with the route
    initializeDriverNavigationMap(currentLiveBooking.pickupCoords, currentLiveBooking.dropCoords);
    updateDriverUI();
}

function initializeDriverNavigationMap(pCoords, dCoords) {
    if (!driverMap) {
        driverMap = L.map('driverMap').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(driverMap);
    }
    // Route logic here...
    const url = `https://router.project-osrm.org/route/v1/driving/${pCoords.lng},${pCoords.lat};${dCoords.lng},${dCoords.lat}?overview=full&geometries=geojson`;
    fetch(url).then(res => res.json()).then(data => {
        L.geoJSON(data.routes[0].geometry, { style: { color: '#ffc107', weight: 6 } }).addTo(driverMap);
    });
    setTimeout(() => { driverMap.invalidateSize(); }, 500);
}

function startRide() {
    const enteredOTP = document.getElementById('otpInput').value;
    if (enteredOTP == "1234") {
        alert("Ride Started!");
        currentLiveBooking.status = "ongoing";
        updateDriverUI();
    } else {
        alert("Invalid OTP");
    }
}

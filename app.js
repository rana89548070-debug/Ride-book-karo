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

let offerTimer = null;
let timeLeft = 10;

// =========================================================================
// 1. SINGLE PAGE ROUTING & DASHBOARD SPA CONTROLLER
// =========================================================================
function handleRouting() {
    const hash = window.location.hash;
    
    // Safely hide sections
    document.querySelectorAll('.page-section').forEach(section => { section.style.display = 'none'; });

    // Defensive check: Check if element exists before setting innerText
    const walletEl = document.getElementById('driverWalletDisplay');
    if(walletEl) {
        walletEl.innerText = `₹${driverWalletBalance}.00`;
    }

    if (hash === '#rider') {
        const portal = document.getElementById('riderPortal');
        if(portal) {
            portal.style.display = 'block';
            initializeMap(); 
        }
    } else if (hash === '#driver') {
        const portal = document.getElementById('driverPortal');
        if(portal) {
            portal.style.display = 'block';
            updateDriverUI(); 
        }
    } else if (hash === '#admin') {
        const portal = document.getElementById('adminPortal');
        const adminEl = document.getElementById('adminNetCommission');
        if(portal) {
            portal.style.display = 'block';
            if(adminEl) adminEl.innerText = `₹${netAdminCommission}.00`;
        }
    } else {
        const menu = document.getElementById('mainMenu');
        if(menu) menu.style.display = 'block';
    }
}

function openPortal(portalName) { window.location.hash = portalName; }
function goBack() { window.location.hash = ''; }

// DOM Load hone ka intezar karein
window.addEventListener('DOMContentLoaded', () => {
    handleRouting();
});

window.addEventListener('hashchange', handleRouting);

// =========================================================================
// 2. LEAFLET MAP & OSRM LOGIC
// =========================================================================
function initializeMap() {
    const mapEl = document.getElementById('map');
    if (!map && mapEl) {
        map = L.map('map').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        map.on('click', handleMapClick);
    }
    if(map) setTimeout(() => { map.invalidateSize(); }, 300);
}

async function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    if (!pickupLatLng) {
        pickupLatLng = e.latlng;
        pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>Pickup</b>").openPopup();
        const pInput = document.getElementById('pickupLocation');
        if(pInput) pInput.value = "Pickup set";
    } else if (!dropLatLng) {
        dropLatLng = e.latlng;
        dropMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>Drop</b>").openPopup();
        const dInput = document.getElementById('dropLocation');
        if(dInput) dInput.value = "Drop set";
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
            const distEl = document.getElementById('distanceDisplay');
            const fareEl = document.getElementById('totalFareDisplay');
            if(distEl) distEl.innerText = `${cachedDistance} km`;
            if(fareEl) fareEl.innerText = `₹${cachedFare}.00`;
        }
    } catch (e) { console.error(e); }
}

// =========================================================================
// 3. CAPTAIN PORTAL LOGIC
// =========================================================================
function toggleDuty() {
    isDriverOnline = !isDriverOnline;
    updateDriverUI();
}

function startOfferCountdown() {
    timeLeft = 10;
    const timerDisplay = document.getElementById('countdownTimer');
    if(timerDisplay) {
        timerDisplay.innerText = `${timeLeft}s`;
        offerTimer = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(offerTimer);
                alert("⏰ Ride Time Out!");
                currentLiveBooking = null; 
                updateDriverUI();
            }
        }, 1000);
    }
}

function initSwipeMechanism() {
    const handle = document.getElementById('swipeTrigger');
    const track = document.getElementById('swipeTrack');
    if (!handle || !track) return;
    
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
            clearInterval(offerTimer);
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
    const dMap = document.getElementById('driverMap');

    // Reset visibility if elements exist
    if(offlineState) offlineState.style.display = "none";
    if(searchingState) searchingState.style.display = "none";
    if(reqCard) reqCard.style.display = "none";
    if(activeCard) activeCard.style.display = "none";
    if(dMap) dMap.style.display = "none";

    if (!isDriverOnline) {
        if(btn) { btn.innerText = "GO ONLINE"; btn.style.backgroundColor = "#28a745"; }
        if(offlineState) offlineState.style.display = "block";
    } else {
        if(btn) { btn.innerText = "GO OFFLINE"; btn.style.backgroundColor = "#dc3545"; }
        
        if (!currentLiveBooking) {
            if(searchingState) searchingState.style.display = "block";
        } else if (currentLiveBooking.status === "requested") {
            const p = document.getElementById('reqPickup');
            const d = document.getElementById('reqDrop');
            if(p) p.innerText = currentLiveBooking.pickup;
            if(d) d.innerText = currentLiveBooking.drop;
            if(reqCard) reqCard.style.display = "block";
            startOfferCountdown();
            initSwipeMechanism();
        } else if (currentLiveBooking.status === "accepted") {
            if(activeCard) activeCard.style.display = "block";
            if(dMap) dMap.style.display = "block";
        }
    }
}

// =========================================================================
// 4. TRIP CONTROL FUNCTIONS
// =========================================================================
function requestLiveBooking() {
    const nameEl = document.getElementById('fullName');
    const pickupEl = document.getElementById('pickupLocation');
    const dropEl = document.getElementById('dropLocation');
    
    if(!nameEl || !nameEl.value) return alert("Enter Name");
    
    currentLiveBooking = {
        name: nameEl.value,
        pickup: pickupEl.value,
        drop: dropEl.value,
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
    initializeDriverNavigationMap(currentLiveBooking.pickupCoords, currentLiveBooking.dropCoords);
    updateDriverUI();
}

function initializeDriverNavigationMap(pCoords, dCoords) {
    if (!driverMap) {
        driverMap = L.map('driverMap').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(driverMap);
    }
    const url = `https://router.project-osrm.org/route/v1/driving/${pCoords.lng},${pCoords.lat};${dCoords.lng},${dCoords.lat}?overview=full&geometries=geojson`;
    fetch(url).then(res => res.json()).then(data => {
        if(data.routes && data.routes.length > 0)
            L.geoJSON(data.routes[0].geometry, { style: { color: '#ffc107', weight: 6 } }).addTo(driverMap);
    });
    setTimeout(() => { if(driverMap) driverMap.invalidateSize(); }, 500);
}

function startRide() {
    const otpEl = document.getElementById('otpInput');
    if(!otpEl) return;
    
    const enteredOTP = otpEl.value;
    if (enteredOTP == "1234") {
        alert("Ride Started!");
        currentLiveBooking.status = "ongoing";
        updateDriverUI();
    } else {
        alert("Invalid OTP");
    }
}

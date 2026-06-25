// =========================================================================
// GLOBAL ARCHITECTURE & STATE MANAGEMENT VARIABLES
// =========================================================================
let map = null;
let pickupLatLng = null;
let dropLatLng = null;
let pickupMarker = null;
let dropMarker = null;
let routingLine = null;

// Driver / Captain Side Map Engine Components
let driverMap = null;
let dPickupMarker = null;
let dDropMarker = null;
let dRoutingLine = null;

// Real-time Cloud Simulation State Engines
let isDriverOnline = false; 
let currentLiveBooking = null; 
let netAdminCommission = 0; // Global Ledger Balance
let selectedPaymentMode = 'cash'; // Default Payment Method

// Cached Variables for Billing Calculations
let cachedDistance = 0;
let cachedFare = 0;

// =========================================================================
// 1. SINGLE PAGE ROUTING & DASHBOARD SPA CONTROLLER
// =========================================================================
function handleRouting() {
    const hash = window.location.hash;

    // Saare separate pages ko pehle secure hide karein
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // Active hash configurations switch routing engine
    if (hash === '#rider') {
        document.getElementById('riderPortal').style.display = 'block';
        initializeMap(); 
    } else if (hash === '#driver') {
        document.getElementById('driverPortal').style.display = 'block';
        updateDriverUI(); 
    } else if (hash === '#admin') {
        document.getElementById('adminPortal').style.display = 'block';
        // Admin workspace core live tracking screen update
        document.getElementById('adminNetCommission').innerText = `₹${netAdminCommission}.00`;
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

// Global Core System Event Initialization Listeners
window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);

// =========================================================================
// 2. LEAFLET MAP RENDERING & GEOLOCATION ADDRESS PARSER
// =========================================================================
function initializeMap() {
    if (!map) {
        // Default View Context Layout: Rudrapur Area [28.98, 79.40]
        map = L.map('map').setView([28.98, 79.40], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', handleMapClick);
    }
    
    // Auto correction layout layer execution timing delay loop
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

async function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const instructionBox = document.getElementById('mapInstruction');

    if (!pickupLatLng) {
        pickupLatLng = e.latlng;
        pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>Pickup Location</b>").openPopup();
        instructionBox.innerHTML = "Ab map par click karke <b>Drop Location</b> select karein.";
        
        document.getElementById('pickupLocation').value = "Fetching address...";
        const address = await fetchAddressName(lat, lng);
        document.getElementById('pickupLocation').value = address;
    } 
    else if (!dropLatLng) {
        dropLatLng = e.latlng;
        dropMarker = L.marker([lat, lng]).addTo(map).bindPopup("<b>Drop Location</b>").openPopup();
        instructionBox.innerHTML = "Locations match ho gayi hain! Niche pricing verify karein.";
        
        document.getElementById('dropLocation').value = "Fetching address...";
        const address = await fetchAddressName(lat, lng);
        document.getElementById('dropLocation').value = address;

        calculateRealRouteAndFare();
    }
}

async function fetchAddressName(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (error) {
        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
}

function resetLocations() {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropMarker) map.removeLayer(dropMarker);
    if (routingLine) map.removeLayer(routingLine);
    
    pickupLatLng = null;
    dropLatLng = null;
    pickupMarker = null;
    dropMarker = null;
    routingLine = null;
    
    cachedDistance = 0;
    cachedFare = 0;
    
    document.getElementById('pickupLocation').value = "";
    document.getElementById('dropLocation').value = "";
    document.getElementById('distanceDisplay').innerText = "0.0 km";
    document.getElementById('totalFareDisplay').innerText = "₹0.00";
    document.getElementById('mapInstruction').innerHTML = "Map par click karke <b>Pickup Location</b> select karein.";
}

// =========================================================================
// 3. OSRM DRIVING DISTANCE ROUTER & ROUNDED PRICING SYSTEM
// =========================================================================
async function calculateRealRouteAndFare() {
    if (!pickupLatLng || !dropLatLng) return;

    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLatLng.lng},${pickupLatLng.lat};${dropLatLng.lng},${dropLatLng.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes.length > 0) {
            const route = data.routes[0];
            cachedDistance = (route.distance / 1000).toFixed(1); 
            
            document.getElementById('distanceDisplay').innerText = `${cachedDistance} km`;

            // Standard Rate Card Calculation Structure: Base ₹30 + ₹12/KM
            const baseFare = 30;
            const perKmRate = 12;
            let finalFare = baseFare + (cachedDistance * perKmRate);
            cachedFare = Math.round(finalFare); 

            document.getElementById('totalFareDisplay').innerText = `₹${cachedFare}.00`;

            if (routingLine) map.removeLayer(routingLine);
            routingLine = L.geoJSON(route.geometry, {
                style: { color: '#007bff', weight: 5, opacity: 0.7 }
            }).addTo(map);

            const group = new L.featureGroup([pickupMarker, dropMarker]);
            map.fitBounds(group.getBounds().pad(0.2));
        } else {
            alert("Road route network clear nahi hai. Kripya doosri location chunein.");
        }
    } catch (error) {
        console.error("OSRM Route Index processing exception error:", error);
    }
}

// =========================================================================
// 4. CAPTAIN LIVE MAP NAVIGATION SYSTEM
// =========================================================================
function initializeDriverNavigationMap(pCoords, dCoords) {
    document.getElementById('driverMap').style.display = "block";
    
    if (!driverMap) {
        driverMap = L.map('driverMap').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(driverMap);
    }

    if (dPickupMarker) driverMap.removeLayer(dPickupMarker);
    if (dDropMarker) driverMap.removeLayer(dDropMarker);
    if (dRoutingLine) driverMap.removeLayer(dRoutingLine);

    dPickupMarker = L.marker([pCoords.lat, pCoords.lng]).addTo(driverMap).bindPopup("<b>Pickup Point</b>").openPopup();
    dDropMarker = L.marker([dCoords.lat, dCoords.lng]).addTo(driverMap).bindPopup("<b>Drop Point</b>");

    const url = `https://router.project-osrm.org/route/v1/driving/${pCoords.lng},${pCoords.lat};${dCoords.lng},${dCoords.lat}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.code === "Ok" && data.routes.length > 0) {
                dRoutingLine = L.geoJSON(data.routes[0].geometry, {
                    style: { color: '#ffc107', weight: 6, opacity: 0.8 }
                }).addTo(driverMap);

                const group = new L.featureGroup([dPickupMarker, dDropMarker]);
                driverMap.fitBounds(group.getBounds().pad(0.2));
            }
        })
        .catch(err => console.error("Driver map calculation logic issue:", err));

    setTimeout(() => {
        driverMap.invalidateSize();
    }, 300);
}

// =========================================================================
// 5. RAPIDO CAPTAIN PORTAL LIFECYCLE & STATE SUBSYSTEMS
// =========================================================================
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
    const ongoingCard = document.getElementById('ongoingRideCard');
    const billCard = document.getElementById('billSummaryCard');

    // Default configuration visibility flush structure
    offlineState.style.display = "none";
    searchingState.style.display = "none";
    reqCard.style.display = "none";
    activeCard.style.display = "none";
    ongoingCard.style.display = "none";
    billCard.style.display = "none";

    if (!isDriverOnline) {
        btn.innerText = "GO ONLINE";
        btn.style.backgroundColor = "#28a745"; 
        offlineState.style.display = "block";
        document.getElementById('driverMap').style.display = "none";
    } else {
        btn.innerText = "GO OFFLINE";
        btn.style.backgroundColor = "#dc3545"; 

        if (!currentLiveBooking) {
            searchingState.style.display = "block";
            document.getElementById('driverMap').style.display = "none";
        } 
        else if (currentLiveBooking.status === "requested") {
            document.getElementById('reqPickup').innerText = currentLiveBooking.pickup;
            document.getElementById('reqDrop').innerText = currentLiveBooking.drop;
            document.getElementById('reqFare').innerText = currentLiveBooking.fare;
            reqCard.style.display = "block";
        } 
        else if (currentLiveBooking.status === "accepted") {
            activeCard.style.display = "block";
        }
        else if (currentLiveBooking.status === "ongoing") {
            ongoingCard.style.display = "block";
        }
        else if (currentLiveBooking.status === "completed") {
            billCard.style.display = "block";
            document.getElementById('driverMap').style.display = "none"; 
        }
    }
}

// =========================================================================
// 6. PASSENGER TRIP TRADING LOOP & INTERFACE ROUTINES
// =========================================================================
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
    if (!name || !phone || phone.length < 10) {
        alert("Kripya valid Name aur 10-digit Mobile Number enter karein!");
        return;
    }

    const generatedOTP = Math.floor(1000 + Math.random() * 9000);

    // Save tracking metadata into secure current object cache context
    currentLiveBooking = {
        name: name,
        phone: phone,
        fare: fare,
        fareRaw: cachedFare,
        distance: cachedDistance,
        pickup: pickup,
        drop: drop,
        otp: generatedOTP,
        status: "requested",
        pickupCoords: pickupLatLng,
        dropCoords: dropLatLng
    };

    // Simulated Real-Time Network Toast SMS Alerts
    const smsBox = document.getElementById('smsNotification');
    document.getElementById('smsMessageContent').innerText = `📬 GoBike Pro: Hi ${name}, your booking OTP is [ ${generatedOTP} ]. Share this with Captain only after sitting on bike.`;
    smsBox.style.display = "block";
    
    setTimeout(() => { smsBox.style.display = "none"; }, 8000);

    alert("🎉 Ride Request Sent! Screen par system notification validation OTP check karein.");
    
    resetLocations(); 
    goBack(); 
}

function acceptRide() {
    if (!currentLiveBooking) return;
    
    currentLiveBooking.status = "accepted";
    updateDriverUI();
    
    // Auto initialization layout structure map mapping engine for driver routing
    initializeDriverNavigationMap(currentLiveBooking.pickupCoords, currentLiveBooking.dropCoords);
}

function startRide() {
    const enteredOTP = document.getElementById('otpInput').value.trim();

    if (!currentLiveBooking) return;

    if (enteredOTP == currentLiveBooking.otp) {
        alert("✅ OTP Verification Successful! Ride shuru ho gayi hai.");
        currentLiveBooking.status = "ongoing";
        document.getElementById('otpInput').value = ""; 
        updateDriverUI();
    } else {
        alert("❌ Verification Error: Galat OTP code enter kiya hai.");
    }
}

// =========================================================================
// 7. RAPIDO TRIP END METRICS (BILLING + PAYMENT SPLIT + ADMINISTRATIVE)
// =========================================================================
function endTripAndGenerateInvoice() {
    if (!currentLiveBooking) return;

    currentLiveBooking.status = "completed";

    // Standard platform matrix calculations engine
    const totalFare = currentLiveBooking.fareRaw;
    const commissionSplit = Math.round(totalFare * 0.20); // 20% Platform Fee Split Structure
    const captainEarnings = totalFare - commissionSplit;

    // Mapping dynamic invoice targets to view component containers
    document.getElementById('billDistance').innerText = `${currentLiveBooking.distance} km`;
    document.getElementById('billFare').innerText = `₹${totalFare}.00`;
    document.getElementById('billCommission').innerText = `-₹${commissionSplit}.00`;
    document.getElementById('billEarnings').innerText = `₹${captainEarnings}.00`;

    // Cache billing calculations into runtime variables for processing validation routines
    currentLiveBooking.calculatedCommission = commissionSplit;

    updateDriverUI();
}

function selectPaymentMode(mode) {
    selectedPaymentMode = mode;
    const cashBtn = document.getElementById('cashPayBtn');
    const qrBtn = document.getElementById('qrPayBtn');
    const qrBox = document.getElementById('qrSection');

    if (mode === 'qr') {
        qrBtn.style.backgroundColor = "#28a745";
        cashBtn.style.backgroundColor = "#6c757d";
        qrBox.style.display = "block";
    } else {
        cashBtn.style.backgroundColor = "#28a745";
        qrBtn.style.backgroundColor = "#6c757d";
        qrBox.style.display = "none";
    }ws
}

function collectPaymentAndReset() {
    if (!currentLiveBooking) return;

    // Central Administrative Accounting Module Synchronization Routine
    netAdminCommission += currentLiveBooking.calculatedCommission;

    alert(`✅ Payment Settle Ho Gaya! Mode: ${selectedPaymentMode.toUpperCase()}. Platform commission successfully updated.`);

    // Resetting systemic state flags back into default mode variables
    currentLiveBooking = null;
    selectedPaymentMode = 'cash';
    
    // UI button state cleanup procedures
    document.getElementById('cashPayBtn').style.backgroundColor = "#6c757d";
    document.getElementById('qrPayBtn').style.backgroundColor = "#6c757d";
    document.getElementById('qrSection').style.display = "none";

    updateDriverUI();
            }

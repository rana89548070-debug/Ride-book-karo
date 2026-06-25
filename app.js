 ko pehle hide karein
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
// Global Map & Booking State Variables (Rider Side)
let map;
let pickupLatLng = null;
let dropLatLng = null;
let pickupMarker = null;
let dropMarker = null;
let routingLine = null;

// Global Map & Navigation Variables (Driver/Captain Side)
let driverMap = null;
let dPickupMarker = null;
let dDropMarker = null;
let dRoutingLine = null;

// Simulated Central Database & Revenue States
let isDriverOnline = false; 
let currentLiveBooking = null; 
let netAdminCommission = 0; // Admin dashboard balance sync tracking
let cachedDistance = 0;
let cachedFare = 0;

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
        // Admin dashboard me dynamic global commission reflect karna
        document.getElementById('adminNetCommission').innerText = `\u20B9${netAdminCommission}.00`;
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
    
    cachedDistance = 0;
    cachedFare = 0;
    
    document.getElementById('pickupLocation').value = "";
    document.getElementById('dropLocation').value = "";
    document.getElementById('distanceDisplay').innerText = "0.0 km";
    document.getElementById('totalFareDisplay').innerText = "\u20B90.00";
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
            cachedDistance = (route.distance / 1000).toFixed(1); // Metres ko KM me convert kiya
            
            document.getElementById('distanceDisplay').innerText = `${cachedDistance} km`;

            // Fare Calculation: \u20B930 Base Fare + \u20B912 Per KM
            const baseFare = 30;
            const perKmRate = 12;
            let finalFare = baseFare + (cachedDistance * perKmRate);
            cachedFare = Math.round(finalFare); // Round figure pricing

            document.getElementById('totalFareDisplay').innerText = `\u20B9${cachedFare}.00`;

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


// ================= 4. DRIVER PORTAL NAVIGATION MAP ENGINE =================
function initializeDriverNavigationMap(pCoords, dCoords) {
    document.getElementById('driverMap').style.display = "block";
    
    if (!driverMap) {
        // Driver navigation view initialize kar rahe hain
        driverMap = L.map('driverMap').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(driverMap);
    }

    // Purani simulation layers ko clear out karein taaki route glitch na ho
    if (dPickupMarker) driverMap.removeLayer(dPickupMarker);
    if (dDropMarker) driverMap.removeLayer(dDropMarker);
    if (dRoutingLine) driverMap.removeLayer(dRoutingLine);

    // Naye markers link karein map instances me
    dPickupMarker = L.marker([pCoords.lat, pCoords.lng]).addTo(driverMap).bindPopup("Pickup Address").openPopup();
    dDropMarker = L.marker([dCoords.lat, dCoords.lng]).addTo(driverMap).bindPopup("Drop Destination");

    // Driving route polyline generation for captain
    const url = `https://router.project-osrm.org/route/v1/driving/${pCoords.lng},${pCoords.lat};${dCoords.lng},${dCoords.lat}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.code === "Ok" && data.routes.length > 0) {
                dRoutingLine = L.geoJSON(data.routes[0].geometry, {
                    style: { color: '#ffc107', weight: 6, opacity: 0.8 } // Gold orange route line for captain
                }).addTo(driverMap);

                const group = new L.featureGroup([dPickupMarker, dDropMarker]);
                driverMap.fitBounds(group.getBounds().pad(0.2));
            }
        })
        .catch(err => console.error("Driver map routing index error:", err));

    // Refitting window bound context safely
    setTimeout(() => {
        driverMap.invalidateSize();
    }, 300);
}


// ================= 5. RAPIDO CAPTAIN: DRIVER STATE MANAGEMENT =================
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
    const driverMapDiv = document.getElementById('driverMap');

    // Sabhi sub-states aur map component ko default state me hide karein
    offlineState.style.display = "none";
    searchingState.style.display = "none";
    reqCard.style.display = "none";
    activeCard.style.display = "none";
    ongoingCard.style.display = "none";
    billCard.style.display = "none";
    driverMapDiv.style.display = "none";

    if (!isDriverOnline) {
        btn.innerText = "GO ONLINE";
        btn.style.backgroundColor = "#28a745"; 
        offlineState.style.display = "block";
    } else {
        btn.innerText = "GO OFFLINE";
        btn.style.backgroundColor = "#dc3545"; 

        // State A: No booking available -> Search matching loops
        if (!currentLiveBooking) {
            searchingState.style.display = "block";
        } 
        // State B: Customer placed request -> Incoming pop up card template
        else if (currentLiveBooking.status === "requested") {
            document.getElementById('reqPickup').innerText = currentLiveBooking.pickup;
            document.getElementById('reqDrop').innerText = currentLiveBooking.drop;
            document.getElementById('reqFare').innerText = `\u20B9${currentLiveBooking.fare}.00`;
            reqCard.style.display = "block";
        } 
        // State C: Captain accepted -> Open OTP input validation box and trigger navigation map path
        else if (currentLiveBooking.status === "accepted") {
            activeCard.style.display = "block";
            initializeDriverNavigationMap(currentLiveBooking.pLoc, currentLiveBooking.dLoc);
        }
        // State D: OTP verified successfully -> Ongoing trip routing is in active progression
        else if (currentLiveBooking.status === "ongoing") {
            ongoingCard.style.display = "block";
            initializeDriverNavigationMap(currentLiveBooking.pLoc, currentLiveBooking.dLoc);
        }
        // State E: Trip marked complete -> Render dynamic invoice statement
        else if (currentLiveBooking.status === "billing") {
            billCard.style.display = "block";
        }
    }
}


// ================= 6. LIVE BOOKING & REAL-TIME SMS OTP SYSTEM =================
function requestLiveBooking() {
    const name = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('mobileNumber').value.trim();
    const pickup = document.getElementById('pickupLocation').value;
    const drop = document.getElementById('dropLocation').value;

    if (!pickup || !drop || cachedFare === 0) {
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

    // Global simulation database cache state update
    currentLiveBooking = {
        name: name,
        phone: phone,
        fare: cachedFare,
        distance: cachedDistance,
        pickup: pickup,
        drop: drop,
        pLoc: pickupLatLng, // Node structure to draw map route on captain view
        dLoc: dropLatLng,   // Node structure to draw map route on captain view
        otp: generatedOTP,
        status: "requested"
    };

    // INSTANT REAL-TIME SMS MESSAGE TOAST DROPDOWN DISPLAY
    const smsBox = document.getElementById('smsNotification');
    document.getElementById('smsMessageContent').innerText = `\u2014 GoBike Pro: Hi ${name}, your booking OTP is [ ${generatedOTP} ]. Share this with Captain only after sitting on bike.`;
    smsBox.style.display = "block";
    
    // 8 Seconds ke baad SMS toast top-screen se automatic hide ho jayega
    setTimeout(() => {
        smsBox.style.display = "none";
    }, 8000);

    alert("\u2014 Booking Request Sent! Aapki screen par real-time OTP message bhej diya gaya hai.");
    
    resetLocations(); // Map clear karein rider terminal par secondary cycle ke liye
    goBack(); // Redirect back to main dashboard hub selection
}

function acceptRide() {
    if (!currentLiveBooking) return;
    
    // State machine transmission: set path to accepted status
    currentLiveBooking.status = "accepted";
    updateDriverUI();
}

function startRide() {
    const enteredOTP = document.getElementById('otpInput').value.trim();

    if (!currentLiveBooking) return;

    // Real-time authentication validation logic check
    if (enteredOTP == currentLiveBooking.otp) {
        alert("\u2705 OTP Verified Successfully! Ride Started. Happy Journey!");
        currentLiveBooking.status = "ongoing"; // Update structural parameters state to active routing
        document.getElementById('otpInput').value = ""; // Clear active input form data
        updateDriverUI(); 
    } else {
        alert("\u274C Galat OTP! Kripya customer se pooch kar sahi code enter karein.");
    }
}


// ================= 7. RAPIDO INVOICING, COMMISSION SPLIT & INVOICE SYSTEMS =================
function endTripAndGenerateInvoice() {
    if (!currentLiveBooking) return;

    // Transitioning configuration state directly into invoicing structure
    currentLiveBooking.status = "billing";

    const totalGrossFare = currentLiveBooking.fare;
    const platformCommission = Math.round(totalGrossFare * 0.20); // 20% Net Platform Fee Deduction Split
    const driverNetEarnings = totalGrossFare - platformCommission;

    // Mapping metrics details into the visual invoice card layout screen elements
    document.getElementById('billDistance').innerText = `${currentLiveBooking.distance} km`;
    document.getElementById('billFare').innerText = `\u20B9${totalGrossFare}.00`;
    document.getElementById('billCommission').innerText = `-\u20B9${platformCommission}.00`;
    document.getElementById('billEarnings').innerText = `\u20B9${driverNetEarnings}.00`;

    // Static cloud synchronization inside admin structural wallet balances ledger 
    netAdminCommission += platformCommission;

    updateDriverUI();
}

function selectPaymentMode(mode) {
    const cashBtn = document.getElementById('cashPayBtn');
    const qrBtn = document.getElementById('qrPayBtn');
    const qrSection = document.getElementById('qrSection');

    if (mode === 'cash') {
        cashBtn.style.backgroundColor = "#28a745"; // Match online green layout
        qrBtn.style.backgroundColor = "#6c757d";   // Gray passive styling selection
        qrSection.style.display = "none";          // Turn down QR element component rendering frame
    } else if (mode === 'qr') {
        qrBtn.style.backgroundColor = "#28a745";   // Active selection tracking flag
        cashBtn.style.backgroundColor = "#6c757d";  // Deselect default state visual mapping matrix
        qrSection.style.display = "block";         // Reveal CSS Simulated payment barcode structure
    }
}

function collectPaymentAndReset() {
    alert("\u2705 Payment Collected & Settled Safely! Sending Captain back to duty cycle.");
    
    // Clear dynamic operational structural data safely to ensure pipeline optimization loops
    currentLiveBooking = null; 
    
    // Reset individual graphical layouts indicators configuration values back to initialization indices
    document.getElementById('qrSection').style.display = "none";
    document.getElementById('cashPayBtn').style.backgroundColor = "#6c757d";
    document.getElementById('qrPayBtn').style.backgroundColor = "#6c757d";
    
    updateDriverUI(); // Drops down flow back into searching dynamic spinner state block loop safely
}

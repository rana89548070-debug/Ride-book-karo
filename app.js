// Global Map Variable
let map;

// 1. ROUTING LOGIC
function handleRouting() {
    const hash = window.location.hash;

    // Saare sections hide karein
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // Hash check karke sahi page dikhayein
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

// FIX: 'fn' ko badal kar 'function' kiya
function goBack() {
    window.location.hash = ''; 
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);


// 2. FARE CALCULATION LOGIC
function checkInputsForFare() {
    const pickup = document.getElementById('pickupLocation').value.trim();
    const drop = document.getElementById('dropLocation').value.trim();
    const fareDisplay = document.getElementById('totalFareDisplay');

    if (pickup === "" || drop === "") {
        fareDisplay.innerText = "₹0.00"; 
        return;
    }

    // Dono inputs bharne par hi fare show hoga
    const baseFare = 40;
    const dynamicSurge = Math.floor(Math.random() * 30) + 10; 
    const finalFare = baseFare + dynamicSurge;

    fareDisplay.innerText = `₹${finalFare}.00`;
}


// 3. MAP FIX LOGIC
function initializeMap() {
    if (!map) {
        // Default coordinates set kiye hain (Rudrapur/Delhi area ke aas paas)
        map = L.map('map').setView([28.98, 79.40], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Live Booking Request
function requestLiveBooking() {
    const name = document.getElementById('fullName').value;
    const phone = document.getElementById('mobileNumber').value;
    const fare = document.getElementById('totalFareDisplay').innerText;

    if(!name || !phone || fare === "₹0.00") {
        alert("Kripya saari details aur locations poori bharein!");
        return;
    }
    
    alert(`Booking Request Sent! Fare: ${fare}`);
}

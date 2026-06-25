// Global Map Variable
let map;

// 1. ROUTING LOGIC: URL ke hash (#) ke mutabik page show/hide karna
function handleRouting() {
    const hash = window.location.hash;

    // Sabhi sections ko pehle hide kar dein
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // Hash check karke sahi page dikhayein
    if (hash === '#rider') {
        document.getElementById('riderPortal').style.display = 'block';
        initializeMap(); // Rider page khulte hi map init ya reset hoga
    } else if (hash === '#driver') {
        document.getElementById('driverPortal').style.display = 'block';
    } else if (hash === '#admin') {
        document.getElementById('adminPortal').style.display = 'block';
    } else {
        // Agar koi hash nahi hai toh main dashboard dikhayein
        document.getElementById('mainMenu').style.display = 'block';
    }
}

// Buttons ke click par URL ka hash change karne ke liye function
function openPortal(portalName) {
    window.location.hash = portalName;
}

// Back button ke liye function
fn goBack() {
    window.location.hash = ''; // Home par le jayega
}

// Page load aur URL change (Refresh) dono events ko track karein
window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);


// 2. FARE CALCULATION LOGIC: Jab tak dono inputs na bhare hon, price calculate nahi hogi
function checkInputsForFare() {
    const pickup = document.getElementById('pickupLocation').value.trim();
    const drop = document.getElementById('dropLocation').value.trim();
    const fareDisplay = document.getElementById('totalFareDisplay');

    if (pickup === "" || drop === "") {
        fareDisplay.innerText = "₹0.00"; // Agar ek bhi field khali hai toh 0
        return;
    }

    // Agar dono bhare hain, tabhi fare calculate karein (Abhi ke liye base rule lagaya hai)
    // Is jagah aap apni real distance calculation logic dal sakte hain
    const baseFare = 40;
    const dynamicSurge = Math.floor(Math.random() * 30) + 10; // Random price fluctuating tabhi hogi jab input chalega
    const finalFare = baseFare + dynamicSurge;

    fareDisplay.innerText = `₹${finalFare}.00`;
}


// 3. MAP FIX LOGIC: Blank gray screen map issue ka ilaaj
function initializeMap() {
    // Agar map pehle se bana hua hai toh use recreate na karein, bas size standard karein
    if (!map) {
        // Default coordinates New Delhi ke hain
        map = L.map('map').setView([28.6139, 77.2090], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Sabse important step: Container display hone ke thodi der baad map resize update karein
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Live Booking Request Trigger
function requestLiveBooking() {
    const name = document.getElementById('fullName').value;
    const phone = document.getElementById('mobileNumber').value;
    const fare = document.getElementById('totalFareDisplay').innerText;

    if(!name || !phone || fare === "₹0.00") {
        alert("Kripya details aur locations poori bharein!");
        return;
    }
    
    alert(`Booking Request Sent! Fare: ${fare}`);
    // Yahan aap apna Firebase database push logic code add kar sakte hain.
}

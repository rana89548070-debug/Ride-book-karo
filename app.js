aps = JSON.parse(localStorage.getItem("rides_captains")) || {};
  let balance = caps[currentCaptain.id] ? caps[currentCaptain.id].balance : 0;
  document.getElementById("lblCaptainWallet").innerText = "₹" + balance.toFixed(2);
}

function logoutAll() {
  currentRider = null;
  currentCaptain = null;
  if(pollingInterval) clearInterval(pollingInterval);
  switchView("portalSelectionScreen");
}

// 5. RIDER SIDE: BOOKING ACTION
function requestBikeRide() {
  if(currentEstimatedFare === 0) return alert("Pehle Fare calculate kijiye!");
  
  let db = JSON.parse(localStorage.getItem("rides")) || [];
  
  // Check if any booking is already pending
  let activeRide = db.find(r => r.riderPhone === currentRider.phone && (r.status === 'Pending' || r.status === 'Accepted' || r.status === 'Ongoing'));
  if(activeRide) return alert("Aapki ek ride pehle se process me chal rahi hai!");

  let newRide = {
    id: "RIDE-" + Date.now(),
    riderName: currentRider.name,
    riderPhone: currentRider.phone,
    pickup: document.getElementById("txtPickup").innerText,
    drop: document.getElementById("txtDrop").innerText,
    fare: currentEstimatedFare,
    distance: currentDistanceText,
    payment: document.getElementById("riderPaymentMethod").value,
    otp: Math.floor(1000 + Math.random() * 9000), // Secure 4 Digit Code
    status: "Pending",
    captainId: null,
    captainName: null,
    timestamp: new Date().toLocaleString()
  };

  db.push(newRide);
  localStorage.setItem("rides", JSON.stringify(db));
  
  document.getElementById("riderStatusBox").classList.remove("hidden");
  document.getElementById("txtTrackStatus").innerText = "Status: Searching for closest Bike Captain...";
}

// 6. REAL-TIME SIMULATION ENGINE (BACKGROUND POLLER)
function startEnginePoller() {
  if(pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(() => {
    let db = JSON.parse(localStorage.getItem("rides")) || [];

    // ====== CASE A: RIDER WINDOW LOGIC UPDATE ======
    if(currentRider) {
      let active = db.find(r => r.riderPhone === currentRider.phone && r.status !== "Completed");
      if(active) {
        document.getElementById("riderStatusBox").classList.remove("hidden");
        if(active.status === "Pending") {
          document.getElementById("txtTrackStatus").innerText = "⏳ Status: Captain allocation pending...";
          document.getElementById("txtTrackOtp").style.display = "none";
        } else if(active.status === "Accepted") {
          document.getElementById("txtTrackStatus").innerText = "🏍️ Status: Captain accepted your Request! Coming to location.";
          document.getElementById("txtTrackCaptainInfo").innerText = `Driver: ${active.captainName} is riding to pick you up.`;
          document.getElementById("txtTrackOtp").innerText = `🔒 Share OTP to Start Trip: ${active.otp}`;
          document.getElementById("txtTrackOtp").style.display = "block";
        } else if(active.status === "Ongoing") {
          document.getElementById("txtTrackStatus").innerText = "⚡ Status: Journey Started. Safe Driving!";
          document.getElementById("txtTrackOtp").style.display = "none";
        }
      } else {
        // Safe reset if no active or completed
        let riderBox = document.getElementById("riderStatusBox");
        if(!riderBox.classList.contains("hidden") && document.getElementById("txtTrackStatus").innerText.includes("Journey Started")) {
           alert("🏁 Trip arrived successfully at Destination! Thank you for choosing Rapido.");
           riderBox.classList.add("hidden");
        }
      }
    }

    // ====== CASE B: DRIVER (CAPTAIN) WINDOW LOGIC UPDATE ======
    if(currentCaptain) {
      // Look for fresh alerts
      let incoming = db.find(r => r.status === "Pending");
      let activeJob = db.find(r => r.captainId === currentCaptain.id && (r.status === "Accepted" || r.status === "Ongoing"));

      if(incoming && !activeJob) {
        document.getElementById("incomingRequestAlert").classList.remove("hidden");
        document.getElementById("txtIncomingDetails").innerHTML = `<b>From:</b> ${incoming.pickup}<br><b>To:</b> ${incoming.drop}<br><b>Fare Earnings:</b> ₹${incoming.fare} (${incoming.distance})`;
      } else {
        document.getElementById("incomingRequestAlert").classList.add("hidden");
      }

      // Handle Current Job Processing UI
      if(activeJob) {
        document.getElementById("captainActiveJobBox").classList.remove("hidden");
        document.getElementById("txtJobDetails").innerHTML = `<b>Customer:</b> ${activeJob.riderName} (<a href="tel:${activeJob.riderPhone}">${activeJob.riderPhone}</a>)<br><b>Route:</b> ${activeJob.drop}<br><b>Amount:</b> ₹${activeJob.fare}`;
        
        if(activeJob.status === "Accepted") {
          document.getElementById("captainOtpBox").classList.remove("hidden");
          document.getElementById("btnEndTrip").classList.add("hidden");
        } else if(activeJob.status === "Ongoing") {
          document.getElementById("captainOtpBox").classList.add("hidden");
          document.getElementById("btnEndTrip").classList.remove("hidden");
        }
      } else {
        document.getElementById("captainActiveJobBox").classList.add("hidden");
      }
      updateCaptainWalletUI();
    }
  }, 2000); // Poll database every 2 seconds for matching actions
}

// 7. DRIVER PORTAL SUB-ACTIONS
function acceptRide() {
  let db = JSON.parse(localStorage.getItem("rides")) || [];
  let rideIndex = db.findIndex(r => r.status === "Pending");
  
  if(rideIndex !== -1) {
    db[rideIndex].status = "Accepted";
    db[rideIndex].captainId = currentCaptain.id;
    db[rideIndex].captainName = currentCaptain.name;
    localStorage.setItem("rides", JSON.stringify(db));
    document.getElementById("incomingRequestAlert").classList.add("hidden");
  }
}

function rejectRide() {
  // Simple view UI close for temporary skip simulation
  document.getElementById("incomingRequestAlert").classList.add("hidden");
}

function startTripWithOtp() {
  let enteredOtp = document.getElementById("txtVerifyOtp").value.trim();
  let db = JSON.parse(localStorage.getItem("rides")) || [];
  let rideIndex = db.findIndex(r => r.captainId === currentCaptain.id && r.status === "Accepted");

  if(rideIndex !== -1) {
    if(db[rideIndex].otp == enteredOtp) {
      db[rideIndex].status = "Ongoing";
      localStorage.setItem("rides", JSON.stringify(db));
      alert("🟢 OTP Match Success! Journey Started safely toward destination drop.");
      document.getElementById("txtVerifyOtp").value = "";
    } else {
      alert("❌ Invalid OTP. Client se unke screen par dikhne wala sahi OTP puchiye.");
    }
  }
}

function endTripAndDeduct() {
  let db = JSON.parse(localStorage.getItem("rides")) || [];
  let rideIndex = db.findIndex(r => r.captainId === currentCaptain.id && r.status === "Ongoing");

  if(rideIndex !== -1) {
    let totalFare = db[rideIndex].fare;
    
    // 🔥 MATH COMMISION CALCULATION ENGINE
    let adminCommission = Math.round(totalFare * 0.05); // 5% cuts to Admin
    let netCaptainShare = totalFare - adminCommission;   // 95% goes to Captain Wallet

    db[rideIndex].status = "Completed";
    db[rideIndex].adminCommissionCollected = adminCommission;
    db[rideIndex].captainEarningCollected = netCaptainShare;
    localStorage.setItem("rides", JSON.stringify(db));

    // Update Captain Database Wallet Balance
    let caps = JSON.parse(localStorage.getItem("rides_captains")) || {};
    if(!caps[currentCaptain.id]) caps[currentCaptain.id] = { balance: 0 };
    caps[currentCaptain.id].balance += netCaptainShare;
    localStorage.setItem("rides_captains", JSON.stringify(caps));

    // Update Admin Database System Balance
    let currentAdminWallet = parseFloat(localStorage.getItem("rides_admin_wallet")) || 0;
    localStorage.setItem("rides_admin_wallet", currentAdminWallet + adminCommission);

    alert(`🏁 Ride Safely Completed!\nTotal Received: ₹${totalFare}\nAdmin 5% Cut: ₹${adminCommission}\nYour Profit (95%): ₹${netCaptainShare}`);
    updateCaptainWalletUI();
  }
}

// 8. ADMIN CONTROL SYSTEM
function loadAdminDashboard() {
  let db = JSON.parse(localStorage.getItem("rides")) || [];
  let caps = JSON.parse(localStorage.getItem("rides_captains")) || {};
  let adminWallet = parseFloat(localStorage.getItem("rides_admin_wallet")) || 0;

  document.getElementById("lblAdminWallet").innerText = "₹" + adminWallet.toFixed(2);
  document.getElementById("statDrivers").innerText = Object.keys(caps).length;
  document.getElementById("statRides").innerText = db.length;

  // Render HTML Master Log rows for Full Admin Visbility
  let logBox = document.getElementById("adminRidesLog");
  logBox.innerHTML = "";
  if(db.length === 0) logBox.innerHTML = "No ride history stored in 'rides' registry.";
  
  db.reverse().forEach(ride => {
    let badgeColor = ride.status === 'Completed' ? 'green' : (ride.status === 'Ongoing' ? 'blue' : 'orange');
    logBox.innerHTML += `
      <div style="border-bottom:1px solid #ddd; padding:6px 0; line-height:1.4;">
        <b>ID:</b> ${ride.id} | <span style="color:${badgeColor}; font-weight:bold;">${ride.status}</span><br>
        <b>Rider:</b> ${ride.riderName} (${ride.riderPhone})<br>
        <b>Captain:</b> ${ride.captainName || 'Not Assigned'}<br>
        <b>Total Cash Flow:</b> ₹${ride.fare} | <b>5% Commission:</b> ₹${ride.adminCommissionCollected || Math.round(ride.fare*0.05)}<br>
        <small style="color:gray;">Time: ${ride.timestamp}</small>
      </div>
    `;
  });
}

// 9. WITHDRAWAL SIMULATION CONTROLLER
function withdrawMoney(role) {
  if(role === 'admin') {
    let bal = parseFloat(localStorage.getItem("rides_admin_wallet")) || 0;
    if(bal <= 0) return alert("Apke Admin account me balance zero hai!");
    if(confirm(`Kya aap apna 5% commission profit balance (₹${bal.toFixed(2)}) apne bank account me transfer karna chahte hain?`)) {
      localStorage.setItem("rides_admin_wallet", 0);
      alert("💸 Congratulations! Capital amount successfully withdrawn to connected Admin Bank/UPI ID Account.");
      loadAdminDashboard();
    }
  } else if(role === 'captain') {
    let caps = JSON.parse(localStorage.getItem("rides_captains")) || {};
    let bal = caps[currentCaptain.id] ? caps[currentCaptain.id].balance : 0;
    if(bal <= 0) return alert("Pehle koi ride ride complete karke paise kamao bhai!");
    if(confirm(`Kya aap apni net bike income (₹${bal.toFixed(2)}) nikalna chahte hain?`)) {
      caps[currentCaptain.id].balance = 0;
      localStorage.setItem("rides_captains", JSON.stringify(caps));
      alert("💸 Wallet Money successfully transferred to your PhonePe/GooglePay UPI Account Linked with Captain ID.");
      updateCaptainWalletUI();
    }
  }
}

function resetSystemDatabase() {
  if(confirm("DANGER! Kya aap saari ride histories, drivers listings aur wallet metrics humesha ke liye mitaana chahte hain?")) {
    localStorage.removeItem("rides");
    localStorage.removeItem("rides_captains");
    localStorage.removeItem("rides_admin_wallet");
    alert("Database Formatted!");
    logoutAll();
  }
}

function phoneHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}
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

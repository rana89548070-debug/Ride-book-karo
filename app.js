let map;
let pickupMarker = null;
let dropMarker = null;

let pickupLat = null, pickupLng = null;
let dropLat = null, dropLng = null;
let currentEstimatedFare = 0;
let currentDistanceText = "";

// Session Storage references for Multi-login simulation
let currentRider = null;
let currentCaptain = null;
let pollingInterval = null;

// 1. INITIALIZE MAP
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 28.6139, lng: 77.2090 }, // Delhi Center default
    zoom: 12,
  });

  map.addListener("click", (e) => {
    if (!pickupLat) {
      alert("📌 Pehle Step 1 wala Live Pickup Button dabayein!");
      return;
    }
    dropLat = e.latLng.lat();
    dropLng = e.latLng.lng();

    if (dropMarker) dropMarker.setMap(null);
    dropMarker = new google.maps.Marker({ position: e.latLng, map: map, label: "B" });

    document.getElementById("txtDrop").innerText = "Drop: Fetching Address...";
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${dropLat}&lon=${dropLng}`)
      .then(r => r.json()).then(data => {
        document.getElementById("txtDrop").innerText = "Drop: " + (data.display_name || "Custom Drop Point").split(',').slice(0,3).join(',');
      }).catch(() => {
        document.getElementById("txtDrop").innerText = `Drop: ${dropLat.toFixed(4)}, ${dropLng.toFixed(4)}`;
      });
  });
}

// 2. GET LIVE LOCATION VIA GPS
function getPickupLocation() {
  document.getElementById("txtPickup").innerText = "📍 Tracking GPS Coordinate...";
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      pickupLat = pos.coords.latitude;
      pickupLng = pos.coords.longitude;
      let loc = { lat: pickupLat, lng: pickupLng };
      map.setCenter(loc);
      map.setZoom(15);

      if (pickupMarker) pickupMarker.setMap(null);
      pickupMarker = new google.maps.Marker({ position: loc, map: map, label: "A" });

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pickupLat}&lon=${pickupLng}`)
        .then(r => r.json()).then(data => {
          document.getElementById("txtPickup").innerText = "Pickup: " + (data.display_name || "Your GPS Location").split(',').slice(0,3).join(',');
        }).catch(() => {
          document.getElementById("txtPickup").innerText = `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;
        });
    }, () => alert("❌ GPS Permission Denied. Please enable location."));
  }
}

// 3. FARE ENGINE (BIKE SPECIFIC RATES)
function calculateBikeFare() {
  if (!pickupLat || !dropLat) {
    alert("📌 Pickup and Drop select hona mandatory hai!");
    return;
  }
  
  // Haversine Formula for Mathematical Distance Calculation
  const R = 6371;
  const dLat = (dropLat - pickupLat) * Math.PI / 180;
  const dLon = (dropLng - pickupLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(pickupLat*Math.PI/180) * Math.cos(dropLat*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let realKm = (R * c) * 1.35; // 1.35 Multiplier for real curved road paths
  if(realKm < 1) realKm = 1;

  // Bike Taxi Pricing Rules (Cheap Economy Rates)
  const basePrice = 20; // First 2 Kms entry fee
  const perKmRate = 8;  // 8 Rs per KM for Bike Taxi
  currentEstimatedFare = Math.round(basePrice + (realKm * perKmRate));
  currentDistanceText = realKm.toFixed(1) + " KM";

  document.getElementById("txtDistance").innerText = "Distance: " + currentDistanceText;
  document.getElementById("txtFare").innerText = "Estimated Bike Fare: ₹" + currentEstimatedFare;
}

// 4. DATABASE SYNC & ROUTING CONTROLLERS
function switchView(id) {
  document.getElementById("portalSelectionScreen").classList.add("hidden");
  document.getElementById("riderLoginPortal").classList.add("hidden");
  document.getElementById("captainLoginPortal").classList.add("hidden");
  document.getElementById("riderDashboard").classList.add("hidden");
  document.getElementById("captainDashboard").classList.add("hidden");
  document.getElementById("adminPortal").classList.add("hidden");

  document.getElementById(id).classList.remove("hidden");
  if(id === 'adminPortal') loadAdminDashboard();
}

function loginRider() {
  let name = document.getElementById("riderName").value.trim();
  let phone = document.getElementById("riderPhone").value.trim();
  if(!name || !phone) return alert("All fields are mandatory");
  currentRider = { name, phone };
  document.getElementById("lblRiderName").innerText = name;
  switchView("riderDashboard");
  startEnginePoller();
}

function loginCaptain() {
  let name = document.getElementById("captainName").value.trim();
  let bike = document.getElementById("captainVehicle").value.trim();
  if(!name || !bike) return alert("All fields are mandatory");
  
  let capId = "CAP-" + phoneHash(name);
  currentCaptain = { id: capId, name, bike };
  
  // Register Captain in Database
  let caps = JSON.parse(localStorage.getItem("rides_captains")) || {};
  if(!caps[capId]) caps[capId] = { balance: 0 };
  localStorage.setItem("rides_captains", JSON.stringify(caps));

  document.getElementById("lblCaptainName").innerText = name + ` (${bike})`;
  updateCaptainWalletUI();
  switchView("captainDashboard");
  startEnginePoller();
}

function updateCaptainWalletUI() {
  if(!currentCaptain) return;
  let caps = JSON.parse(localStorage.getItem("rides_captains")) || {};
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

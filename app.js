let map;
let pickupMarker = null;
let dropMarker = null;

let pickupLat = null;
let pickupLng = null;
let dropLat = null;
let dropLng = null;
let totalFare = 0;

// 1. MAP INITIALIZE
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.5937, lng: 78.9629 }, // Shuru me India center dikhega
    zoom: 5,
  });

  // Map click listener - Drop Location ke liye
  map.addListener("click", (mapsMouseEvent) => {
    if (pickupLat === null || pickupLng === null) {
      alert("📌 Bhai, pehle upar wale '1. Get Live Pickup Location' button par click karo!");
      return;
    }

    const clickedPos = mapsMouseEvent.latLng;
    dropLat = clickedPos.lat();
    dropLng = clickedPos.lng();

    if (dropMarker) dropMarker.setMap(null);

    dropMarker = new google.maps.Marker({
      position: clickedPos,
      map: map,
      label: "D",
    });

    // FREE GEOCORDER: OpenStreetMap se address nikalna (No Keys Required)
    document.getElementById("dropText").innerText = "Drop: Fetching address...";
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${dropLat}&lon=${dropLng}`)
      .then(res => res.json())
      .then(data => {
        let address = data.display_name || "Selected Location";
        // Address ko thoda chota karke dikhane ke liye shuru ke 3 part liye
        document.getElementById("dropText").innerText = "Drop: " + address.split(',').slice(0,3).join(',');
      })
      .catch(() => {
        document.getElementById("dropText").innerText = `Drop: ${dropLat.toFixed(4)}, ${dropLng.toFixed(4)}`;
      });
  });
}

// 2. LIVE PICKUP LOCATION FETCH KARNA
function getPickup() {
  const pickupText = document.getElementById("pickupText");
  pickupText.innerText = "📍 Fetching location...";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickupLat = pos.coords.latitude;
        pickupLng = pos.coords.longitude;
        const myLocation = { lat: pickupLat, lng: pickupLng };

        map.setCenter(myLocation);
        map.setZoom(15);

        if (pickupMarker) pickupMarker.setMap(null);

        pickupMarker = new google.maps.Marker({
          position: myLocation,
          map: map,
          label: "P",
        });

        // FREE GEOCORDER FOR PICKUP
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pickupLat}&lon=${pickupLng}`)
          .then(res => res.json())
          .then(data => {
            let address = data.display_name || "Your Location";
            pickupText.innerText = "Pickup: " + address.split(',').slice(0,3).join(',');
          })
          .catch(() => {
            pickupText.innerText = `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;
          });
      },
      (error) => {
        alert("❌ Browser me location permission 'Allow' karein!");
        pickupText.innerText = "Pickup: Permission Denied";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    alert("❌ Aapka browser location support nahi karta.");
  }
}

// 3. FARE CALCULATOR (Mathematical Driving Distance - 100% Free)
function calculateFare() {
  const distanceText = document.getElementById("distanceText");
  const fareText = document.getElementById("fareText");

  if (pickupLat === null || dropLat === null) {
    alert("📌 Pehle Pickup aur Map par Drop location select karein!");
    return;
  }

  distanceText.innerText = "Distance: Calculating...";

  // Haversine Formula: Do coordinates ke beech ki mathematical duri
  const R = 6371; // Earth's radius in km
  const dLat = (dropLat - pickupLat) * Math.PI / 180;
  const dLon = (dropLng - pickupLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pickupLat * Math.PI / 180) * Math.cos(dropLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let straightDistance = R * c; 

  // Sadkein thodi ghumadaar hoti hain, isliye 1.3 se multiply karke realistic driving KM nikala hai
  let drivingDistanceKm = straightDistance * 1.3; 
  if (drivingDistanceKm < 1) drivingDistanceKm = 1; // Minimum 1 KM line

  const ratePerKm = 12; // ₹12 per KM ka rate
  const baseFare = 30;  // Base booking charge
  totalFare = Math.round(baseFare + (drivingDistanceKm * ratePerKm));

  // UI par text update karna
  distanceText.innerText = "Distance: " + drivingDistanceKm.toFixed(1) + " km";
  fareText.innerText = "Fare: ₹" + totalFare;
}

// 4. BOOK RIDE LOGIC (Admin/Dashboard support ke sath)
function bookRide() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const fareText = document.getElementById("fareText").innerText;
  const distanceText = document.getElementById("distanceText").innerText;

  if (!name || !phone) {
    alert("📌 Pehle apna Name aur Phone number daalo!");
    return;
  }
  if (fareText.includes("--")) {
    alert("📌 Pehle 'Calculate Distance & Fare' button dabayein!");
    return;
  }

  // Admin panel me save karne ke liye object banaya
  let newBooking = {
    customerName: name,
    customerPhone: phone,
    rideDistance: distanceText,
    rideFare: fareText,
    time: new Date().toLocaleString()
  };

  let totalBookings = JSON.parse(localStorage.getItem("allRides")) || [];
  totalBookings.push(newBooking);
  localStorage.setItem("allRides", JSON.stringify(totalBookings));

  alert(`🎉 Congratulations ${name}!\nAapki ride book ho chuki hai.\n${fareText}\nHamara driver aapko ${phone} par call karega.`);
  
  // Clear inputs
  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
}

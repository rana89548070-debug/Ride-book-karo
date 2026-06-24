let map;
let pickupMarker = null;
let dropMarker = null;

let pickupLat = null;
let pickupLng = null;
let dropLat = null;
let dropLng = null;
let totalFare = 0;

// 1. WEB PAGE LOAD HOTE HI MAP INITIALIZE KARNA
function initMap() {
  // Shuruat me map India ke center par dikhega
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.5937, lng: 78.9629 },
    zoom: 5,
  });

  // MAP PAR CLICK KARNE KA LISTENER (Drop location select karne ke liye)
  map.addListener("click", (mapsMouseEvent) => {
    // Agar user ne pehle apni live location fetch nahi ki toh warning do
    if (pickupLat === null || pickupLng === null) {
      alert("📌 Bhai, pehle upar wale '1. Get Live Pickup Location' button par click karke apni location fetch karo!");
      return;
    }

    const clickedPos = mapsMouseEvent.latLng;
    dropLat = clickedPos.lat();
    dropLng = clickedPos.lng();

    // Agar pehle se koi Drop marker hai toh use hatao
    if (dropMarker) {
      dropMarker.setMap(null);
    }

    // Map par naya Red Marker lagao Drop location ke liye
    dropMarker = new google.maps.Marker({
      position: clickedPos,
      map: map,
      title: "Drop Location",
      label: "D", // D stands for Drop
    });

    document.getElementById("dropText").innerText = `Drop Selected: ${dropLat.toFixed(4)}, ${dropLng.toFixed(4)}`;
    console.log("Drop Location Clicked:", dropLat, dropLng);
  });
}

// 2. LIVE LOCATION FETCH KARNE KA LOGIC
function getPickup() {
  const pickupText = document.getElementById("pickupText");
  pickupText.innerText = "📍 Fetching location...";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickupLat = pos.coords.latitude;
        pickupLng = pos.coords.longitude;
        const myLocation = { lat: pickupLat, lng: pickupLng };

        pickupText.innerText = `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;

        // Map ko user ki live location par zoom karo
        map.setCenter(myLocation);
        map.setZoom(14);

        if (pickupMarker) {
          pickupMarker.setMap(null);
        }

        // Map par user ki position par Green/Blue marker lagao
        pickupMarker = new google.maps.Marker({
          position: myLocation,
          map: map,
          title: "Aapki Location",
          label: "P", // P stands for Pickup
        });
      },
      (error) => {
        console.error(error);
        alert("❌ Location fetch nahi ho payi! Phone/Browser ki Settings me ja kar Location allow karein.");
        pickupText.innerText = "Pickup: Permission Denied";
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  } else {
    alert("❌ Geolocation is not supported by this browser.");
  }
}

// 3. FARE AUR DISTANCE CALCULATE KARNE KA LOGIC
function calculateFare() {
  const distanceText = document.getElementById("distanceText");
  const fareText = document.getElementById("fareText");

  if (pickupLat === null || pickupLng === null) {
    alert("📌 Pehle apni Live Pickup Location fetch karein!");
    return;
  }

  if (dropLat === null || dropLng === null) {
    alert("📌 Map par kisi bhi jagah touch/click karke apni Drop Location select karein!");
    return;
  }

  distanceText.innerText = "Distance: Calculating...";
  fareText.innerText = "Fare: --";

  const service = new google.maps.DistanceMatrixService();
  
  service.getDistanceMatrix(
    {
      origins: [{ lat: pickupLat, lng: pickupLng }],   // Pickup Coordinates
      destinations: [{ lat: dropLat, lng: dropLng }], // Drop Coordinates (Direct from Map!)
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
    },
    (response, status) => {
      if (status !== "OK") {
        alert("❌ Google Maps API Error: " + status);
        return;
      }

      const element = response.rows[0].elements[0];

      if (element.status !== "OK") {
        alert("❌ Is jagah tak gaadi ka rasta nahi mila! Kripya map par thoda sahi jagah click karein.");
        distanceText.innerText = "Distance: Route Not Found";
        return;
      }

      const distanceKm = element.distance.value / 1000;
      const distanceStr = element.distance.text;

      const ratePerKm = 12; // ₹12 per KM का रेट
      totalFare = Math.round(distanceKm * ratePerKm);

      distanceText.innerText = "Distance: " + distanceStr;
      fareText.innerText = "Fare: ₹" + totalFare;
    }
  );
}

// 4. RIDE BOOKING LOGIC
function bookRide() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const fareText = document.getElementById("fareText").innerText;

  if (!name || !phone) {
    alert("📌 Pehle apna Name aur Phone number daalo!");
    return;
  }

  if (fareText.includes("--") || fareText.includes("Error")) {
    alert("📌 Pehle 'Calculate Distance & Fare' button daba kar kiraya check karo!");
    return;
  }

  alert(`🎉 Congratulations ${name}!\nAapki ride book ho chuki hai.\n${fareText}\nHamara driver aapko ${phone} par call karega.`);
}

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
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.5937, lng: 78.9629 }, // India center
    zoom: 5,
  });

  // MAP PAR CLICK KARNE KA LISTENER (Drop location select karne ke liye)
  map.addListener("click", (mapsMouseEvent) => {
    if (pickupLat === null || pickupLng === null) {
      alert("📌 Bhai, pehle upar wale '1. Get Live Pickup Location' button par click karke apni location fetch karo!");
      return;
    }

    const clickedPos = mapsMouseEvent.latLng;
    dropLat = clickedPos.lat();
    dropLng = clickedPos.lng();

    if (dropMarker) {
      dropMarker.setMap(null);
    }

    dropMarker = new google.maps.Marker({
      position: clickedPos,
      map: map,
      title: "Drop Location",
      label: "D",
    });

    // === GEOCODING LOGIC FOR DROP ===
    document.getElementById("dropText").innerText = "Drop: Fetching address...";
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ location: clickedPos }, (results, status) => {
      if (status === "OK" && results[0]) {
        // Coordinates ki jagah real address text dikhayega
        document.getElementById("dropText").innerText = "Drop: " + results[0].formatted_address;
      } else {
        document.getElementById("dropText").innerText = `Drop Selected: ${dropLat.toFixed(4)}, ${dropLng.toFixed(4)}`;
      }
    });
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

        map.setCenter(myLocation);
        map.setZoom(15);

        if (pickupMarker) {
          pickupMarker.setMap(null);
        }

        pickupMarker = new google.maps.Marker({
          position: myLocation,
          map: map,
          title: "Aapki Location",
          label: "P",
        });

        // === GEOCODING LOGIC FOR PICKUP ===
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: myLocation }, (results, status) => {
          if (status === "OK" && results[0]) {
            // Live location coordinates ko real address me badla
            pickupText.innerText = "Pickup: " + results[0].formatted_address;
          } else {
            pickupText.innerText = `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;
          }
        });
      },
      (error) => {
        alert("❌ Location fetch nahi ho payi! Phone/Browser me permission allow karein.");
        pickupText.innerText = "Pickup: Permission Denied";
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    alert("❌ Geolocation is not supported by this browser.");
  }
}

// 3. FARE AUR DISTANCE CALCULATE KARNE KA LOGIC
function calculateFare() {
  const distanceText = document.getElementById("distanceText");
  const fareText = document.getElementById("fareText");

  if (pickupLat === null || dropLat === null) {
    alert("📌 Pehle apni Live Pickup aur Map par Drop location select karein!");
    return;
  }

  distanceText.innerText = "Distance: Calculating...";
  fareText.innerText = "Fare: --";

  const service = new google.maps.DistanceMatrixService();
  
  service.getDistanceMatrix(
    {
      origins: [{ lat: pickupLat, lng: pickupLng }],
      destinations: [{ lat: dropLat, lng: dropLng }],
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
        alert("❌ Is jagah tak gaadi ka rasta nahi mila!");
        distanceText.innerText = "Distance: Route Not Found";
        return;
      }

      const distanceKm = element.distance.value / 1000;
      const distanceStr = element.distance.text;

      const ratePerKm = 12; 
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

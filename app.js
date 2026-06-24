let pickupLat = null;
let pickupLng = null;
let totalFare = null;

/* ========= GET PICKUP LOCATION ========= */
window.getPickup = function () {
  if (!navigator.geolocation) {
    alert("Geolocation supported nahi hai");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      pickupLat = position.coords.latitude;
      pickupLng = position.coords.longitude;

      document.getElementById("pickupText").innerText =
        `Pickup: ${pickupLat.toFixed(5)}, ${pickupLng.toFixed(5)}`;
    },
    (error) => {
      alert("❌ Location allow nahi ki");
      console.error(error);
    }
  );
};

/* ========= CALCULATE DISTANCE + FARE ========= */
window.calculateFare = function () {
  if (pickupLat === null || pickupLng === null) {
    alert("❌ Pehle pickup location lo");
    return;
  }

  const drop = document.getElementById("drop").value.trim();
  if (!drop) {
    alert("❌ Drop location likho");
    return;
  }

  if (!window.google || !google.maps) {
    alert("❌ Google Maps load nahi hua");
    return;
  }

  const service = new google.maps.DistanceMatrixService();

  service.getDistanceMatrix(
    {
      origins: [{ lat: pickupLat, lng: pickupLng }],
      destinations: [drop],
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (response, status) => {
      if (status !== "OK") {
        alert("❌ Google Maps Error: " + status);
        console.error(response);
        return;
      }

      const element = response.rows[0].elements[0];

      if (element.status !== "OK") {
        alert("❌ Drop location galat hai");
        return;
      }

      const distanceKm = element.distance.value / 1000;

      const baseFare = 30; // ₹
      const perKm = 12;    // ₹ per km
      totalFare = Math.round(baseFare + distanceKm * perKm);

      document.getElementById("distanceText").innerText =
        "Distance: " + element.distance.text;

      document.getElementById("fareText").innerText =
        "Fare: ₹" + totalFare;
    }
  );
};

/* ========= BOOK RIDE ========= */
window.bookRide = function () {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const drop = document.getElementById("drop").value.trim();

  if (!name || !phone || !pickupLat || !pickupLng || !drop || !totalFare) {
    alert("❌ Pehle pickup lo, fare calculate karo, phir book karo");
    return;
  }

  alert(
    "✅ Ride Booked Successfully!\n\n" +
    "Name: " + name +
    "\nPhone: " + phone +
    "\nPickup: " + pickupLat.toFixed(4) + ", " + pickupLng.toFixed(4) +
    "\nDrop: " + drop +
    "\nFare: ₹" + totalFare
  );
};

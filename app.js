let pickupLat, pickupLng;

function getPickup() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      pickupLat = pos.coords.latitude;
      pickupLng = pos.coords.longitude;

      document.getElementById("pickupText").innerText =
        `Pickup: ${pickupLat}, ${pickupLng}`;
    }, () => {
      alert("Location access allow karo");
    });
  } else {
    alert("Geolocation not supported");
  }
}

function calculateFare() {
  let drop = document.getElementById("drop").value;
  if (!pickupLat || !drop) {
    alert("Pickup ya Drop missing");
    return;
  }

  let geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: drop }, function (results, status) {
    if (status === "OK") {
      let dropLat = results[0].geometry.location.lat();
      let dropLng = results[0].geometry.location.lng();

      let service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix({
        origins: [{ lat: pickupLat, lng: pickupLng }],
        destinations: [{ lat: dropLat, lng: dropLng }],
        travelMode: 'DRIVING',
      }, function (response, status) {
        if (status === "OK") {
          let distanceText =
            response.rows[0].elements[0].distance.text;
          let distanceValue =
            response.rows[0].elements[0].distance.value / 1000;

          let fare = Math.round(distanceValue * 12);

          document.getElementById("distanceText").innerText =
            "Distance: " + distanceText;

          document.getElementById("fareText").innerText =
            "Fare: ₹" + fare;
        } else {
          alert("Distance error");
        }
      });

    } else {
      alert("Drop location not found");
    }
  });
}

function bookRide() {
  alert("🚕 Ride Booked Successfully!");
}    return;
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

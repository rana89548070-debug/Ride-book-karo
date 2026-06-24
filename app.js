// Global variables jo poore code me use honge
let pickupLat = null;
let pickupLng = null;
let totalFare = 0;

/* ========= 1. GET PICKUP LOCATION ========= */
function getPickup() {
  const pickupText = document.getElementById("pickupText");
  pickupText.innerText = "📍 Fetching location...";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickupLat = pos.coords.latitude;
        pickupLng = pos.coords.longitude;

        // UI par coordinates dikhane ke liye
        pickupText.innerText = `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;
      },
      (error) => {
        alert("❌ Location access allow karo browser me!");
        pickupText.innerText = "Pickup: Permission Denied";
      }
    );
  } else {
    alert("❌ Geolocation not supported by your browser");
  }
}

/* ========= 2. CALCULATE DISTANCE & FARE ========= */
function calculateFare() {
  let drop = document.getElementById("drop").value.trim();

  // Validation checks
  if (!pickupLat || !pickupLng) {
    alert("❌ Pehle 'Get Pickup Location' button par click karein!");
    return;
  }
  if (!drop) {
    alert("❌ Please Enter Drop Location!");
    return;
  }
  if (!window.google || !google.maps) {
    alert("❌ Google Maps script abhi load nahi hui hai");
    return;
  }

  document.getElementById("distanceText").innerText = "Distance: Calculating...";
  document.getElementById("fareText").innerText = "Fare: --";

  const service = new google.maps.DistanceMatrixService();

  // Google Distance Matrix API directly text address support karti hai
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
        alert("❌ Drop location nahi mili ya wahan ka rasta nahi mila!");
        document.getElementById("distanceText").innerText = "Distance: Not Found";
        return;
      }

      // Meters ko KM me convert karne ke liye
      const distanceKm = element.distance.value / 1000;

      // Fare Calculation Logic
      const baseFare = 30; // Base charge ₹30
      const perKm = 12;    // ₹12 per km
      totalFare = Math.round(baseFare + distanceKm * perKm);

      // UI par data update karne ke liye
      document.getElementById("distanceText").innerText = "Distance: " + element.distance.text;
      document.getElementById("fareText").innerText = "Fare: ₹" + totalFare;
    }
  );
}

/* ========= 3. BOOK RIDE ========= */
function bookRide() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const drop = document.getElementById("drop").value.trim();

  if (!name || !phone) {
    alert("❌ Pehle apna Name aur Phone number fill karo!");
    return;
  }
  if (!pickupLat || !drop || totalFare === 0) {
    alert("❌ Pehle pickup lo aur fare calculate karo!");
    return;
  }

  // Final Success Alert
  alert(
    "🎉 Ride Booked Successfully!\n\n" +
    "👤 Name: " + name +
    "\n📞 Phone: " + phone +
    "\n📍 Pickup Coords: " + pickupLat.toFixed(4) + ", " + pickupLng.toFixed(4) +
    "\n🏁 Drop: " + drop +
    "\n💰 Total Fare: ₹" + totalFare
  );
}
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

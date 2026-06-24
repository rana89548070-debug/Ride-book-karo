let pickupLat = null;
let pickupLng = null;
let totalFare = null;

/* ===== GET PICKUP LOCATION ===== */
function getPickup() {
  if (!navigator.geolocation) {
    alert("Geolocation supported nahi hai");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pickupLat = pos.coords.latitude;
      pickupLng = pos.coords.longitude;

      document.getElementById("pickupText").innerText =
        `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;
    },
    () => {
      alert("❌ Location allow nahi ki");
    }
  );
}

/* ===== CALCULATE DISTANCE + FARE ===== */
function calculateFare() {
  if (!pickupLat || !pickupLng) {
    alert("❌ Pehle pickup location lo");
    return;
  }

  const drop = document.getElementById("drop").value.trim();
  if (!drop) {
    alert("❌ Drop location likho");
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
        alert("Distance error: " + status);
        return;
      }

      const element = response.rows[0].elements[0];

      if (element.status !== "OK") {
        alert("Drop location invalid hai");
        return;
      }

      const distanceKm = element.distance.value / 1000;

      const baseFare = 30;
      const perKm = 12;
      totalFare = Math.round(baseFare + distanceKm * perKm);

      document.getElementById("distanceText").innerText =
        "Distance: " + element.distance.text;

      document.getElementById("fareText").innerText =
        "Fare: ₹" + totalFare;
    }
  );
}

/* ===== BOOK RIDE ===== */
function bookRide() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const drop = document.getElementById("drop").value.trim();

  if (!name || !phone || !pickupLat || !drop || !totalFare) {
    alert("❌ Sab details complete karo");
    return;
  }

  alert(
    "✅ Ride Booked!\n\n" +
    "Name: " + name +
    "\nPhone: " + phone +
    "\nFare: ₹" + totalFare
  );
}  // 🔢 FAKE distance (demo purpose)
  let distanceKm = Math.floor(Math.random() * 10) + 1;

  let ratePerKm = 10; // ₹10 per km
  let fare = distanceKm * ratePerKm;

  document.getElementById("distanceText").innerText =
    `Distance: ${distanceKm} km`;

  document.getElementById("fareText").innerText =
    `Fare: ₹${fare}`;
}

// STEP 3: Book Ride
function bookRide() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;

  if (name === "" || phone === "") {
    alert("Name aur Phone bharo");
    return;
  }

  alert("✅ Ride Booked Successfully!");
}  if (!pickupLat || !pickupLng) {
    alert("Pickup location lo pehle");
    return;
  }

  const drop = document.getElementById("drop").value.trim();
  if (!drop) {
    alert("Drop location daalo");
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
        alert("Distance error: " + status);
        return;
      }

      const element = response.rows[0].elements[0];
      const distanceKm = element.distance.value / 1000;

      const baseFare = 30;
      const perKm = 12;
      totalFare = Math.round(baseFare + distanceKm * perKm);

      document.getElementById("distanceText").innerText =
        "Distance: " + element.distance.text;
      document.getElementById("fareText").innerText =
        "Fare: ₹" + totalFare;
    }
  );
};

/* ===== BOOK RIDE ===== */
window.bookRide = async function () {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const drop = document.getElementById("drop").value.trim();

  if (!name || !phone || !pickupLat || !drop || !totalFare) {
    alert("❌ Complete details bharo");
    return;
  }

  await addDoc(collection(db, "rides"), {
    name,
    phone,
    pickupLat,
    pickupLng,
    drop,
    fare: totalFare,
    status: "Pending",
    createdAt: serverTimestamp()
  });

  alert("✅ Ride Booked Successfully");
};

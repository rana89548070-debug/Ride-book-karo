import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ===== GLOBAL ===== */
window.pickupLat = null;
window.pickupLng = null;
window.pickupAddress = null;
window.totalFare = null;

/* ===== GET LOCATION (GPS only) ===== */
window.getLocation = function () {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pickupLat = pos.coords.latitude;
      pickupLng = pos.coords.longitude;

      document.getElementById("pickupText").innerText =
        "Pickup Coordinates: " + pickupLat + ", " + pickupLng;
    },
    () => {
      alert("❌ Location denied");
    }
  );
};

/* ===== CALCULATE FARE (Google Maps SDK) ===== */
window.calculateFare = function () {
  if (!pickupLat || !pickupLng) {
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

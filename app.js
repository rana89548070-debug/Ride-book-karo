import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ===== GLOBAL ===== */
const apiKey = "AIzaSyCW0a_ClbmEG0gnyZZ_DzPvmPFvx20mfk8";

window.pickupLat = null;
window.pickupLng = null;
window.pickupAddress = null;
window.totalFare = null;

/* ===== GET LOCATION ===== */
window.getLocation = function () {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      pickupLat = position.coords.latitude;
      pickupLng = position.coords.longitude;

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pickupLat},${pickupLng}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      pickupAddress = data.results[0].formatted_address;
      document.getElementById("pickupText").innerText =
        "Pickup: " + pickupAddress;
    },
    () => {
      alert("❌ Location denied");
    }
  );
};

/* ===== CALCULATE FARE ===== */
window.calculateFare = async function () {
  if (!pickupLat || !pickupLng) {
    alert("Pickup location lo pehle");
    return;
  }

  const drop = document.getElementById("drop").value.trim();
  if (!drop) {
    alert("Drop location daalo");
    return;
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${encodeURIComponent(
    drop
  )}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  const element = data.rows[0].elements[0];
  const distanceKm = element.distance.value / 1000;

  const baseFare = 30;
  const perKm = 12;
  totalFare = Math.round(baseFare + distanceKm * perKm);

  document.getElementById("distanceText").innerText =
    "Distance: " + element.distance.text;
  document.getElementById("fareText").innerText =
    "Fare: ₹" + totalFare;
};

/* ===== BOOK RIDE ===== */
window.bookRide = async function () {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const drop = document.getElementById("drop").value.trim();

  if (!name || !phone || !pickupAddress || !drop || !totalFare) {
    alert("❌ Complete details bharo");
    return;
  }

  await addDoc(collection(db, "rides"), {
    name,
    phone,
    pickup: pickupAddress,
    drop,
    fare: totalFare,
    status: "Pending",
    createdAt: serverTimestamp()
  });

  alert("✅ Ride Booked Successfully");
};

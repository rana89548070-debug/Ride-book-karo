// app.js (FINAL COMPLETE VERSION)

import { db } from "./firebase.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* =========================
   USER LOCATION (GPS)
========================= */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        reject("Location permission denied");
      }
    );
  });
}

/* =========================
   FARE CALCULATION
========================= */
function calculateFare(distanceKm) {
  const baseFare = 30;   // ₹ base
  const perKm = 10;      // ₹ per km
  return baseFare + distanceKm * perKm;
}

/* =========================
   MAIN BOOK RIDE FUNCTION
========================= */
window.bookRide = async function () {

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const destination = document.getElementById("destination").value.trim();

  if (!name || !phone || !destination) {
    alert("Please fill all details");
    return;
  }

  let pickupLocation;
  try {
    pickupLocation = await getUserLocation();
  } catch (error) {
    alert("Please allow location access");
    return;
  }

  // Temporary distance logic (REAL maps later)
  const distanceKm = Math.floor(Math.random() * 8) + 2; // 2–10 km
  const fare = calculateFare(distanceKm);

  try {
    await addDoc(collection(db, "rides"), {
      name: name,
      phone: phone,
      destination: destination,

      pickupLocation: pickupLocation,
      distanceKm: distanceKm,
      fare: fare,

      status: "Pending",
      paymentType: "Cash",

      createdAt: new Date()
    });

    alert(`Ride Booked ✅\nEstimated Fare: ₹${fare}`);

    // optional: clear fields
    document.getElementById("name").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("destination").value = "";

  } catch (error) {
    console.error(error);
    alert("Something went wrong. Try again.");
  }
};

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let userLat = null;
let userLng = null;
let fare = null;

/* 📍 LOCATION FETCH */
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;

      document.getElementById("locationText").innerText =
        "📍 Location fetched";

      // Simple fare logic
      fare = 50; // base fare
      document.getElementById("fareText").innerText =
        "💰 Fare: ₹" + fare;
    },
    () => {
      document.getElementById("locationText").innerText =
        "❌ Location denied";
    }
  );
}

/* 🚕 BOOK RIDE */
window.bookRide = async function () {
  try {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !phone) {
      alert("Name & Phone required");
      return;
    }

    if (!userLat || !userLng) {
      alert("Location not available");
      return;
    }

    await addDoc(collection(db, "rides"), {
      name,
      phone,
      location: {
        lat: userLat,
        lng: userLng
      },
      fare,
      status: "Pending",
      createdAt: serverTimestamp()
    });

    alert("✅ Ride Booked Successfully");

    document.getElementById("name").value = "";
    document.getElementById("phone").value = "";

  } catch (error) {
    console.error(error);
    alert("❌ Error, check console");
  }
};

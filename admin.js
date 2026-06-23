import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const rideList = document.getElementById("rideList");

window.loadAdminRides = () => {
    onSnapshot(collection(db, "rides"), (snapshot) => {
        rideList.innerHTML = "";
        snapshot.forEach((doc) => {
            const ride = doc.data();
            rideList.innerHTML += `
                <div style="border:1px solid #ccc; padding:10px; margin:10px;">
                    <p>Name: ${ride.name} | Phone: ${ride.phone}</p>
                    <p>Status: ${ride.status}</p>
                </div>
            `;
        });
    });
};

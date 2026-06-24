import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.bookRide = async () => {
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    await addDoc(collection(db, "rides"), { name, phone, status: "Pending" });
    alert("Ride Booked!");
};

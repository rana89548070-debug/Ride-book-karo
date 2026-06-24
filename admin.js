import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

onSnapshot(collection(db, "rides"), (snapshot) => {
    let list = "";
    snapshot.forEach((doc) => {
        list += `<li>${doc.data().name} - ${doc.data().phone}</li>`;
    });
    document.getElementById("rideList").innerHTML = list;
});

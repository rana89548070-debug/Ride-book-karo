window.loadAdminRides = () => {
    console.log("Loading rides..."); // यह चेक करने के लिए जोड़ें
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

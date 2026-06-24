function getPickup() {
  const pickupText = document.getElementById("pickupText");
  pickupText.innerText = "📍 Fetching location...";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickupLat = pos.coords.latitude;
        pickupLng = pos.coords.longitude;
        pickupText.innerText = `Pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`;
      },
      (error) => {
        console.error(error);
        alert("❌ Location fetch nahi ho payi! Browser me permission 'Allow' karein.");
        pickupText.innerText = "Pickup: Permission Denied";
      },
      { 
        enableHighAccuracy: true, // Isse exact live location milti hai
        timeout: 10000,           // 10 seconds ka wait karega
        maximumAge: 0             // Har baar ekdum fresh location lega
      }
    );
  } else {
    alert("❌ Geolocation not supported by your browser");
  }
}

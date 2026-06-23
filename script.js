document.getElementById("rideForm").addEventListener("submit", function(e){
  e.preventDefault();

  let ride = {
    name: name.value,
    pickup: pickup.value,
    drop: drop.value,
    fare: Number(fare.value),
    payment: payment.value,
    commission: Number(fare.value) * 0.05,
    time: new Date().toLocaleString()
  };

  let rides = JSON.parse(localStorage.getItem("rides")) || [];
  rides.push(ride);
  localStorage.setItem("rides", JSON.stringify(rides));

  msg.innerText = "✅ Ride Booked Successfully";
  this.reset();
});

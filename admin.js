const ADMIN_MOBILE = "7830722258";

function login(){
  let mobile = document.getElementById("adminMobile").value;

  if(mobile === ADMIN_MOBILE){
    document.getElementById("login").style.display = "none";
    document.getElementById("panel").style.display = "block";
    loadRides();
  } else {
    alert("❌ Wrong Admin Number");
  }
}

function loadRides(){
  let rides = JSON.parse(localStorage.getItem("rides")) || [];
  let html = "";
  let totalCommission = 0;

  rides.forEach((r,i)=>{
    totalCommission += r.commission;
    html += `
      <p>
      ${i+1}. ${r.name} | ₹${r.fare} | ${r.payment}<br>
      Commission: ₹${r.commission}<br>
      ${r.time}
      </p><hr>`;
  });

  html += `<h3>Total Commission: ₹${totalCommission}</h3>`;
  document.getElementById("data").innerHTML = html;
}

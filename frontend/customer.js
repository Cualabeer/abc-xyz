async function loadGarages() {
  const res = await fetch("/api/admin/garages");
  const garages = await res.json();
  const select = document.getElementById("garageSelect");
  select.innerHTML = garages.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
}

async function submitBooking(e) {
  e.preventDefault();
  const garage_id = document.getElementById("garageSelect").value;
  const date = document.getElementById("dateInput").value;
  const time = document.getElementById("timeInput").value;
  const service = document.getElementById("serviceInput").value;
  const notes = document.getElementById("notesInput").value;

  const res = await fetch("/api/customer/book",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({garage_id,date,time,service,notes})
  });
  const data = await res.json();
  if(data.error){ alert(data.error); return; }
  alert("Booking created!");
  document.getElementById("bookingForm").reset();
}

document.addEventListener("DOMContentLoaded", loadGarages);
document.getElementById("bookingForm").addEventListener("submit", submitBooking);
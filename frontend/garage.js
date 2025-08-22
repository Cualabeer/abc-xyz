async function loadGarageBookings() {
  const res = await fetch("/api/garage/bookings");
  const bookings = await res.json();
  const tbody = document.getElementById("garageTable");
  tbody.innerHTML = "";
  bookings.forEach(b => {
    const row = `<tr>
      <td>${b.name}</td>
      <td>${b.email}</td>
      <td>${b.date}</td>
      <td>${b.time}</td>
      <td>${b.service}</td>
      <td>${b.notes || ""}</td>
    </tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

document.addEventListener("DOMContentLoaded", loadGarageBookings);
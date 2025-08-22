async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const role = document.getElementById("loginRole").value;

  const res = await fetch("/api/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });
  const data = await res.json();
  if(data.error){ alert(data.error); return; }

  // Redirect based on role
  if(data.role==="customer") window.location.href="customer.html";
  else if(data.role==="garage") window.location.href="garage.html";
  else if(data.role==="admin" || data.role==="superadmin") window.location.href="admin.html";
}

async function register() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;

  const res = await fetch("/api/register", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,email,password,role})
  });
  const data = await res.json();
  if(data.error){ alert(data.error); return; }
  alert("Registered successfully! Now login.");
}

document.getElementById("loginBtn").addEventListener("click",login);
document.getElementById("registerBtn").addEventListener("click",register);
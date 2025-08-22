async function resetDb(){
  await fetch("/api/admin/reset-db",{method:"POST"});
  alert("Database reset");
}

async function resetUsers(){
  await fetch("/api/admin/reset-users",{method:"POST"});
  alert("Users reset");
}

async function addTestData(){
  await fetch("/api/admin/add-test-data",{method:"POST"});
  alert("Test data added");
}

async function createUser(){
  const name=document.getElementById("newName").value;
  const email=document.getElementById("newEmail").value;
  const password=document.getElementById("newPassword").value;
  const role=document.getElementById("newRole").value;

  const res=await fetch("/api/admin/create-user",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,email,password,role})
  });
  const data=await res.json();
  if(data.error){ alert(data.error); return; }
  alert("User created");
  loadUsers();
}

async function loadUsers(){
  const res=await fetch("/api/admin/garages");
  const garages=await res.json();
  console.log(garages);
}

document.getElementById("resetDbBtn").addEventListener("click",resetDb);
document.getElementById("resetUsersBtn").addEventListener("click",resetUsers);
document.getElementById("addTestBtn").addEventListener("click",addTestData);
document.getElementById("createUserBtn").addEventListener("click",createUser);
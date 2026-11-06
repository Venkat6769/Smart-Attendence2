async function test() {
  const accounts = [
    { email: 'admin@university.edu', password: 'Admin@123', role: 'admin' },
    { email: 'lecturer@university.edu', password: 'Lecturer@123', role: 'lecturer' },
    { email: 'student@university.edu', password: 'Student@123', role: 'student' }
  ];

  for (const acc of accounts) {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acc.email, password: acc.password })
    });
    const data = await res.json();
    console.log(`Login ${acc.role} (${acc.email}): status ${res.status}, role in body: ${data.data?.user?.role}, token present: ${!!data.data?.token}`);
  }
}

test();

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('=== 1. LECTURER LOGIN ===');
  const lecLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'lecturer@university.edu', password: 'Lecturer@123' })
  });
  if (lecLogin.status !== 200) throw new Error('Lecturer login failed');
  const lecToken = lecLogin.data.data.token;
  console.log('Lecturer login OK!');

  console.log('\n=== 2. GET LECTURER COURSE ===');
  const courses = await request('/api/lecturer/courses', { token: lecToken });
  const course = courses.data.data[0];
  console.log('Using course:', course.code, course.title);

  // Close any existing active session
  const existing = await request(`/api/sessions/${course.id}/list`, { token: lecToken });
  const activeSess = existing.data?.data?.find(s => s.status === 'active');
  if (activeSess) {
    console.log('Closing existing session first...');
    await request(`/api/sessions/${activeSess.id}/end`, { method: 'POST', token: lecToken });
  }

  console.log('\n=== 3. START SESSION (INITIAL QR) ===');
  const startRes = await request('/api/sessions/start', {
    method: 'POST',
    token: lecToken,
    body: JSON.stringify({ course_id: course.id })
  });
  if (startRes.status !== 201) throw new Error('Start session failed: ' + JSON.stringify(startRes));

  const session = startRes.data.data.session;
  const token1 = startRes.data.data.token;
  const qr1 = startRes.data.data.qrCode;
  console.log('Session started! ID:', session.id);
  console.log('Initial Token 1:', token1);
  console.log('Initial QR 1 length:', qr1?.length);

  console.log('\n=== 4. ROTATE QR CODE (SIMULATE 5 SECONDS PASSING) ===');
  await sleep(1000); // short delay
  const rotate1 = await request(`/api/sessions/${session.id}/qr`, { token: lecToken });
  if (rotate1.status !== 200) throw new Error('Rotate 1 failed');
  const token2 = rotate1.data.data.token;
  const qr2 = rotate1.data.data.qrCode;
  console.log('Rotated Token 2:', token2);
  console.log('Rotated QR 2 length:', qr2?.length);

  if (token1 === token2) throw new Error('Token did NOT change on rotation!');
  console.log(' Token successfully changed: Token 2 != Token 1');

  console.log('\n=== 5. ROTATE QR CODE AGAIN (ANOTHER 5 SECONDS) ===');
  const rotate2 = await request(`/api/sessions/${session.id}/qr`, { token: lecToken });
  const token3 = rotate2.data.data.token;
  const qr3 = rotate2.data.data.qrCode;
  console.log('Rotated Token 3:', token3);
  if (token2 === token3) throw new Error('Token did NOT change on second rotation!');
  console.log(' Token successfully changed again: Token 3 != Token 2');

  console.log('\n=== 6. STUDENT LOGIN & SCAN CURRENT ROTATING QR ===');
  const studLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@university.edu', password: 'Student@123' })
  });
  if (studLogin.status !== 200) throw new Error('Student login failed');
  const studToken = studLogin.data.data.token;

  // Student scans Token 3 (current active token)
  const scanRes = await request('/api/attendance/scan', {
    method: 'POST',
    token: studToken,
    body: JSON.stringify({ token: token3 })
  });
  console.log('Scan Token 3 status (expect 201):', scanRes.status, scanRes.data?.data?.message);
  if (scanRes.status !== 201) throw new Error('Valid token scan failed: ' + JSON.stringify(scanRes));

  // Student scans again (duplicate check)
  const dupScan = await request('/api/attendance/scan', {
    method: 'POST',
    token: studToken,
    body: JSON.stringify({ token: token3 })
  });
  console.log('Duplicate scan status (expect 409):', dupScan.status, dupScan.data?.error);
  if (dupScan.status !== 409) throw new Error('Expected 409 duplicate rejection');

  console.log('\n=== 7. END SESSION ===');
  const endRes = await request(`/api/sessions/${session.id}/end`, {
    method: 'POST',
    token: lecToken
  });
  console.log('End session status (expect 200):', endRes.status, endRes.data?.data);

  console.log('\n ALL ROTATING QR TESTS PASSED! ');
}

runTest().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});

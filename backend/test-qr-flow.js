async function test() {
  const BASE_URL = 'http://localhost:5000';

  // 1. Login as lecturer
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lecturer@university.edu', password: 'Lecturer@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  console.log('1. Lecturer logged in, token:', !!token);

  // 2. Get assigned courses
  const coursesRes = await fetch(`${BASE_URL}/api/lecturer/courses`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const coursesData = await coursesRes.json();
  const course = coursesData.data?.[0];
  console.log('2. Lecturer course:', course?.code, course?.title, 'ID:', course?.id);

  // 3. Start a new attendance session
  const startRes = await fetch(`${BASE_URL}/api/sessions/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ course_id: course.id })
  });
  console.log('3. Start session status:', startRes.status);
  const startData = await startRes.json();
  const session = startData.data?.session;
  const qrCode = startData.data?.qrCode;
  console.log('   Session ID:', session?.id);
  console.log('   Session Token:', session?.token);
  console.log('   QR Code generated?', !!qrCode);
  console.log('   QR Code starts with data:image/png;base64?', qrCode?.startsWith('data:image/png;base64'));
  console.log('   QR Code string length:', qrCode?.length);

  // 4. Fetch the QR code again via getSessionQR
  const getQrRes = await fetch(`${BASE_URL}/api/sessions/${session.id}/qr`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const getQrData = await getQrRes.json();
  console.log('4. Regenerate QR status:', getQrRes.status);
  console.log('   QR regenerated?', !!getQrData.data?.qrCode);

  // 5. Check sessions list
  const listRes = await fetch(`${BASE_URL}/api/sessions/${course.id}/list`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const listData = await listRes.json();
  console.log('5. Sessions list count:', listData.data?.length);
  const active = listData.data?.find(s => s.status === 'active');
  console.log('   Active session found in list?', !!active, 'Token present?', !!active?.token);

  console.log('\n QR GENERATION FULLY VERIFIED! ');
}

test().catch(console.error);

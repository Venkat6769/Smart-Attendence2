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

async function runTests() {
  console.log('=== 1. ADMIN LOGIN ===');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@university.edu', password: 'Admin@123' }),
  });
  if (adminLogin.status !== 200) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
  }
  const adminToken = adminLogin.data.data.token;
  console.log('Admin login successful!');

  console.log('\n=== 2. CREATE LECTURER ===');
  let lecturer;
  const createLec = await request('/api/users/lecturer', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ name: 'Dr. Alan Turing', email: 'alan.turing@university.edu' }),
  });
  if (createLec.status === 201) {
    lecturer = createLec.data.data.user;
    console.log('Lecturer created:', lecturer.email);
  } else if (createLec.status === 409) {
    const users = await request('/api/users', { token: adminToken });
    lecturer = users.data.data.find(u => u.email === 'alan.turing@university.edu');
    console.log('Lecturer already exists:', lecturer.email);
  } else {
    throw new Error(`Failed to create lecturer: ${JSON.stringify(createLec)}`);
  }

  console.log('\n=== 3. CREATE STUDENTS ===');
  let student1, student2;
  const createStud1 = await request('/api/users/student', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      name: 'Ada Lovelace',
      email: 'ada.lovelace@university.edu',
      matric_number: 'MAT-2026-001',
    }),
  });
  if (createStud1.status === 201) {
    student1 = createStud1.data.data.user;
  } else {
    const users = await request('/api/users', { token: adminToken });
    student1 = users.data.data.find(u => u.email === 'ada.lovelace@university.edu');
  }
  console.log('Student 1:', student1.name, student1.email);

  const createStud2 = await request('/api/users/student', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      name: 'Grace Hopper',
      email: 'grace.hopper@university.edu',
      matric_number: 'MAT-2026-002',
    }),
  });
  if (createStud2.status === 201) {
    student2 = createStud2.data.data.user;
  } else {
    const users = await request('/api/users', { token: adminToken });
    student2 = users.data.data.find(u => u.email === 'grace.hopper@university.edu');
  }
  console.log('Student 2:', student2.name, student2.email);

  console.log('\n=== 4. CREATE COURSE & ENROLL STUDENTS ===');
  let course;
  const createCourse = await request('/api/courses', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      code: 'CS101',
      title: 'Introduction to Computer Science',
      lecturer_id: lecturer.id,
    }),
  });
  if (createCourse.status === 201) {
    course = createCourse.data.data;
  } else {
    const courses = await request('/api/courses', { token: adminToken });
    course = courses.data.data.find(c => c.code === 'CS101');
    await request(`/api/courses/${course.id}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({ lecturer_id: lecturer.id }),
    });
  }
  console.log('Course:', course.code, course.title, 'Lecturer ID:', course.lecturer_id);

  // Enroll both students
  await request('/api/enrollments', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ student_id: student1.id, course_id: course.id }),
  });
  await request('/api/enrollments', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ student_id: student2.id, course_id: course.id }),
  });
  console.log('Enrolled both students in course', course.code);

  console.log('\n=== 5. LECTURER LOGIN & PASSWORD CHANGE ===');
  let lecLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'alan.turing@university.edu', password: 'Welcome@123' }),
  });
  let lecToken;
  if (lecLogin.status === 200) {
    lecToken = lecLogin.data.data.token;
    console.log('Lecturer logged in with default password. must_change_password:', lecLogin.data.data.user.must_change_password);
    // Change password to Alan@12345
    const chgPass = await request('/api/auth/change-password', {
      method: 'PATCH',
      token: lecToken,
      body: JSON.stringify({ currentPassword: 'Welcome@123', newPassword: 'Alan@12345' }),
    });
    console.log('Password change response:', chgPass.status, chgPass.data?.data?.message);
    // Re-login with new password
    lecLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'alan.turing@university.edu', password: 'Alan@12345' }),
    });
    lecToken = lecLogin.data.data.token;
    console.log('Re-login with new password successful!');
  } else {
    // Already changed?
    lecLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'alan.turing@university.edu', password: 'Alan@12345' }),
    });
    lecToken = lecLogin.data.data.token;
    console.log('Lecturer logged in with Alan@12345');
  }

  console.log('\n=== 6. LECTURER COURSES & START SESSION ===');
  const lecCourses = await request('/api/lecturer/courses', { token: lecToken });
  console.log('Lecturer assigned courses:', lecCourses.data?.data?.length);

  // Check if active session exists
  const existingSessions = await request(`/api/sessions/${course.id}/list`, { token: lecToken });
  const activeExisting = existingSessions.data?.data?.find(s => s.status === 'active');
  if (activeExisting) {
    console.log('Closing existing active session first...');
    await request(`/api/sessions/${activeExisting.id}/end`, { method: 'POST', token: lecToken });
  }

  const startSess = await request('/api/sessions/start', {
    method: 'POST',
    token: lecToken,
    body: JSON.stringify({ course_id: course.id }),
  });
  if (startSess.status !== 201) {
    throw new Error(`Failed to start session: ${JSON.stringify(startSess)}`);
  }
  const session = startSess.data.data.session;
  const qrCode = startSess.data.data.qrCode;
  console.log('Session started! ID:', session.id, 'Token:', session.token);
  console.log('QR Code generated? Data URL length:', qrCode?.length);

  console.log('\n=== 7. STUDENT LOGIN & SCAN QR ===');
  // Student 1 (Ada) logs in
  let stud1Login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ada.lovelace@university.edu', password: 'Welcome@123' }),
  });
  let stud1Token;
  if (stud1Login.status === 200) {
    stud1Token = stud1Login.data.data.token;
  } else {
    stud1Login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ada.lovelace@university.edu', password: 'Ada@12345' }),
    });
    stud1Token = stud1Login.data.data.token;
  }

  // Student 1 views courses
  const studCourses = await request('/api/student/courses', { token: stud1Token });
  console.log('Student 1 enrolled courses:', studCourses.data?.data?.map(c => c.code));

  // Student 1 scans valid QR
  const scanResult = await request('/api/attendance/scan', {
    method: 'POST',
    token: stud1Token,
    body: JSON.stringify({ token: session.token }),
  });
  console.log('Scan result status:', scanResult.status, scanResult.data?.data?.message);

  // Student 1 tries to scan again (duplicate test)
  const dupScan = await request('/api/attendance/scan', {
    method: 'POST',
    token: stud1Token,
    body: JSON.stringify({ token: session.token }),
  });
  console.log('Duplicate scan status (expect 409):', dupScan.status, dupScan.data?.error);

  // Student scans fake token (invalid test)
  const fakeScan = await request('/api/attendance/scan', {
    method: 'POST',
    token: stud1Token,
    body: JSON.stringify({ token: '00000000-0000-0000-0000-000000000000' }),
  });
  console.log('Fake scan status (expect 404):', fakeScan.status, fakeScan.data?.error);

  console.log('\n=== 8. LECTURER CLOSES SESSION ===');
  const endSess = await request(`/api/sessions/${session.id}/end`, {
    method: 'POST',
    token: lecToken,
  });
  console.log('Session ended status:', endSess.status, endSess.data?.data);

  console.log('\n=== 9. REPORTS & ATTENDANCE VERIFICATION ===');
  // Course report
  const courseReport = await request(`/api/reports/course/${course.id}`, { token: lecToken });
  console.log('Course report rows:', courseReport.data?.data?.rows);

  // Session report
  const sessionReport = await request(`/api/reports/session/${session.id}`, { token: lecToken });
  console.log('Session report records:');
  for (const r of sessionReport.data?.data?.records || []) {
    console.log(`  - ${r.name}: ${r.status}`);
  }

  // PDF report check
  const pdfRes = await fetch(`${BASE_URL}/api/reports/course/${course.id}/pdf`, {
    headers: { Authorization: `Bearer ${lecToken}` },
  });
  console.log('PDF Report status:', pdfRes.status, 'Content-Type:', pdfRes.headers.get('content-type'));

  console.log('\n=== 10. STUDENT ATTENDANCE HISTORY & PERCENTAGES ===');
  // Student 1 attendance history
  const stud1History = await request(`/api/attendance/history/${course.id}`, { token: stud1Token });
  console.log('Student 1 history count:', stud1History.data?.data?.length);
  const stud1Pct = await request(`/api/attendance/percentage/${course.id}`, { token: stud1Token });
  console.log('Student 1 attendance pct:', stud1Pct.data?.data);

  // Student 2 (Grace) login & warnings
  let stud2Login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'grace.hopper@university.edu', password: 'Welcome@123' }),
  });
  let stud2Token = stud2Login.data?.data?.token;
  if (!stud2Token) {
    stud2Login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'grace.hopper@university.edu', password: 'Grace@12345' }),
    });
    stud2Token = stud2Login.data.data.token;
  }
  const stud2Pct = await request(`/api/attendance/percentage/${course.id}`, { token: stud2Token });
  console.log('Student 2 attendance pct (expect 0%, flagged: true):', stud2Pct.data?.data);

  const stud2Warnings = await request('/api/attendance/warnings', { token: stud2Token });
  console.log('Student 2 warnings:', stud2Warnings.data?.data);

  console.log('\n=== 11. ADMIN FLAGGED STUDENTS & ALL ATTENDANCE ===');
  const flagged = await request('/api/students/flagged', { token: adminToken });
  console.log('Admin flagged students count:', flagged.data?.data?.length);
  for (const f of flagged.data?.data || []) {
    console.log(`  - Flagged: ${f.name} (${f.course_code}) - ${f.percentage}%`);
  }

  const allAtt = await request('/api/attendance/all', { token: adminToken });
  console.log('Admin all attendance count:', allAtt.data?.data?.length);

  console.log('\n ALL TESTS COMPLETED SUCCESSFULLY! ');
}

runTests().catch(err => {
  console.error('\n TEST FAILED:', err);
  process.exit(1);
});

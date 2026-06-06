/**
 * utils/attendance.js
 * Helper functions for attendance percentage calculations and flagging logic.
 * These are used by both lecturer report controllers and student-facing endpoints.
 */

const ATTENDANCE_THRESHOLD = 75; // students below this % are flagged as at-risk

/**
 * calculatePercentage — computes the attendance percentage for a student in a course
 * @param {number} presentCount - number of sessions the student attended
 * @param {number} totalSessions - total sessions held in the course
 * @returns {number} percentage rounded to 1 decimal place (e.g. 83.3)
 */
function calculatePercentage(presentCount, totalSessions) {
  if (totalSessions === 0) return 0;
  return Math.round((presentCount / totalSessions) * 100 * 10) / 10;
}

/**
 * isFlagged — returns true if a student's attendance is below the threshold
 * @param {number} percentage - the student's attendance percentage
 * @returns {boolean}
 */
function isFlagged(percentage) {
  return percentage < ATTENDANCE_THRESHOLD;
}

/**
 * formatAttendanceRow — formats a single student's attendance data for reports
 * @param {object} student - student object with name, matric_number, present_count, total_sessions
 * @returns {object} formatted row with percentage and flag status
 */
function formatAttendanceRow(student) {
  const percentage = calculatePercentage(
    parseInt(student.present_count, 10),
    parseInt(student.total_sessions, 10)
  );
  return {
    name:           student.name,
    matric_number:  student.matric_number || 'N/A',
    present:        parseInt(student.present_count, 10),
    total:          parseInt(student.total_sessions, 10),
    percentage,
    flagged:        isFlagged(percentage),
    status:         isFlagged(percentage) ? 'AT RISK' : 'OK',
  };
}

module.exports = { calculatePercentage, isFlagged, formatAttendanceRow, ATTENDANCE_THRESHOLD };

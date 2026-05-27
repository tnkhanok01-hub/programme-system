export function validateAttendance(record: any) {
  if (record.qr_end && record.post_survey) {
    return "valid";
  }
  return "invalid";
}
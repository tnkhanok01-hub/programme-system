export function validateAttendance(record: any) {
  if (
    record.qr_start &&
    record.qr_end &&
    record.pre_survey &&
    record.post_survey
  ) {
    return "valid";
  }
  return "invalid";
}
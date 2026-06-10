export const BASE_MERIT_POINTS = 100

export function displayMeritTotal(earnedPoints) {
  return BASE_MERIT_POINTS + Number(earnedPoints || 0)
}

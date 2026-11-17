export type PartOfDay = "morning" | "noon" | "afternoon" | "evening";

const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false });

/** Buổi trong ngày theo giờ (0–23): trước 11 giờ sáng, trước 14 giờ trưa, trước 18 giờ chiều, còn lại tối. */
export function partOfDay(hour: number): PartOfDay {
  if (hour < 11) return "morning";
  if (hour < 14) return "noon";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Buổi trong ngày của `now` theo giờ Việt Nam, dùng chọn câu chào trên trang chủ. */
export function partOfDayInVietnam(now: Date): PartOfDay {
  return partOfDay(Number(hourFormatter.format(now)) % 24);
}

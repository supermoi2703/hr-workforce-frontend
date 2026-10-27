import { describe, expect, it } from "vitest";
import { meanGrayDiff } from "./camera";
import { failedPhotoIndex, groupByDay, scorePercent } from "./daily";
import type { Punch } from "./types";

function punch(id: string, employeeId: string, workDate: string, time: string): Punch {
  return {
    id,
    employee: { id: employeeId, employeeCode: null, fullName: employeeId },
    workDate,
    punchedAt: `${workDate}T${time}Z`,
    source: "KIOSK",
    matchScore: 0.7,
    matchLevel: "HIGH",
    userConfirmed: false,
    photoFileId: null,
  };
}

describe("groupByDay", () => {
  it("lần quét đầu là check-in, lần cuối là check-out, theo từng người từng ngày", () => {
    const days = groupByDay([
      punch("3", "an", "2026-10-28", "10:30:00"),
      punch("1", "an", "2026-10-28", "01:05:00"),
      punch("2", "an", "2026-10-28", "05:00:00"),
      punch("4", "binh", "2026-10-28", "01:30:00"),
      punch("5", "an", "2026-10-27", "01:00:00"),
    ]);

    expect(days.map((d) => d.key)).toEqual(["2026-10-28|an", "2026-10-28|binh", "2026-10-27|an"]);
    expect(days[0].first.id).toBe("1");
    expect(days[0].last?.id).toBe("3");
    expect(days[0].punches).toHaveLength(3);
    // Chỉ quét một lần: chưa có check-out.
    expect(days[1].last).toBeNull();
  });
});

describe("helpers", () => {
  it("đổi điểm sang phần trăm, giới hạn 0–100", () => {
    expect(scorePercent(0.684)).toBe("68%");
    expect(scorePercent(-0.2)).toBe("0%");
    expect(scorePercent(null)).toBe("—");
  });

  it("đọc số thứ tự ảnh hỏng từ thông báo lỗi đăng ký", () => {
    expect(failedPhotoIndex("photo=2: No face found in the image")).toBe(1);
    expect(failedPhotoIndex("other")).toBeNull();
  });

  it("đo chênh lệch độ sáng giữa hai khung", () => {
    const black = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
    const white = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]);
    expect(meanGrayDiff(black, black)).toBe(0);
    expect(meanGrayDiff(black, white)).toBe(255);
  });
});

import { describe, expect, it } from "vitest";
import {
  BLOCK_STAGGER_MS,
  clampIndex,
  dragTransform,
  EDGE_RESISTANCE,
  edgeResist,
  nextIndex,
  prevIndex,
  resolveSwipe,
  ROTATE_INTERVAL_MS,
  tickDelay,
} from "./carousel";

describe("nextIndex / prevIndex", () => {
  it("quay vòng ở hai đầu", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(prevIndex(1, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
  });

  it("chỉ một tin thì ở yên, danh sách rỗng không lỗi", () => {
    expect(nextIndex(0, 1)).toBe(0);
    expect(prevIndex(0, 1)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(0, 0)).toBe(0);
  });
});

describe("clampIndex", () => {
  it("giữ chỉ số trong danh sách khi danh sách ngắn lại", () => {
    expect(clampIndex(4, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(-2, 3)).toBe(0);
    expect(clampIndex(5, 0)).toBe(0);
  });
});

describe("tickDelay", () => {
  it("chu kỳ là 10 giây", () => {
    expect(ROTATE_INTERVAL_MS).toBe(10000);
  });

  it("lần đầu của mỗi khối lệch nhau để không đổi tin cùng lúc", () => {
    expect(tickDelay(0, true)).toBe(ROTATE_INTERVAL_MS);
    expect(tickDelay(1, true)).toBe(ROTATE_INTERVAL_MS + BLOCK_STAGGER_MS);
    expect(tickDelay(3, true)).toBe(ROTATE_INTERVAL_MS + 3 * BLOCK_STAGGER_MS);
  });

  it("các lần sau chỉ chờ đúng một chu kỳ", () => {
    expect(tickDelay(0, false)).toBe(ROTATE_INTERVAL_MS);
    expect(tickDelay(3, false)).toBe(ROTATE_INTERVAL_MS);
  });

  it("chỉ số khối âm không làm thời gian chờ ngắn hơn một chu kỳ", () => {
    expect(tickDelay(-2, true)).toBe(ROTATE_INTERVAL_MS);
  });
});

describe("resolveSwipe", () => {
  const base = { width: 400, velocity: 0, index: 2, count: 5 };

  it("kéo ngắn thì ở lại tin hiện tại", () => {
    expect(resolveSwipe({ ...base, dx: -50 })).toBe(2);
    expect(resolveSwipe({ ...base, dx: 79 })).toBe(2); // dưới 20% của 400 px
  });

  it("kéo sang trái đủ xa là tin sau, sang phải là tin trước", () => {
    expect(resolveSwipe({ ...base, dx: -120 })).toBe(3);
    expect(resolveSwipe({ ...base, dx: 120 })).toBe(1);
  });

  it("vuốt nhanh dù ngắn vẫn đổi tin, nhưng phải kéo đủ vài px", () => {
    expect(resolveSwipe({ ...base, dx: -40, velocity: -0.8 })).toBe(3);
    expect(resolveSwipe({ ...base, dx: 40, velocity: 0.8 })).toBe(1);
    // nhanh mà gần như không dịch (chạm rung tay) thì không tính
    expect(resolveSwipe({ ...base, dx: -5, velocity: -2 })).toBe(2);
  });

  it("không quay vòng ở hai đầu", () => {
    expect(resolveSwipe({ ...base, index: 0, dx: 200 })).toBe(0);
    expect(resolveSwipe({ ...base, index: 4, dx: -200 })).toBe(4);
  });

  it("chỉ một tin hoặc chưa đo được bề rộng thì ở yên", () => {
    expect(resolveSwipe({ ...base, count: 1, index: 0, dx: -300 })).toBe(0);
    expect(resolveSwipe({ ...base, width: 0, dx: -300 })).toBe(2);
  });
});

describe("edgeResist", () => {
  it("kéo giữa các thẻ thì đi theo tay", () => {
    expect(edgeResist(-80, 2, 5)).toBe(-80);
    expect(edgeResist(80, 2, 5)).toBe(80);
  });

  it("kéo ra ngoài thẻ đầu hoặc thẻ cuối thì bị cản", () => {
    expect(edgeResist(100, 0, 5)).toBe(100 * EDGE_RESISTANCE);
    expect(edgeResist(-100, 4, 5)).toBe(-100 * EDGE_RESISTANCE);
  });

  it("kéo vào trong từ hai đầu thì không bị cản", () => {
    expect(edgeResist(-100, 0, 5)).toBe(-100);
    expect(edgeResist(100, 4, 5)).toBe(100);
  });

  it("chỉ một tin thì mọi hướng đều bị cản", () => {
    expect(edgeResist(100, 0, 1)).toBe(100 * EDGE_RESISTANCE);
    expect(edgeResist(-100, 0, 1)).toBe(-100 * EDGE_RESISTANCE);
  });
});

describe("dragTransform", () => {
  it("mỗi thẻ rộng một khung, cộng độ lệch đang kéo", () => {
    expect(dragTransform(0, 0)).toBe("translateX(calc(-0% + 0px))");
    expect(dragTransform(2, 0)).toBe("translateX(calc(-200% + 0px))");
    expect(dragTransform(1, -35)).toBe("translateX(calc(-100% + -35px))");
  });
});

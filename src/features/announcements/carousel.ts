// Logic thuần của khối tự chuyển tin ở trang chủ bảng tin (không phụ thuộc React hay trình duyệt, để test được).

/** Sau bao lâu thì khối tự chuyển sang tin kế tiếp. */
export const ROTATE_INTERVAL_MS = 10000;

/** Mỗi khối trong lưới bắt đầu chuyển lệch nhau chừng này để các khối không đổi tin cùng một lúc. */
export const BLOCK_STAGGER_MS = 1500;

/** Tay phải dịch ngang quá chừng này (px) và ngang nhiều hơn dọc thì mới tính là bắt đầu kéo (bấm nhẹ vẫn mở bài). */
export const DRAG_START_PX = 6;

/** Kéo quá tỉ lệ này của bề rộng thẻ thì đổi tin khi buông tay. */
export const SWIPE_DISTANCE_RATIO = 0.2;

/** Vuốt nhanh hơn tốc độ này (px/ms) và đã kéo đủ xa thì đổi tin dù chưa tới ngưỡng khoảng cách. */
export const SWIPE_VELOCITY = 0.4;

/** Quãng kéo tối thiểu (px) để một cú vuốt nhanh được tính. */
export const SWIPE_MIN_FLICK_PX = 20;

/** Kéo ra khỏi thẻ đầu / thẻ cuối chỉ đi được chừng này so với tay (cảm giác bị cản). */
export const EDGE_RESISTANCE = 0.35;

/** Tin kế tiếp, quay vòng về đầu sau tin cuối. */
export function nextIndex(index: number, count: number): number {
  return count <= 0 ? 0 : (index + 1) % count;
}

/** Tin trước đó, quay vòng về cuối trước tin đầu. */
export function prevIndex(index: number, count: number): number {
  return count <= 0 ? 0 : (index - 1 + count) % count;
}

/** Giữ chỉ số trong phạm vi danh sách hiện tại (danh sách có thể ngắn lại khi dữ liệu được làm mới). */
export function clampIndex(index: number, count: number): number {
  return count <= 0 ? 0 : Math.min(Math.max(index, 0), count - 1);
}

/**
 * Chờ bao lâu trước lần chuyển kế tiếp. Lần chạy đầu của khối thứ `blockIndex` cộng thêm độ lệch; các lần sau chỉ chờ đúng
 * một chu kỳ (các khối đã lệch nhịp nhau từ trước).
 */
export function tickDelay(blockIndex: number, first: boolean): number {
  return ROTATE_INTERVAL_MS + (first ? Math.max(0, blockIndex) * BLOCK_STAGGER_MS : 0);
}

/**
 * Buông tay sau khi kéo thì sang tin nào. Kéo sang trái (dx âm) là tin sau, sang phải là tin trước. Đổi tin khi kéo quá
 * `SWIPE_DISTANCE_RATIO` bề rộng thẻ, hoặc vuốt nhanh (`velocity` px/ms) sau khi đã kéo quá `SWIPE_MIN_FLICK_PX`; không thì
 * ở lại tin hiện tại. Không quay vòng ở hai đầu: kéo ra ngoài thẻ đầu / cuối thì ở nguyên.
 */
export function resolveSwipe(input: {
  dx: number;
  width: number;
  velocity: number;
  index: number;
  count: number;
}): number {
  const { dx, width, velocity, index, count } = input;
  if (count <= 1 || width <= 0) return clampIndex(index, count);
  const far = Math.abs(dx) > width * SWIPE_DISTANCE_RATIO;
  const flick = Math.abs(velocity) > SWIPE_VELOCITY && Math.abs(dx) > SWIPE_MIN_FLICK_PX;
  if (!far && !flick) return index;
  return clampIndex(dx < 0 ? index + 1 : index - 1, count);
}

/** Độ lệch hiển thị khi kéo: bình thường theo tay, kéo ra ngoài thẻ đầu / cuối thì bị cản (`EDGE_RESISTANCE`). */
export function edgeResist(dx: number, index: number, count: number): number {
  const beforeFirst = dx > 0 && index <= 0;
  const afterLast = dx < 0 && index >= count - 1;
  return beforeFirst || afterLast ? dx * EDGE_RESISTANCE : dx;
}

/** Vị trí của dải thẻ: thẻ thứ `index` nằm vừa khung (mỗi thẻ rộng đúng một khung), cộng độ lệch `dx` px khi đang kéo. */
export function dragTransform(index: number, dx: number): string {
  return `translateX(calc(-${index * 100}% + ${dx}px))`;
}

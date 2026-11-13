// Chỉnh văn bản Markdown cho thanh công cụ soạn bài. Mọi hàm là hàm thuần: nhận nội dung và vị trí chọn, trả nội dung mới và
// vị trí chọn mới, để test được mà không cần trình duyệt. Component (markdown-editor.tsx) chỉ áp kết quả lên ô soạn.

/** Nội dung và vùng đang chọn (start = end khi chỉ có con trỏ). */
export type TextState = { value: string; start: number; end: number };

// Không có gạch ngang (`~~`): cần remark-gfm ở phần hiển thị mà bảng tin chưa dùng.
const MARKERS = { bold: "**", italic: "*" } as const;
export type InlineFormat = keyof typeof MARKERS;

/** Số ký tự `char` liên tiếp ngay trước (`dir` = -1) hoặc ngay sau (`dir` = 1) vị trí `index`. */
function runLength(value: string, index: number, dir: -1 | 1, char: string): number {
  let count = 0;
  let i = dir === -1 ? index - 1 : index;
  while (i >= 0 && i < value.length && value[i] === char) {
    count++;
    i += dir;
  }
  return count;
}

/** Ký hiệu đã bao quanh vùng chọn chưa. `*` đi theo cặp: `**x**` là đậm (không phải nghiêng), `***x***` là cả hai. */
// (số dấu `*` liền kề: đậm khi có từ hai dấu, nghiêng khi số dấu lẻ)
function wrappedBy(format: InlineFormat, value: string, start: number, end: number): boolean {
  const before = runLength(value, start, -1, "*");
  const after = runLength(value, end, 1, "*");
  return format === "bold" ? before >= 2 && after >= 2 : before % 2 === 1 && after % 2 === 1;
}

/**
 * Đậm, nghiêng: bọc vùng chọn bằng ký hiệu, bấm lần nữa thì bỏ. Không chọn gì: chèn cặp ký hiệu và đặt con trỏ
 * ở giữa (bấm lần nữa khi con trỏ đang ở giữa cặp thì xóa cặp).
 */
export function toggleInline(state: TextState, format: InlineFormat): TextState {
  const marker = MARKERS[format];
  const { value, start, end } = state;
  const size = marker.length;

  // Đã được bao quanh: bỏ ký hiệu phía ngoài
  if (wrappedBy(format, value, start, end)) {
    return {
      value: value.slice(0, start - size) + value.slice(start, end) + value.slice(end + size),
      start: start - size,
      end: end - size,
    };
  }
  // Vùng chọn tự mang ký hiệu ở hai đầu (vd bôi cả `**chữ**`): bỏ ký hiệu bên trong
  const selected = value.slice(start, end);
  // Với `*` chỉ tính khi đúng một dấu ở mỗi đầu (`**chữ**` là đậm, không phải nghiêng)
  const selfMarked =
    format === "italic"
      ? selected.length > 2 && /^\*(?!\*)/.test(selected) && /(?<!\*)\*$/.test(selected)
      : selected.length > size * 2 && selected.startsWith(marker) && selected.endsWith(marker);
  if (selfMarked) {
    return {
      value: value.slice(0, start) + selected.slice(size, -size) + value.slice(end),
      start,
      end: end - size * 2,
    };
  }
  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    start: start + size,
    end: end + size,
  };
}

/** Điểm đầu và cuối (không gồm ký tự xuống dòng) của khối dòng chứa vùng chọn. */
function lineBlock(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  // Vùng chọn kết thúc ngay đầu một dòng (vd bôi cả dòng bằng cách kéo xuống dòng sau): không kể dòng đó
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const newline = value.indexOf("\n", last);
  return { from, to: newline === -1 ? value.length : newline };
}

/** Áp `transform` lên từng dòng của khối; trả về nội dung mới và vị trí chọn dịch theo độ dài thay đổi. */
function mapLines(state: TextState, transform: (line: string, index: number) => string): TextState {
  const { value, start, end } = state;
  const { from, to } = lineBlock(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const changed = lines.map(transform);
  const firstDelta = changed[0].length - lines[0].length;
  const totalDelta = changed.join("\n").length - (to - from);
  return {
    value: value.slice(0, from) + changed.join("\n") + value.slice(to),
    // Con trỏ ở dòng đầu dịch theo thay đổi của dòng đó nhưng không lùi ra trước đầu dòng
    start: Math.max(from, start + firstDelta),
    end: Math.max(from, end + totalDelta),
  };
}

const HEADING = /^#{1,6}\s+/;

/**
 * Cỡ chữ: đặt tiêu đề cấp `level` (1 lớn, 2 vừa, 3 nhỏ) ở đầu mỗi dòng đang chọn; level 0 là chữ thường (bỏ tiêu đề). Dòng đã
 * đúng cấp đó thì bấm lần nữa trở về chữ thường.
 */
export function setHeading(state: TextState, level: 0 | 1 | 2 | 3): TextState {
  const { from, to } = lineBlock(state.value, state.start, state.end);
  const lines = state.value.slice(from, to).split("\n");
  const prefix = "#".repeat(level) + " ";
  const alreadyThere = level > 0 && lines.every((line) => line.trim() === "" || line.startsWith(prefix));
  return mapLines(state, (line) => {
    if (line.trim() === "") return line;
    const plain = line.replace(HEADING, "");
    return level === 0 || alreadyThere ? plain : prefix + plain;
  });
}

export type LineList = "bullet" | "numbered" | "quote";

const LIST_PREFIX = /^\s*(?:[-*+]|\d+\.)\s+/;
const QUOTE_PREFIX = /^>\s?/;

/**
 * Danh sách chấm, danh sách số, trích dẫn: thêm tiền tố ở đầu mỗi dòng đang chọn (dòng trống bỏ qua, danh sách số đánh số
 * liên tục). Mọi dòng đã có đúng tiền tố đó thì bấm lần nữa để bỏ; đổi giữa danh sách chấm và số thì thay tiền tố.
 */
export function toggleLinePrefix(state: TextState, kind: LineList): TextState {
  const { from, to } = lineBlock(state.value, state.start, state.end);
  const lines = state.value.slice(from, to).split("\n");
  const content = lines.filter((line) => line.trim() !== "");
  const isBullet = (line: string) => /^\s*[-*+]\s+/.test(line);
  const isNumbered = (line: string) => /^\s*\d+\.\s+/.test(line);
  const has = (line: string) =>
    kind === "bullet" ? isBullet(line) : kind === "numbered" ? isNumbered(line) : QUOTE_PREFIX.test(line);
  const remove = content.length > 0 && content.every(has);

  let number = 0;
  return mapLines(state, (line) => {
    if (line.trim() === "" && content.length > 0) return line;
    const bare = kind === "quote" ? line.replace(QUOTE_PREFIX, "") : line.replace(LIST_PREFIX, "");
    if (remove) return bare;
    if (kind === "quote") return "> " + bare;
    if (kind === "bullet") return "- " + bare;
    number += 1;
    return `${number}. ${bare}`;
  });
}

/**
 * Chèn liên kết `[chữ](https://)`. Có chọn chữ: dùng chữ đó làm tên liên kết và chọn sẵn phần địa chỉ để gõ ngay. Chọn sẵn
 * một địa chỉ (http / https): dùng làm đích và chọn sẵn phần tên. Không chọn gì: chèn tên mẫu `placeholder` và chọn nó.
 */
export function insertLink(state: TextState, placeholder: string): TextState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);

  if (/^https?:\/\/\S+$/.test(selected)) {
    const text = `[${placeholder}](${selected})`;
    return { value: value.slice(0, start) + text + value.slice(end), start: start + 1, end: start + 1 + placeholder.length };
  }
  const label = selected === "" ? placeholder : selected;
  const url = "https://";
  const text = `[${label}](${url})`;
  const urlStart = start + label.length + 3;
  return {
    value: value.slice(0, start) + text + value.slice(end),
    // Có chữ sẵn: chọn địa chỉ để gõ; chưa có chữ: chọn tên mẫu để gõ
    start: selected === "" ? start + 1 : urlStart,
    end: selected === "" ? start + 1 + label.length : urlStart + url.length,
  };
}

/**
 * Chèn đường kẻ `---` thành dòng riêng, sau vùng chọn. Phải có dòng trống phía trên: `---` dính ngay dưới một dòng chữ sẽ
 * biến dòng đó thành tiêu đề.
 */
export function insertRule(state: TextState): TextState {
  const { value, end } = state;
  const before = value.slice(0, end);
  const after = value.slice(end);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after === "" || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const inserted = `${lead}---${trail}`;
  const caret = before.length + lead.length + 3 + trail.length;
  return { value: before + inserted + after, start: caret, end: caret };
}

/**
 * Khoảng nhỏ nhất cần thay để từ `before` thành `after`: `from`-`to` là đoạn cũ, `insert` là đoạn mới. Component dùng để
 * chỉ thay đúng đoạn đó khi áp lên ô soạn (giữ được Ctrl+Z và không làm nhảy cuộn).
 */
export function diffRange(before: string, after: string): { from: number; to: number; insert: string } {
  let prefix = 0;
  const max = Math.min(before.length, after.length);
  while (prefix < max && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  return { from: prefix, to: before.length - suffix, insert: after.slice(prefix, after.length - suffix) };
}

import { describe, expect, it } from "vitest";
import {
  diffRange,
  insertLink,
  insertRule,
  setHeading,
  toggleInline,
  toggleLinePrefix,
  type TextState,
} from "./markdown-edit";

// Viết trạng thái cho dễ đọc: «chữ» là vùng đang chọn, ¦ là con trỏ (không chọn gì).
function parse(text: string): TextState {
  const open = text.indexOf("«");
  if (open !== -1) {
    const close = text.indexOf("»");
    const value = text.slice(0, open) + text.slice(open + 1, close) + text.slice(close + 1);
    return { value, start: open, end: close - 1 };
  }
  const caret = text.indexOf("¦");
  return { value: text.replace("¦", ""), start: caret, end: caret };
}

function show({ value, start, end }: TextState): string {
  return start === end
    ? value.slice(0, start) + "¦" + value.slice(start)
    : value.slice(0, start) + "«" + value.slice(start, end) + "»" + value.slice(end);
}

describe("toggleInline", () => {
  it("bọc vùng chọn và giữ vùng chọn trên chữ", () => {
    expect(show(toggleInline(parse("a «b» c"), "bold"))).toBe("a **«b»** c");
    expect(show(toggleInline(parse("a «b» c"), "italic"))).toBe("a *«b»* c");
  });

  it("bấm lần nữa thì bỏ ký hiệu", () => {
    expect(show(toggleInline(parse("a **«b»** c"), "bold"))).toBe("a «b» c");
    expect(show(toggleInline(parse("a *«b»* c"), "italic"))).toBe("a «b» c");
  });

  it("bôi cả đoạn đã có ký hiệu thì bỏ ký hiệu bên trong", () => {
    expect(show(toggleInline(parse("«**b**»"), "bold"))).toBe("«b»");
    expect(show(toggleInline(parse("«*b*»"), "italic"))).toBe("«b»");
  });

  it("không chọn gì: chèn cặp ký hiệu, con trỏ ở giữa", () => {
    expect(show(toggleInline(parse("a ¦ b"), "bold"))).toBe("a **¦** b");
  });

  it("đậm và nghiêng không nhầm với nhau", () => {
    // `**b**` là đậm: bấm nghiêng thì thêm một dấu `*`, không bỏ dấu nào
    expect(show(toggleInline(parse("**«b»**"), "italic"))).toBe("***«b»***");
    // `***b***` là cả hai: bỏ một cái thì còn lại cái kia
    expect(show(toggleInline(parse("***«b»***"), "bold"))).toBe("*«b»*");
    expect(show(toggleInline(parse("***«b»***"), "italic"))).toBe("**«b»**");
  });

  it("làm việc đúng với chữ có dấu và nhiều dòng", () => {
    expect(show(toggleInline(parse("Dòng một\n«Dòng hai»"), "bold"))).toBe("Dòng một\n**«Dòng hai»**");
  });
});

describe("setHeading (cỡ chữ)", () => {
  it("đặt tiêu đề ở đầu dòng chứa con trỏ", () => {
    expect(show(setHeading(parse("Thông báo¦"), 2))).toBe("## Thông báo¦");
    expect(show(setHeading(parse("Thông ¦báo"), 1))).toBe("# Thông ¦báo");
  });

  it("bấm lại đúng cấp thì trở về chữ thường; đổi cấp thì thay", () => {
    expect(setHeading(parse("## Thông báo¦"), 2).value).toBe("Thông báo");
    expect(setHeading(parse("## Thông báo¦"), 1).value).toBe("# Thông báo");
    expect(setHeading(parse("### Thông báo¦"), 0).value).toBe("Thông báo");
  });

  it("áp lên mọi dòng đang chọn, bỏ qua dòng trống và không đụng dòng ngoài vùng chọn", () => {
    const result = setHeading(parse("Trước\n«Một\n\nHai»\nSau"), 3);
    expect(result.value).toBe("Trước\n### Một\n\n### Hai\nSau");
  });

  it("vị trí chọn dịch theo phần đã thêm", () => {
    const result = setHeading(parse("«Thông báo»"), 2);
    expect(show(result)).toBe("## «Thông báo»");
  });

  it("chọn cả dòng bằng cách kéo xuống đầu dòng sau thì không đụng dòng sau", () => {
    const state: TextState = { value: "Một\nHai", start: 0, end: 4 };
    expect(setHeading(state, 1).value).toBe("# Một\nHai");
  });
});

describe("toggleLinePrefix", () => {
  it("danh sách chấm cho nhiều dòng, bấm lại thì bỏ", () => {
    const added = toggleLinePrefix(parse("«Một\nHai\nBa»"), "bullet");
    expect(added.value).toBe("- Một\n- Hai\n- Ba");
    expect(toggleLinePrefix(added, "bullet").value).toBe("Một\nHai\nBa");
  });

  it("danh sách số đánh số liên tục và bỏ qua dòng trống", () => {
    expect(toggleLinePrefix(parse("«Một\nHai\n\nBa»"), "numbered").value).toBe("1. Một\n2. Hai\n\n3. Ba");
  });

  it("đổi giữa danh sách chấm và danh sách số thì thay tiền tố", () => {
    expect(toggleLinePrefix(parse("«- Một\n- Hai»"), "numbered").value).toBe("1. Một\n2. Hai");
    expect(toggleLinePrefix(parse("«1. Một\n2. Hai»"), "bullet").value).toBe("- Một\n- Hai");
  });

  it("trích dẫn thêm và bỏ `> `", () => {
    expect(toggleLinePrefix(parse("«Một\nHai»"), "quote").value).toBe("> Một\n> Hai");
    expect(toggleLinePrefix(parse("«> Một\n> Hai»"), "quote").value).toBe("Một\nHai");
  });

  it("chỉ đụng các dòng đang chọn", () => {
    expect(toggleLinePrefix(parse("Trước\nGiữa¦\nSau"), "bullet").value).toBe("Trước\n- Giữa\nSau");
  });

  it("con trỏ ở dòng trống thì chèn tiền tố ngay đó", () => {
    expect(show(toggleLinePrefix(parse("Trước\n¦\nSau"), "bullet"))).toBe("Trước\n- ¦\nSau");
  });

  it("nếu chỉ một phần số dòng có tiền tố thì thêm cho các dòng còn lại thay vì bỏ", () => {
    expect(toggleLinePrefix(parse("«- Một\nHai»"), "bullet").value).toBe("- Một\n- Hai");
  });
});

describe("insertLink", () => {
  it("có chữ chọn sẵn: dùng làm tên và chọn phần địa chỉ để gõ", () => {
    expect(show(insertLink(parse("xem «trang này» nhé"), "tên liên kết"))).toBe(
      "xem [trang này](«https://») nhé",
    );
  });

  it("không chọn gì: chèn tên mẫu và chọn nó", () => {
    expect(show(insertLink(parse("xem ¦"), "tên liên kết"))).toBe("xem [«tên liên kết»](https://)");
  });

  it("chọn sẵn một địa chỉ: dùng làm đích, chọn tên mẫu", () => {
    expect(show(insertLink(parse("«https://example.com/a»"), "tên liên kết"))).toBe(
      "[«tên liên kết»](https://example.com/a)",
    );
  });
});

describe("insertRule", () => {
  it("đường kẻ nằm dòng riêng, có dòng trống phía trên (tránh biến chữ phía trên thành tiêu đề)", () => {
    const result = insertRule(parse("Đoạn một¦\nĐoạn hai"));
    expect(result.value).toBe("Đoạn một\n\n---\n\nĐoạn hai");
    expect(result.start).toBe(result.end);
  });

  it("ở cuối nội dung và sau dòng trống không thêm dòng trống thừa", () => {
    expect(insertRule(parse("Đoạn một¦")).value).toBe("Đoạn một\n\n---");
    expect(insertRule(parse("Đoạn một\n\n¦")).value).toBe("Đoạn một\n\n---");
    expect(insertRule(parse("¦")).value).toBe("---");
  });

  it("con trỏ đặt ngay sau đường kẻ", () => {
    const result = insertRule(parse("A¦"));
    expect(result.value.slice(0, result.start)).toBe("A\n\n---");
  });
});

describe("diffRange", () => {
  it("chỉ trả về đoạn khác nhau (để thay đúng đoạn đó, giữ Ctrl+Z)", () => {
    expect(diffRange("a b c", "a **b** c")).toEqual({ from: 2, to: 3, insert: "**b**" });
  });

  it("chèn thuần và xóa thuần", () => {
    expect(diffRange("ac", "abc")).toEqual({ from: 1, to: 1, insert: "b" });
    expect(diffRange("abc", "ac")).toEqual({ from: 1, to: 2, insert: "" });
  });

  it("hai chuỗi giống nhau thì không có gì để thay", () => {
    expect(diffRange("abc", "abc")).toEqual({ from: 3, to: 3, insert: "" });
  });

  it("kết quả luôn dựng lại đúng chuỗi mới", () => {
    for (const [before, after] of [
      ["", "abc"],
      ["abc", ""],
      ["aaa", "aaaa"],
      ["Một\nHai", "# Một\nHai"],
      ["xxyy", "xxzzyy"],
    ]) {
      const { from, to, insert } = diffRange(before, after);
      expect(before.slice(0, from) + insert + before.slice(to)).toBe(after);
    }
  });
});

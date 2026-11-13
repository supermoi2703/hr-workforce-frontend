"use client";

import { useRef, type ComponentType, type KeyboardEvent } from "react";
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  diffRange,
  insertLink,
  insertRule,
  setHeading,
  toggleInline,
  toggleLinePrefix,
  type TextState,
} from "../markdown-edit";

type Action = (state: TextState) => TextState;

type EditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  maxLength?: number;
  invalid?: boolean;
  disabled?: boolean;
  rows?: number;
};

/**
 * Ô soạn nội dung Markdown có thanh công cụ: đậm, nghiêng, cỡ chữ (tiêu đề lớn / vừa / nhỏ), danh sách, trích
 * dẫn, liên kết, đường kẻ; phím tắt Ctrl/Cmd+B, I, K. Nội dung vẫn là Markdown thuần (xem markdown-edit.ts): không có màu chữ
 * hay cỡ chữ tự do vì Markdown không có. Xem trước do nơi dùng quyết định (hiện MarkdownContent thay cho component này).
 */
export function MarkdownEditor({ id, value, onChange, onBlur, maxLength, invalid, disabled, rows = 12 }: EditorProps) {
  const t = useTranslations("Announcements.Editor");
  const ref = useRef<HTMLTextAreaElement>(null);

  /**
   * Áp một thao tác lên đúng đoạn văn bản thay đổi bằng `execCommand("insertText")` để Ctrl+Z hoàn tác được từng bước (gán
   * thẳng `value` sẽ xóa lịch sử hoàn tác của trình duyệt). Không được thì dùng `setRangeText` rồi báo cho React.
   */
  function apply(action: Action) {
    const el = ref.current;
    if (!el || disabled) return;
    const state: TextState = { value: el.value, start: el.selectionStart, end: el.selectionEnd };
    const next = action(state);
    el.focus();
    if (next.value !== state.value) {
      const { from, to, insert } = diffRange(state.value, next.value);
      el.setSelectionRange(from, to);
      const done = insert === "" ? document.execCommand("delete") : document.execCommand("insertText", false, insert);
      if (!done || el.value !== next.value) {
        el.setRangeText(insert, from, to, "end");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    el.setSelectionRange(next.start, next.end);
  }

  const groups: { key: string; items: { key: string; label: string; icon: ComponentType<{ className?: string }>; run: Action }[] }[] = [
    {
      key: "inline",
      items: [
        { key: "bold", label: t("bold"), icon: BoldIcon, run: (s) => toggleInline(s, "bold") },
        { key: "italic", label: t("italic"), icon: ItalicIcon, run: (s) => toggleInline(s, "italic") },
      ],
    },
    {
      key: "size",
      items: [
        { key: "h1", label: t("sizeLarge"), icon: Heading1Icon, run: (s) => setHeading(s, 1) },
        { key: "h2", label: t("sizeMedium"), icon: Heading2Icon, run: (s) => setHeading(s, 2) },
        { key: "h3", label: t("sizeSmall"), icon: Heading3Icon, run: (s) => setHeading(s, 3) },
      ],
    },
    {
      key: "block",
      items: [
        { key: "bullet", label: t("bulletList"), icon: ListIcon, run: (s) => toggleLinePrefix(s, "bullet") },
        { key: "numbered", label: t("numberedList"), icon: ListOrderedIcon, run: (s) => toggleLinePrefix(s, "numbered") },
        { key: "quote", label: t("quote"), icon: QuoteIcon, run: (s) => toggleLinePrefix(s, "quote") },
      ],
    },
    {
      key: "insert",
      items: [
        { key: "link", label: t("link"), icon: LinkIcon, run: (s) => insertLink(s, t("linkPlaceholder")) },
        { key: "rule", label: t("rule"), icon: MinusIcon, run: insertRule },
      ],
    },
  ];

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const shortcuts: Record<string, Action> = {
      b: (s) => toggleInline(s, "bold"),
      i: (s) => toggleInline(s, "italic"),
      k: (s) => insertLink(s, t("linkPlaceholder")),
    };
    const action = shortcuts[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    apply(action);
  }

  return (
    <div>
      <div
        role="toolbar"
        aria-label={t("toolbar")}
        aria-controls={id}
        className="flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-t-lg border border-b-0 bg-muted/40 p-1"
      >
        {groups.map((group, index) => (
          <div key={group.key} className={cn("flex items-center gap-0.5", index > 0 && "border-l pl-1")}>
            {group.items.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="icon-sm"
                title={item.label}
                aria-label={item.label}
                disabled={disabled}
                // Giữ vùng chọn trong ô soạn khi bấm nút
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => apply(item.run)}
              >
                <item.icon />
              </Button>
            ))}
          </div>
        ))}
      </div>
      <Textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={invalid}
        className="rounded-t-none"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

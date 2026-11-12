"use client";

import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { DISALLOWED_ELEMENTS, safeUrl } from "../markdown";

/** react-markdown truyền thêm `node` (cây cú pháp) vào mỗi thẻ; bỏ đi để không gắn nó lên phần tử DOM. */
function domProps<T extends { node?: unknown }>(all: T): Omit<T, "node"> {
  const rest = { ...all };
  delete rest.node;
  return rest;
}

/**
 * Hiển thị nội dung bài (Markdown). Không render HTML thô, chặn ảnh và liên kết không phải http(s) / mailto
 * (xem markdown.ts). Liên kết mở tab mới.
 */
export function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed break-words", className)}>
      <Markdown
        disallowedElements={DISALLOWED_ELEMENTS}
        urlTransform={safeUrl}
        components={{
          a: (props) => (
            <a {...domProps(props)} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" />
          ),
          h1: (props) => <h2 {...domProps(props)} className="pt-2 text-lg font-semibold" />,
          h2: (props) => <h3 {...domProps(props)} className="pt-2 text-base font-semibold" />,
          h3: (props) => <h4 {...domProps(props)} className="pt-1 font-semibold" />,
          ul: (props) => <ul {...domProps(props)} className="list-disc space-y-1 pl-5" />,
          ol: (props) => <ol {...domProps(props)} className="list-decimal space-y-1 pl-5" />,
          blockquote: (props) => <blockquote {...domProps(props)} className="border-l-2 pl-3 text-muted-foreground" />,
          code: (props) => <code {...domProps(props)} className="rounded bg-muted px-1 py-0.5 text-xs" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

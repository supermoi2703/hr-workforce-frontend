"use client";

import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { DISALLOWED_ELEMENTS, safeUrl } from "../markdown";

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
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" />
          ),
          h1: ({ node: _node, ...props }) => <h2 {...props} className="pt-2 text-lg font-semibold" />,
          h2: ({ node: _node, ...props }) => <h3 {...props} className="pt-2 text-base font-semibold" />,
          h3: ({ node: _node, ...props }) => <h4 {...props} className="pt-1 font-semibold" />,
          ul: ({ node: _node, ...props }) => <ul {...props} className="list-disc space-y-1 pl-5" />,
          ol: ({ node: _node, ...props }) => <ol {...props} className="list-decimal space-y-1 pl-5" />,
          blockquote: ({ node: _node, ...props }) => (
            <blockquote {...props} className="border-l-2 pl-3 text-muted-foreground" />
          ),
          code: ({ node: _node, ...props }) => <code {...props} className="rounded bg-muted px-1 py-0.5 text-xs" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

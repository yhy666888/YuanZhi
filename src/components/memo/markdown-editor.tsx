interface Props {
  content: string;
  onChange: (md: string) => void;
}

export function MarkdownEditor({ content, onChange }: Props) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder="支持 Markdown 语法…"
      className="min-h-[260px] w-full resize-y rounded-md border border-black/10 bg-white/40 dark:bg-black/20 p-3 font-mono text-sm leading-relaxed placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

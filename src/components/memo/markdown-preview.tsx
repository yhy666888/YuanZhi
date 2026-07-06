import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function MarkdownPreview({ content }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-input bg-background p-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*暂无内容*"}</ReactMarkdown>
    </div>
  );
}

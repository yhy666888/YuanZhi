import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pin, Plus } from "lucide-react";
export { MemoDetailPage } from "./detail";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { getColorClasses } from "@/lib/note-colors";
import { cn } from "@/lib/utils";
import { listMemos } from "@/services/memos";
import type { Memo } from "@/lib/types";

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function previewText(memo: Memo): string {
  if (memo.format === "markdown") {
    const plain = memo.content_md.replace(/[#*`>~_\-\[\]\(\)!]/g, "").trim();
    return plain.slice(0, 120);
  }
  return stripHtml(memo.content_html).slice(0, 120);
}

export function MemoPage() {
  const navigate = useNavigate();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [error, setError] = useState(false);

  const load = () => {
    listMemos()
      .then(setMemos)
      .catch(() => setError(true));
  };
  useEffect(load, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">便签</h1>
        <Button onClick={() => navigate("/memo/new")}>
          <Plus className="h-4 w-4" />
          新建
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {error ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            桌面端可编辑便签
          </div>
        ) : memos.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            还没有便签，点击「新建」添加
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {memos.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/memo/${m.id}`)}
                className={cn(
                  "group relative flex flex-col rounded-lg border p-4 text-left shadow-sm transition hover:shadow-md",
                  getColorClasses(m.color)
                )}
              >
                {m.pinned && (
                  <Pin className="absolute right-3 top-3 h-4 w-4 text-foreground/40" />
                )}
                <h3 className="mb-1 truncate font-medium">
                  {m.title || "无标题"}
                </h3>
                <div className="line-clamp-6 text-sm text-foreground/70">
                  {m.format === "markdown" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-6">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content_md || ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span>{previewText(m) || "空便签"}</span>
                  )}
                </div>
                <span className="mt-auto pt-2 text-xs text-foreground/40">
                  {new Date(m.updated_at).toLocaleDateString("zh-CN")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

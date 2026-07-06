import { useEffect, useState } from "react";
import { Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "./rich-text-editor";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownPreview } from "./markdown-preview";
import { NOTE_COLORS } from "@/lib/note-colors";
import { cn } from "@/lib/utils";
import type { Memo, MemoFormat } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memo: Memo | null;
  onSave: (data: {
    title: string;
    content_html: string;
    content_md: string;
    format: MemoFormat;
    color: string;
    pinned: boolean;
  }) => void;
  onDelete: (id: string) => void;
}

const INPUT_CLS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MemoDetailDialog({ open, onOpenChange, memo, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [format, setFormat] = useState<MemoFormat>("rich");
  const [color, setColor] = useState("yellow");
  const [pinned, setPinned] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);

  useEffect(() => {
    if (memo) {
      setTitle(memo.title);
      setContentHtml(memo.content_html);
      setContentMd(memo.content_md);
      setFormat(memo.format);
      setColor(memo.color);
      setPinned(memo.pinned);
    } else {
      setTitle("");
      setContentHtml("");
      setContentMd("");
      setFormat("rich");
      setColor("yellow");
      setPinned(false);
    }
    setMdPreview(false);
  }, [memo, open]);

  function save() {
    onSave({ title: title.trim(), content_html: contentHtml, content_md: contentMd, format, color, pinned });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{memo ? "编辑便签" : "新建便签"}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            className={INPUT_CLS}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPinned(!pinned)}
            className={cn("shrink-0", pinned && "text-primary")}
            title="置顶"
          >
            <Pin className="h-4 w-4" />
          </Button>
        </div>

        {/* 颜色选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">颜色</span>
          <div className="flex gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition",
                  c.bg,
                  color === c.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                )}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* 格式切换 */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              onClick={() => setFormat("rich")}
              className={cn(
                "px-3 py-1 text-sm transition",
                format === "rich" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              富文本
            </button>
            <button
              onClick={() => setFormat("markdown")}
              className={cn(
                "px-3 py-1 text-sm transition",
                format === "markdown" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              Markdown
            </button>
          </div>
          {format === "markdown" && (
            <button
              onClick={() => setMdPreview(!mdPreview)}
              className="text-sm text-primary hover:underline"
            >
              {mdPreview ? "编辑" : "预览"}
            </button>
          )}
        </div>

        {/* 编辑区 */}
        <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "calc(90vh - 280px)" }}>
          {format === "rich" ? (
            <RichTextEditor content={contentHtml} onChange={setContentHtml} />
          ) : mdPreview ? (
            <MarkdownPreview content={contentMd} />
          ) : (
            <MarkdownEditor content={contentMd} onChange={setContentMd} />
          )}
        </div>

        <div className="flex justify-between">
          {memo ? (
            <Button
              variant="ghost"
              onClick={() => {
                onDelete(memo.id);
                onOpenChange(false);
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

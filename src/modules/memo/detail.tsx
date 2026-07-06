import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Edit3,
  Pin,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/memo/rich-text-editor";
import { MarkdownEditor } from "@/components/memo/markdown-editor";
import { NOTE_COLORS, getColorClasses } from "@/lib/note-colors";
import { getMemo, updateMemo, deleteMemo, addMemo } from "@/services/memos";
import { cn } from "@/lib/utils";
import type { Memo, MemoFormat } from "@/lib/types";

const INPUT_CLS =
  "flex h-10 w-full rounded-md border border-black/10 bg-white/40 dark:bg-black/20 px-3 py-2 text-sm placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MemoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // 编辑态
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [format, setFormat] = useState<MemoFormat>("rich");
  const [color, setColor] = useState("yellow");
  const [pinned, setPinned] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);

  useEffect(() => {
    if (id === "new") {
      setIsNew(true);
      setEditing(true);
      setLoading(false);
      setTitle("");
      setContentHtml("");
      setContentMd("");
      setFormat("rich");
      setColor("yellow");
      setPinned(false);
      return;
    }
    let active = true;
    setLoading(true);
    getMemo(id!)
      .then((m) => {
        if (!active) return;
        setMemo(m);
        if (m) {
          setTitle(m.title);
          setContentHtml(m.content_html);
          setContentMd(m.content_md);
          setFormat(m.format);
          setColor(m.color);
          setPinned(m.pinned);
        }
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  function startEdit() {
    setEditing(true);
    setMdPreview(false);
  }

  function cancelEdit() {
    if (isNew) {
      navigate("/memo");
      return;
    }
    setEditing(false);
    if (memo) {
      setTitle(memo.title);
      setContentHtml(memo.content_html);
      setContentMd(memo.content_md);
      setFormat(memo.format);
      setColor(memo.color);
      setPinned(memo.pinned);
    }
  }

  async function save() {
    const data = {
      title: title.trim(),
      content_html: contentHtml,
      content_md: contentMd,
      format,
      color,
      pinned,
    };
    try {
      if (isNew) {
        const newId = await addMemo(data);
        navigate(`/memo/${newId}`, { replace: true });
        setIsNew(false);
        setEditing(false);
      } else if (memo) {
        await updateMemo(memo.id, data);
        setMemo({ ...memo, ...data });
        setEditing(false);
      }
    } catch (e) {
      alert("保存失败：" + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleDelete() {
    if (!memo) return;
    try {
      await deleteMemo(memo.id);
      navigate("/memo");
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        加载中…
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", getColorClasses(color))}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/memo")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button variant="ghost" size="icon" onClick={cancelEdit} title="取消">
                <X className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={save} title="保存">
                <Check className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={startEdit} title="编辑">
                <Edit3 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                title="删除"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-2xl px-6 pb-8">
          {editing ? (
            <EditView
              title={title}
              setTitle={setTitle}
              contentHtml={contentHtml}
              setContentHtml={setContentHtml}
              contentMd={contentMd}
              setContentMd={setContentMd}
              format={format}
              setFormat={setFormat}
              color={color}
              setColor={setColor}
              pinned={pinned}
              setPinned={setPinned}
              mdPreview={mdPreview}
              setMdPreview={setMdPreview}
            />
          ) : (
            <ReadView memo={memo} />
          )}
        </div>
      </div>
    </div>
  );
}

function ReadView({ memo }: { memo: Memo | null }) {
  if (!memo) {
    return <div className="py-16 text-center text-muted-foreground">便签不存在</div>;
  }
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {memo.pinned && <Pin className="h-4 w-4 text-foreground/40" />}
        <h1 className="text-2xl font-semibold">{memo.title || "无标题"}</h1>
      </div>
      <div className="mb-4 text-xs text-foreground/40">
        {new Date(memo.updated_at).toLocaleString("zh-CN")} ·{" "}
        {memo.format === "rich" ? "富文本" : "Markdown"}
      </div>
      {memo.format === "markdown" ? (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-black/10 bg-white/40 dark:bg-black/20 p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {memo.content_md || "*暂无内容*"}
          </ReactMarkdown>
        </div>
      ) : (
        <div
          className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-black/10 bg-white/40 dark:bg-black/20 p-4"
          dangerouslySetInnerHTML={{ __html: memo.content_html || "<p>暂无内容</p>" }}
        />
      )}
    </div>
  );
}

function EditView(props: {
  title: string;
  setTitle: (v: string) => void;
  contentHtml: string;
  setContentHtml: (v: string) => void;
  contentMd: string;
  setContentMd: (v: string) => void;
  format: MemoFormat;
  setFormat: (v: MemoFormat) => void;
  color: string;
  setColor: (v: string) => void;
  pinned: boolean;
  setPinned: (v: boolean) => void;
  mdPreview: boolean;
  setMdPreview: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={props.title}
          onChange={(e) => props.setTitle(e.target.value)}
          placeholder="标题"
          className={INPUT_CLS}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => props.setPinned(!props.pinned)}
          className={cn("shrink-0", props.pinned && "text-primary")}
          title="置顶"
        >
          <Pin className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">颜色</span>
        <div className="flex gap-1.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => props.setColor(c.value)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition",
                c.bg,
                props.color === c.value
                  ? "border-primary ring-2 ring-primary/30"
                  : c.value === "white" ? "border-black/15" : "border-transparent"
              )}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-black/10 bg-white/40 dark:bg-black/20">
          <button
            onClick={() => props.setFormat("rich")}
            className={cn(
              "px-3 py-1 text-sm transition rounded-l-md",
              props.format === "rich"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            富文本
          </button>
          <button
            onClick={() => props.setFormat("markdown")}
            className={cn(
              "px-3 py-1 text-sm transition rounded-r-md",
              props.format === "markdown"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            Markdown
          </button>
        </div>
        {props.format === "markdown" && (
          <button
            onClick={() => props.setMdPreview(!props.mdPreview)}
            className="text-sm text-primary hover:underline"
          >
            {props.mdPreview ? "编辑" : "预览"}
          </button>
        )}
      </div>

      {props.format === "rich" ? (
        <RichTextEditor content={props.contentHtml} onChange={props.setContentHtml} />
      ) : props.mdPreview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-black/10 bg-white/40 dark:bg-black/20 p-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {props.contentMd || "*暂无内容*"}
          </ReactMarkdown>
        </div>
      ) : (
        <MarkdownEditor content={props.contentMd} onChange={props.setContentMd} />
      )}
    </div>
  );
}

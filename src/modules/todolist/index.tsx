import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} from "@/services/todos";
import { PRIORITY_LABELS, priorityBorder, priorityDot } from "@/lib/priority";
import { TODO_ICONS, getTodoIcon, getTodoIconLabel } from "@/lib/todo-icons";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";

const INPUT_CLS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface FormState {
  title: string;
  due_at: string;
  reminder_enabled: boolean;
  priority: number;
  tag: string;
}

function emptyForm(): FormState {
  return {
    title: "",
    due_at: "",
    reminder_enabled: false,
    priority: 1,
    tag: "",
  };
}

export function TodolistPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = () => {
    listTodos()
      .then(setTodos)
      .catch(() => setError(true));
  };
  useEffect(load, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }
  function openEdit(t: Todo) {
    setEditing(t);
    setForm({
      title: t.title,
      due_at: t.due_at
        ? format(parseISO(t.due_at), "yyyy-MM-dd'T'HH:mm")
        : "",
      reminder_enabled: t.reminder_enabled,
      priority: t.priority,
      tag: t.tag ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      reminder_enabled: form.reminder_enabled,
      priority: form.priority,
      tag: form.tag || null,
    };
    try {
      if (editing) await updateTodo(editing.id, payload);
      else await addTodo(payload);
      setOpen(false);
      load();
    } catch (e) {
      console.error("保存待办失败:", e);
      const msg = e instanceof Error ? e.message : String(e);
      alert("保存失败：" + msg);
    }
  }

  async function toggle(t: Todo) {
    setTodos((p) =>
      p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
    );
    try {
      await updateTodo(t.id, { done: !t.done });
    } catch {
      /* ignore */
    }
  }

  async function remove(t: Todo) {
    setTodos((p) => p.filter((x) => x.id !== t.id));
    try {
      await deleteTodo(t.id);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">待办</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          新建
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl space-y-2 px-6 pb-6">
          {error ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              桌面端可编辑待办
            </div>
          ) : todos.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              还没有待办，点击「新建」添加
            </div>
          ) : (
        <ul className="space-y-2">
          {todos.map((t) => {
            const TagIcon = getTodoIcon(t.tag);
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-md border-l-4 ${priorityBorder(
                  t.priority
                )} bg-card p-3 shadow-sm`}
              >
                <button onClick={() => toggle(t)} className="shrink-0">
                  {t.done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${t.done ? "line-through opacity-60" : ""}`}
                  >
                    {t.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {t.due_at && (
                      <span>
                        {format(parseISO(t.due_at), "MM月dd日 HH:mm")}
                      </span>
                    )}
                    {t.reminder_enabled && (
                      <span className="text-primary">⏰ 提醒</span>
                    )}
                    {t.tag && (
                      <span className="flex items-center gap-1 rounded bg-muted px-1.5">
                        <TagIcon className="h-3 w-3" />
                        {getTodoIconLabel(t.tag)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full ${priorityDot(t.priority)}`}
                      />
                      {PRIORITY_LABELS[t.priority] ?? "普通"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(t)}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(t)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑待办" : "新建待办"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">内容</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLS}
                placeholder="做什么？"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">时间</span>
              <input
                type="datetime-local"
                value={form.due_at}
                onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">重要程度</span>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
                className={INPUT_CLS}
              >
                {PRIORITY_LABELS.map((l, i) => (
                  <option key={i} value={i}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">标识</span>
              <div className="grid grid-cols-5 gap-2">
                {TODO_ICONS.map((ic) => {
                  const Icon = ic.icon;
                  const active = form.tag === ic.value;
                  return (
                    <button
                      type="button"
                      key={ic.value}
                      onClick={() =>
                        setForm({
                          ...form,
                          tag: active ? "" : ic.value,
                        })
                      }
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {ic.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.reminder_enabled}
                onChange={(e) =>
                  setForm({ ...form, reminder_enabled: e.target.checked })
                }
                className="h-4 w-4"
              />
              到点提醒
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}

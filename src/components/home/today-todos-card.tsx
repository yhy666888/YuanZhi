import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { listTopTodos, updateTodo } from "@/services/todos";
import { priorityBorder } from "@/lib/priority";
import { getTodoIcon, getTodoIconLabel } from "@/lib/todo-icons";
import type { Todo } from "@/lib/types";

export function TodayTodosCard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    listTopTodos(5)
      .then(setTodos)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  };
  useEffect(load, []);

  async function toggle(t: Todo) {
    setTodos((p) =>
      p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
    );
    try {
      await updateTodo(t.id, { done: !t.done });
    } catch {
      /* 桌面端 */
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4 text-primary" />
            待办事项
          </span>
          <Link to="/todolist" className="text-sm text-primary hover:underline">
            全部
          </Link>
        </div>
        {err ? (
          <p className="py-4 text-sm text-destructive">加载失败：{err}</p>
        ) : todos.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">暂无待办事项</p>
        ) : (
          <ul className="space-y-1.5">
            {todos.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-2 rounded-md border-l-2 ${priorityBorder(
                  t.priority
                )} bg-muted/30 px-3 py-2`}
              >
                <button onClick={() => toggle(t)} className="shrink-0">
                  {t.done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <span
                  className={`flex-1 truncate text-sm ${t.done ? "line-through opacity-60" : ""}`}
                >
                  {t.title}
                </span>
                {t.due_at && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(parseISO(t.due_at), "MM月dd日 HH:mm")}
                  </span>
                )}
                {t.tag && (() => {
                  const TagIcon = getTodoIcon(t.tag);
                  return (
                    <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 text-xs">
                      <TagIcon className="h-3 w-3" />
                      {getTodoIconLabel(t.tag)}
                    </span>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

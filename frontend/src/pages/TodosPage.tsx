import { useState } from "react";
import { CalendarDays, Check, Clock3, ListFilter, Pencil, Plus, Trash2 } from "lucide-react";
import { api, type Priority, type Todo } from "../api";
import { TodoDialog } from "../components/TodoDialog";
import { Empty } from "../components/Widgets";
import { formatDue, priorityLabels } from "../utils";

export function TodosPage({ todos, refresh }: { todos: Todo[]; refresh: () => Promise<void> }) {
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [actionError, setActionError] = useState("");
  const visible = todos.filter(todo => (filter === "all" || (filter === "completed" ? todo.completed : !todo.completed)) && (priority === "all" || todo.priority === priority));
  const toggle = async (todo: Todo) => { await api.updateTodo(todo.id, { completed: !todo.completed }); await refresh(); };
  const remove = async (id: number) => { if (!window.confirm("确定删除这项任务吗？")) return; await api.deleteTodo(id); await refresh(); };
  return <div className="todo-page"><div className="todo-tabs"><button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>进行中 <span>{todos.filter(t => !t.completed).length}</span></button><button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>已完成 <span>{todos.filter(t => t.completed).length}</span></button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部 <span>{todos.length}</span></button><label className="filter-button"><ListFilter /><select aria-label="按优先级筛选" value={priority} onChange={event => setPriority(event.target.value as Priority | "all")}><option value="all">全部优先级</option><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select></label></div>{actionError && <div className="error-banner"><span>{actionError}</span><button onClick={() => setActionError("")}>关闭</button></div>}<div className="todo-list">{visible.map(todo => <article className={`todo-card ${todo.completed ? "completed" : ""}`} key={todo.id}><button className={`todo-check ${todo.priority}`} onClick={() => void toggle(todo).catch(err => setActionError(err instanceof Error ? err.message : "更新待办失败"))}>{todo.completed && <Check />}</button><div className="todo-copy"><div><strong>{todo.title}</strong><span className={`priority ${todo.priority}`}>{priorityLabels[todo.priority]}</span></div><small><CalendarDays /> {formatDue(todo.due_at)} <Clock3 /> {todo.pomodoro_target ? `${todo.pomodoros}/${todo.pomodoro_target} 番茄` : "未设置番茄"}</small></div><button className="icon-button" title="编辑" onClick={() => setEditing(todo)}><Pencil /></button><button className="icon-button danger" title="删除" onClick={() => void remove(todo.id).catch(err => setActionError(err instanceof Error ? err.message : "删除待办失败"))}><Trash2 /></button></article>)}{!visible.length && <Empty text="这里还没有任务" />}</div><button className="floating-add" onClick={() => setAdding(true)}><Plus /> 新建待办</button>{adding && <TodoDialog onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh(); }} />}{editing && <TodoDialog todo={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}</div>;
}

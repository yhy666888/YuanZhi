import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, CheckSquare2, Home, TimerReset, Wallet, X } from "lucide-react";
import { api } from "../api";
import { DateTimePicker } from "./DateTimePicker";
import { expenseCategories, localDateKey, type Page } from "../utils";

type Mode = "menu" | "expense" | "todo" | "plan";

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (page: Page) => void;
  refresh: () => Promise<void>;
}

export function CommandPalette({ onClose, onNavigate, refresh }: CommandPaletteProps) {
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [note, setNote] = useState("");
  const [todoTitle, setTodoTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [planTitle, setPlanTitle] = useState("");
  const [planAt, setPlanAt] = useState(`${localDateKey()}T09:00`);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const finishWith = async (message: string, action: () => Promise<unknown>) => {
    setBusy(true); setError(""); setDone("");
    try {
      await action();
      setDone(message);
      await refresh();
      window.setTimeout(onClose, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const submitExpense = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { setError("请输入有效金额"); return; }
    await finishWith(`已记账 ${formatYuan(cents)}`, () => api.createExpense({ amount_cents: cents, category, note: note.trim(), spent_at: localDateKey() }));
  };

  const submitTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!todoTitle.trim()) { setError("请填写待办内容"); return; }
    await finishWith("待办已创建", () => api.createTodo({ title: todoTitle.trim(), priority, due_at: null, pomodoro_target: 0 }));
  };

  const submitPlan = async () => {
    if (!planTitle.trim()) { setError("请填写计划内容"); return; }
    if (!planAt.includes("T") || !planAt.slice(11, 16)) { setError("每日计划需要填写开始时间"); return; }
    const day = planAt.slice(0, 10);
    const time = planAt.slice(11, 16);
    await finishWith("计划已创建", () => api.createPlan({ plan_type: "daily", title: planTitle.trim(), start_date: day, end_date: day, start_time: time, end_time: null, priority: "medium", notes: "", progress: 0 }));
  };

  const menuActions = [
    { icon: Wallet, label: "记一笔支出", hint: "金额 + 分类", run: () => setMode("expense") },
    { icon: CheckSquare2, label: "新建待办", hint: "标题 + 优先级", run: () => setMode("todo") },
    { icon: CalendarDays, label: "新建今日计划", hint: "标题 + 开始时间", run: () => setMode("plan") },
    { icon: Home, label: "首页", hint: "", run: () => onNavigate("home") },
    { icon: CheckSquare2, label: "待办事项", hint: "", run: () => onNavigate("todos") },
    { icon: TimerReset, label: "番茄钟", hint: "", run: () => onNavigate("pomodoro") },
    { icon: CalendarDays, label: "计划", hint: "", run: () => onNavigate("plan") },
    { icon: Wallet, label: "记账", hint: "", run: () => onNavigate("money") },
  ];

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="todo-dialog command-dialog" onMouseDown={event => event.stopPropagation()}>
      <div className="dialog-title">
        <div><span>{mode === "menu" ? "快捷操作" : mode === "expense" ? "记一笔支出" : mode === "todo" ? "新建待办" : "新建今日计划"}</span><small>{mode === "menu" ? "Ctrl + K 随时呼出" : "Esc 返回"}</small></div>
        {mode !== "menu"
          ? <button type="button" className="command-back" title="返回" onClick={() => { setMode("menu"); setError(""); }}><ArrowLeft /></button>
          : <button type="button" onClick={onClose}><X /></button>}
      </div>
      {done && <p className="command-done">{done}</p>}
      {error && <p className="form-error">{error}</p>}
      {mode === "menu" && <div className="command-menu">
        {menuActions.map(action => <button key={action.label} type="button" onClick={() => { setError(""); action.run(); }}>
          <action.icon /><div><strong>{action.label}</strong>{action.hint && <small>{action.hint}</small>}</div>
        </button>)}
      </div>}
      {mode === "expense" && <div className="command-form">
        <label>金额（元）<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" autoFocus /></label>
        <label>分类<div className="category-chips">{expenseCategories.map(item => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></label>
        <label>备注（可选）<input value={note} onChange={event => setNote(event.target.value)} maxLength={200} placeholder="花了什么" /></label>
        <button className="command-submit" disabled={busy} onClick={() => void submitExpense()}>{busy ? "保存中…" : "记一笔"}</button>
      </div>}
      {mode === "todo" && <form className="command-form" onSubmit={event => void submitTodo(event)}>
        <label>待办内容<input value={todoTitle} onChange={event => setTodoTitle(event.target.value)} maxLength={120} placeholder="要做什么？" autoFocus /></label>
        <label>优先级<select value={priority} onChange={event => setPriority(event.target.value as typeof priority)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        <button className="command-submit" type="submit" disabled={busy}>{busy ? "保存中…" : "创建待办"}</button>
      </form>}
      {mode === "plan" && <div className="command-form">
        <label>计划内容<input value={planTitle} onChange={event => setPlanTitle(event.target.value)} maxLength={160} placeholder="要做什么？" autoFocus /></label>
        <div className="command-form-row">
          <label>日期与开始时间<DateTimePicker value={planAt} onChange={value => value && setPlanAt(value)} ariaLabel="计划日期与开始时间" align="right" /></label>
        </div>
        <button className="command-submit" disabled={busy} onClick={() => void submitPlan()}>{busy ? "保存中…" : "创建计划"}</button>
      </div>}
    </div>
  </div>;
}

function formatYuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

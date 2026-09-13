import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import { api, type Expense, type ExpenseListPayload } from "../api";
import { DateTimePicker } from "../components/DateTimePicker";
import { Empty } from "../components/Widgets";
import { expenseCategories, formatCents, incomeCategories, monthKey, nowDateTimeKey, payMethods } from "../utils";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
type Kind = "expense" | "income";

function categoriesFor(kind: Kind) {
  return kind === "income" ? incomeCategories : expenseCategories;
}

function MoneyRecordDialog({ expense, onClose, onSaved }: { expense?: Expense; onClose: () => void; onSaved: () => Promise<void> }) {
  const [kind, setKind] = useState<Kind>((expense?.kind as Kind) ?? "expense");
  const [amount, setAmount] = useState(expense ? String(expense.amount_cents / 100) : "");
  const [category, setCategory] = useState(expense?.category ?? expenseCategories[0]);
  const [method, setMethod] = useState(expense?.method ?? payMethods[0]);
  const [note, setNote] = useState(expense?.note ?? "");
  const [spentAt, setSpentAt] = useState(expense?.spent_at.slice(0, 16) ?? nowDateTimeKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { setError("请输入有效金额"); return; }
    setSaving(true); setError("");
    try {
      if (expense) await api.updateExpense(expense.id, { kind, amount_cents: cents, category, method, note: note.trim(), spent_at: spentAt });
      else await api.createExpense({ kind, amount_cents: cents, category, method, note: note.trim(), spent_at: spentAt });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSaving(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="todo-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void save(event)}>
      <div className="dialog-title"><div><span>{expense ? "编辑记录" : "记一笔"}</span><small>类型、支付方式与日期随手切换</small></div><button type="button" onClick={onClose}><X /></button></div>
      <label>类型<div className="category-chips">{(["expense", "income"] as Kind[]).map(item => <button key={item} type="button" className={kind === item ? "active" : ""} onClick={() => { setKind(item); if (!categoriesFor(item).includes(category)) setCategory(categoriesFor(item)[0]); }}>{item === "expense" ? "支出" : "收入"}</button>)}</div></label>
      <label>金额（元）<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" autoFocus /></label>
      <label>支付方式<div className="category-chips">{payMethods.map(item => <button key={item} type="button" className={method === item ? "active" : ""} onClick={() => setMethod(item)}>{item}</button>)}</div></label>
      <label>分类<div className="category-chips">{categoriesFor(kind).map(item => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></label>
      <label>备注（可选）<input value={note} onChange={event => setNote(event.target.value)} maxLength={200} placeholder="花了什么 / 来源" /></label>
      <label>发生时间<DateTimePicker value={spentAt} onChange={value => value && setSpentAt(value)} ariaLabel="发生时间" /></label>
      {error && <p className="form-error">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
    </form>
  </div>;
}

export function MoneyPage({ onChanged }: { onChanged: () => Promise<void> }) {
  const [month, setMonth] = useState(monthKey());
  const [data, setData] = useState<ExpenseListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.expenses(month));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取记账数据失败");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // 账单加载：setState 均位于 await 之后的异步续体，非同步级联渲染
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const shiftMonth = (delta: number) => setMonth(current => {
    const [year, mon] = current.split("-").map(Number);
    const next = new Date(year, mon - 1 + delta, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  });

  const remove = async (id: number) => {
    if (!window.confirm("删除这条记录吗？")) return;
    setError("");
    try { await api.deleteExpense(id); await load(); await onChanged(); } catch (err) { setError(err instanceof Error ? err.message : "删除失败"); }
  };

  const filteredItems = (data?.items ?? []).filter(item => kindFilter === "all" || item.kind === kindFilter);
  const groups: [string, Expense[]][] = [];
  for (const item of filteredItems) {
    const day = item.spent_at.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last[0] === day) last[1].push(item);
    else groups.push([day, [item]]);
  }
  const monthLabel = `${month.split("-")[0]} 年 ${Number(month.split("-")[1])} 月`;
  const summary = data?.summary;
  const maxCategory = summary?.by_category[0]?.total_cents ?? 0;
  const isCurrentMonth = month === monthKey();

  return <div className="page money-page">
    <section className="panel money-summary">
      <div className="money-summary-head">
        <div className="money-month"><Wallet /><strong>{monthLabel}</strong><button onClick={() => shiftMonth(-1)} aria-label="上个月"><ChevronLeft /></button><button onClick={() => setMonth(monthKey())}>本月</button><button onClick={() => shiftMonth(1)} aria-label="下个月"><ChevronRight /></button></div>
        <div className="money-totals">
          <div><span>本月支出</span><strong>{summary ? formatCents(summary.month_total_cents) : "--"}</strong></div>
          <div><span>本月收入</span><strong>{summary ? formatCents(summary.month_income_cents) : "--"}</strong></div>
          {isCurrentMonth && <div><span>今日支出</span><strong>{summary ? formatCents(summary.today_total_cents) : "--"}</strong></div>}
          <div><span>本月笔数</span><strong>{summary?.count ?? "--"}</strong></div>
        </div>
      </div>
      <div className="money-assets">
        <div><span>存款（收入 − 支出）</span><strong>{summary ? formatCents(summary.savings_cents) : "--"}</strong></div>
        <div><span>负债（信用卡待还）</span><strong>{summary ? formatCents(summary.debt_cents) : "--"}</strong></div>
        <small>信用卡消费会计入负债；可通过记一笔收入（选择信用卡）来登记还款。</small>
      </div>
      {summary && summary.by_category.length > 0 && <div className="money-categories">
        {summary.by_category.map(item => <div className="money-category" key={item.category}>
          <div><span>{item.category}</span><small>{item.count} 笔</small></div>
          <div className="money-category-bar"><i style={{ width: `${maxCategory ? Math.max(6, Math.round(item.total_cents / maxCategory * 100)) : 0}%` }} /><b>{formatCents(item.total_cents)}</b></div>
        </div>)}
      </div>}
    </section>
    <section className="panel money-list">
      <h2>消费明细</h2>
      <div className="money-kind-filter">{([["all", "全部"], ["expense", "支出"], ["income", "收入"]] as ["all" | Kind, string][]).map(([key, label]) => <button key={key} className={kindFilter === key ? "active" : ""} onClick={() => setKindFilter(key)}>{label}</button>)}</div>
      {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}>关闭</button></div>}
      {loading ? <Empty text="正在读取账单…" /> : groups.length ? groups.map(([date, items]) => <div className="money-day" key={date}>
        <div className="money-day-head"><strong>{date.slice(5).replace("-", "/")} {WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()]}</strong><span>{formatCents(items.reduce((sum, item) => sum + (item.kind === "income" ? item.amount_cents : -item.amount_cents), 0))}</span></div>
        {items.map(item => <div className="money-row" key={item.id}>
          <span className={`money-category-badge cat-${expenseCategories.indexOf(item.category) % 6}`}>{item.category}</span>
          <div className="money-copy"><strong>{item.note || item.category}</strong><small>{item.spent_at.slice(11, 16)} · {item.method}</small></div>
          <b className={item.kind === "income" ? "income" : ""}>{item.kind === "income" ? "+" : ""}{formatCents(item.amount_cents)}</b>
          <button className="icon-button" title="编辑记录" onClick={() => setEditing(item)}><Pencil /></button>
          <button className="icon-button danger" title="删除记录" onClick={() => void remove(item.id)}><Trash2 /></button>
        </div>)}
      </div>) : <Empty text={`${monthLabel}还没有记录，点右下角 ⊕ 记一笔`} />}
    </section>
    <button className="money-fab" title="记一笔" aria-label="记一笔" onClick={() => setDialogOpen(true)}><Plus /></button>
    {dialogOpen && <MoneyRecordDialog onClose={() => setDialogOpen(false)} onSaved={async () => { setDialogOpen(false); await load(); await onChanged(); }} />}
    {editing && <MoneyRecordDialog expense={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); await onChanged(); }} />}
  </div>;
}

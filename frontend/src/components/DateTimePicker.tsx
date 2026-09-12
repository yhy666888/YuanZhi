import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { localDateKey } from "../utils";

const WEEKDAY_INITIALS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const WHEEL_ITEM_HEIGHT = 40;

function parseDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateLabel(value: string) {
  const { year, month, day } = parseDateParts(value);
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
  const yearPrefix = year === new Date().getFullYear() ? "" : `${year}年`;
  return `${yearPrefix}${month}月${day}日 ${weekday}`;
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // 捕获阶段监听：表单等祖先元素会 stopPropagation 阻止冒泡，捕获阶段可确保外部点击始终能关闭弹层
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, close]);
  return ref;
}

function relativeDateKeys() {
  return [0, 1, 2].map(offset => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return { key: localDateKey(date), label: offset === 0 ? "今天" : offset === 1 ? "明天" : "后天" };
  });
}

interface PickerFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  clearable?: boolean;
  timeClearable?: boolean;
  placeholder?: string;
  align?: "left" | "right";
  ariaLabel?: string;
}

function CalendarPanel({ value, onPick }: { value: string | null; onPick: (key: string) => void }) {
  const initial = value ? parseDateParts(value) : null;
  const [view, setView] = useState(() => ({
    year: initial?.year ?? new Date().getFullYear(),
    month: initial ? initial.month - 1 : new Date().getMonth(),
  }));
  const todayKey = localDateKey();
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const dayCount = new Date(view.year, view.month + 1, 0).getDate();
  const shiftMonth = (delta: number) => setView(current => {
    const next = new Date(current.year, current.month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });
  return <>
    <div className="picker-quick">{relativeDateKeys().map(item => <button key={item.key} type="button" className={value === item.key ? "active" : ""} onClick={() => onPick(item.key)}>{item.label}</button>)}</div>
    <div className="cal-head">
      <strong>{view.year} 年 {view.month + 1} 月</strong>
      <div className="cal-nav">
        <button type="button" aria-label="上个月" onClick={() => shiftMonth(-1)}><ChevronLeft /></button>
        <button type="button" aria-label="下个月" onClick={() => shiftMonth(1)}><ChevronRight /></button>
      </div>
    </div>
    <div className="cal-grid">
      {WEEKDAY_INITIALS.map(day => <span key={day} className="cal-dow">{day}</span>)}
      {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
      {Array.from({ length: dayCount }, (_, index) => index + 1).map(day => {
        const key = toDateKey(view.year, view.month, day);
        return <button key={key} type="button" className={`cal-day ${key === todayKey ? "today" : ""} ${key === value ? "selected" : ""}`} onClick={() => onPick(key)}>{day}</button>;
      })}
    </div>
  </>;
}

export function DatePicker({ value, onChange, clearable = false, placeholder = "选择日期", align = "left", ariaLabel }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return <div className="picker-wrap" ref={ref}>
    <button type="button" className={`picker-field ${value ? "" : "empty"}`} aria-label={ariaLabel} onClick={() => setOpen(current => !current)}>
      <CalendarDays />
      <span>{value ? formatDateLabel(value) : placeholder}</span>
    </button>
    {open && <div className={`picker-popup ${align === "right" ? "right" : ""}`} role="dialog" aria-label={ariaLabel ? `${ariaLabel}选择面板` : "日期选择面板"}>
      <CalendarPanel value={value} onPick={key => { onChange(key); close(); }} />
      {clearable && <div className="picker-footer"><button type="button" className="picker-clear" onClick={() => { onChange(null); close(); }}>清除日期</button></div>}
    </div>}
  </div>;
}

function WheelColumn({ options, value, onChange, ariaLabel }: { options: string[]; value: string; onChange: (value: string) => void; ariaLabel: string }) {  const listRef = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(0, options.indexOf(value));
  const initialScroll = useRef(initialIndex);
  const interacted = useRef(false);
  const [liveIndex, setLiveIndex] = useState(initialIndex);
  const markInteracted = () => { interacted.current = true; };
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = initialScroll.current * WHEEL_ITEM_HEIGHT;
  }, []);
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)));
    setLiveIndex(next);
    if (interacted.current && options[next] !== value) onChange(options[next]);
  };
  const pick = (index: number) => {
    interacted.current = true;
    if (options[index] !== value) onChange(options[index]);
    listRef.current?.scrollTo({ top: index * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
  };
  return <div className="wheel-col">
    <div className="wheel-list" role="listbox" aria-label={ariaLabel} ref={listRef} onScroll={handleScroll} onWheel={markInteracted} onTouchMove={markInteracted}>
      <div className="wheel-spacer" />
      {options.map((option, index) => (
        <div key={option} role="option" aria-selected={index === liveIndex} className={`wheel-item ${index === liveIndex ? "active" : ""}`} onClick={() => pick(index)}>{option}</div>
      ))}
      <div className="wheel-spacer" />
    </div>
  </div>;
}

export function DateTimePicker({ value, onChange, clearable = false, timeClearable = false, placeholder = "选择时间", align = "left", ariaLabel }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [draftDate, setDraftDate] = useState(localDateKey());
  const [draftHour, setDraftHour] = useState("09");
  const [draftMinute, setDraftMinute] = useState("00");
  const [hasTime, setHasTime] = useState(true);
  const openPanel = () => {
    const current = value ?? `${localDateKey()}T09:00`;
    setDraftDate(current.slice(0, 10));
    if (current.includes("T")) {
      setHasTime(true);
      setDraftHour(current.slice(11, 13));
      setDraftMinute(current.slice(14, 16));
    } else {
      setHasTime(false);
      setDraftHour("09");
      setDraftMinute("00");
    }
    setMode("date");
    setOpen(true);
  };
  const commitDate = (date: string) => {
    setDraftDate(date);
    const next = hasTime ? `${date}T${draftHour}:${draftMinute}` : date;
    if (next !== value) onChange(next);
  };
  const commitTime = (hour: string, minute: string) => {
    setHasTime(true);
    setDraftHour(hour);
    setDraftMinute(minute);
    const next = `${draftDate}T${hour}:${minute}`;
    if (next !== value) onChange(next);
  };
  const display = !value ? null : value.includes("T") ? `${formatDateLabel(value.slice(0, 10))} ${value.slice(11, 16)}` : formatDateLabel(value);
  return <div className="picker-wrap" ref={ref}>
    <button type="button" className={`picker-field ${value ? "" : "empty"}`} aria-label={ariaLabel} onClick={() => (open ? close() : openPanel())}>
      <CalendarDays />
      <span>{display ?? placeholder}</span>
    </button>
    {open && <div className={`picker-popup dt-popup ${align === "right" ? "right" : ""}`} role="dialog" aria-label={ariaLabel ? `${ariaLabel}选择面板` : "日期时间选择面板"}>
      <div className="picker-tabs">
        <button type="button" className={`picker-tab ${mode === "date" ? "active" : ""}`} onClick={() => setMode("date")}>{formatDateLabel(draftDate)}</button>
        <button type="button" className={`picker-tab ${mode === "time" ? "active" : ""}`} onClick={() => setMode("time")}>{hasTime ? `${draftHour}:${draftMinute}` : "未设置"}</button>
      </div>
      {mode === "date"
        ? <CalendarPanel value={draftDate} onPick={commitDate} />
        : <div className="wheel-row">
            <div className="wheel-lines" />
            <WheelColumn options={HOUR_OPTIONS} value={draftHour} onChange={next => commitTime(next, draftMinute)} ariaLabel="小时" />
            <WheelColumn options={MINUTE_OPTIONS} value={draftMinute} onChange={next => commitTime(draftHour, next)} ariaLabel="分钟" />
          </div>}
      {(clearable || (timeClearable && hasTime)) && <div className="picker-footer">
        {timeClearable && hasTime && <button type="button" className="picker-clear" onClick={() => { setHasTime(false); if (draftDate !== value) onChange(draftDate); }}>清除时间</button>}
        {clearable && <button type="button" className="picker-clear" onClick={() => { onChange(null); close(); }}>清除</button>}
      </div>}
    </div>}
  </div>;
}

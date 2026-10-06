"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Props = { value: string; min: string; max: string; onChange: (value: string) => void; label: string };
const keyForDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthDate = (key: string) => key ? new Date(`${key}T12:00:00`) : new Date();

export default function CalendarPicker({ value, min, max, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => { const date = monthDate(value); return new Date(date.getFullYear(), date.getMonth(), 1); });
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);
  const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
  const dates = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? keyForDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)) : "";
  });
  const selectedLabel = value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "Choose a date";

  return <div className="calendar-picker" ref={rootRef}>
    <button type="button" className="calendar-trigger" aria-label={`${label}: ${selectedLabel}`} aria-expanded={open} onClick={() => { if (!open && value) { const date = monthDate(value); setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)); } setOpen(!open); }}><CalendarDays size={15}/><span>{selectedLabel}</span></button>
    {open && <div className="calendar-popover" role="dialog" aria-label={label}>
      <div className="calendar-month"><button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><ChevronLeft size={16}/></button><b>{monthLabel}</b><button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><ChevronRight size={16}/></button></div>
      <div className="calendar-grid">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span className="calendar-weekday" key={`${day}-${index}`}>{day}</span>)}{dates.map((date, index) => {
        const disabled = !date || date < min || date > max;
        return date ? <button type="button" key={date} className={`calendar-day ${date === value ? "selected" : ""}`} disabled={disabled} aria-pressed={date === value} onClick={() => { onChange(date); setOpen(false); }}>{Number(date.slice(-2))}</button> : <span key={`empty-${index}`}/>;
      })}</div>
    </div>}
  </div>;
}

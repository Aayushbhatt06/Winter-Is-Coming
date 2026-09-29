"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Sunrise, Moon, Brain, BookOpen, Dumbbell, Footprints, Droplets, PhoneOff, Heart, Salad, Plus, X } from "lucide-react";
import type { Goal, TrackerOptions } from "@/lib/types";

const suggestions = [
  { name: "Walk 10,000 steps", category: "Movement", icon: Footprints },
  { name: "Move my body", category: "Movement", icon: Dumbbell },
  { name: "Eat a nourishing breakfast", category: "Nutrition", icon: Sunrise },
  { name: "Reach my protein goal", category: "Nutrition", icon: Salad },
  { name: "Drink 8 glasses of water", category: "Wellbeing", icon: Droplets },
  { name: "Read for 20 minutes", category: "Learning", icon: BookOpen },
  { name: "Focus on my studies", category: "Learning", icon: Brain },
  { name: "Sleep 8 hours", category: "Rest", icon: Moon },
  { name: "Take a mindful break", category: "Wellbeing", icon: Heart },
  { name: "Limit social media", category: "Focus", icon: PhoneOff },
];
const themes = [{ id: "forest", name: "Moss", color: "#65735d" }, { id: "ocean", name: "Glacier", color: "#637c84" }, { id: "sunset", name: "Ember", color: "#b77c5b" }, { id: "lavender", name: "Dusk", color: "#83748c" }];

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [step, setStep] = useState(mode === "signup" ? 0 : 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", startDate: new Date().toLocaleDateString("en-CA"), endDate: "", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", theme: "forest", goals: [] as Goal[], customGoal: "", trackers: { weight: false, mood: false, sleep: false, photo: false, progressPhoto: false } as TrackerOptions });
  const update = (patch: Partial<typeof form>) => setForm((old) => ({ ...old, ...patch }));
  const toggleGoal = (item: typeof suggestions[number]) => {
    const found = form.goals.some((goal) => goal.name === item.name);
    update({ goals: found ? form.goals.filter((goal) => goal.name !== item.name) : [...form.goals, { id: crypto.randomUUID(), name: item.name, category: item.category, frequency: "daily" }] });
  };
  const addCustom = () => {
    const name = form.customGoal.trim();
    if (!name || form.goals.length >= 20) return;
    update({ goals: [...form.goals, { id: crypto.randomUUID(), name, category: "Personal", frequency: "daily" }], customGoal: "" });
  };
  const toggleTracker = (key: keyof TrackerOptions) => update({ trackers: { ...form.trackers, [key]: !form.trackers[key] } });
  async function submit(event?: React.FormEvent) {
    event?.preventDefault(); setBusy(true); setError("");
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Something went wrong. Please try again."); setBusy(false); return; }
      router.push("/dashboard"); router.refresh();
    } catch { setError("Couldn’t connect right now. Please try again."); setBusy(false); }
  }
  const next = () => { if (step === 0 && (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 8)) { setError("Add your name, a valid email, and a password with 8+ characters."); return; } if (step === 1 && (!form.startDate || !form.endDate || form.endDate < form.startDate)) { setError("Choose an end date on or after your start date."); return; } if (step === 2 && form.goals.length === 0) { setError("Pick at least one goal, or add your own."); return; } setError(""); setStep(step + 1); };
  const totalSteps = 4;

  return <main className="auth-page">
    <Link href="/" className="brand"><span className="brand-mark"><Sparkles size={17}/></span> winter arc</Link>
    <div className="auth-card">
      {mode === "signup" && <div className="step-meta"><span>YOUR WINTER ARC · STEP {step + 1} OF {totalSteps}</span><div className="progress-line"><i style={{ width: `${((step + 1) / totalSteps) * 100}%` }}/></div></div>}
      {mode === "login" ? <>
        <span className="eyebrow">WELCOME BACK</span><h1>Good to have<br/>you here.</h1><p className="subtle">Pick up right where you left off.</p>
        <form onSubmit={submit} className="auth-fields"><label>Email address<input autoComplete="email" type="email" required value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="you@example.com"/></label><label>Password<input autoComplete="current-password" type="password" required value={form.password} onChange={(e) => update({ password: e.target.value })} placeholder="Your password"/></label>{error && <p className="error-message">{error}</p>}<button className="button button-primary button-wide" disabled={busy}>{busy ? "Signing you in…" : "Log in"}<ArrowRight size={16}/></button></form>
        <p className="auth-foot">New to this? <Link href="/signup">Create an account <ArrowRight size={13}/></Link></p>
      </> : <>
        {step === 0 && <><span className="eyebrow">A SPACE THAT’S YOURS</span><h1>Let’s set up<br/>your arc.</h1><p className="subtle">Start with the basics. It only takes a minute.</p><div className="auth-fields"><label>Your name<input autoComplete="name" required value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="What should we call you?"/></label><label>Email address<input autoComplete="email" type="email" required value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="you@example.com"/></label><label>Password<input autoComplete="new-password" type="password" required minLength={8} value={form.password} onChange={(e) => update({ password: e.target.value })} placeholder="At least 8 characters"/></label></div></>}
        {step === 1 && <><span className="eyebrow">THE CALENDAR</span><h1>Pick your<br/>season.</h1><p className="subtle">You’ll be able to check in on the day, not in advance or after.</p><div className="auth-fields"><label>When does your arc begin?<input type="date" min={new Date().toLocaleDateString("en-CA")} value={form.startDate} onChange={(e) => update({ startDate: e.target.value, endDate: form.endDate && form.endDate < e.target.value ? e.target.value : form.endDate })}/></label><label>When does it finish?<input type="date" min={form.startDate || new Date().toLocaleDateString("en-CA")} value={form.endDate} onChange={(e) => update({ endDate: e.target.value })}/></label><p className="hint">Your dates use your local timezone ({form.timeZone}). Check-ins open only on the current day.</p></div></>}
        {step === 2 && <><span className="eyebrow">YOUR DAILY PRACTICE</span><h1>What would<br/>you like to do?</h1><p className="subtle">Choose a few habits that feel right for you. Start small, change them later.</p><div className="suggestion-grid">{suggestions.map((item) => { const Icon = item.icon; const active = form.goals.some((goal) => goal.name === item.name); return <button key={item.name} type="button" className={`suggestion ${active ? "selected" : ""}`} onClick={() => toggleGoal(item)}><span className="suggestion-icon"><Icon size={16}/></span><span>{item.name}</span>{active && <Check size={15} className="suggestion-check"/>}</button>; })}</div><form className="custom-goal" onSubmit={(e) => { e.preventDefault(); addCustom(); }}><input value={form.customGoal} onChange={(e) => update({ customGoal: e.target.value })} maxLength={90} placeholder="Add your own goal…"/><button disabled={!form.customGoal.trim() || form.goals.length >= 20} aria-label="Add goal"><Plus size={18}/></button></form>{form.goals.filter((goal) => goal.category === "Personal").map((goal) => <button key={goal.id} type="button" className="added-custom" onClick={() => update({ goals: form.goals.filter((item) => item.id !== goal.id) })}>{goal.name}<X size={13}/></button>)}<p className="hint">Choose up to 20 goals. Even one is a good start.</p></>}
        {step === 3 && <><span className="eyebrow">MAKE IT FEEL LIKE YOU</span><h1>Choose your<br/>little extras.</h1><p className="subtle">Keep the page calm, and add only the trackers you want to see.</p><p className="field-title">COLOR MOOD</p><div className="theme-grid">{themes.map((theme) => <button type="button" key={theme.id} onClick={() => update({ theme: theme.id })} className={`theme-swatch ${form.theme === theme.id ? "active" : ""}`}><i style={{ background: theme.color }}/>{theme.name}{form.theme === theme.id && <Check size={14}/>}</button>)}</div><p className="field-title">OPTIONAL TRACKERS</p><div className="tracker-list">{[["weight","Body weight","Log a measurement whenever you like."],["progressPhoto","Progress photos","Add photos whenever you want to document your journey."],["mood","Daily mood","A small 1–5 check-in with yourself."],["sleep","Hours of sleep","Notice your rest over time."],["photo","Profile photo","Add a photo to your account."]] .map(([key,title,desc]) => <button type="button" key={key} className={`tracker-option ${form.trackers[key as keyof TrackerOptions] ? "checked" : ""}`} onClick={() => toggleTracker(key as keyof TrackerOptions)}><span className="fake-check">{form.trackers[key as keyof TrackerOptions] && <Check size={14}/>}</span><span><b>{title}</b><small>{desc}</small></span></button>)}</div></>}
        {error && <p className="error-message">{error}</p>}
        <div className="step-actions">{step > 0 && <button className="button button-quiet" type="button" onClick={() => { setError(""); setStep(step - 1); }}><ArrowLeft size={16}/> Back</button>}{step < 3 ? <button className="button button-primary" type="button" onClick={next}>Continue <ArrowRight size={16}/></button> : <button className="button button-primary" disabled={busy} onClick={() => void submit()}>{busy ? "Creating your space…" : "Create my Winter Arc"}<ArrowRight size={16}/></button>}</div>
        {step === 0 && <p className="auth-foot">Already have an account? <Link href="/login">Log in <ArrowRight size={13}/></Link></p>}
      </>}
    </div>
    <div className="auth-note"><span>“</span> Small things, done consistently, add up to big things.</div>
  </main>;
}

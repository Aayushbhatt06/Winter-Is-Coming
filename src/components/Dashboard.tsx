"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BicepsFlexed, Check, CloudSun, Flame, Leaf, LogOut, Menu, Plus, Settings2, Sparkles, Trash2, Upload, X } from "lucide-react";
import type { Checkin, Goal, Profile, ProgressPhoto, TrackerEntry, TrackerOptions } from "@/lib/types";
import { daysBetween } from "@/lib/date";
import ThemeControl from "@/components/ThemeControl";

const themes: Record<string,string> = { forest: "theme-forest", ocean: "theme-ocean", sunset: "theme-sunset", lavender: "theme-lavender" };
const praise = ["Look at you, keeping a promise to yourself.", "That’s one more reason to be proud today.", "You showed up. That’s the whole point.", "A little progress is still progress.", "You’re building something lovely, one day at a time.", "Your future self is already saying thank you."];
const calmQuotes = ["Small things, done consistently, add up to big things.", "You don’t have to see the whole staircase. Just take the first step.", "A little better is still better.", "Be where your feet are. This day is enough."];
const colorOptions = [{ id: "forest", label: "Moss", color: "#65735d" }, { id: "ocean", label: "Glacier", color: "#637c84" }, { id: "sunset", label: "Ember", color: "#b77c5b" }, { id: "lavender", label: "Dusk", color: "#83748c" }];
const todayLocal = (tz: string) => { const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(); const get = (t: string) => parts.find((p) => p.type === t)?.value || ""; return `${get("year")}-${get("month")}-${get("day")}`; };
const longDate = (key: string, _tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(new Date(`${key}T12:00:00Z`));
const compactDate = (key: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${key}T12:00:00Z`));
const chartTooltipStyle = { backgroundColor: "var(--white)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", boxShadow: "0 8px 24px #0002" };
const chartTooltipLabelStyle = { color: "var(--muted)" };
const chartTooltipItemStyle = { color: "var(--ink)" };

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [trackerEntries, setTrackerEntries] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const goalIdsRef = useRef<string[]>([]);
  const persistedGoalIdsRef = useRef<string[]>([]);
  const goalSaveWorkerRef = useRef(false);
  const goalSaveSequenceRef = useRef(0);
  const [trackerDate, setTrackerDate] = useState("");
  const [weight, setWeight] = useState("");
  const [mood, setMood] = useState("");
  const [sleep, setSleep] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<ProgressPhoto | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/me", { cache: "no-store" }); if (response.status === 401) { router.replace("/login"); return; } const data = await response.json(); if (!response.ok) throw new Error(data.error); const date = todayLocal(data.profile.timeZone || "UTC"); const initialGoalIds = (data.checkins as Checkin[]).find((entry) => entry.date === date)?.goalIds || []; goalIdsRef.current = [...initialGoalIds]; persistedGoalIdsRef.current = [...initialGoalIds]; setProfile(data.profile); setCheckins(data.checkins); setProgressPhotos(data.progressPhotos || []); const merged = new Map<string, TrackerEntry>(); for (const entry of data.checkins as Checkin[]) if (entry.weight || entry.mood || entry.sleep) merged.set(entry.date, { date: entry.date, weight: entry.weight, mood: entry.mood, sleep: entry.sleep }); for (const entry of (data.trackerEntries || []) as TrackerEntry[]) merged.set(entry.date, { ...merged.get(entry.date), ...entry }); setTrackerEntries([...merged.values()].sort((a, b) => a.date.localeCompare(b.date))); setTrackerDate(date); } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t load your arc."); } finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!viewingPhoto && !confirmDeletePhoto) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmDeletePhoto) setConfirmDeletePhoto(null);
        else setViewingPhoto(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewingPhoto, confirmDeletePhoto]);
  const today = profile ? todayLocal((profile as Profile & {timeZone?:string}).timeZone || "UTC") : "";
  const selectedTrackerEntry = trackerEntries.find((entry) => entry.date === trackerDate);
  useEffect(() => { setWeight(selectedTrackerEntry?.weight?.toString() || ""); setMood(selectedTrackerEntry?.mood?.toString() || ""); setSleep(selectedTrackerEntry?.sleep?.toString() || ""); }, [trackerDate, selectedTrackerEntry?.weight, selectedTrackerEntry?.mood, selectedTrackerEntry?.sleep]);
  const withinArc = !!profile && today >= profile.startDate && today <= profile.endDate;
  const trackerDateValid = !!profile && trackerDate >= profile.startDate && trackerDate <= profile.endDate && trackerDate <= today;
  const trackerMaxDate = profile ? (today < profile.endDate ? today : profile.endDate) : today;
  const todayCheckin = checkins.find((item) => item.date === today);
  const completed = todayCheckin?.goalIds || [];
  const completedCount = completed.length;
  const percent = profile?.goals.length ? Math.round(completedCount / profile.goals.length * 100) : 0;
  const daysTotal = profile ? daysBetween(profile.startDate, profile.endDate) : 1;
  const daysElapsed = profile ? (today < profile.startDate ? 0 : Math.min(daysTotal, daysBetween(profile.startDate, today))) : 0;
  const checkedDays = useMemo(() => { const set = new Set<string>(); if (!profile) return set; for (const entry of checkins) if (entry.goalIds.length >= profile.goals.length) set.add(entry.date); return set; }, [profile, checkins]);
  const run = useMemo(() => { let count = 0; for (let offset = 0; offset < daysElapsed; offset++) { const d = new Date(`${profile!.startDate}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); const key = d.toISOString().slice(0, 10); if (checkedDays.has(key)) count++; else if (offset < daysElapsed - 1) count = 0; } return count; }, [profile, daysElapsed, checkedDays]);
  const chartData = useMemo(() => { if (!profile) return []; const data: { date: string; label: string; done: number; total: number }[] = []; const start = new Date(`${profile.startDate}T12:00:00Z`); for (let i = 0; i < Math.min(daysElapsed, 28); i++) { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); const date = d.toISOString().slice(0, 10); const entry = checkins.find((x) => x.date === date); data.push({ date, label: compactDate(date), done: Math.round((entry?.goalIds.length || 0) / profile.goals.length * 100), total: profile.goals.length }); } return data; }, [profile, daysElapsed, checkins]);
  const weightData = trackerEntries.filter((entry) => entry.weight !== undefined).map((entry) => ({ label: compactDate(entry.date), weight: entry.weight as number }));
  const moodData = trackerEntries.filter((entry) => entry.mood !== undefined).map((entry) => ({ label: compactDate(entry.date), value: entry.mood as number }));
  const sleepData = trackerEntries.filter((entry) => entry.sleep !== undefined).map((entry) => ({ label: compactDate(entry.date), value: entry.sleep as number }));

  function saveCheckin() {
    if (!profile || !withinArc || goalSaveWorkerRef.current) return;
    goalSaveWorkerRef.current = true;
    setSavingCheckin(true);
    setError("");
    void (async () => {
      while (true) {
        const sequence = goalSaveSequenceRef.current;
        const goalIds = [...goalIdsRef.current];
        try {
          const response = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: today, goalIds }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          persistedGoalIdsRef.current = goalIds;
          if (sequence !== goalSaveSequenceRef.current) continue;
          setCheckins((old) => {
            const existing = old.find((entry) => entry.date === today);
            return [...old.filter((entry) => entry.date !== today), { ...existing, ...result.checkin }].sort((a,b) => a.date.localeCompare(b.date));
          });
          if (goalIds.length === profile.goals.length) { setNotice(praise[Math.floor(Math.random() * praise.length)]); setTimeout(() => setNotice(""), 5000); }
          break;
        } catch (e) {
          if (sequence !== goalSaveSequenceRef.current) continue;
          const rollback = [...persistedGoalIdsRef.current];
          goalIdsRef.current = rollback;
          setCheckins((old) => {
            const existing = old.find((entry) => entry.date === today);
            return [...old.filter((entry) => entry.date !== today), { ...existing, date: today, goalIds: rollback } as Checkin].sort((a,b) => a.date.localeCompare(b.date));
          });
          const reason = e instanceof Error ? e.message : "Couldn’t save today’s progress.";
          setError(`${reason} Your change was undone.`);
          break;
        }
      }
      goalSaveWorkerRef.current = false;
      setSavingCheckin(false);
    })();
  }
  async function saveTrackerEntry(patch: Record<string, number>) {
    if (!profile || !trackerDate) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/tracker-entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: trackerDate, ...patch }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTrackerEntries((old) => [...old.filter((entry) => entry.date !== trackerDate), result.entry].sort((a, b) => a.date.localeCompare(b.date)));
      setNotice(`Saved for ${compactDate(trackerDate)}. Nice job keeping track.`); setTimeout(() => setNotice(""), 4000);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t save this tracker entry."); }
    finally { setSaving(false); }
  }
  function toggleGoal(goalId: string) {
    const next = new Set(goalIdsRef.current);
    if (next.has(goalId)) next.delete(goalId); else next.add(goalId);
    const goalIds = [...next];
    goalIdsRef.current = goalIds;
    ++goalSaveSequenceRef.current;
    setCheckins((old) => {
      const existing = old.find((entry) => entry.date === today);
      return [...old.filter((entry) => entry.date !== today), { ...existing, date: today, goalIds } as Checkin].sort((a,b) => a.date.localeCompare(b.date));
    });
    void saveCheckin();
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  async function uploadProgressPhoto(file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Choose an image smaller than 8 MB."); return; }
    setSaving(true); setError("");
    try {
      const sigResponse = await fetch("/api/progress-photo-signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: trackerDate }) });
      const sig = await sigResponse.json();
      if (!sigResponse.ok) throw new Error(sig.error);
      const form = new FormData(); form.append("file", file); form.append("api_key", sig.apiKey); form.append("timestamp", sig.timestamp); form.append("public_id", sig.publicId); form.append("overwrite", "true"); form.append("signature", sig.signature);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: form });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.error?.message || "Photo upload failed.");
      if (uploaded.public_id !== sig.publicId) throw new Error("The uploaded photo could not be matched to this date. Please try again.");
      const saveResponse = await fetch("/api/progress-photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sig.date, photoUrl: uploaded.secure_url, publicId: sig.publicId }) });
      const result = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(result.error);
      setProgressPhotos((old) => [...old.filter((item) => item.date !== result.photo.date), result.photo].sort((a, b) => a.date.localeCompare(b.date)));
      setNotice(`Progress photo saved for ${compactDate(sig.date)}.`); setTimeout(() => setNotice(""), 5000);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t upload your photo."); }
    finally { setSaving(false); }
  }
  async function deleteProgressPhoto(date: string) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/progress-photo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProgressPhotos((old) => old.filter((item) => item.date !== date));
      setConfirmDeletePhoto(null); setViewingPhoto(null);
      setNotice(`Progress photo from ${compactDate(date)} deleted.`); setTimeout(() => setNotice(""), 4000);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t delete this photo."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="loading-screen"><div className="loading-mark"><Sparkles size={23}/></div><p>Small things, done consistently, add up to big things.</p><div className="loading-track"><i/></div><span>getting your space ready</span></main>;
  if (!profile) return <main className="loading-screen"><span className="error-message">{error || "We couldn’t find your Winter Arc."}</span><a className="button button-primary" href="/login">Back to login <ArrowRight size={16}/></a></main>;
  const fullName = profile.name.trim().split(/\s+/)[0];

  return <main className={`dashboard ${themes[profile.theme] || themes.forest}`}>
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}><a className="brand" href="/dashboard"><span className="brand-mark"><BicepsFlexed size={18}/></span> Winter Is Coming</a><div className="side-section"><span className="side-label">YOUR SPACE</span><a href="#today" className="side-link side-active"><span className="side-icon"><Leaf size={16}/></span> Today</a><a href="#progress" className="side-link"><span className="side-icon"><ArrowUpRight size={16}/></span> My progress</a><button className="side-link" onClick={() => setSettingsOpen(true)}><span className="side-icon"><Settings2 size={16}/></span> My goals</button></div><div className="sidebar-season"><span className="mini-sun">✳</span><span>YOUR WINTER ARC</span><b>{compactDate(profile.startDate)} — {compactDate(profile.endDate)}</b><small>{daysElapsed} of {daysTotal} days</small><div className="mini-progress"><i style={{ width: `${daysElapsed / daysTotal * 100}%` }}/></div></div><div className="sidebar-bottom"><div className="user-chip">{profile.photoUrl ? <img src={profile.photoUrl} alt=""/> : <span className="avatar-initial">{profile.name[0]?.toUpperCase()}</span>}<span><b>{profile.name}</b><small>On your own time</small></span><button aria-label="Sign out" onClick={logout}><LogOut size={15}/></button></div></div></aside>
    <section className="dashboard-main"><header className="dash-header"><button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu"><Menu size={19}/></button><div className="breadcrumb">YOUR SPACE <span>/</span> TODAY</div><div className="header-actions"><span className="today-stamp"><CloudSun size={16}/>{longDate(today, (profile as Profile & {timeZone?:string}).timeZone || "UTC")}</span><ThemeControl/><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings2 size={16}/> <span>Settings</span></button></div></header>
      <div className="dashboard-content"><section className="welcome-row" id="today"><div><span className="eyebrow">A NEW DAY, A NEW CHANCE</span><h1>Good morning, {fullName}<span className="greeting-period">.</span></h1><p>{calmQuotes[new Date(today + "T12:00:00").getDate() % calmQuotes.length]}</p></div><div className="streak-pill"><span className="streak-icon"><Flame size={17}/></span><span><b>{run} day{run === 1 ? "" : "s"}</b><small>current streak</small></span></div></section>
        {!withinArc && <div className="season-note"><Sparkles size={17}/><span>{today < profile.startDate ? `Your arc begins ${compactDate(profile.startDate)}. Your goals will be ready then.` : "Your Winter Arc is complete. Take a moment to be proud of how far you came."}</span></div>}
        {notice && <div className="praise-toast"><span><Sparkles size={16}/></span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
        {error && <div className="error-banner">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={15}/></button></div>}
        <div className="today-layout"><section className="card goals-card"><div className="card-heading"><div><span className="eyebrow">TODAY’S PRACTICE</span><h2>A few things for you</h2></div><span className="quiet-count">{completedCount} <i>/</i> {profile.goals.length}</span></div><div className="goal-progress-line"><i style={{ width: `${percent}%` }}/></div><div className="goal-list">{profile.goals.map((goal) => { const done = completed.includes(goal.id); return <button key={goal.id} className={`goal-row ${done ? "goal-done" : ""}`} disabled={!withinArc} aria-pressed={done} onClick={() => toggleGoal(goal.id)}><span className="goal-checkbox">{done && <Check size={14} strokeWidth={2.6}/>}</span><span className="goal-title">{goal.name}</span><span className="goal-category">{goal.category}</span></button>; })}</div><div className={`goal-footer ${percent === 100 && profile.goals.length > 0 ? "all-done" : ""}`}><span className="footer-sparkle"><Sparkles size={15}/></span><span>{percent === 100 && profile.goals.length > 0 ? "You showed up for yourself today. That’s everything." : "No rush. Every little thing counts."}</span><small>{savingCheckin ? "SAVING…" : "TODAY ONLY"}</small></div></section>
          <section className="card snapshot-card"><div className="card-heading"><div><span className="eyebrow">YOUR ARC, SO FAR</span><h2>In this together</h2></div><span className="snapshot-icon"><Leaf size={17}/></span></div><div className="snapshot-number">{daysElapsed}<small> / {daysTotal} days</small></div><span className="snapshot-caption">of your Winter Arc</span><div className="snapshot-progress"><div><span>Season progress</span><b>{Math.round(daysElapsed / daysTotal * 100)}%</b></div><div className="snapshot-track"><i style={{ width: `${daysElapsed / daysTotal * 100}%` }}/></div></div><div className="snapshot-bottom"><span><span className="tiny-ring">{percent}%</span> of today’s goals done</span><span>{daysTotal - daysElapsed} to go <ArrowRight size={12}/></span></div></section></div>
        {(profile.trackers.weight || profile.trackers.mood || profile.trackers.sleep || profile.trackers.progressPhoto) && <section className="card tracker-panel"><div className="tracker-panel-heading"><div><span className="eyebrow">YOUR OPTIONAL TRACKERS</span><h2>Little details, over time</h2><p>Log a measurement or photo for today or a past date in your Winter Arc. Habit check-ins stay today-only.</p></div><label className="tracker-date-field">ENTRY DATE<input type="date" min={profile.startDate} max={trackerMaxDate} value={trackerDate} onChange={(e) => setTrackerDate(e.target.value)}/></label></div>{!trackerDateValid && <p className="tracker-hint">Choose a date within your Winter Arc to add a tracker entry.</p>}<div className="tracker-entry-grid">{profile.trackers.weight && <div className="tracker-entry"><label>Body weight <span>kg</span><input type="number" inputMode="decimal" min="1" max="700" step="0.1" placeholder="e.g. 68.5" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={!trackerDateValid}/></label><button className="button button-primary" onClick={() => void saveTrackerEntry({ weight: Number(weight) })} disabled={!trackerDateValid || !weight || saving}>Save weight <ArrowRight size={13}/></button></div>}{profile.trackers.mood && <div className="tracker-entry"><span className="tracker-entry-title">How’s your mood?</span><div className="mood-control"><div>{[1,2,3,4,5].map((value) => <button key={value} className={mood === String(value) ? "mood-active" : ""} onClick={() => setMood(String(value))} disabled={!trackerDateValid} aria-label={`Mood ${value}`}>{["☁","◔","◑","◕","☀"][value-1]}</button>)}</div></div><button className="button button-primary" onClick={() => void saveTrackerEntry({ mood: Number(mood) })} disabled={!trackerDateValid || !mood || saving}>Save mood <ArrowRight size={13}/></button></div>}{profile.trackers.sleep && <div className="tracker-entry"><label>Hours of sleep<input type="number" min="0" max="24" step="0.5" placeholder="e.g. 8" value={sleep} onChange={(e) => setSleep(e.target.value)} disabled={!trackerDateValid}/></label><button className="button button-primary" onClick={() => void saveTrackerEntry({ sleep: Number(sleep) })} disabled={!trackerDateValid || sleep === "" || saving}>Save sleep <ArrowRight size={13}/></button></div>}{profile.trackers.progressPhoto && <div className="tracker-entry tracker-photo-entry"><span className="tracker-entry-title">Progress photo <small>{progressPhotos.some((item) => item.date === trackerDate) ? `A photo is saved for ${compactDate(trackerDate)}.` : "Add a photo for this date."}</small></span><label className={`button button-primary progress-photo-upload ${!trackerDateValid || saving ? "disabled" : ""}`}><Upload size={14}/>{saving ? "Uploading…" : progressPhotos.some((item) => item.date === trackerDate) ? "Replace photo" : "Choose photo"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void uploadProgressPhoto(e.target.files?.[0])} disabled={!trackerDateValid || saving}/></label><small>JPG, PNG, or WebP · up to 8 MB</small></div>}</div>{profile.trackers.progressPhoto && progressPhotos.length > 0 && <div className="progress-photo-gallery">{progressPhotos.map((item) => <figure key={item.date}><button type="button" className="progress-photo-thumb" onClick={() => setViewingPhoto(item)} aria-label={`View progress photo from ${compactDate(item.date)}`}><img src={item.photoUrl} alt=""/><span>View photo <ArrowUpRight size={12}/></span></button><figcaption><span>LOGGED</span><b>{compactDate(item.date)}</b></figcaption></figure>)}</div>}</section>}
        <section className="progress-section" id="progress"><div className="section-title"><div><span className="eyebrow">THE DAYS ARE ADDING UP</span><h2>Your progress</h2></div><span className="section-tag"><span/> A steady rhythm</span></div><div className="chart-grid"><section className="card chart-card"><div className="chart-heading"><div><h3>Days you showed up</h3><p>Daily goals completed · last 28 days</p></div><span className="chart-legend"><i/> GOALS DONE</span></div><div className="chart-wrap">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 0, bottom: 0, left: -24 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd"/><YAxis domain={[0,100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickFormatter={(n) => `${n}%`} axisLine={false} tickLine={false} ticks={[0,25,50,75,100]}/><Tooltip cursor={false} contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(value) => [`${value}%`, "Goals done"]}/><Bar dataKey="done" fill="var(--accent)" radius={[4,4,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer> : <div className="chart-empty"><span>✳</span><b>Your first check-in starts a new little pattern.</b><small>Come back after today’s goals.</small></div>}</div></section>
          <section className="card chart-card"><div className="chart-heading"><div><h3>{profile.trackers.weight ? "Weight trend" : "A gentle look back"}</h3><p>{profile.trackers.weight ? "Measurements saved by date" : "A moving average of your daily practice"}</p></div><span className="chart-legend line-legend"><i/> {profile.trackers.weight ? "WEIGHT" : "DAILY"}</span></div><div className="chart-wrap">{profile.trackers.weight && weightData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={weightData} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.16}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false}/><Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(value) => [`${value} kg`, "Weight"]}/><Area type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.2} fill="url(#weightFill)" dot={{ r: 3, fill: "var(--accent)" }}/></AreaChart></ResponsiveContainer> : chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id="rhythmFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.16}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd"/><YAxis domain={[0,100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickFormatter={(n) => `${n}%`} axisLine={false} tickLine={false}/><Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(value) => [`${value}%`, "Goals done"]}/><Area type="monotone" dataKey="done" stroke="var(--accent)" strokeWidth={2.2} fill="url(#rhythmFill)"/></AreaChart></ResponsiveContainer> : <div className="chart-empty"><span>♡</span><b>Your progress is yours to grow.</b><small>Even one checked box counts.</small></div>}</div></section></div>{(profile.trackers.mood || profile.trackers.sleep) && <div className="metric-chart-grid">{profile.trackers.mood && <MetricChartCard title="Mood over time" unit=" / 5" data={moodData} empty="Your mood entries will appear here."/>}{profile.trackers.sleep && <MetricChartCard title="Sleep over time" unit=" hrs" data={sleepData} empty="Your sleep entries will appear here."/>}</div>}</section>
        <footer className="dash-footer"><span>A good day to begin again.</span><span>TAKE WHAT HELPS. LEAVE THE REST.</span></footer></div>
    </section>
    {settingsOpen && <SettingsModal profile={profile} onClose={() => setSettingsOpen(false)} onSaved={(updated) => { setProfile(updated); setSettingsOpen(false); }}/>}
    {viewingPhoto && <div className="photo-lightbox-backdrop" role="presentation" onClick={() => setViewingPhoto(null)}><section className="photo-lightbox" role="dialog" aria-modal="true" aria-labelledby="photo-lightbox-title" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">YOUR WINTER ARC</span><h2 id="photo-lightbox-title">Progress photo · {compactDate(viewingPhoto.date)}</h2></div><button className="icon-button" type="button" onClick={() => setViewingPhoto(null)} aria-label="Close photo viewer"><X size={18}/></button></header><img className="photo-lightbox-image" src={viewingPhoto.photoUrl} alt={`Progress photo from ${compactDate(viewingPhoto.date)}`}/><div className="photo-lightbox-actions"><a className="button button-primary" href={viewingPhoto.photoUrl.replace("/image/upload/", "/image/upload/fl_attachment/")} download={`winter-arc-progress-${viewingPhoto.date}.jpg`}><ArrowDownToLine size={15}/> Download photo</a><button className="button photo-delete-button" type="button" onClick={() => setConfirmDeletePhoto(viewingPhoto)}><Trash2 size={15}/> Delete photo</button></div></section></div>}
    {confirmDeletePhoto && <div className="photo-lightbox-backdrop photo-confirm-backdrop" role="presentation" onClick={() => !saving && setConfirmDeletePhoto(null)}><section className="delete-photo-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-photo-title" aria-describedby="delete-photo-description" onClick={(event) => event.stopPropagation()}><span className="delete-photo-icon"><Trash2 size={19}/></span><span className="eyebrow">A PERMANENT CHANGE</span><h2 id="delete-photo-title">Delete this progress photo?</h2><p id="delete-photo-description">The photo from {compactDate(confirmDeletePhoto.date)} will be permanently deleted from your account. You can’t recover it.</p>{error && <p className="error-message">{error}</p>}<div className="delete-photo-actions"><button className="button button-quiet" type="button" onClick={() => setConfirmDeletePhoto(null)} disabled={saving}>Keep photo</button><button className="button photo-delete-button" type="button" onClick={() => void deleteProgressPhoto(confirmDeletePhoto.date)} disabled={saving}>{saving ? "Deleting…" : "Delete permanently"}</button></div></section></div>}
  </main>;
}

function MetricChartCard({ title, unit, data, empty }: { title: string; unit: string; data: { label: string; value: number }[]; empty: string }) {
  const domain: [number, number | "auto"] = title.startsWith("Mood") ? [1, 5] : [0, "auto"];
  return <section className="card chart-card">
    <div className="chart-heading"><div><h3>{title}</h3><p>Entries saved by date</p></div><span className="chart-legend line-legend"><i/> TREND</span></div>
    <div className="chart-wrap">{data.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false}/><YAxis domain={domain} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false}/><Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(value) => [`${value}${unit}`, title.startsWith("Mood") ? "Mood" : "Sleep"]}/><Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.2} dot={{ r: 3, fill: "var(--accent)" }} activeDot={{ r: 5 }}/></LineChart></ResponsiveContainer> : <div className="chart-empty"><span>♡</span><b>{empty}</b><small>Choose a past date or add today’s entry.</small></div>}</div>
  </section>;
}

function SettingsModal({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: (p: Profile) => void }) {
  const [goals, setGoals] = useState<Goal[]>(profile.goals);
  const [custom, setCustom] = useState("");
  const [trackers, setTrackers] = useState<TrackerOptions>(profile.trackers);
  const [theme, setTheme] = useState(profile.theme);
  const [startDate, setStartDate] = useState(profile.startDate);
  const [endDate, setEndDate] = useState(profile.endDate);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  async function save() { setBusy(true); setError(""); try { const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goals, trackers, theme, startDate, endDate }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); onSaved({ ...profile, goals, trackers, theme, startDate, endDate }); } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t save settings."); } finally { setBusy(false); } }
  async function upload(file?: File) { if (!file) return; if (file.size > 5 * 1024 * 1024) { setError("Choose an image smaller than 5 MB."); return; } setPhotoBusy(true); setError(""); try { const sigRes = await fetch("/api/avatar-signature", { method: "POST" }); const sig = await sigRes.json(); if (!sigRes.ok) throw new Error(sig.error); const form = new FormData(); form.append("file", file); form.append("api_key", sig.apiKey); form.append("timestamp", sig.timestamp); form.append("folder", sig.folder); form.append("signature", sig.signature); const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: form }); const uploaded = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploaded.error?.message || "Photo upload failed."); const saveRes = await fetch("/api/avatar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoUrl: uploaded.secure_url }) }); if (!saveRes.ok) throw new Error("Photo uploaded, but couldn’t save it to your profile."); onSaved({ ...profile, photoUrl: uploaded.secure_url }); } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t upload your photo."); } finally { setPhotoBusy(false); } }
  const add = () => { if (!custom.trim() || goals.length >= 20) return; setGoals([...goals, { id: crypto.randomUUID(), name: custom.trim(), category: "Personal", frequency: "daily" }]); setCustom(""); };
  return <div className="modal-backdrop" onClick={onClose}><div className="settings-modal" onClick={(e) => e.stopPropagation()}><header className="modal-header"><div><span className="eyebrow">YOUR WINTER ARC</span><h2>Make it yours</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header><div className="settings-scroll"><label className="settings-label">Your dates<span className="hint">We use these to open check-ins only on the day itself.</span></label><div className="date-pair"><label>Start date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/></label><label>End date<input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)}/></label></div><div className="settings-divider"/><label className="settings-label">Your daily goals<span className="hint">Keep at least one. Add, remove, or edit your practice.</span></label><div className="edit-goals">{goals.map((goal) => <div key={goal.id}><input value={goal.name} maxLength={90} onChange={(e) => setGoals(goals.map((g) => g.id === goal.id ? { ...g, name: e.target.value } : g))}/><button onClick={() => setGoals(goals.filter((g) => g.id !== goal.id))} aria-label="Remove goal"><X size={15}/></button></div>)}</div><form className="custom-goal" onSubmit={(e) => { e.preventDefault(); add(); }}><input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add another goal…" maxLength={90}/><button aria-label="Add goal" disabled={!custom.trim() || goals.length >= 20}><Plus size={17}/></button></form><div className="settings-divider"/><label className="settings-label">Your color mood</label><div className="theme-grid">{colorOptions.map((item) => <button key={item.id} onClick={() => setTheme(item.id)} className={`theme-swatch ${theme === item.id ? "active" : ""}`}><i style={{ background: item.color }}/>{item.label}{theme === item.id && <Check size={14}/>}</button>)}</div><div className="settings-divider"/><label className="settings-label">Optional trackers<span className="hint">Turn on only what feels useful.</span></label><div className="settings-trackers">{[["weight","Body weight"],["progressPhoto","Progress photos"],["mood","Daily mood"],["sleep","Hours of sleep"],["photo","Profile photo"]].map(([key,label]) => <button key={key} onClick={() => setTrackers({ ...trackers, [key]: !trackers[key as keyof TrackerOptions] })}><span className={`fake-check ${trackers[key as keyof TrackerOptions] ? "checked" : ""}`}>{trackers[key as keyof TrackerOptions] && <Check size={13}/>}</span>{label}</button>)}</div>{trackers.photo && <label className="photo-upload"><span className="photo-preview">{profile.photoUrl ? <img src={profile.photoUrl} alt="Profile preview"/> : profile.name[0]}</span><span><b>{photoBusy ? "Uploading…" : "Add a profile photo"}</b><small>JPG or PNG, up to 5 MB</small></span><span className="upload-button"><Upload size={15}/> Choose</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void upload(e.target.files?.[0])} disabled={photoBusy}/></label>}</div>{error && <p className="error-message modal-error">{error}</p>}<footer className="modal-footer"><button className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => void save()} disabled={busy || photoBusy}>{busy ? "Saving…" : "Save my changes"}<ArrowRight size={15}/></button></footer></div></div>;
}

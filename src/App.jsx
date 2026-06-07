import { useState, useEffect, useRef } from "react";

const COLORS = [
  { bg: "#FF6B35", light: "#FFF0EB" },
  { bg: "#2EC4B6", light: "#E8FAF9" },
  { bg: "#9B5DE5", light: "#F3EEFF" },
  { bg: "#F7C59F", light: "#FFF8F0" },
  { bg: "#06D6A0", light: "#E6FBF5" },
  { bg: "#E63946", light: "#FFEAEC" },
  { bg: "#FFD60A", light: "#FFFBE6" },
  { bg: "#4CC9F0", light: "#E8F8FF" },
];

const EMOJIS = ["🏃","🚴","💪","🏋️","😴","📱","💼","🥗","💧","🧘","⚽","🏀","🎯","📚","🎸","🌿"];
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MONTHS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_SHORT = ["L","M","M","J","V","S","D"];

const BADGES = [
  { id: "first", label: "Premier pas", desc: "Premier score enregistré", emoji: "🌱", check: (scores) => Object.keys(scores).length >= 1 },
  { id: "week", label: "Semaine complète", desc: "7 jours de suite", emoji: "🔥", check: (scores, streak) => streak >= 7 },
  { id: "month", label: "Mois parfait", desc: "30 jours de suite", emoji: "💎", check: (scores, streak) => streak >= 30 },
  { id: "record10", label: "Top 10", desc: "10 scores enregistrés", emoji: "⭐", check: (scores) => Object.keys(scores).length >= 10 },
  { id: "record50", label: "Régulier", desc: "50 scores enregistrés", emoji: "🏅", check: (scores) => Object.keys(scores).length >= 50 },
  { id: "goal5", label: "En forme", desc: "Objectif atteint 5 fois", emoji: "🎯", check: (scores, streak, tracker) => Object.values(scores).filter(v => tracker.mode === "max" ? v <= tracker.max : v >= tracker.max).length >= 5 },
];

const DEFAULT_TRACKERS = [
  { id: 1, name: "🚴 Vélo", unit: "km", max: 30, color: 1, scores: {}, mode: "min", restDays: [] },
  { id: 2, name: "🏃 Course", unit: "km", max: 5, color: 4, scores: {}, mode: "min", restDays: [0] },
  { id: 3, name: "💼 Travail", unit: "h", max: 8, color: 2, scores: {}, mode: "min", restDays: [5,6] },
  { id: 4, name: "📱 Écran", unit: "h", max: 2, color: 5, scores: {}, mode: "max", restDays: [] },
  { id: 5, name: "😴 Sommeil", unit: "h", max: 8, color: 6, scores: {}, mode: "min", restDays: [] },
  { id: 6, name: "💪 Pompes", unit: "reps", max: 100, color: 0, scores: {}, mode: "min", restDays: [0] },
  { id: 7, name: "🏋️ Abdos", unit: "reps", max: 200, color: 3, scores: {}, mode: "min", restDays: [0] },
];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return (new Date(year, month, 1).getDay() + 6) % 7; }
function formatKey(y, m, d) { return `${y}-${m}-${d}`; }
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  return Math.ceil((((d - new Date(d.getFullYear(),0,1))/86400000)+1)/7);
}

function getStreak(scores) {
  let count = 0;
  const t = new Date();
  while (true) {
    const key = formatKey(t.getFullYear(), t.getMonth(), t.getDate());
    if (scores[key] === undefined) break;
    count++;
    t.setDate(t.getDate() - 1);
  }
  return count;
}

function getDayColor(score, trackerObj) {
  const c = COLORS[trackerObj.color % COLORS.length];
  if (trackerObj.mode === "max") {
    if (score <= trackerObj.max) return `#06D6A0aa`;
    return `#E63946aa`;
  }
  const pct = Math.min(score / trackerObj.max, 1);
  const hex = Math.round(pct * 220 + 35).toString(16).padStart(2,"0");
  return `${c.bg}${hex}`;
}

export default function App() {
  const today = new Date();
  const [trackers, setTrackers] = useState(() => {
    try {
      const s = localStorage.getItem("pt-v3");
      const parsed = s ? JSON.parse(s) : DEFAULT_TRACKERS;
      return parsed.map(t => ({ restDays: [], ...t }));
    } catch { return DEFAULT_TRACKERS; }
  });
  const [activeTracker, setActiveTracker] = useState(() => {
    try { return parseInt(localStorage.getItem("pt-active")) || (trackers[0]?.id); } catch { return trackers[0]?.id; }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("pt-theme") || "dark");
  const [view, setView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [calView, setCalView] = useState("month"); // month | week
  const [modal, setModal] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [newT, setNewT] = useState({ name: "", max: "", unit: "", mode: "min", color: 0, restDays: [] });
  const [editT, setEditT] = useState({});
  const [friendCode] = useState(() => {
    let c = localStorage.getItem("pt-friendcode");
    if (!c) { c = Math.random().toString(36).substr(2,6).toUpperCase(); localStorage.setItem("pt-friendcode", c); }
    return c;
  });
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState(() => { try { return JSON.parse(localStorage.getItem("pt-friends") || "[]"); } catch { return []; }});
  const [friendInput, setFriendInput] = useState("");
  const [notifTime] = useState("15:00");
  const [newBadge, setNewBadge] = useState(null);
  const prevBadgesRef = useRef({});

  const isDark = theme === "dark";
  const bg = isDark ? "#0F0F13" : "#F4F4F8";
  const card = isDark ? "#1E1E28" : "#FFFFFF";
  const header = isDark ? "#16161D" : "#FFFFFF";
  const border = isDark ? "#2A2A35" : "#E0E0EA";
  const text = isDark ? "#F0EFF4" : "#1A1A2E";
  const muted = isDark ? "#888" : "#999";
  const subtle = isDark ? "#2A2A35" : "#EFEFEF";

  useEffect(() => { localStorage.setItem("pt-v3", JSON.stringify(trackers)); }, [trackers]);
  useEffect(() => { localStorage.setItem("pt-active", activeTracker); }, [activeTracker]);
  useEffect(() => { localStorage.setItem("pt-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("pt-friends", JSON.stringify(friends)); }, [friends]);

  // Notifications
  useEffect(() => {
    if (!("Notification" in window)) return;
    const checkNotif = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      if (hhmm === notifTime) {
        const todayKey = formatKey(now.getFullYear(), now.getMonth(), now.getDate());
        const missing = trackers.filter(t => t.scores[todayKey] === undefined);
        if (missing.length > 0 && Notification.permission === "granted") {
          new Notification("🏆 Tracker - Rappel 15h", {
            body: `Tu n'as pas encore rempli : ${missing.map(t => t.name).join(", ")}`,
          });
        }
      }
    };
    const interval = setInterval(checkNotif, 60000);
    return () => clearInterval(interval);
  }, [trackers, notifTime]);

  // Badge detection
  useEffect(() => {
    trackers.forEach(t => {
      const streak = getStreak(t.scores);
      BADGES.forEach(badge => {
        const key = `${t.id}-${badge.id}`;
        const earned = badge.check(t.scores, streak, t);
        const wasEarned = prevBadgesRef.current[key];
        if (earned && !wasEarned) {
          setNewBadge({ badge, trackerName: t.name });
          setTimeout(() => setNewBadge(null), 4000);
        }
        prevBadgesRef.current[key] = earned;
      });
    });
  }, [trackers]);

  const tracker = trackers.find(t => t.id === activeTracker) || trackers[0];
  const color = COLORS[tracker?.color % COLORS.length];
  const streak = tracker ? getStreak(tracker.scores) : 0;
  const allScores = tracker ? Object.entries(tracker.scores).map(([k,v]) => ({key:k,value:v})).sort((a,b) => a.key.localeCompare(b.key)) : [];
  const bestScore = allScores.length ? (tracker.mode === "max" ? Math.min(...allScores.map(s=>s.value)) : Math.max(...allScores.map(s=>s.value))) : 0;
  const monthAvg = (() => {
    const days = getDaysInMonth(currentYear, currentMonth);
    const vals = [];
    for (let d=1;d<=days;d++) {
      const v = tracker?.scores[formatKey(currentYear,currentMonth,d)];
      if (v !== undefined) vals.push(v);
    }
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
  })();

  function saveScore() {
    const val = parseFloat(inputVal);
    if (isNaN(val) || val < 0) return;
    const key = formatKey(modal.year, modal.month, modal.day);
    setTrackers(prev => prev.map(t => t.id === activeTracker ? { ...t, scores: { ...t.scores, [key]: val } } : t));
    setModal(null); setInputVal("");
  }

  function deleteScore(key) {
    setTrackers(prev => prev.map(t => t.id === activeTracker
      ? { ...t, scores: Object.fromEntries(Object.entries(t.scores).filter(([k]) => k !== key)) } : t));
  }

  function addTracker() {
    if (!newT.name.trim()) return;
    const id = Date.now();
    setTrackers(prev => [...prev, { id, ...newT, name: newT.name.trim(), max: parseFloat(newT.max)||10, unit: newT.unit||"reps", scores: {}, restDays: newT.restDays||[] }]);
    setActiveTracker(id);
    setShowNew(false);
    setNewT({ name:"", max:"", unit:"", mode:"min", color:0, restDays:[] });
  }

  function removeTracker(id) {
    const r = trackers.filter(t => t.id !== id);
    setTrackers(r);
    if (activeTracker === id) setActiveTracker(r[0]?.id);
  }

  function openEdit(t) {
    setEditModal(t.id);
    setEditT({ name: t.name, max: String(t.max), unit: t.unit, mode: t.mode||"min", color: t.color, restDays: t.restDays||[] });
  }

  function saveEdit() {
    if (!editT.name.trim()) return;
    setTrackers(prev => prev.map(t => t.id === editModal
      ? { ...t, name: editT.name.trim(), max: parseFloat(editT.max)||t.max, unit: editT.unit||t.unit, mode: editT.mode, color: editT.color, restDays: editT.restDays||[] } : t));
    setEditModal(null);
  }

  function requestNotifPermission() {
    if ("Notification" in window) Notification.requestPermission();
  }

  function getEarnedBadges(t) {
    const s = getStreak(t.scores);
    return BADGES.filter(b => b.check(t.scores, s, t));
  }

  // Week view helpers
  function getWeekDays() {
    const d = new Date(currentYear, currentMonth, today.getDate());
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    return Array.from({length:7}, (_,i) => { const dd = new Date(monday); dd.setDate(monday.getDate()+i); return dd; });
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const weekDays = getWeekDays();
  const isMax = tracker?.mode === "max";

  // Chart data: last 8 weeks averages
  const weeklyData = (() => {
    if (!tracker) return [];
    const weeks = {};
    Object.entries(tracker.scores).forEach(([k,v]) => {
      const [y,m,d] = k.split("-").map(Number);
      const date = new Date(y,m,d);
      const wk = `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2,"0")}`;
      if (!weeks[wk]) weeks[wk] = [];
      weeks[wk].push(v);
    });
    return Object.entries(weeks).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8).map(([wk,vals]) => ({
      wk, avg: (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)
    }));
  })();

  const inputStyle = { padding:"11px 13px", background: subtle, border:`2px solid ${border}`, borderRadius:11, color:text, fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:text, transition:"background 0.3s" }}>

      {/* Badge popup */}
      {newBadge && (
        <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", zIndex:999,
          background: card, border:`2px solid ${color.bg}`, borderRadius:16, padding:"12px 20px",
          display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px #0008", animation:"slideDown 0.4s ease" }}>
          <span style={{fontSize:28}}>{newBadge.badge.emoji}</span>
          <div>
            <div style={{fontWeight:800, fontSize:14, color:color.bg}}>Badge débloqué !</div>
            <div style={{fontWeight:700, fontSize:13}}>{newBadge.badge.label}</div>
            <div style={{fontSize:11, color:muted}}>{newBadge.trackerName} — {newBadge.badge.desc}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:header, borderBottom:`1px solid ${border}`, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontWeight:800, fontSize:18, letterSpacing:"-0.5px" }}>
          🏆 <span style={{color:color?.bg}}>Tracker</span>
        </div>
        <div style={{display:"flex", gap:6, alignItems:"center"}}>
          <button onClick={() => setShowFriends(true)} style={{ padding:"6px 10px", borderRadius:20, border:"none", cursor:"pointer", background:subtle, color:muted, fontSize:12, fontWeight:600 }}>👥</button>
          <button onClick={() => setTheme(t => t==="dark"?"light":"dark")} style={{ padding:"6px 10px", borderRadius:20, border:"none", cursor:"pointer", background:subtle, color:muted, fontSize:14 }}>{isDark?"☀️":"🌙"}</button>
          {["calendar","stats","badges"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"6px 10px", borderRadius:20, border:"none", cursor:"pointer",
              background: view===v ? color?.bg : subtle,
              color: view===v ? "#fff" : muted, fontSize:11, fontWeight:600
            }}>{v==="calendar"?"📅":v==="stats"?"📊":"🏅"}</button>
          ))}
        </div>
      </div>

      {/* Tracker tabs */}
      <div style={{ background:header, padding:"10px 12px", display:"flex", gap:6, overflowX:"auto", borderBottom:`1px solid ${border}`, alignItems:"center" }}>
        {trackers.map(t => {
          const c = COLORS[t.color % COLORS.length];
          const active = t.id === activeTracker;
          const todayKey2 = formatKey(today.getFullYear(),today.getMonth(),today.getDate());
          const done = t.scores[todayKey2] !== undefined;
          return (
            <button key={t.id} onClick={() => setActiveTracker(t.id)} style={{
              padding:"7px 13px", borderRadius:10, border:"none", cursor:"pointer",
              background: active ? c.bg : subtle, color: active?"#fff":muted,
              fontSize:12, fontWeight:700, whiteSpace:"nowrap",
              display:"flex", alignItems:"center", gap:5, flexShrink:0, position:"relative"
            }}>
              {t.name}
              {done && <span style={{fontSize:9}}>✅</span>}
              {active && trackers.length>1 && (
                <span onClick={e=>{e.stopPropagation();removeTracker(t.id);}} style={{opacity:0.6,fontSize:10,cursor:"pointer"}}>✕</span>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowNew(true)} style={{ padding:"7px 12px", borderRadius:10, border:`2px dashed ${border}`, background:"transparent", color:muted, cursor:"pointer", fontSize:12, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>+ Nouveau</button>
      </div>

      <div style={{ padding:"14px", maxWidth:520, margin:"0 auto" }}>

        {/* Stats cards */}
        {tracker && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:7, marginBottom:12 }}>
            {[
              { label: isMax?"Meilleur":"Record", value: allScores.length ? bestScore : "—", suffix: tracker.unit },
              { label: isMax?"Maximum":"Objectif", value: tracker.max, suffix: tracker.unit },
              { label: "Série", value: streak, suffix: streak>1?"j":"j" },
              { label: "Moy. mois", value: monthAvg||"—", suffix: monthAvg?tracker.unit:"" },
            ].map((s,i) => (
              <div key={i} style={{ background:card, borderRadius:12, padding:"9px 7px", textAlign:"center", boxShadow: isDark?"none":"0 2px 8px #0001" }}>
                <div style={{ fontSize:18, fontWeight:800, color:color.bg }}>{s.value}</div>
                <div style={{ fontSize:9, color:muted, marginTop:1 }}>{s.suffix}</div>
                <div style={{ fontSize:9, color:muted, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Mode badge + edit button */}
        {tracker && (
          <div style={{ marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background: isMax?"#E6394622":`${color.bg}22`, color: isMax?"#E63946":color.bg }}>
              {isMax?"⬇️ Max à ne pas dépasser":"⬆️ Objectif min à atteindre"}
            </span>
            <button onClick={() => openEdit(tracker)} style={{ padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", background:subtle, color:muted, fontSize:12, fontWeight:600 }}>⚙️ Modifier</button>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view==="calendar" && tracker && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <button onClick={() => {
                if (currentMonth===0){setCurrentMonth(11);setCurrentYear(y=>y-1);}else setCurrentMonth(m=>m-1);
              }} style={{ background:subtle, border:"none", color:text, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:16 }}>‹</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontWeight:700, fontSize:15}}>{MONTHS_FULL[currentMonth]} {currentYear}</div>
                <div style={{display:"flex", gap:6, justifyContent:"center", marginTop:5}}>
                  {["month","week"].map(v => (
                    <button key={v} onClick={() => setCalView(v)} style={{ padding:"3px 10px", borderRadius:12, border:"none", cursor:"pointer", background: calView===v?color.bg:subtle, color:calView===v?"#fff":muted, fontSize:10, fontWeight:700 }}>
                      {v==="month"?"Mois":"Semaine"}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => {
                if (currentMonth===11){setCurrentMonth(0);setCurrentYear(y=>y+1);}else setCurrentMonth(m=>m+1);
              }} style={{ background:subtle, border:"none", color:text, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:16 }}>›</button>
            </div>

            {calView==="month" && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
                  {DAYS_SHORT.map((d,i) => <div key={i} style={{textAlign:"center",fontSize:10,color:muted,fontWeight:700,padding:"3px 0"}}>{d}</div>)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
                  {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`}/>)}
                  {Array.from({length:daysInMonth}).map((_,i) => {
                    const day = i+1;
                    const key = formatKey(currentYear,currentMonth,day);
                    const score = tracker.scores[key];
                    const hasScore = score !== undefined;
                    const isToday = day===today.getDate()&&currentMonth===today.getMonth()&&currentYear===today.getFullYear();
                    const isPast = new Date(currentYear,currentMonth,day) < new Date(today.getFullYear(),today.getMonth(),today.getDate());
                    const dow = (new Date(currentYear,currentMonth,day).getDay()+6)%7;
                    const isRest = (tracker.restDays||[]).includes(dow);
                    return (
                      <div key={day} onClick={() => {setModal({day,month:currentMonth,year:currentYear});setInputVal(hasScore?String(score):"");}}
                        style={{ aspectRatio:"1", borderRadius:9,
                          background: isRest&&!hasScore ? `${border}` : hasScore ? getDayColor(score,tracker) : isToday?"#2A2A3A":card,
                          border: isToday?`2px solid ${color.bg}`:`2px solid transparent`,
                          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s",
                          opacity: isRest&&!hasScore ? 0.4 : 1,
                        }}>
                        <span style={{fontSize:10,color:hasScore?"#fff":isToday?"#fff":muted,fontWeight:600}}>{day}</span>
                        {hasScore && <span style={{fontSize:8,color:"#ffffffdd",fontWeight:700}}>{score}{tracker.unit}</span>}
                        {isRest&&!hasScore&&isPast&&<span style={{fontSize:8,color:muted}}>😴</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {calView==="week" && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
                  {weekDays.map((d,i) => {
                    const key = formatKey(d.getFullYear(),d.getMonth(),d.getDate());
                    const score = tracker.scores[key];
                    const hasScore = score!==undefined;
                    const isToday2 = d.toDateString()===today.toDateString();
                    const dow = (d.getDay()+6)%7;
                    const isRest = (tracker.restDays||[]).includes(dow);
                    return (
                      <div key={i} onClick={() => {setModal({day:d.getDate(),month:d.getMonth(),year:d.getFullYear()});setInputVal(hasScore?String(score):"");}}
                        style={{ borderRadius:14, padding:"14px 6px", textAlign:"center", cursor:"pointer",
                          background: hasScore?getDayColor(score,tracker): isToday2?"#2A2A3A":card,
                          border: isToday2?`2px solid ${color.bg}`:`2px solid ${border}`,
                          opacity: isRest&&!hasScore?0.4:1,
                        }}>
                        <div style={{fontSize:10,color:muted,fontWeight:700,marginBottom:6}}>{DAYS_SHORT[i]}</div>
                        <div style={{fontSize:15,fontWeight:800,color:hasScore?"#fff":isToday2?"#fff":text}}>{d.getDate()}</div>
                        {hasScore&&<div style={{fontSize:11,color:"#ffffffdd",marginTop:4,fontWeight:700}}>{score}<span style={{fontSize:9}}>{tracker.unit}</span></div>}
                        {!hasScore&&isRest&&<div style={{fontSize:14,marginTop:4}}>😴</div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{textAlign:"center",fontSize:11,color:muted,marginTop:4}}>
                  Semaine {getWeekNumber(weekDays[0])} · {weekDays[0].getDate()} {MONTHS[weekDays[0].getMonth()]} — {weekDays[6].getDate()} {MONTHS[weekDays[6].getMonth()]}
                </div>
              </div>
            )}

            {/* Legend */}
            <div style={{marginTop:14,display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
              {isMax ? <>
                <div style={{width:18,height:10,borderRadius:3,background:"#06D6A088"}}/>
                <span style={{fontSize:10,color:muted}}>Sous la limite</span>
                <div style={{width:18,height:10,borderRadius:3,background:"#E6394688",marginLeft:8}}/>
                <span style={{fontSize:10,color:muted}}>Dépassé</span>
              </> : <>
                <div style={{width:18,height:10,borderRadius:3,background:`${color.bg}44`}}/>
                <div style={{width:18,height:10,borderRadius:3,background:`${color.bg}99`}}/>
                <div style={{width:18,height:10,borderRadius:3,background:color.bg}}/>
                <span style={{fontSize:10,color:muted}}>Faible → Objectif atteint</span>
              </>}
            </div>
          </>
        )}

        {/* STATS VIEW */}
        {view==="stats" && tracker && (
          <div>
            <h3 style={{margin:"0 0 12px",fontWeight:700,color:text,fontSize:15}}>Statistiques — {tracker.name}</h3>
            {allScores.length===0 ? (
              <div style={{textAlign:"center",color:muted,padding:40}}>Aucun score enregistré</div>
            ) : (
              <>
                {/* Weekly chart */}
                {weeklyData.length>1 && (
                  <div style={{background:card,borderRadius:14,padding:16,marginBottom:14,boxShadow:isDark?"none":"0 2px 8px #0001"}}>
                    <div style={{fontSize:12,color:muted,marginBottom:10,fontWeight:600}}>Moyenne hebdomadaire</div>
                    <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
                      {weeklyData.map((w,i) => {
                        const pct = Math.min(w.avg/tracker.max,1.5);
                        const h = Math.max(6,pct*70);
                        const good = tracker.mode==="max"?w.avg<=tracker.max:w.avg>=tracker.max;
                        return (
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                            <span style={{fontSize:8,color:muted}}>{w.avg}</span>
                            <div style={{width:"100%",height:h,borderRadius:"4px 4px 0 0",background:good?color.bg:tracker.mode==="max"?"#E63946":`${color.bg}55`}}/>
                            <span style={{fontSize:8,color:muted}}>S{w.wk.split("W")[1]}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{borderTop:`1px dashed ${color.bg}44`,marginTop:4}}/>
                  </div>
                )}

                {/* Monthly evolution */}
                <div style={{background:card,borderRadius:14,padding:16,marginBottom:14,boxShadow:isDark?"none":"0 2px 8px #0001"}}>
                  <div style={{fontSize:12,color:muted,marginBottom:8,fontWeight:600}}>Ce mois — {MONTHS_FULL[currentMonth]}</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:2,height:60}}>
                    {Array.from({length:daysInMonth},(_,i)=>{
                      const d=i+1;
                      const v=tracker.scores[formatKey(currentYear,currentMonth,d)];
                      if(!v) return <div key={d} style={{flex:1,height:4,background:border,borderRadius:2,minWidth:2}}/>;
                      const pct=Math.min(v/tracker.max,1.5);
                      const h=Math.max(6,pct*56);
                      const good=tracker.mode==="max"?v<=tracker.max:v>=tracker.max;
                      return <div key={d} style={{flex:1,height:h,background:good?color.bg:"#E63946",borderRadius:"2px 2px 0 0",minWidth:2}}/>;
                    })}
                  </div>
                </div>

                {/* Score list */}
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {allScores.slice().reverse().slice(0,20).map(s => {
                    const [y,m,d]=s.key.split("-").map(Number);
                    const good=tracker.mode==="max"?s.value<=tracker.max:s.value>=tracker.max;
                    const pct=Math.round((s.value/tracker.max)*100);
                    return (
                      <div key={s.key} style={{background:card,borderRadius:11,padding:"9px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:isDark?"none":"0 1px 4px #0001"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{d} {MONTHS[m]} {y}</div>
                          <div style={{fontSize:10,color:muted,marginTop:1}}>
                            {tracker.mode==="max"
                              ? good?`✅ ${(tracker.max-s.value).toFixed(1)}${tracker.unit} de marge`:`⚠️ +${(s.value-tracker.max).toFixed(1)}${tracker.unit}`
                              : `${pct}% de l'objectif`}
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:17,fontWeight:800,color:good?color.bg:"#E63946"}}>{s.value}</div>
                            <div style={{fontSize:9,color:muted}}>{tracker.unit}</div>
                          </div>
                          <button onClick={()=>deleteScore(s.key)} style={{background:subtle,border:"none",color:muted,borderRadius:7,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* BADGES VIEW */}
        {view==="badges" && tracker && (
          <div>
            <h3 style={{margin:"0 0 12px",fontWeight:700,fontSize:15}}>Badges — {tracker.name}</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {BADGES.map(badge => {
                const s=getStreak(tracker.scores);
                const earned=badge.check(tracker.scores,s,tracker);
                return (
                  <div key={badge.id} style={{background:card,borderRadius:14,padding:16,textAlign:"center",opacity:earned?1:0.4,border:`2px solid ${earned?color.bg:border}`,boxShadow:isDark?"none":"0 2px 8px #0001"}}>
                    <div style={{fontSize:32,marginBottom:6}}>{badge.emoji}</div>
                    <div style={{fontWeight:800,fontSize:13,color:earned?color.bg:muted}}>{badge.label}</div>
                    <div style={{fontSize:11,color:muted,marginTop:3}}>{badge.desc}</div>
                    {earned&&<div style={{fontSize:10,color:color.bg,fontWeight:700,marginTop:5}}>✅ Débloqué</div>}
                  </div>
                );
              })}
            </div>

            {/* All trackers badges summary */}
            <h3 style={{margin:"20px 0 12px",fontWeight:700,fontSize:15}}>Tous les trackers</h3>
            {trackers.map(t => {
              const earned = getEarnedBadges(t);
              return (
                <div key={t.id} style={{background:card,borderRadius:12,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700,fontSize:13}}>{t.name}</span>
                  <div style={{display:"flex",gap:4}}>
                    {earned.length===0 && <span style={{fontSize:11,color:muted}}>Aucun badge</span>}
                    {earned.map(b => <span key={b.id} style={{fontSize:18}}>{b.emoji}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Score modal */}
      {modal && tracker && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={()=>setModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:"20px 20px 0 0",padding:22,width:"100%",maxWidth:480}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:3,color:text}}>{modal.day} {MONTHS_FULL[modal.month]} {modal.year}</div>
            <div style={{color:muted,fontSize:12,marginBottom:18}}>{tracker.name} — {isMax?"max":"objectif"} : {tracker.max} {tracker.unit}</div>
            <input type="number" step="0.1" value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveScore()}
              placeholder={`Valeur en ${tracker.unit}...`} autoFocus
              style={{width:"100%",padding:"13px 14px",background:subtle,border:`2px solid ${color.bg}55`,borderRadius:11,color:text,fontSize:20,fontWeight:700,boxSizing:"border-box",outline:"none"}}/>
            {inputVal&&!isNaN(parseFloat(inputVal))&&(
              <div style={{marginTop:8,fontSize:12,color:muted}}>
                {isMax ? (parseFloat(inputVal)<=tracker.max?`✅ ${(tracker.max-parseFloat(inputVal)).toFixed(1)} ${tracker.unit} de marge`:`⚠️ Dépasse de ${(parseFloat(inputVal)-tracker.max).toFixed(1)} ${tracker.unit}`)
                  : `${Math.round((parseFloat(inputVal)/tracker.max)*100)}% de l'objectif ${parseFloat(inputVal)>=tracker.max?"🏆":""}`}
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={()=>setModal(null)} style={{flex:1,padding:13,borderRadius:11,border:"none",background:subtle,color:muted,cursor:"pointer",fontWeight:700}}>Annuler</button>
              <button onClick={saveScore} style={{flex:2,padding:13,borderRadius:11,border:"none",background:color.bg,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:15}}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* New tracker modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:"20px 20px 0 0",padding:22,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:16,color:text}}>Nouveau tracker</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={newT.name} onChange={e=>setNewT(p=>({...p,name:e.target.value}))} placeholder="Nom + emoji (ex: 🏊 Natation)" style={inputStyle}/>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:muted,marginBottom:4}}>Valeur cible</div>
                  <input value={newT.max} onChange={e=>setNewT(p=>({...p,max:e.target.value}))} type="number" step="0.1" placeholder="Ex: 30" style={inputStyle}/>
                </div>
                <div style={{width:80}}>
                  <div style={{fontSize:11,color:muted,marginBottom:4}}>Unité</div>
                  <input value={newT.unit} onChange={e=>setNewT(p=>({...p,unit:e.target.value}))} placeholder="km, h..." style={inputStyle}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:6}}>Type</div>
                <div style={{display:"flex",gap:8}}>
                  {[["min","⬆️ Minimum"],["max","⬇️ Maximum"]].map(([val,label])=>(
                    <button key={val} onClick={()=>setNewT(p=>({...p,mode:val}))} style={{flex:1,padding:"10px 8px",borderRadius:11,border:"none",cursor:"pointer",background:newT.mode===val?(val==="max"?"#E63946":"#06D6A0"):subtle,color:newT.mode===val?"#fff":muted,fontSize:12,fontWeight:700}}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:6}}>Couleur</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {COLORS.map((c,i)=>(
                    <div key={i} onClick={()=>setNewT(p=>({...p,color:i}))} style={{width:28,height:28,borderRadius:"50%",background:c.bg,cursor:"pointer",border:newT.color===i?`3px solid ${text}`:"3px solid transparent"}}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:6}}>Jours de repos 😴</div>
                <div style={{display:"flex",gap:6}}>
                  {["L","M","M","J","V","S","D"].map((d,i)=>(
                    <button key={i} onClick={()=>setNewT(p=>({...p,restDays:p.restDays.includes(i)?p.restDays.filter(x=>x!==i):[...p.restDays,i]}))} style={{flex:1,padding:"8px 4px",borderRadius:9,border:"none",cursor:"pointer",background:newT.restDays.includes(i)?color.bg:subtle,color:newT.restDays.includes(i)?"#fff":muted,fontSize:11,fontWeight:700}}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:18}}>
              <button onClick={()=>setShowNew(false)} style={{flex:1,padding:13,borderRadius:11,border:"none",background:subtle,color:muted,cursor:"pointer",fontWeight:700}}>Annuler</button>
              <button onClick={addTracker} style={{flex:2,padding:13,borderRadius:11,border:"none",background:"#FF6B35",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:15}}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit tracker modal */}
      {editModal && tracker && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={()=>setEditModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:"20px 20px 0 0",padding:22,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:6,color:text}}>Modifier le tracker</div>
            <div style={{color:muted,fontSize:12,marginBottom:16}}>Les scores existants ne sont pas affectés</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={editT.name||""} onChange={e=>setEditT(p=>({...p,name:e.target.value}))} placeholder="Nom" style={inputStyle}/>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:muted,marginBottom:4}}>Objectif / Limite</div>
                  <input value={editT.max||""} onChange={e=>setEditT(p=>({...p,max:e.target.value}))} type="number" step="0.1" style={{...inputStyle,fontSize:18,fontWeight:700,border:`2px solid ${color.bg}55`}}/>
                </div>
                <div style={{width:80}}>
                  <div style={{fontSize:11,color:muted,marginBottom:4}}>Unité</div>
                  <input value={editT.unit||""} onChange={e=>setEditT(p=>({...p,unit:e.target.value}))} placeholder="km, h..." style={inputStyle}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:6}}>Type</div>
                <div style={{display:"flex",gap:8}}>
                  {[["min","⬆️ Minimum"],["max","⬇️ Maximum"]].map(([val,label])=>(
                    <button key={val} onClick={()=>setEditT(p=>({...p,mode:val}))} style={{flex:1,padding:"10px 8px",borderRadius:11,border:"none",cursor:"pointer",background:editT.mode===val?(val==="max"?"#E63946":"#06D6A0"):subtle,color:editT.mode===val?"#fff":muted,fontSize:12,fontWeight:700}}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:6}}>Couleur</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {COLORS.map((c,i)=>(
                    <div key={i} onClick={()=>setEditT(p=>({...p,color:i}))} style={{width:28,height:28,borderRadius:"50%",background:c.bg,cursor:"pointer",border:(editT.color===i)?`3px solid ${text}`:"3px solid transparent"}}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:6}}>Jours de repos 😴</div>
                <div style={{display:"flex",gap:6}}>
                  {["L","M","M","J","V","S","D"].map((d,i)=>(
                    <button key={i} onClick={()=>setEditT(p=>({...p,restDays:p.restDays?.includes(i)?p.restDays.filter(x=>x!==i):[...(p.restDays||[]),i]}))} style={{flex:1,padding:"8px 4px",borderRadius:9,border:"none",cursor:"pointer",background:(editT.restDays||[]).includes(i)?color.bg:subtle,color:(editT.restDays||[]).includes(i)?"#fff":muted,fontSize:11,fontWeight:700}}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:18}}>
              <button onClick={()=>setEditModal(null)} style={{flex:1,padding:13,borderRadius:11,border:"none",background:subtle,color:muted,cursor:"pointer",fontWeight:700}}>Annuler</button>
              <button onClick={saveEdit} style={{flex:2,padding:13,borderRadius:11,border:"none",background:color.bg,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:15}}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Friends modal */}
      {showFriends && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={()=>setShowFriends(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:"20px 20px 0 0",padding:22,width:"100%",maxWidth:480}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:16,color:text}}>👥 Mode Amis</div>
            <div style={{background:subtle,borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:11,color:muted,marginBottom:4}}>Ton code ami — partage-le !</div>
              <div style={{fontSize:28,fontWeight:900,letterSpacing:4,color:color.bg,textAlign:"center"}}>{friendCode}</div>
              <div style={{fontSize:10,color:muted,textAlign:"center",marginTop:4}}>Donne ce code à tes amis pour qu'ils te suivent</div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:muted,marginBottom:6}}>Ajouter un ami (son code)</div>
              <div style={{display:"flex",gap:8}}>
                <input value={friendInput} onChange={e=>setFriendInput(e.target.value.toUpperCase())} placeholder="Ex: AB12CD" maxLength={6}
                  style={{...inputStyle,flex:1,letterSpacing:2,fontWeight:700}}/>
                <button onClick={()=>{if(friendInput.length===6&&!friends.includes(friendInput)){setFriends(p=>[...p,friendInput]);setFriendInput("");}}} style={{padding:"11px 16px",borderRadius:11,border:"none",background:color.bg,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>+</button>
              </div>
            </div>
            {friends.length>0 && (
              <div>
                <div style={{fontSize:11,color:muted,marginBottom:8}}>Tes amis</div>
                {friends.map(f=>(
                  <div key={f} style={{background:subtle,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontWeight:700,letterSpacing:2}}>{f}</span>
                    <button onClick={()=>setFriends(p=>p.filter(x=>x!==f))} style={{background:"transparent",border:"none",color:muted,cursor:"pointer",fontSize:12}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{background:`${color.bg}11`,borderRadius:10,padding:12,marginTop:12}}>
              <div style={{fontSize:11,color:muted}}>💡 Pour challenger tes amis, partage ton code et compare vos séries ! La fonctionnalité de classement en temps réel arrive bientôt.</div>
            </div>
            <div style={{marginTop:14,display:"flex",gap:8}}>
              <button onClick={requestNotifPermission} style={{flex:1,padding:12,borderRadius:11,border:"none",background:subtle,color:muted,cursor:"pointer",fontWeight:600,fontSize:12}}>🔔 Activer notifs 15h</button>
              <button onClick={()=>setShowFriends(false)} style={{flex:1,padding:12,borderRadius:11,border:"none",background:color.bg,color:"#fff",cursor:"pointer",fontWeight:700}}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";

const COLORS = [
  { bg: "#FF6B35", light: "#FFF0EB", text: "#FF6B35" },
  { bg: "#2EC4B6", light: "#E8FAF9", text: "#2EC4B6" },
  { bg: "#9B5DE5", light: "#F3EEFF", text: "#9B5DE5" },
  { bg: "#F7C59F", light: "#FFF8F0", text: "#D4830A" },
  { bg: "#06D6A0", light: "#E6FBF5", text: "#06D6A0" },
  { bg: "#E63946", light: "#FFEAEC", text: "#E63946" },
  { bg: "#FFD60A", light: "#FFFBE6", text: "#B38A00" },
];

const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_SHORT = ["L","M","M","J","V","S","D"];

const DEFAULT_TRACKERS = [
  { id: 1, name: "🚴 Vélo", unit: "km", max: 30, color: 1, scores: {}, mode: "min" },
  { id: 2, name: "🏃 Course", unit: "km", max: 5, color: 4, scores: {}, mode: "min" },
  { id: 3, name: "💼 Travail", unit: "h", max: 8, color: 2, scores: {}, mode: "min" },
  { id: 4, name: "📱 Écran", unit: "h", max: 2, color: 5, scores: {}, mode: "max" },
  { id: 5, name: "😴 Sommeil", unit: "h", max: 8, color: 6, scores: {}, mode: "min" },
  { id: 6, name: "💪 Pompes", unit: "reps", max: 100, color: 0, scores: {}, mode: "min" },
  { id: 7, name: "🏋️ Abdos", unit: "reps", max: 200, color: 3, scores: {}, mode: "min" },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function formatKey(y, m, d) {
  return `${y}-${m}-${d}`;
}

export default function App() {
  const today = new Date();

  const [trackers, setTrackers] = useState(() => {
    try {
      const saved = localStorage.getItem("performance-trackers-v2");
      return saved ? JSON.parse(saved) : DEFAULT_TRACKERS;
    } catch {
      return DEFAULT_TRACKERS;
    }
  });

  useEffect(() => {
    localStorage.setItem("performance-trackers-v2", JSON.stringify(trackers));
  }, [trackers]);

  const [activeTracker, setActiveTracker] = useState(trackers[0]?.id || 1);
  const [view, setView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [modal, setModal] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [showNewTracker, setShowNewTracker] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newMode, setNewMode] = useState("min");

  const tracker = trackers.find(t => t.id === activeTracker) || trackers[0];
  const color = COLORS[tracker?.color % COLORS.length];

  // For "max" mode (écran): green = below limit, red = above
  function getDayColor(score, trackerObj) {
    const c = COLORS[trackerObj.color % COLORS.length];
    if (trackerObj.mode === "max") {
      const pct = Math.min(score / trackerObj.max, 1.5);
      if (score <= trackerObj.max) return { bg: `#06D6A0${Math.round((0.4 + pct * 0.6) * 255).toString(16).padStart(2,"0")}`, good: true };
      return { bg: `#E6394688`, good: false };
    }
    const pct = Math.min(score / trackerObj.max, 1);
    return { bg: `linear-gradient(135deg, ${c.bg}${Math.round(pct * 255).toString(16).padStart(2,"0")}, ${c.bg}33)`, good: pct >= 1 };
  }

  function saveScore() {
    const val = parseFloat(inputVal);
    if (isNaN(val) || val < 0) return;
    const key = formatKey(modal.year, modal.month, modal.day);
    setTrackers(prev => prev.map(t =>
      t.id === activeTracker ? { ...t, scores: { ...t.scores, [key]: val } } : t
    ));
    setModal(null);
    setInputVal("");
  }

  function deleteScore(key) {
    setTrackers(prev => prev.map(t =>
      t.id === activeTracker
        ? { ...t, scores: Object.fromEntries(Object.entries(t.scores).filter(([k]) => k !== key)) }
        : t
    ));
  }

  function addTracker() {
    if (!newName.trim()) return;
    const id = Date.now();
    setTrackers(prev => [...prev, {
      id, name: newName.trim(), unit: newUnit || "reps",
      max: parseFloat(newMax) || 10,
      color: prev.length % COLORS.length,
      scores: {}, mode: newMode,
    }]);
    setActiveTracker(id);
    setShowNewTracker(false);
    setNewName(""); setNewMax(""); setNewUnit(""); setNewMode("min");
  }

  function removeTracker(id) {
    const remaining = trackers.filter(t => t.id !== id);
    setTrackers(remaining);
    if (activeTracker === id) setActiveTracker(remaining[0]?.id);
  }

  function getMonthScores() {
    if (!tracker) return {};
    const result = {};
    const days = getDaysInMonth(currentYear, currentMonth);
    for (let d = 1; d <= days; d++) {
      const key = formatKey(currentYear, currentMonth, d);
      if (tracker.scores[key] !== undefined) result[d] = tracker.scores[key];
    }
    return result;
  }

  function getAllScores() {
    if (!tracker) return [];
    return Object.entries(tracker.scores)
      .map(([k, v]) => ({ key: k, value: v }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  const monthScores = getMonthScores();
  const allScores = getAllScores();
  const bestScore = tracker
    ? tracker.mode === "max"
      ? Math.min(...allScores.map(s => s.value), tracker.max)
      : Math.max(...allScores.map(s => s.value), 0)
    : 0;

  const streak = (() => {
    if (!tracker) return 0;
    let count = 0;
    const t = new Date();
    while (true) {
      const key = formatKey(t.getFullYear(), t.getMonth(), t.getDate());
      if (tracker.scores[key] === undefined) break;
      count++;
      t.setDate(t.getDate() - 1);
    }
    return count;
  })();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const isMax = tracker?.mode === "max";

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F13", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#F0EFF4" }}>

      {/* Header */}
      <div style={{ background: "#16161D", borderBottom: "1px solid #2A2A35", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>
          🏆 <span style={{ color: color?.bg }}>Tracker</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["calendar","stats"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: view === v ? color?.bg : "#2A2A35",
              color: view === v ? "#fff" : "#aaa", fontSize: 12, fontWeight: 600
            }}>{v === "calendar" ? "Calendrier" : "Stats"}</button>
          ))}
        </div>
      </div>

      {/* Tracker tabs */}
      <div style={{ background: "#16161D", padding: "10px 12px", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid #2A2A35", alignItems: "center" }}>
        {trackers.map(t => {
          const c = COLORS[t.color % COLORS.length];
          const active = t.id === activeTracker;
          return (
            <button key={t.id} onClick={() => setActiveTracker(t.id)} style={{
              padding: "7px 13px", borderRadius: 10, border: "none", cursor: "pointer",
              background: active ? c.bg : "#2A2A35", color: active ? "#fff" : "#aaa",
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}>
              {t.name}
              {active && trackers.length > 1 && (
                <span onClick={e => { e.stopPropagation(); removeTracker(t.id); }}
                  style={{ opacity: 0.6, fontSize: 10, cursor: "pointer" }}>✕</span>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowNewTracker(true)} style={{
          padding: "7px 12px", borderRadius: 10, border: "2px dashed #3A3A45",
          background: "transparent", color: "#888", cursor: "pointer",
          fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
        }}>+ Nouveau</button>
      </div>

      <div style={{ padding: "14px", maxWidth: 500, margin: "0 auto" }}>

        {/* Stats cards */}
        {tracker && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: isMax ? "Meilleur jour" : "Record", value: allScores.length ? bestScore : "—", suffix: tracker.unit },
              { label: isMax ? "Maximum autorisé" : "Objectif", value: tracker.max, suffix: tracker.unit },
              { label: "Série", value: streak, suffix: streak > 1 ? "jours" : "jour" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#1E1E28", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: color.bg }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{s.suffix}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Mode badge */}
        {tracker && (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              background: isMax ? "#E6394622" : `${color.bg}22`,
              color: isMax ? "#E63946" : color.bg,
            }}>
              {isMax ? "⬇️ Maximum à ne pas dépasser" : "⬆️ Objectif minimum à atteindre"}
            </span>
          </div>
        )}

        {view === "calendar" && tracker && (
          <>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                else setCurrentMonth(m => m - 1);
              }} style={{ background: "#2A2A35", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{MONTHS[currentMonth]} {currentYear}</span>
              <button onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                else setCurrentMonth(m => m + 1);
              }} style={{ background: "#2A2A35", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
              {DAYS_SHORT.map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#555", fontWeight: 700, padding: "3px 0" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const score = monthScores[day];
                const hasScore = score !== undefined;
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const dayColor = hasScore ? getDayColor(score, tracker) : null;

                return (
                  <div key={day}
                    onClick={() => { setModal({ day, month: currentMonth, year: currentYear }); setInputVal(hasScore ? String(score) : ""); }}
                    style={{
                      aspectRatio: "1", borderRadius: 9,
                      background: hasScore ? dayColor.bg : isToday ? "#2A2A3A" : "#1A1A22",
                      border: isToday ? `2px solid ${color.bg}` : "2px solid transparent",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 10, color: hasScore ? "#fff" : isToday ? "#fff" : "#444", fontWeight: 600 }}>{day}</span>
                    {hasScore && <span style={{ fontSize: 9, color: "#ffffffdd", fontWeight: 700 }}>{score}{tracker.unit}</span>}
                    {!hasScore && isPast && <span style={{ fontSize: 7, color: "#2A2A35" }}>—</span>}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              {isMax ? (
                <>
                  <div style={{ width: 20, height: 10, borderRadius: 3, background: "#06D6A088" }} />
                  <span style={{ fontSize: 10, color: "#666" }}>Sous la limite</span>
                  <div style={{ width: 20, height: 10, borderRadius: 3, background: "#E6394688", marginLeft: 8 }} />
                  <span style={{ fontSize: 10, color: "#666" }}>Dépassé</span>
                </>
              ) : (
                <>
                  <div style={{ width: 20, height: 10, borderRadius: 3, background: `${color.bg}33` }} />
                  <div style={{ width: 20, height: 10, borderRadius: 3, background: `${color.bg}88` }} />
                  <div style={{ width: 20, height: 10, borderRadius: 3, background: color.bg }} />
                  <span style={{ fontSize: 10, color: "#666" }}>Faible → Objectif atteint</span>
                </>
              )}
            </div>
          </>
        )}

        {view === "stats" && tracker && (
          <div>
            <h3 style={{ margin: "0 0 12px", fontWeight: 700, color: "#ddd", fontSize: 15 }}>Historique — {tracker.name}</h3>
            {allScores.length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Aucun score enregistré</div>
            ) : (
              <>
                <div style={{ background: "#1E1E28", borderRadius: 14, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>30 derniers scores</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 70 }}>
                    {allScores.slice(-30).map((s, i) => {
                      const pct = Math.min(s.value / tracker.max, 1.5);
                      const h = Math.max(4, pct * 62);
                      const good = tracker.mode === "max" ? s.value <= tracker.max : s.value >= tracker.max;
                      return (
                        <div key={i} style={{
                          flex: 1, height: h, borderRadius: "3px 3px 0 0", minWidth: 3,
                          background: good ? color.bg : tracker.mode === "max" ? "#E63946" : `${color.bg}66`,
                        }} />
                      );
                    })}
                  </div>
                  <div style={{ borderTop: `1px dashed ${color.bg}44`, marginTop: 3 }} />
                  <div style={{ fontSize: 10, color: "#555", marginTop: 4, textAlign: "right" }}>
                    Ligne = objectif {tracker.max}{tracker.unit}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {allScores.slice().reverse().slice(0, 20).map(s => {
                    const [y, m, d] = s.key.split("-").map(Number);
                    const good = tracker.mode === "max" ? s.value <= tracker.max : s.value >= tracker.max;
                    const pct = Math.round((s.value / tracker.max) * 100);
                    return (
                      <div key={s.key} style={{ background: "#1E1E28", borderRadius: 11, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d} {MONTHS[m]} {y}</div>
                          <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>
                            {tracker.mode === "max"
                              ? good ? `✅ ${tracker.max - s.value}${tracker.unit} sous la limite` : `⚠️ +${s.value - tracker.max}${tracker.unit} au-dessus`
                              : `${pct}% de l'objectif`}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 17, fontWeight: 800, color: good ? color.bg : "#E63946" }}>{s.value}</div>
                            <div style={{ fontSize: 9, color: "#555" }}>{tracker.unit}</div>
                          </div>
                          <button onClick={() => deleteScore(s.key)} style={{ background: "#2A2A35", border: "none", color: "#666", borderRadius: 7, padding: "3px 7px", cursor: "pointer", fontSize: 11 }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Score Modal */}
      {modal && tracker && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1E1E28", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 3 }}>
              {modal.day} {MONTHS[modal.month]} {modal.year}
            </div>
            <div style={{ color: "#666", fontSize: 12, marginBottom: 18 }}>
              {tracker.name} — {isMax ? "max" : "objectif"} : {tracker.max} {tracker.unit}
            </div>
            <input
              type="number" step="0.1" value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveScore()}
              placeholder={`Valeur en ${tracker.unit}...`}
              autoFocus
              style={{ width: "100%", padding: "13px 14px", background: "#2A2A35", border: `2px solid ${color.bg}44`, borderRadius: 11, color: "#fff", fontSize: 20, fontWeight: 700, boxSizing: "border-box", outline: "none" }}
            />
            {inputVal && !isNaN(parseFloat(inputVal)) && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
                {isMax
                  ? parseFloat(inputVal) <= tracker.max
                    ? `✅ Sous la limite (${tracker.max - parseFloat(inputVal)} ${tracker.unit} de marge)`
                    : `⚠️ Dépasse la limite de ${parseFloat(inputVal) - tracker.max} ${tracker.unit}`
                  : `${Math.round((parseFloat(inputVal) / tracker.max) * 100)}% de l'objectif ${parseFloat(inputVal) >= tracker.max ? "🏆" : ""}`
                }
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 13, borderRadius: 11, border: "none", background: "#2A2A35", color: "#aaa", cursor: "pointer", fontWeight: 700 }}>Annuler</button>
              <button onClick={saveScore} style={{ flex: 2, padding: 13, borderRadius: 11, border: "none", background: color.bg, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* New Tracker Modal */}
      {showNewTracker && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => setShowNewTracker(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1E1E28", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>Nouveau tracker</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom (ex: 🏊 Natation, 🚶 Marche...)"
                style={{ padding: "11px 13px", background: "#2A2A35", border: "2px solid #3A3A45", borderRadius: 11, color: "#fff", fontSize: 14, outline: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newMax} onChange={e => setNewMax(e.target.value)}
                  type="number" step="0.1" placeholder="Valeur cible"
                  style={{ flex: 1, padding: "11px 13px", background: "#2A2A35", border: "2px solid #3A3A45", borderRadius: 11, color: "#fff", fontSize: 14, outline: "none" }} />
                <input value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  placeholder="Unité"
                  style={{ width: 80, padding: "11px 13px", background: "#2A2A35", border: "2px solid #3A3A45", borderRadius: 11, color: "#fff", fontSize: 14, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["min", "⬆️ Objectif minimum"], ["max", "⬇️ Maximum à ne pas dépasser"]].map(([val, label]) => (
                  <button key={val} onClick={() => setNewMode(val)} style={{
                    flex: 1, padding: "10px 8px", borderRadius: 11, border: "none", cursor: "pointer",
                    background: newMode === val ? (val === "max" ? "#E63946" : "#06D6A0") : "#2A2A35",
                    color: newMode === val ? "#fff" : "#888", fontSize: 12, fontWeight: 700,
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowNewTracker(false)} style={{ flex: 1, padding: 13, borderRadius: 11, border: "none", background: "#2A2A35", color: "#aaa", cursor: "pointer", fontWeight: 700 }}>Annuler</button>
              <button onClick={addTracker} style={{ flex: 2, padding: 13, borderRadius: 11, border: "none", background: "#FF6B35", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 }}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

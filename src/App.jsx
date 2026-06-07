import { useState, useEffect } from "react";

const COLORS = [
  { bg: "#FF6B35", light: "#FFF0EB", text: "#FF6B35" },
  { bg: "#2EC4B6", light: "#E8FAF9", text: "#2EC4B6" },
  { bg: "#9B5DE5", light: "#F3EEFF", text: "#9B5DE5" },
  { bg: "#F7C59F", light: "#FFF8F0", text: "#D4830A" },
  { bg: "#06D6A0", light: "#E6FBF5", text: "#06D6A0" },
];

const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_SHORT = ["L","M","M","J","V","S","D"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return (d + 6) % 7; // Monday = 0
}

function todayKey() {
  const t = new Date();
  return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
}

function formatKey(y, m, d) {
  return `${y}-${m}-${d}`;
}

export default function App() {
  const today = new Date();
  const [trackers, setTrackers] = useState(() => {
    try {
      const saved = localStorage.getItem("performance-trackers");
      return saved ? JSON.parse(saved) : [
        { id: 1, name: "Pompes", unit: "reps", max: 100, color: 0, scores: {} },
        { id: 2, name: "Abdos", unit: "reps", max: 200, color: 1, scores: {} },
      ];
    } catch {
      return [
        { id: 1, name: "Pompes", unit: "reps", max: 100, color: 0, scores: {} },
        { id: 2, name: "Abdos", unit: "reps", max: 200, color: 1, scores: {} },
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem("performance-trackers", JSON.stringify(trackers));
  }, [trackers]);
  const [activeTracker, setActiveTracker] = useState(1);
  const [view, setView] = useState("calendar"); // calendar | stats
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [modal, setModal] = useState(null); // { day, month, year }
  const [inputVal, setInputVal] = useState("");
  const [showNewTracker, setShowNewTracker] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState("");
  const [newUnit, setNewUnit] = useState("reps");
  const [editingTracker, setEditingTracker] = useState(null);

  const tracker = trackers.find(t => t.id === activeTracker);
  const color = COLORS[tracker?.color % COLORS.length];

  function saveScore() {
    const val = parseInt(inputVal);
    if (isNaN(val) || val < 0) return;
    const key = formatKey(modal.year, modal.month, modal.day);
    setTrackers(prev => prev.map(t =>
      t.id === activeTracker
        ? { ...t, scores: { ...t.scores, [key]: val } }
        : t
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
      max: parseInt(newMax) || 100,
      color: prev.length % COLORS.length,
      scores: {}
    }]);
    setActiveTracker(id);
    setShowNewTracker(false);
    setNewName(""); setNewMax(""); setNewUnit("reps");
  }

  function removeTracker(id) {
    setTrackers(prev => prev.filter(t => t.id !== id));
    if (activeTracker === id) setActiveTracker(trackers[0]?.id);
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
  const maxScore = tracker ? Math.max(...allScores.map(s => s.value), 0) : 0;
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F0F13",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#F0EFF4",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "#16161D",
        borderBottom: "1px solid #2A2A35",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>
          🏆 <span style={{ color: color?.bg }}>Tracker</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("calendar")} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            background: view === "calendar" ? color?.bg : "#2A2A35",
            color: view === "calendar" ? "#fff" : "#aaa", fontSize: 13, fontWeight: 600
          }}>Calendrier</button>
          <button onClick={() => setView("stats")} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            background: view === "stats" ? color?.bg : "#2A2A35",
            color: view === "stats" ? "#fff" : "#aaa", fontSize: 13, fontWeight: 600
          }}>Stats</button>
        </div>
      </div>

      {/* Tracker tabs */}
      <div style={{
        background: "#16161D",
        padding: "12px 16px",
        display: "flex",
        gap: 8,
        overflowX: "auto",
        borderBottom: "1px solid #2A2A35",
        alignItems: "center",
      }}>
        {trackers.map(t => {
          const c = COLORS[t.color % COLORS.length];
          const active = t.id === activeTracker;
          return (
            <button key={t.id} onClick={() => setActiveTracker(t.id)} style={{
              padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              background: active ? c.bg : "#2A2A35",
              color: active ? "#fff" : "#aaa",
              fontSize: 13, fontWeight: 700,
              whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s",
              flexShrink: 0,
            }}>
              {t.name}
              {active && trackers.length > 1 && (
                <span onClick={e => { e.stopPropagation(); removeTracker(t.id); }}
                  style={{ marginLeft: 4, opacity: 0.6, fontSize: 11, cursor: "pointer" }}>✕</span>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowNewTracker(true)} style={{
          padding: "8px 14px", borderRadius: 12, border: "2px dashed #3A3A45",
          background: "transparent", color: "#888", cursor: "pointer",
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
        }}>+ Nouveau</button>
      </div>

      <div style={{ padding: "16px", maxWidth: 500, margin: "0 auto" }}>

        {/* Stats cards */}
        {tracker && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Record", value: maxScore, suffix: tracker.unit },
              { label: "Max objectif", value: tracker.max, suffix: tracker.unit },
              { label: "Série", value: streak, suffix: streak > 1 ? "jours" : "jour" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "#1E1E28", borderRadius: 14, padding: "12px 10px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: color.bg }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{s.suffix}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {view === "calendar" && tracker && (
          <>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                else setCurrentMonth(m => m - 1);
              }} style={{ background: "#2A2A35", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[currentMonth]} {currentYear}</span>
              <button onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                else setCurrentMonth(m => m + 1);
              }} style={{ background: "#2A2A35", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {DAYS_SHORT.map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#555", fontWeight: 700, padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const score = monthScores[day];
                const hasScore = score !== undefined;
                const pct = hasScore ? Math.min(score / tracker.max, 1) : 0;
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <div key={day} onClick={() => { setModal({ day, month: currentMonth, year: currentYear }); setInputVal(hasScore ? String(score) : ""); }}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 10,
                      background: hasScore
                        ? `linear-gradient(135deg, ${color.bg}${Math.round(pct * 255).toString(16).padStart(2, "0")}, ${color.bg}33)`
                        : isToday ? "#2A2A3A" : "#1A1A22",
                      border: isToday ? `2px solid ${color.bg}` : "2px solid transparent",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 11, color: hasScore ? "#fff" : isToday ? "#fff" : "#444", fontWeight: 600 }}>{day}</span>
                    {hasScore && (
                      <span style={{ fontSize: 10, color: "#ffffffcc", fontWeight: 700 }}>{score}</span>
                    )}
                    {!hasScore && isPast && (
                      <span style={{ fontSize: 8, color: "#333" }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <div style={{ width: 24, height: 12, borderRadius: 4, background: `${color.bg}22` }} />
              <div style={{ width: 24, height: 12, borderRadius: 4, background: `${color.bg}88` }} />
              <div style={{ width: 24, height: 12, borderRadius: 4, background: color.bg }} />
              <span style={{ fontSize: 11, color: "#666" }}>Faible → Objectif atteint</span>
            </div>
          </>
        )}

        {view === "stats" && tracker && (
          <div>
            <h3 style={{ margin: "0 0 12px", fontWeight: 700, color: "#ddd" }}>Historique — {tracker.name}</h3>
            {allScores.length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Aucun score enregistré</div>
            ) : (
              <>
                {/* Mini bar chart */}
                <div style={{
                  background: "#1E1E28", borderRadius: 14, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>30 derniers scores</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                    {allScores.slice(-30).map((s, i) => {
                      const h = Math.max(4, (s.value / tracker.max) * 72);
                      return (
                        <div key={i} title={`${s.key}: ${s.value}`} style={{
                          flex: 1, height: h, borderRadius: "3px 3px 0 0",
                          background: s.value >= tracker.max ? color.bg : `${color.bg}88`,
                          minWidth: 4,
                        }} />
                      );
                    })}
                  </div>
                  <div style={{ borderTop: `1px dashed ${color.bg}44`, marginTop: 4 }} />
                </div>

                {/* List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {allScores.slice().reverse().slice(0, 20).map(s => {
                    const [y, m, d] = s.key.split("-").map(Number);
                    const pct = Math.round((s.value / tracker.max) * 100);
                    return (
                      <div key={s.key} style={{
                        background: "#1E1E28", borderRadius: 12, padding: "10px 14px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d} {MONTHS[m]} {y}</div>
                          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                            {pct}% de l'objectif
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: s.value >= tracker.max ? color.bg : "#fff" }}>
                              {s.value}
                            </div>
                            <div style={{ fontSize: 10, color: "#555" }}>{tracker.unit}</div>
                          </div>
                          <button onClick={() => deleteScore(s.key)} style={{
                            background: "#2A2A35", border: "none", color: "#666",
                            borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12
                          }}>✕</button>
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
        <div style={{
          position: "fixed", inset: 0, background: "#000000cc",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
        }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1E1E28", borderRadius: "20px 20px 0 0",
            padding: 24, width: "100%", maxWidth: 480,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              {modal.day} {MONTHS[modal.month]} {modal.year}
            </div>
            <div style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
              {tracker.name} — objectif : {tracker.max} {tracker.unit}
            </div>
            <input
              type="number"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveScore()}
              placeholder={`Nombre de ${tracker.unit}...`}
              autoFocus
              style={{
                width: "100%", padding: "14px 16px",
                background: "#2A2A35", border: `2px solid ${color.bg}44`,
                borderRadius: 12, color: "#fff", fontSize: 20, fontWeight: 700,
                boxSizing: "border-box", outline: "none",
              }}
            />
            {inputVal && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#888" }}>
                = {Math.round((parseInt(inputVal) / tracker.max) * 100)}% de l'objectif
                {parseInt(inputVal) >= tracker.max && " 🏆 Objectif atteint !"}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: 14, borderRadius: 12, border: "none",
                background: "#2A2A35", color: "#aaa", cursor: "pointer", fontWeight: 700, fontSize: 15
              }}>Annuler</button>
              <button onClick={saveScore} style={{
                flex: 2, padding: 14, borderRadius: 12, border: "none",
                background: color.bg, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15
              }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* New Tracker Modal */}
      {showNewTracker && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000cc",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
        }} onClick={() => setShowNewTracker(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1E1E28", borderRadius: "20px 20px 0 0",
            padding: 24, width: "100%", maxWidth: 480,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Nouveau tracker</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom (ex: Pompes, Squats, Km...)"
                style={{
                  padding: "12px 14px", background: "#2A2A35", border: "2px solid #3A3A45",
                  borderRadius: 12, color: "#fff", fontSize: 15, outline: "none"
                }} />
              <div style={{ display: "flex", gap: 10 }}>
                <input value={newMax} onChange={e => setNewMax(e.target.value)}
                  type="number" placeholder="Objectif max"
                  style={{
                    flex: 1, padding: "12px 14px", background: "#2A2A35", border: "2px solid #3A3A45",
                    borderRadius: 12, color: "#fff", fontSize: 15, outline: "none"
                  }} />
                <input value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  placeholder="Unité"
                  style={{
                    width: 90, padding: "12px 14px", background: "#2A2A35", border: "2px solid #3A3A45",
                    borderRadius: 12, color: "#fff", fontSize: 15, outline: "none"
                  }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowNewTracker(false)} style={{
                flex: 1, padding: 14, borderRadius: 12, border: "none",
                background: "#2A2A35", color: "#aaa", cursor: "pointer", fontWeight: 700
              }}>Annuler</button>
              <button onClick={addTracker} style={{
                flex: 2, padding: 14, borderRadius: 12, border: "none",
                background: "#FF6B35", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15
              }}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

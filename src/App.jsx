import { useState, useEffect } from "react";

const INSTRUMENTS = [
  { id: "spy_cedr", ticker: "SPY", name: "SPDR S&P 500 ETF", type: "CEDEAR", price: 8420, change: 1.2 },
  { id: "ggal_cedr", ticker: "GGAL", name: "Grupo Financiero Galicia", type: "CEDEAR", price: 1890, change: 3.4 },
  { id: "ypf_cedr", ticker: "YPF", name: "YPF S.A.", type: "CEDEAR", price: 6340, change: -0.8 },
  { id: "meli_cedr", ticker: "MELI", name: "MercadoLibre", type: "CEDEAR", price: 42100, change: 2.1 },
  { id: "tlcpd_on", ticker: "TLCPD", name: "Telecom ON 2026", type: "ON", price: 98.2, change: 0.1 },
  { id: "vscud_on", ticker: "VSCUD", name: "Vista Energy ON 2030", type: "ON", price: 104.5, change: -0.3 },
  { id: "ymcjo_on", ticker: "YMCJO", name: "YPF ON 2031", type: "ON", price: 91.8, change: 0.5 },
  { id: "bahusda_fci", ticker: "BAHUSDA", name: "Balanz Ahorro USD", type: "FCI", price: 1.0, change: 0.04 },
];

const USD_MEP = 1265;
const formatARS = (v) => `$${(v * USD_MEP).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
const formatUSD = (v) => `U$S ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const TYPE_COLORS = { CEDEAR: "#00d4aa", ON: "#f5a623", FCI: "#7b8cde" };

export default function App() {
  const [positions, setPositions] = useState([
    { id: 1, instrumentId: "spy_cedr", qty: 10, avgPrice: 8100 },
    { id: 2, instrumentId: "tlcpd_on", qty: 5000, avgPrice: 97.0 },
    { id: 3, instrumentId: "bahusda_fci", qty: 15000, avgPrice: 1.0 },
    { id: 4, instrumentId: "ggal_cedr", qty: 50, avgPrice: 1750 },
  ]);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPos, setNewPos] = useState({ instrumentId: "", qty: "", avgPrice: "" });
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => { setTimeout(() => setAnimIn(true), 80); }, []);

  const getInstrument = (id) => INSTRUMENTS.find((i) => i.id === id);

  const enrichedPositions = positions.map((p) => {
    const inst = getInstrument(p.instrumentId);
    if (!inst) return null;
    const currentValue = p.qty * inst.price;
    const costBasis = p.qty * p.avgPrice;
    const pnl = currentValue - costBasis;
    const pnlPct = (pnl / costBasis) * 100;
    return { ...p, inst, currentValue, costBasis, pnl, pnlPct };
  }).filter(Boolean);

  const totalUSD = enrichedPositions.reduce((s, p) => s + p.currentValue, 0);
  const totalCost = enrichedPositions.reduce((s, p) => s + p.costBasis, 0);
  const totalPnL = totalUSD - totalCost;
  const totalPnLPct = (totalPnL / totalCost) * 100;
  const typeBreakdown = ["CEDEAR", "ON", "FCI"].map((type) => {
    const val = enrichedPositions.filter((p) => p.inst.type === type).reduce((s, p) => s + p.currentValue, 0);
    return { type, val, pct: totalUSD ? (val / totalUSD) * 100 : 0 };
  });

  const addPosition = () => {
    if (!newPos.instrumentId || !newPos.qty || !newPos.avgPrice) return;
    setPositions((prev) => [...prev, { id: Date.now(), instrumentId: newPos.instrumentId, qty: parseFloat(newPos.qty), avgPrice: parseFloat(newPos.avgPrice) }]);
    setNewPos({ instrumentId: "", qty: "", avgPrice: "" });
    setShowAddModal(false);
  };

  const removePosition = (id) => setPositions((prev) => prev.filter((p) => p.id !== id));

  const runAiAnalysis = async () => {
    setAiLoading(true); setAiError(""); setAiAnalysis(""); setActiveTab("ai");
    const portfolioSummary = enrichedPositions.map((p) =>
      `- ${p.inst.ticker} (${p.inst.type}): ${p.qty} unidades @ U$S${p.avgPrice}, valor actual U$S${p.currentValue.toFixed(2)}, P&L ${formatPct(p.pnlPct)}`
    ).join("\n");
    const prompt = `Soy un inversor argentino. Mi portfolio:\n${portfolioSummary}\n\nTotal USD: ${formatUSD(totalUSD)}\nP&L: ${formatPct(totalPnLPct)}\nDistribución: ${typeBreakdown.map(t => `${t.type}: ${t.pct.toFixed(1)}%`).join(", ")}\nDólar MEP: $${USD_MEP}\n\nAnalizá: 1) Concentración 2) Riesgo por instrumento 3) Exposición argentina vs internacional 4) 2-3 recomendaciones concretas. Sé directo, en español.`;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const data = await response.json();
      if (data.success && data.data?.content) {
        setAiAnalysis(data.data.content.map((c) => c.text || "").join(""));
      } else {
        setAiError(`Debug: ${JSON.stringify(data)}`);
      }
    } catch (e) { 
      setAiError(`Error: ${e.message}`); 
    }
    setAiLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", color: "#e8edf2", fontFamily: "'IBM Plex Mono', monospace", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, opacity: animIn ? 1 : 0, transition: "all 0.5s ease" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#00d4aa", textTransform: "uppercase", marginBottom: 4 }}>LATAM Portfolio Tracker</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Mi Portfolio</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#556", letterSpacing: 2, textTransform: "uppercase" }}>USD MEP</div>
            <div style={{ fontSize: 18, color: "#f5a623", fontWeight: 700 }}>${USD_MEP.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24, opacity: animIn ? 1 : 0, transition: "all 0.6s ease 0.1s" }}>
          {[
            { label: "Valor Total", value: formatUSD(totalUSD), sub: formatARS(totalUSD), color: "#00d4aa" },
            { label: "P&L Total", value: formatUSD(totalPnL), sub: formatPct(totalPnLPct), color: totalPnL >= 0 ? "#00d4aa" : "#ff4d6d" },
            { label: "Posiciones", value: positions.length, sub: `${typeBreakdown.filter(t => t.val > 0).length} tipos`, color: "#7b8cde" },
          ].map((card) => (
            <div key={card.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "16px 12px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: card.color, opacity: 0.6 }} />
              <div style={{ fontSize: 9, color: "#556", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: card.color, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 10, color: "#778" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 10, color: "#556", letterSpacing: 2, textTransform: "uppercase" }}>
            <span>Distribución</span>
            <div style={{ display: "flex", gap: 12 }}>{typeBreakdown.map(t => <span key={t.type} style={{ color: TYPE_COLORS[t.type] }}>{t.type} {t.pct.toFixed(0)}%</span>)}</div>
          </div>
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#111" }}>
            {typeBreakdown.map(t => <div key={t.type} style={{ width: `${t.pct}%`, background: TYPE_COLORS[t.type], transition: "width 0.8s ease" }} />)}
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[["portfolio", "Portfolio"], ["mercado", "Mercado"], ["ai", "Análisis IA"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: activeTab === tab ? "#00d4aa" : "#445", borderBottom: activeTab === tab ? "2px solid #00d4aa" : "2px solid transparent", marginBottom: -1, transition: "all 0.2s", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>

        {activeTab === "portfolio" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button onClick={() => setShowAddModal(true)} style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", color: "#00d4aa", borderRadius: 6, padding: "8px 18px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>+ Agregar</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {enrichedPositions.map((p) => (
                <div key={p.id} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "12px 14px", display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: `${TYPE_COLORS[p.inst.type]}18`, border: `1px solid ${TYPE_COLORS[p.inst.type]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: TYPE_COLORS[p.inst.type] }}>{p.inst.type}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#dde" }}>{p.inst.ticker}</div>
                    <div style={{ fontSize: 9, color: "#445", marginTop: 2 }}>{p.qty.toLocaleString()} unidades</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#bbc" }}>{formatUSD(p.currentValue)}</div>
                    <div style={{ fontSize: 9, color: "#445" }}>{formatARS(p.currentValue)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: p.pnl >= 0 ? "#00d4aa" : "#ff4d6d", fontWeight: 600 }}>{formatPct(p.pnlPct)}</div>
                    <div style={{ fontSize: 9, color: p.pnl >= 0 ? "#00a888" : "#cc3355" }}>{p.pnl >= 0 ? "+" : ""}{formatUSD(p.pnl)}</div>
                  </div>
                  <button onClick={() => removePosition(p.id)} style={{ background: "none", border: "none", color: "#334", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(0,212,170,0.04)", borderRadius: 8, border: "1px solid rgba(0,212,170,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#556" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#00d4aa" }}>{formatUSD(totalUSD)}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={runAiAnalysis} style={{ background: "linear-gradient(135deg, rgba(0,212,170,0.15), rgba(123,140,222,0.15))", border: "1px solid rgba(0,212,170,0.3)", color: "#00d4aa", borderRadius: 8, padding: "12px", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", width: "100%", fontFamily: "inherit" }}>✦ Analizar con IA</button>
            </div>
          </div>
        )}

        {activeTab === "mercado" && (
          <div>
            {["CEDEAR", "ON", "FCI"].map((type) => (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: TYPE_COLORS[type], marginBottom: 8, textTransform: "uppercase" }}>— {type}s</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {INSTRUMENTS.filter(i => i.type === type).map((inst) => (
                    <div key={inst.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#ccd" }}>{inst.ticker}</span>
                        <span style={{ fontSize: 9, color: "#445", marginLeft: 8 }}>{inst.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: inst.change >= 0 ? "#00d4aa" : "#ff4d6d" }}>{formatPct(inst.change)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "ai" && (
          <div>
            {aiLoading && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#00d4aa", textTransform: "uppercase", marginBottom: 12 }}>Analizando portfolio</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4aa", animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </div>
                <style>{`@keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
              </div>
            )}
            {aiError && <div style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 8, padding: 16, color: "#ff4d6d", fontSize: 12 }}>{aiError}</div>}
            {!aiLoading && !aiAnalysis && !aiError && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#334" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Presioná "Analizar con IA" desde Portfolio</div>
              </div>
            )}
            {aiAnalysis && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,212,170,0.12)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#00d4aa", textTransform: "uppercase", marginBottom: 16 }}>✦ Análisis IA — {new Date().toLocaleDateString("es-AR")}</div>
                <div style={{ fontSize: 12, lineHeight: 1.9, color: "#9aabb8", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{aiAnalysis}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: "#0d1117", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 12, padding: 24, width: 340, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#00d4aa", textTransform: "uppercase", marginBottom: 20 }}>Nueva Posición</div>
            {[{ label: "Instrumento", field: "instrumentId", type: "select" }, { label: "Cantidad", field: "qty", type: "number", placeholder: "ej: 100" }, { label: "Precio promedio", field: "avgPrice", type: "number", placeholder: "ej: 8100" }].map(({ label, field, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#556", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                {type === "select" ? (
                  <select value={newPos[field]} onChange={(e) => setNewPos({ ...newPos, [field]: e.target.value })} style={{ width: "100%", background: "#0a0e14", border: "1px solid rgba(255,255,255,0.1)", color: "#ccd", borderRadius: 6, padding: "9px 12px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                    <option value="">— Seleccioná —</option>
                    {INSTRUMENTS.map(i => <option key={i.id} value={i.id}>{i.ticker} — {i.type}</option>)}
                  </select>
                ) : (
                  <input type={type} placeholder={placeholder} value={newPos[field]} onChange={(e) => setNewPos({ ...newPos, [field]: e.target.value })} style={{ width: "100%", background: "#0a0e14", border: "1px solid rgba(255,255,255,0.1)", color: "#ccd", borderRadius: 6, padding: "9px 12px", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#556", borderRadius: 6, padding: "10px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={addPosition} style={{ flex: 1, background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "#00d4aa", borderRadius: 6, padding: "10px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

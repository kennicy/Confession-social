// EmpireComponent.jsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * EmpireComponent - mini Clash-of-Clans style (client-only)
 * Features:
 * - Grid map with placeable buildings: TownHall, Mine, Barracks, Wall
 * - Gold generation from mines, manual collect
 * - Train troops in Barracks (swordsman, archer)
 * - Deploy troops to attack an AI base (battle sim)
 * - Upgrade buildings
 * - Save / Load to localStorage
 *
 * Drop into your components folder and import into GamePage.
 */

// ---------- Config / Data ----------
const GRID_SIZE = 8;
const CELL_SIZE_PX = 56;

const BUILDINGS = {
  TownHall: {
    key: "TownHall",
    display: "Town Hall",
    cost: { gold: 0 },
    hpBase: 1000,
    size: 2, // occupies size x size cells (simple)
    canBuild: false, // auto present
  },
  Mine: {
    key: "Mine",
    display: "Gold Mine",
    cost: { gold: 300 },
    hpBase: 200,
    producesGoldPerSec: 2, // base rate
    size: 1,
  },
  Barracks: {
    key: "Barracks",
    display: "Barracks",
    cost: { gold: 500 },
    hpBase: 300,
    size: 1,
  },
  Wall: {
    key: "Wall",
    display: "Wall",
    cost: { gold: 50 },
    hpBase: 100,
    size: 1,
  },
};

const TROOPS = {
  swordsman: { display: "Swordsman", cost: 75, attack: 25, hp: 80, trainTimeSec: 2, speed: 120 },
  archer: { display: "Archer", cost: 120, attack: 40, hp: 45, trainTimeSec: 3, speed: 140 },
};

const LOCAL_KEY = "empire_demo_v1";

// ---------- Utilities ----------
const uid = (prefix = "") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------- Default Starter Base ----------
function defaultBase() {
  const layout = {
    buildings: [
      // Place a TownHall near center
      { id: "th-1", type: "TownHall", x: 3, y: 3, level: 1, hp: BUILDINGS.TownHall.hpBase },
      // a mine and barracks example
      { id: "mine-1", type: "Mine", x: 1, y: 1, level: 1, hp: BUILDINGS.Mine.hpBase },
      { id: "barr-1", type: "Barracks", x: 6, y: 1, level: 1, hp: BUILDINGS.Barracks.hpBase },
      { id: "wall-1", type: "Wall", x: 4, y: 1, level: 1, hp: BUILDINGS.Wall.hpBase },
    ],
    gold: 800,
    troops: { swordsman: 0, archer: 0 },
    trainingQueue: [], // {id, type, remainingSec}
    createdAt: Date.now(),
  };
  return layout;
}

// ---------- Main Component ----------
export default function EmpireComponent({ user }) {
  // state
  const [base, setBase] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return defaultBase();
  });

  const [selectedTool, setSelectedTool] = useState("select"); // select | build:Mine|build:Barracks|build:Wall|upgrade|delete
  const [cursorPos, setCursorPos] = useState(null); // {x,y}
  const [dragging, setDragging] = useState(false);

  const [goldBuffer, setGoldBuffer] = useState(0);
  const goldTickRef = useRef(null);

  const [activeTraining, setActiveTraining] = useState([]); // training queue shown locally
  const trainingIntervalRef = useRef(null);

  const [combatLog, setCombatLog] = useState([]);
  const [deployedTroops, setDeployedTroops] = useState([]); // for animations: {id,type,x,y,targetX,targetY, hp}

  // AI base to attack (simple preset)
  const [aiBase, setAiBase] = useState(() => {
    return {
      id: "ai-1",
      name: "Bandit Camp",
      buildings: [
        { id: "ai-th", type: "TownHall", x: 4, y: 4, level: 1, hp: BUILDINGS.TownHall.hpBase + 200 },
        { id: "ai-m1", type: "Mine", x: 2, y: 2, level: 1, hp: BUILDINGS.Mine.hpBase },
        { id: "ai-w1", type: "Wall", x: 4, y: 3, level: 1, hp: BUILDINGS.Wall.hpBase },
      ],
      gold: 500 + Math.floor(Math.random() * 500),
    };
  });

  // Save base to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(base));
    } catch (e) {
      console.error("save err", e);
    }
  }, [base]);

  // Gold tick: mines produce gold per second based on level
  useEffect(() => {
    if (goldTickRef.current) clearInterval(goldTickRef.current);
    goldTickRef.current = setInterval(() => {
      const totalProduction = base.buildings.reduce((acc, b) => {
        if (b.type === "Mine") {
          const rate = (BUILDINGS.Mine.producesGoldPerSec || 1) * (1 + (b.level - 1) * 0.5);
          return acc + rate;
        }
        return acc;
      }, 0);
      setGoldBuffer((g) => g + totalProduction);
    }, 1000);

    return () => clearInterval(goldTickRef.current);
  }, [base.buildings]);

  // training queue processor
  useEffect(() => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    trainingIntervalRef.current = setInterval(() => {
      setActiveTraining((q) => {
        if (!q.length) return q;
        const updated = q.map((task) => ({ ...task, remaining: task.remaining - 1 })).filter(t => t.remaining > 0);
        // tasks with remaining === 0 should be added to troops
        const finished = q.filter(t => t.remaining <= 1);
        if (finished.length) {
          setBase((prev) => {
            const newT = { ...prev.troops };
            finished.forEach(f => {
              newT[f.type] = (newT[f.type] || 0) + f.count;
            });
            return { ...prev, troops: newT };
          });
          appendLog(`Training complete: ${finished.map(f => `${f.count} ${f.type}`).join(", ")}`);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(trainingIntervalRef.current);
  }, []);

  // tick: flush goldBuffer into base every 3 seconds (not to spam saves)
  useEffect(() => {
    const flush = setInterval(() => {
      if (goldBuffer > 0) {
        setBase((p) => ({ ...p, gold: Math.floor((p.gold || 0) + goldBuffer) }));
        setGoldBuffer(0);
      }
    }, 3000);
    return () => clearInterval(flush);
  }, [goldBuffer]);

  // helper append log
  function appendLog(msg) {
    setCombatLog((l) => [{ t: new Date().toLocaleTimeString(), m: msg }, ...l].slice(0, 80));
  }

  // ---------- Building placement / management ----------
  function canPlaceAt(x, y, size = 1) {
    // bounds
    if (x < 0 || y < 0 || x + size > GRID_SIZE || y + size > GRID_SIZE) return false;
    // overlapping other buildings
    for (const b of base.buildings) {
      const bx = b.x, by = b.y, bs = (BUILDINGS[b.type]?.size || 1);
      if (!(x + size - 1 < bx || x > bx + bs - 1 || y + size - 1 < by || y > by + bs - 1)) {
        return false;
      }
    }
    return true;
  }

  function placeBuilding(type, x, y) {
    const def = BUILDINGS[type];
    if (!def) return alert("Unknown building");
    if (!canPlaceAt(x, y, def.size)) return alert("Không thể đặt ở vị trí này (chồng hoặc vượt ranh)");
    if ((base.gold || 0) < (def.cost.gold || 0)) return alert("Không đủ vàng để xây!");
    const id = uid(`${type}-`);
    const newB = { id, type, x, y, level: 1, hp: def.hpBase };
    setBase((p) => ({ ...p, gold: Math.floor(p.gold - (def.cost.gold || 0)), buildings: [...p.buildings, newB] }));
    appendLog(`Đã xây ${def.display}`);
  }

  function upgradeBuilding(id) {
    setBase((p) => {
      const buildings = p.buildings.map((b) => {
        if (b.id === id) {
          const cost = Math.floor((BUILDINGS[b.type].cost.gold || 100) * (1 + b.level * 0.8));
          if (p.gold < cost) {
            appendLog("Không đủ vàng để nâng cấp");
            return b;
          }
          appendLog(`Nâng cấp ${b.type} L${b.level} -> L${b.level + 1}`);
          p.gold = Math.floor(p.gold - cost);
          return { ...b, level: b.level + 1, hp: Math.floor((BUILDINGS[b.type].hpBase || 100) * (1 + (b.level) * 0.5)) };
        }
        return b;
      });
      return { ...p, buildings };
    });
  }

  function demolishBuilding(id) {
    setBase((p) => ({ ...p, buildings: p.buildings.filter(b => b.id !== id) }));
    appendLog("Đã phá bỏ công trình");
  }

  // ---------- Troop training ----------
  function train(type, count = 1) {
    const spec = TROOPS[type];
    if (!spec) return;
    const totalCost = spec.cost * count;
    if ((base.gold || 0) < totalCost) return alert("Không đủ vàng để huấn luyện");
    // check if player has at least one Barracks
    const hasBarracks = base.buildings.some(b => b.type === "Barracks");
    if (!hasBarracks) return alert("Cần Barracks để huấn luyện lính");
    // push to activeTraining (simulate queue)
    const t = { id: uid("train-"), type, count, remaining: spec.trainTimeSec * count };
    setActiveTraining((q) => [...q, t]);
    setBase((p) => ({ ...p, gold: Math.floor(p.gold - totalCost) }));
    appendLog(`Bắt đầu huấn luyện ${count} ${type}`);
  }

  // ---------- Deployment / Battle ----------
  function deployAndAttack(targetBase) {
    // require troops
    const myTroops = { ...base.troops };
    const totalTroopsCount = Object.values(myTroops).reduce((a,b) => a + (b || 0), 0);
    if (totalTroopsCount === 0) return alert("Bạn chưa có lính để triển khai!");
    appendLog("Triển khai lính tấn công...");

    // create deployedTroops array for animation and simulation
    const deployed = [];
    let spawnX = 0, spawnY = 0;
    // choose spawn edge (left)
    spawnX = 0; spawnY = Math.floor(GRID_SIZE / 2);
    for (const [type, count] of Object.entries(myTroops)) {
      for (let i = 0; i < count; i++) {
        deployed.push({
          id: uid("d-"),
          type,
          x: spawnX + Math.random() * 0.6,
          y: spawnY + (Math.random() - 0.5) * 2,
          hp: TROOPS[type].hp,
          attack: TROOPS[type].attack,
          targetX: targetBase.buildings.find(b => b.type === "TownHall")?.x || (GRID_SIZE - 1),
          targetY: targetBase.buildings.find(b => b.type === "TownHall")?.y || Math.floor(GRID_SIZE / 2),
        });
      }
    }
    // clear player's troops (they are "deployed")
    setBase((p) => ({ ...p, troops: Object.keys(p.troops).reduce((acc,k)=>{acc[k]=0;return acc;},{}) }));
    setDeployedTroops(deployed);

    // run simulation (simple)
    setTimeout(() => {
      const simRes = simulateBattleSimple(deployed, targetBase);
      appendLog(simRes.message);
      // apply loot if win
      if (simRes.attackerWins) {
        const loot = Math.floor((targetBase.gold || 0) * simRes.lootPercent);
        setBase((p) => ({ ...p, gold: Math.floor(p.gold + loot) }));
        appendLog(`Bạn cướp được ${loot} vàng!`);
        // reduce ai gold
        setAiBase((ai) => ({ ...ai, gold: Math.max(0, ai.gold - loot) }));
      }
      // clear deployed after a short delay to allow anims
      setTimeout(() => setDeployedTroops([]), 900);
    }, 1200);
  }

  function simulateBattleSimple(deployed, defender) {
    // Sum attack power
    let atk = 0, hp = 0;
    deployed.forEach(d => { atk += d.attack; hp += d.hp; });
    // defense power: townhall*level*50 + walls * count * 20 + mines add passive defense
    const th = defender.buildings.find(b => b.type === "TownHall");
    const townLevel = (th?.level) || 1;
    const wallCount = defender.buildings.filter(b => b.type === "Wall").length;
    const defensePower = townLevel * 80 + wallCount * 25;
    const attackerWins = atk > defensePower;
    const lootPercent = clamp(atk / (defensePower + 1) / 2, 0, 0.8);
    return {
      attackerWins,
      attackPower: atk,
      defensePower,
      lootPercent,
      message: attackerWins ? `Chiến thắng! (atk ${Math.round(atk)} > def ${Math.round(defensePower)})` : `Thất bại! (atk ${Math.round(atk)} <= def ${Math.round(defensePower)})`,
    };
  }

  // ---------- Map click handlers ----------
  function onCellClick(x, y) {
    if (selectedTool === "select") {
      // select building at this cell if any
      const b = base.buildings.find(bid => {
        const bs = (BUILDINGS[bid.type]?.size || 1);
        return x >= bid.x && x < bid.x + bs && y >= bid.y && y < bid.y + bs;
      });
      if (b) {
        // show options: upgrade / demolish
        const action = window.prompt(`Bạn chọn ${b.type} (id:${b.id}). Gõ "u" để upgrade, "d" để phá, hoặc hủy để thoát.`);
        if (action === "u") upgradeBuilding(b.id);
        if (action === "d") {
          if (confirm("Xác nhận phá công trình?")) demolishBuilding(b.id);
        }
      }
    } else if (selectedTool?.startsWith("build:")) {
      const type = selectedTool.split(":")[1];
      placeBuilding(type, x, y);
    } else if (selectedTool === "attack-ai") {
      deployAndAttack(aiBase);
    } else if (selectedTool === "collect") {
      // immediate collect (take buffered gold too)
      const backlog = Math.floor(goldBuffer);
      setBase((p) => ({ ...p, gold: Math.floor(p.gold + goldBuffer) }));
      setGoldBuffer(0);
      appendLog(`Thu thập ${backlog} vàng`);
    }
  }

  // ---------- Helpers UI ----------
  function renderCell(x, y) {
    const b = base.buildings.find(bid => {
      const bs = (BUILDINGS[bid.type]?.size || 1);
      return x >= bid.x && x < bid.x + bs && y >= bid.y && y < bid.y + bs;
    });

    return (
      <div
        key={`${x}-${y}`}
        onClick={() => onCellClick(x, y)}
        style={{
          width: CELL_SIZE_PX,
          height: CELL_SIZE_PX,
          border: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#071022",
          cursor: selectedTool === "select" ? "pointer" : "crosshair",
        }}
      >
        {b ? renderBuildingIcon(b) : <div style={{ color: "#2b3a45" }}>.</div>}
      </div>
    );
  }

  function renderBuildingIcon(b) {
    const def = BUILDINGS[b.type];
    const label = def ? def.display : b.type;
    // display icon simple emoji
    let emoji = "🏗️";
    if (b.type === "TownHall") emoji = "🏰";
    if (b.type === "Mine") emoji = "⛏️";
    if (b.type === "Barracks") emoji = "🏹";
    if (b.type === "Wall") emoji = "🧱";

    return (
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 20 }}>{emoji}</div>
        <div style={{ fontSize: 11 }}>{label} L{b.level}</div>
      </div>
    );
  }

  function collectBufferedGold() {
    setBase((p) => ({ ...p, gold: Math.floor(p.gold + goldBuffer) }));
    setGoldBuffer(0);
    appendLog("Bạn đã thu thập vàng từ mỏ");
  }

  // ---------- UI Layout ----------
  return (
    <div style={{ padding: 18, fontFamily: "Segoe UI, Tahoma, sans-serif", color: "#e6eef6" }}>
      <h2 style={{ margin: 0 }}>Empire (Offline Prototype)</h2>
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {/* Left panel: map */}
        <div style={{ background: "#071021", padding: 12, borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.6)" }}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div>
              <strong>Gold:</strong> {Math.floor(base.gold || 0)} <span style={{ color: "#9aa6ad" }}>|</span> <strong>Buffered:</strong> {Math.floor(goldBuffer)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setSelectedTool("select"); }} style={btnStyle(selectedTool === "select")}>Select</button>
              <button onClick={() => { setSelectedTool("build:Mine"); }} style={btnStyle(selectedTool === "build:Mine")}>Build Mine</button>
              <button onClick={() => { setSelectedTool("build:Barracks"); }} style={btnStyle(selectedTool === "build:Barracks")}>Build Barracks</button>
              <button onClick={() => { setSelectedTool("build:Wall"); }} style={btnStyle(selectedTool === "build:Wall")}>Build Wall</button>
              <button onClick={() => { setSelectedTool("upgrade"); }} style={btnStyle(selectedTool === "upgrade")}>Upgrade</button>
              <button onClick={() => { setSelectedTool("attack-ai"); }} style={btnStyle(selectedTool === "attack-ai")}>Attack AI</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE_PX}px)`, gridAutoRows: `${CELL_SIZE_PX}px`, gap: 0 }}>
            {Array.from({ length: GRID_SIZE }).flatMap((_, y) => Array.from({ length: GRID_SIZE }).map((__, x) => renderCell(x, y)))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={() => placeBuilding("Mine", Math.floor(Math.random() * (GRID_SIZE - 1)), Math.floor(Math.random() * (GRID_SIZE - 1)))} style={smallBtn}>Quick Build Mine</button>
            <button onClick={() => placeBuilding("Barracks", Math.floor(Math.random() * (GRID_SIZE - 1)), Math.floor(Math.random() * (GRID_SIZE - 1)))} style={smallBtn}>Quick Build Barracks</button>
            <button onClick={() => { setBase(defaultBase()); appendLog("Reset base to default"); }} style={smallBtn}>Reset Base</button>
          </div>
        </div>

        {/* Right panel: actions */}
        <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#071121", padding: 12, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Base Info</h4>
            <div style={{ color: "#9fb0bd" }}>Buildings: {base.buildings.length}</div>
            <div style={{ color: "#9fb0bd" }}>Troops: {Object.entries(base.troops).map(([k,v])=> `${TROOPS[k]?.display||k}:${v}`).join(" • ")}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={collectBufferedGold} style={{ ...smallBtn, background: "#1f8cff" }}>Collect {Math.floor(goldBuffer)} Gold</button>
            </div>
          </div>

          <div style={{ background: "#071121", padding: 12, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Train Troops</h4>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(TROOPS).map(([k, spec]) => (
                <div key={k} style={{ background: "#04121a", padding: 8, borderRadius: 8, minWidth: 140 }}>
                  <div style={{ fontWeight: "600" }}>{spec.display}</div>
                  <div style={{ color: "#8fb0b8", fontSize: 13 }}>Cost: {spec.cost} Gold</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <button onClick={() => train(k, 1)} style={smallBtn}>Train x1</button>
                    <button onClick={() => train(k, 5)} style={smallBtn}>Train x5</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "#a7bfc6" }}>Queue: {activeTraining.length ? activeTraining.map(t=>`${t.count} ${t.type} (${t.remaining}s)`).join(", ") : "—"}</div>
            </div>
          </div>

          <div style={{ background: "#071121", padding: 12, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>AI Camp (Target)</h4>
            <div style={{ color: "#9fb0bd" }}>Name: {aiBase.name}</div>
            <div style={{ color: "#9fb0bd" }}>Gold: {aiBase.gold}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => deployAndAttack(aiBase)} style={{ ...smallBtn, background: "#ef4444" }}>Deploy & Attack AI</button>
              <button onClick={() => setAiBase({ ...aiBase, gold: aiBase.gold + 200 })} style={smallBtn}>Add loot to AI</button>
            </div>
          </div>

          <div style={{ background: "#071121", padding: 12, borderRadius: 10, maxHeight: 260, overflow: "auto" }}>
            <h4 style={{ marginTop: 0 }}>Activity Log</h4>
            <div style={{ color: "#b9d4dd" }}>
              {combatLog.length === 0 && <div style={{ color: "#6f8891" }}>No events yet</div>}
              {combatLog.map((l, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.03)" }}>
                  <div style={{ fontSize: 12, color: "#93c5fd" }}>{l.t}</div>
                  <div>{l.m}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#071121", padding: 12, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Save / Export</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { localStorage.setItem(LOCAL_KEY, JSON.stringify(base)); appendLog("Saved to localStorage"); }} style={smallBtn}>Save</button>
              <button onClick={() => {
                const data = JSON.stringify(base, null, 2);
                navigator.clipboard?.writeText(data);
                appendLog("Exported JSON to clipboard");
              }} style={smallBtn}>Export JSON</button>
              <button onClick={() => {
                try {
                  const raw = prompt("Paste base JSON here to import:");
                  if (!raw) return;
                  const parsed = JSON.parse(raw);
                  setBase(parsed);
                  appendLog("Imported base from JSON");
                } catch (e) { alert("Invalid JSON"); }
              }} style={smallBtn}>Import JSON</button>
            </div>
          </div>
        </div>
      </div>

      {/* Deployed troop animations (floating) */}
      <div style={{ position: "relative", width: "100%", height: 0 }}>
        <AnimatePresence>
          {deployedTroops.map(d => (
            <motion.div key={d.id}
              initial={{ opacity: 0, x: d.x * CELL_SIZE_PX, y: d.y * CELL_SIZE_PX }}
              animate={{ opacity: 1, x: (d.targetX + Math.random() * 0.4) * CELL_SIZE_PX, y: (d.targetY + Math.random() * 0.4) * CELL_SIZE_PX }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                pointerEvents: "none",
              }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffb86b", boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }}>
                {d.type === "swordsman" ? "🗡️" : "🏹"}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- Small styles ----------
const btnStyle = (active) => ({
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  background: active ? "#2563eb" : "#24303a",
  color: "#fff",
  cursor: "pointer",
});

const smallBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  background: "#1f8cff",
  color: "#fff",
  cursor: "pointer",
};

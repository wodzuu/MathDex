import { useState, useEffect } from "react";

function useStyles() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@600;700;800;900&display=swap";
    document.head.appendChild(link);
    const s = document.createElement("style");
    s.textContent = `
      @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
      @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(.95)} }
      @keyframes glowY   { 0%,100%{box-shadow:0 0 8px #FFCB0540} 50%{box-shadow:0 0 22px #FFCB0590} }
      .fade-up  { animation:fadeUp  .3s ease both }
      .fade-in  { animation:fadeIn  .2s ease both }
      .slide-up { animation:slideUp .35s cubic-bezier(.34,.7,.64,1) both }
      .pulsing  { animation:pulse 1.6s ease-in-out infinite }
      .glowY    { animation:glowY  2s  ease-in-out infinite }
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-thumb{background:#3a3d5c;border-radius:2px}
    `;
    document.head.appendChild(s);
    return () => { document.head.removeChild(link); document.head.removeChild(s); };
  }, []);
}

const D = {
  darker:"#0a1220", navy:"#0F1B2D", card:"#22253a", card2:"#2a2d45",
  border:"#3a3d5c", yellow:"#FFCB05", red:"#CC0000", green:"#48c774",
  blue:"#3B4CCA", muted:"#8892b8", white:"#f0f4ff",
};
const TYPES = {
  Electric:{bg:"#302400",fg:"#F8D030",bdr:"#604800"},
  Water:   {bg:"#0a1030",fg:"#6890F0",bdr:"#1a2060"},
  Fire:    {bg:"#301808",fg:"#F08030",bdr:"#603018"},
  Rock:    {bg:"#281c00",fg:"#B8A038",bdr:"#483c00"},
  Normal:  {bg:"#2a2a20",fg:"#A8A878",bdr:"#4a4a40"},
  Ground:  {bg:"#1a1000",fg:"#C8960C",bdr:"#3a2800"},
};
const t = tp => TYPES[tp] || TYPES.Normal;
const px = "'Press Start 2P',monospace";
const ff = "'Nunito',sans-serif";

const TypeBadge = ({ type }) => (
  <span style={{ fontFamily:ff, fontWeight:800, fontSize:10, padding:"2px 8px",
    borderRadius:99, textTransform:"uppercase",
    background:t(type).bg, color:t(type).fg, border:`1px solid ${t(type).bdr}` }}>
    {type}
  </span>
);

// ── FLOOR DATA ────────────────────────────────────────────────────────────────
// Floor 8 rooms. The player has cleared room 1.
const ROOMS = [
  { id:"r1", type:"encounter", mandatory:true,  cleared:true,
    pokemon:{name:"Geodude",   emoji:"🪨", type:"Rock",     level:20, rarity:"Common"   } },
  { id:"r2", type:"encounter", mandatory:false, cleared:false,
    pokemon:{name:"Magnemite", emoji:"🔩", type:"Electric", level:22, rarity:"Uncommon" } },
  { id:"r3", type:"chest",     mandatory:false, cleared:false, rarity:"Rare" },
  { id:"r4", type:"encounter", mandatory:true,  cleared:false,
    pokemon:{name:"Growlithe", emoji:"🔥", type:"Fire",     level:22, rarity:"Uncommon" } },
  { id:"r5", type:"stairs",    mandatory:true,  cleared:false },
];

export default function App() {
  useStyles();

  const [cleared, setCleared]       = useState(new Set(["r1"]));
  const [overlay, setOverlay]       = useState(null);   // "encounter"|"chest"|"stairs"
  const [activeRoom, setActiveRoom] = useState(null);
  const [battlePhase, setBattlePhase] = useState("pre"); // pre|fighting|won
  const [enemyHp, setEnemyHp]       = useState(100);
  // Party — 3 Pokémon at floor 8 (2 start + 1 unlocked after floor 5 boss)
  const [party, setParty] = useState([
    { id:"pika", name:"Pikachu",   emoji:"⚡", type:"Electric", level:24, hp:78, lead:true  },
    { id:"char", name:"Charizard", emoji:"🔥", type:"Fire",     level:31, hp:91, lead:false },
    { id:"vap",  name:"Vaporeon",  emoji:"💧", type:"Water",    level:22, hp:55, lead:false },
  ]);
  const leadPk = party.find(p => p.lead);
  const [potions, setPotions]   = useState(4);
  const [showLoot, setShowLoot] = useState(false);

  // player is on the first uncleared mandatory room
  const playerRoomId = (() => {
    const mandatory = ROOMS.filter(r => r.mandatory && r.type !== "stairs");
    const firstUncleared = mandatory.find(r => !cleared.has(r.id));
    return firstUncleared ? firstUncleared.id : "r5";
  })();

  const canDescend = ROOMS.filter(r => r.mandatory && r.type !== "stairs").every(r => cleared.has(r.id));

  function accessible(room) {
    if(cleared.has(room.id)) return false; // already done
    if(room.type === "stairs") return canDescend;
    // mandatory rooms: must clear previous mandatory first
    if(room.mandatory) {
      const mandatories = ROOMS.filter(r => r.mandatory && r.type !== "stairs");
      const idx = mandatories.findIndex(r => r.id === room.id);
      if(idx > 0) return cleared.has(mandatories[idx-1].id);
      return true;
    }
    // optional rooms: always accessible once at least room 1 cleared
    return cleared.has("r1");
  }

  function tapRoom(room) {
    if(!accessible(room)) return;
    setActiveRoom(room);
    setEnemyHp(100);
    setBattlePhase("pre");
    if(room.type === "stairs")    setOverlay("stairs");
    else if(room.type === "encounter") setOverlay("encounter");
    else if(room.type === "chest")     setOverlay("chest");
  }

  function attack() {
    const dmg = Math.round(16 + Math.random()*14);
    const newHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newHp);
    const edm = Math.round(6+Math.random()*8);
    setParty(p => p.map(pk => pk.lead ? {...pk, hp:Math.max(0,pk.hp-edm)} : pk));
    if(newHp <= 0) setBattlePhase("won");
  }

  function completeRoom() {
    setCleared(c => new Set([...c, activeRoom.id]));
    setOverlay(null);
    setBattlePhase("pre");
    if(activeRoom.type === "encounter") {
      setTimeout(() => setShowLoot(true), 300);
    }
  }

  function closeOverlay() {
    setOverlay(null); setBattlePhase("pre"); setEnemyHp(100);
  }

  const hpCol = hp => hp>50?D.green:hp>20?D.yellow:D.red;

  return (
    <div style={{ background:D.darker, minHeight:"100vh", fontFamily:ff, maxWidth:420, margin:"0 auto" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background:`linear-gradient(180deg,#0d1a0d,${D.darker})`,
        borderBottom:`2px solid ${D.border}`, padding:"12px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:px, fontSize:8, color:D.yellow, letterSpacing:2, marginBottom:4 }}>DUNGEON</div>
            <div style={{ fontFamily:px, fontSize:13 }}>Floor 8</div>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:2 }}>POTIONS</div>
              <div style={{ fontFamily:px, fontSize:12, color:potions>1?D.green:D.red }}>🧪×{potions}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:2 }}>₽</div>
              <div style={{ fontFamily:px, fontSize:12, color:D.yellow }}>840</div>
            </div>
          </div>
        </div>

        {/* Party HP strip — all 3 Pokémon */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {party.map((pk,i) => (
            <div key={pk.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* sprite */}
              <div style={{ width:pk.lead?30:24, height:pk.lead?30:24, borderRadius:"50%", flexShrink:0,
                background:t(pk.type).bg, border:`2px solid ${pk.lead?t(pk.type).fg:t(pk.type).bdr}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:pk.lead?16:13, transition:"all .3s",
                boxShadow:pk.lead?`0 0 8px ${t(pk.type).fg}60`:"none" }}>
                {pk.emoji}
              </div>
              {/* name + HP */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ fontSize:pk.lead?12:10, fontWeight:800,
                    color:pk.lead?D.white:D.muted }}>{pk.name}</span>
                  <span style={{ fontFamily:px, fontSize:7, color:D.muted }}>Lv{pk.level}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontFamily:px, fontSize:6, color:D.white }}>HP</span>
                  <div style={{ flex:1, height:pk.lead?7:5,
                    background:"#111", border:`1px solid #ffffff15`,
                    borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${pk.hp}%`, height:"100%",
                      background:hpCol(pk.hp), borderRadius:3, transition:"width .4s" }}/>
                  </div>
                  <span style={{ fontFamily:px, fontSize:6, color:pk.hp<25?D.red:D.muted }}>{pk.hp}%</span>
                  {pk.hp<25 && <span style={{ fontSize:10 }} className="pulsing">⚠️</span>}
                </div>
              </div>
              {/* lead marker */}
              {pk.lead && (
                <div style={{ fontFamily:px, fontSize:7, color:D.yellow,
                  background:"#1a1400", border:`1px solid ${D.yellow}`,
                  borderRadius:4, padding:"2px 5px", flexShrink:0 }}>LEAD</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FLOOR PROGRESS ── */}
      <div style={{ padding:"16px 14px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:800, color:D.muted }}>
            {cleared.size - 0} / {ROOMS.filter(r=>r.type!=="stairs").length} rooms cleared
          </div>
          {canDescend && (
            <button style={{ background:D.green, border:"none", borderRadius:8,
              padding:"5px 12px", fontFamily:px, fontSize:8, color:D.darker, cursor:"pointer" }}
              className="glowY">▼ DESCEND</button>
          )}
        </div>

        {/* ── ROOM PATH ── */}
        <div style={{ position:"relative", padding:"0 8px", marginBottom:20 }}>

          {/* connecting line */}
          <div style={{ position:"absolute", top:36, left:32, right:32, height:3,
            background:`linear-gradient(90deg,${D.border},${D.border2},${D.border})`,
            borderRadius:2, zIndex:0 }}/>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative", zIndex:1 }}>
            {ROOMS.map((room, i) => {
              const isCleared  = cleared.has(room.id);
              const isAccess   = accessible(room);
              const isPlayer   = room.id === playerRoomId && !isCleared;
              const isStairs   = room.type === "stairs";
              const isMandatory= room.mandatory;

              const nodeBg   = isCleared ? "#111"
                : isStairs ? (canDescend ? "#0a200a" : D.darker)
                : room.type==="chest" ? "#1a1400"
                : t(room.pokemon?.type||"Normal").bg;
              const nodeBdr  = isCleared ? D.border
                : isStairs ? (canDescend ? D.green : D.border)
                : isPlayer ? D.yellow
                : room.type==="chest" ? D.yellow
                : t(room.pokemon?.type||"Normal").bdr;
              const nodeSize = 66;

              return (
                <div key={room.id} style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  gap:6, flex:1, maxWidth:nodeSize+8 }}>

                  {/* player marker */}
                  <div style={{ height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {isPlayer && (
                      <div style={{ fontFamily:px, fontSize:8, color:D.yellow }} className="pulsing">▼</div>
                    )}
                  </div>

                  {/* node */}
                  <button onClick={() => tapRoom(room)}
                    disabled={isCleared || (!isAccess)}
                    style={{ width:nodeSize, height:nodeSize, borderRadius:14, border:`2px solid ${nodeBdr}`,
                      background:nodeBg, cursor:isCleared||!isAccess?"default":"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:isStairs?22:28, position:"relative", transition:"all .2s",
                      filter:isCleared?"grayscale(1)":!isAccess?"grayscale(.7)":"none",
                      opacity:isCleared?.5:!isAccess?.45:1,
                      boxShadow:isPlayer?`0 0 0 3px ${D.yellow}50`:"none",
                    }}
                    onMouseEnter={e=>{ if(!isCleared&&isAccess) e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.transform="none"; }}>

                    {isCleared ? (
                      <span style={{ fontFamily:px, fontSize:16, color:D.green }}>✓</span>
                    ) : isStairs ? (
                      <span style={{ fontSize:26, opacity:canDescend?1:.3 }}>⬇️</span>
                    ) : room.type==="chest" ? "📦"
                      : room.pokemon?.emoji || "?"}

                    {/* mandatory badge */}
                    {isMandatory && !isCleared && !isStairs && (
                      <div style={{ position:"absolute", top:-5, right:-5, width:14, height:14,
                        borderRadius:"50%", background:D.yellow, border:`2px solid ${D.darker}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:7, color:D.darker, fontWeight:900 }}>!</div>
                    )}
                  </button>

                  {/* label */}
                  <div style={{ textAlign:"center", width:"100%" }}>
                    {isStairs ? (
                      <div style={{ fontFamily:px, fontSize:7, color:canDescend?D.green:D.muted }}>
                        {canDescend?"GO DOWN":"LOCKED"}
                      </div>
                    ) : room.type==="chest" ? (
                      <>
                        <div style={{ fontFamily:px, fontSize:7, color:D.yellow, marginBottom:3 }}>CHEST</div>
                        {!room.mandatory && <div style={{ fontFamily:px, fontSize:6, color:D.muted }}>optional</div>}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize:11, fontWeight:800,
                          color:isCleared?D.muted:D.white, marginBottom:3, lineHeight:1.3 }}>
                          {room.pokemon.name}
                        </div>
                        <TypeBadge type={room.pokemon.type}/>
                        <div style={{ fontFamily:px, fontSize:6, color:D.muted, marginTop:3 }}>
                          Lv{room.pokemon.level}
                          {!room.mandatory && " · opt"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* legend */}
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:20 }}>
          {[
            { col:D.yellow, label:"! = Required" },
            { col:D.muted,  label:"No badge = Optional" },
            { col:D.green,  label:"✓ = Cleared" },
          ].map(l => (
            <span key={l.label} style={{ fontSize:11, fontWeight:700, color:D.muted,
              display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:l.col }}/>{l.label}
            </span>
          ))}
        </div>

        {/* next floor hint — deliberately vague */}
        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:12,
          padding:"10px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:20 }}>🌑</span>
          <div>
            <div style={{ fontFamily:px, fontSize:8, color:D.muted, marginBottom:4 }}>FLOOR 9 AHEAD</div>
            <div style={{ fontSize:12, fontWeight:700, color:D.muted }}>Unknown — descend to reveal</div>
          </div>
        </div>

        {/* return to town */}
        <button style={{ width:"100%", padding:"12px", fontFamily:ff, fontSize:14,
          fontWeight:900, textTransform:"uppercase", background:"transparent",
          color:D.muted, border:`2px solid ${D.border}`, borderRadius:12, cursor:"pointer" }}>
          ← Return to Town
        </button>
      </div>

      {/* ══════════ OVERLAYS ══════════ */}

      {/* ── ENCOUNTER ── */}
      {overlay==="encounter" && activeRoom && (
        <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)",
          zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
          onClick={e=>e.target===e.currentTarget&&closeOverlay()}>
          <div className="slide-up" style={{ background:D.darker, borderTop:`3px solid ${D.yellow}`,
            borderRadius:"24px 24px 0 0", maxWidth:420, width:"100%", margin:"0 auto",
            padding:"0 14px 28px" }}>
            <div style={{ width:42, height:5, background:D.yellow, opacity:.6,
              borderRadius:3, margin:"12px auto 16px" }}/>

            {/* PRE-BATTLE */}
            {battlePhase==="pre" && (
              <div className="fade-up">
                {/* mini arena */}
                <div style={{
                  background:"linear-gradient(180deg,#1a3a6a 0%,#0d2040 46%,#1a2a0e 46%,#0d1a06 100%)",
                  border:`2px solid ${D.border}`, borderRadius:16, padding:"18px 16px",
                  position:"relative", minHeight:160, marginBottom:14, overflow:"hidden",
                }}>
                  <div style={{ position:"absolute", top:14, right:20,
                    fontSize:52, filter:"drop-shadow(0 4px 12px rgba(0,0,0,.7))" }}>
                    {activeRoom.pokemon.emoji}
                  </div>
                  {/* enemy name box */}
                  <div style={{ position:"absolute", top:10, left:10, background:D.card,
                    border:`2px solid ${D.border}`, borderRadius:10, padding:"7px 11px", minWidth:148 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontFamily:px, fontSize:8 }}>{activeRoom.pokemon.name.toUpperCase()}</span>
                      <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>Lv{activeRoom.pokemon.level}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontFamily:px, fontSize:6, color:D.white }}>HP</span>
                      <div style={{ flex:1, height:6, background:"#111", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:"100%", height:"100%", background:D.red }}/>
                      </div>
                    </div>
                  </div>
                  {/* player sprite */}
                  <div style={{ position:"absolute", bottom:14, left:20, fontSize:44,
                    filter:"drop-shadow(0 4px 10px rgba(0,0,0,.6))" }}>⚡</div>
                  {/* shadows */}
                  <div style={{ position:"absolute", top:"38%", left:"16%", width:"26%",
                    height:8, background:"rgba(0,0,0,.3)", borderRadius:"50%", filter:"blur(3px)" }}/>
                  <div style={{ position:"absolute", top:"73%", right:"8%", width:"30%",
                    height:9, background:"rgba(0,0,0,.35)", borderRadius:"50%", filter:"blur(4px)" }}/>
                </div>

                {/* info strip */}
                <div style={{ background:D.card2, border:`1px solid ${D.border}`, borderRadius:12,
                  padding:"10px 14px", marginBottom:14, display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ fontSize:26 }}>{activeRoom.pokemon.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:px, fontSize:10, marginBottom:5 }}>
                      Wild {activeRoom.pokemon.name} appeared!
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <TypeBadge type={activeRoom.pokemon.type}/>
                      <span style={{ fontFamily:px, fontSize:8, padding:"2px 6px", borderRadius:4,
                        background:activeRoom.pokemon.rarity==="Uncommon"?"#0a2010":"#1a1a1a",
                        color:activeRoom.pokemon.rarity==="Uncommon"?D.green:"#888" }}>
                        {activeRoom.pokemon.rarity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:3 }}>DROPS</div>
                    <div style={{ fontSize:18 }}>📦</div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
                  <button onClick={()=>setBattlePhase("fighting")} style={{
                    padding:"13px", fontFamily:ff, fontSize:15, fontWeight:900,
                    textTransform:"uppercase", background:D.yellow, color:D.darker,
                    border:"none", borderRadius:12, cursor:"pointer", boxShadow:`0 4px 0 #a07800`,
                  }} className="glowY">⚔️ Fight!</button>
                  <button onClick={closeOverlay} style={{ padding:"11px", fontFamily:ff,
                    fontSize:13, fontWeight:800, background:"transparent", color:D.muted,
                    border:`2px solid ${D.border}`, borderRadius:12, cursor:"pointer" }}>
                    🏃 Flee
                  </button>
                </div>
              </div>
            )}

            {/* FIGHTING */}
            {battlePhase==="fighting" && (
              <div className="fade-up">
                <div style={{ fontFamily:px, fontSize:9, color:D.muted, textAlign:"center", marginBottom:10 }}>
                  BATTLE IN PROGRESS
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                  {[
                    { label:activeRoom.pokemon.name, hp:enemyHp, col:enemyHp>50?D.red:enemyHp>20?D.yellow:"#600" },
                    { label:"Pikachu", hp:leadPk.hp, col:hpCol(leadPk.hp) },
                  ].map((p,i)=>(
                    <div key={i} style={{ background:D.card, border:`2px solid ${D.border}`,
                      borderRadius:12, padding:"10px 12px" }}>
                      <div style={{ fontFamily:px, fontSize:8, color:D.muted, marginBottom:5 }}>{p.label.toUpperCase()}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontFamily:px, fontSize:6, color:D.white }}>HP</span>
                        <div style={{ flex:1, height:7, background:"#111", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ width:`${p.hp}%`, height:"100%", background:p.col, transition:"width .4s" }}/>
                        </div>
                        <span style={{ fontFamily:px, fontSize:7, color:D.muted }}>{p.hp}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12, color:D.muted, textAlign:"center", marginBottom:10, fontWeight:700 }}>
                  Solve the move puzzle to attack at full power!
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button onClick={attack} style={{ padding:"12px", fontFamily:ff, fontSize:14,
                    fontWeight:900, textTransform:"uppercase", background:D.yellow, color:D.darker,
                    border:"none", borderRadius:12, cursor:"pointer", boxShadow:`0 4px 0 #a07800` }}>
                    ⚔️ Attack!
                  </button>
                  <button onClick={()=>{ if(potions>0){setPotions(p=>p-1);setPlayerHp(h=>Math.min(100,h+20));} }}
                    style={{ padding:"11px", fontFamily:ff, fontSize:13, fontWeight:800,
                      background:"#0a1a0a", color:D.green, border:`2px solid ${D.green}`,
                      borderRadius:12, cursor:"pointer", opacity:potions>0?1:.4 }}>
                    🧪 Potion ×{potions}
                  </button>
                </div>
              </div>
            )}

            {/* WON */}
            {battlePhase==="won" && (
              <div className="fade-up" style={{ textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
                <div style={{ fontFamily:px, fontSize:12, color:D.yellow, marginBottom:6 }}>VICTORY!</div>
                <div style={{ fontSize:13, color:D.muted, marginBottom:4, fontWeight:700 }}>
                  {activeRoom.pokemon.name} was defeated!
                </div>
                <div style={{ fontSize:12, color:D.green, marginBottom:16, fontWeight:700 }}>
                  +320 EXP &nbsp;·&nbsp; +14 Sp.Atk EVs &nbsp;·&nbsp; 1 item dropped
                </div>
                <button onClick={completeRoom} style={{ width:"100%", padding:"13px", fontFamily:ff,
                  fontSize:15, fontWeight:900, textTransform:"uppercase",
                  background:D.yellow, color:D.darker, border:"none", borderRadius:12,
                  cursor:"pointer", boxShadow:`0 4px 0 #a07800` }}>
                  Continue →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHEST ── */}
      {overlay==="chest" && (
        <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)",
          zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
          onClick={e=>e.target===e.currentTarget&&closeOverlay()}>
          <div className="slide-up" style={{ background:D.darker, borderTop:`3px solid ${D.yellow}`,
            borderRadius:"24px 24px 0 0", maxWidth:420, width:"100%", margin:"0 auto",
            padding:"0 14px 28px" }}>
            <div style={{ width:42, height:5, background:D.yellow, opacity:.6, borderRadius:3, margin:"12px auto 16px" }}/>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:52, marginBottom:8 }}>📦</div>
              <div style={{ fontFamily:px, fontSize:11, color:D.yellow, marginBottom:6 }}>TREASURE CHEST</div>
              <div style={{ fontSize:13, color:D.muted, fontWeight:700, lineHeight:1.6 }}>
                A sealed artefact! Take it to Professor Oak to unlock its stats.
              </div>
            </div>
            <div style={{ background:D.card2, border:`2px solid ${D.border}`, borderRadius:12,
              padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"#0a1030",
                border:"2px solid #1a2060", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:20 }}>⚡</div>
              <div>
                <div style={{ fontFamily:px, fontSize:9, marginBottom:4 }}>??? ITEM</div>
                <span style={{ fontFamily:px, fontSize:8, padding:"2px 7px", borderRadius:4,
                  background:"#0a1030", color:"#6890F0", border:"1px solid #1a2060" }}>RARE</span>
              </div>
            </div>
            <button onClick={()=>{ completeRoom(); }} style={{ width:"100%", padding:"13px",
              fontFamily:ff, fontSize:15, fontWeight:900, textTransform:"uppercase",
              background:D.yellow, color:D.darker, border:"none", borderRadius:12,
              cursor:"pointer", boxShadow:`0 4px 0 #a07800` }} className="glowY">
              ✋ Take Item
            </button>
          </div>
        </div>
      )}

      {/* ── STAIRS ── */}
      {overlay==="stairs" && (
        <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)",
          zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
          onClick={e=>e.target===e.currentTarget&&closeOverlay()}>
          <div className="slide-up" style={{ background:D.darker, borderTop:`3px solid ${D.green}`,
            borderRadius:"24px 24px 0 0", maxWidth:420, width:"100%", margin:"0 auto",
            padding:"0 14px 28px" }}>
            <div style={{ width:42, height:5, background:D.green, opacity:.6, borderRadius:3, margin:"12px auto 16px" }}/>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>⬇️</div>
              <div style={{ fontFamily:px, fontSize:11, color:D.green, marginBottom:8 }}>DESCEND?</div>
              <div style={{ fontSize:13, color:D.muted, fontWeight:700, lineHeight:1.7 }}>
                Floor 9 lies below. You won't know what awaits until you step through.
                Return to town first if you need to heal or restock.
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
              <button onClick={closeOverlay} style={{ padding:"13px", fontFamily:ff, fontSize:15,
                fontWeight:900, textTransform:"uppercase", background:D.green, color:D.darker,
                border:"none", borderRadius:12, cursor:"pointer", boxShadow:`0 4px 0 #1a6a1a` }}>
                ⬇️ Descend!
              </button>
              <button onClick={closeOverlay} style={{ padding:"11px", fontFamily:ff, fontSize:13,
                fontWeight:800, background:"transparent", color:D.muted,
                border:`2px solid ${D.border}`, borderRadius:12, cursor:"pointer" }}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOOT DROP ── */}
      {showLoot && (
        <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)",
          zIndex:300, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div className="slide-up" style={{ background:D.darker, borderTop:`3px solid ${D.yellow}`,
            borderRadius:"24px 24px 0 0", maxWidth:420, width:"100%", margin:"0 auto",
            padding:"0 14px 28px" }}>
            <div style={{ width:42, height:5, background:D.yellow, opacity:.6, borderRadius:3, margin:"12px auto 16px" }}/>
            <div style={{ textAlign:"center", marginBottom:14 }}>
              <div style={{ fontFamily:px, fontSize:10, color:D.yellow, marginBottom:6 }}>ITEM DROPPED!</div>
              <div style={{ fontSize:13, color:D.muted, fontWeight:700, marginBottom:14 }}>
                Added to your bag. Identify it with Professor Oak back in town.
              </div>
              <div style={{ background:D.card2, border:`2px solid ${D.border}`, borderRadius:14,
                padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"#0a1030",
                  border:"2px solid #1a2060", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:22 }}>⚡</div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontFamily:px, fontSize:10, marginBottom:4 }}>??? ITEM</div>
                  <span style={{ fontFamily:px, fontSize:8, padding:"2px 7px", borderRadius:4,
                    background:"#0a1a10", color:D.green, border:`1px solid #1a4020` }}>UNCOMMON</span>
                </div>
                <div style={{ marginLeft:"auto", fontFamily:px, fontSize:9, color:D.muted }}>→ BAG</div>
              </div>
            </div>
            <button onClick={()=>setShowLoot(false)} style={{ width:"100%", padding:"13px",
              fontFamily:ff, fontSize:15, fontWeight:900, textTransform:"uppercase",
              background:D.yellow, color:D.darker, border:"none", borderRadius:12,
              cursor:"pointer", boxShadow:`0 4px 0 #a07800` }}>
              Continue exploring →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

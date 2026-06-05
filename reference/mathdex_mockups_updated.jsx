import { useState, useRef, useEffect } from "react";

// ── inject fonts + keyframes once ─────────────────────────────────────────────
function useGlobalStyles() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@600;700;800;900&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes slideUp   { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
      @keyframes floatDmg  { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-52px) scale(1.5)} }
      @keyframes pkGlow    { 0%,100%{box-shadow:0 0 8px #FFCB0540} 50%{box-shadow:0 0 22px #FFCB0590} }
      @keyframes cflash    { 0%,100%{background:#22253a} 40%{background:#0d2a10} }
      @keyframes wflash    { 0%,100%{background:#22253a} 40%{background:#2a0d0d} }
      @keyframes blinkcur  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      @keyframes superEff  { 0%{opacity:0;transform:scale(.5) rotate(-10deg)} 60%{opacity:1;transform:scale(1.1) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
      @keyframes timerPulse{ 0%,100%{opacity:1} 50%{opacity:.4} }

      .fade-up   { animation: fadeUp  .3s ease both; }
      .slide-up  { animation: slideUp .35s cubic-bezier(.34,.7,.64,1) both; }
      .pk-glow   { animation: pkGlow  2s ease-in-out infinite; }
      .cflash    { animation: cflash  .5s ease; }
      .wflash    { animation: wflash  .5s ease; }
      .blinkcur  { display:inline-block; animation: blinkcur 1s step-end infinite; }
      .supereff-badge {
        font-family:'Press Start 2P',monospace; font-size:9px;
        color:#CC0000; background:#fff; border:2px solid #CC0000;
        border-radius:6px; padding:4px 9px; display:inline-block;
        animation:superEff .4s ease both; box-shadow:2px 2px 0 #CC0000;
      }
      .timer-pulse { animation: timerPulse .4s ease-in-out infinite; }

      ::-webkit-scrollbar { width:4px; }
      ::-webkit-scrollbar-thumb { background:#3a3d5c; border-radius:2px; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);
}

// ── design tokens ─────────────────────────────────────────────────────────────
const D = {
  navy:    "#0F1B2D",
  darker:  "#0a1220",
  card:    "#22253a",
  card2:   "#2a2d45",
  border:  "#3a3d5c",
  border2: "#4a4d6c",
  yellow:  "#FFCB05",
  red:     "#CC0000",
  green:   "#48c774",
  blue:    "#3B4CCA",
  muted:   "#8892b8",
  white:   "#f0f4ff",
};

// official Pokémon type colours — stored as hex so we can use them safely
const TYPES = {
  Electric: { bg:"#302400", fg:"#F8D030", bdr:"#604800" },
  Water:    { bg:"#0a1030", fg:"#6890F0", bdr:"#1a2060" },
  Fire:     { bg:"#301808", fg:"#F08030", bdr:"#603018" },
  Grass:    { bg:"#0a2008", fg:"#78C850", bdr:"#1a4018" },
  Normal:   { bg:"#2a2a20", fg:"#A8A878", bdr:"#4a4a40" },
  Rock:     { bg:"#281c00", fg:"#B8A038", bdr:"#483c00" },
  Psychic:  { bg:"#300818", fg:"#F85888", bdr:"#601830" },
  Ghost:    { bg:"#180818", fg:"#9070B8", bdr:"#301030" },
  Dragon:   { bg:"#14083c", fg:"#7038F8", bdr:"#241070" },
  Ice:      { bg:"#082828", fg:"#98D8D8", bdr:"#185858" },
};
const t = (type) => TYPES[type] || TYPES.Normal;

const STAT_COLS = {
  HP:"#F87171", Atk:"#FB923C", Def:"#6890F0",
  "Sp.Atk":"#C084FC", "Sp.Def":"#2DD4BF", Spd:"#F8D030",
};

const px = "'Press Start 2P', monospace";
const body = "'Nunito', sans-serif";

// ── shared small components ───────────────────────────────────────────────────
const TypeBadge = ({ type, large }) => (
  <span style={{
    display:"inline-block", fontFamily:body, fontWeight:800,
    fontSize:large?12:10, padding:large?"3px 12px":"2px 8px",
    borderRadius:99, textTransform:"uppercase", letterSpacing:.5,
    background:t(type).bg, color:t(type).fg, border:`1px solid ${t(type).bdr}`,
  }}>{type}</span>
);

const RarityBadge = ({ r }) => {
  const cfg = {
    Common:   { bg:"#1a1a1a", fg:"#888", bdr:"#333" },
    Uncommon: { bg:"#0a2010", fg:"#48c774", bdr:"#1a4020" },
    Rare:     { bg:"#0a1030", fg:"#6890F0", bdr:"#1a2060" },
    Epic:     { bg:"#1a0a30", fg:"#C084FC", bdr:"#2a1a50" },
    Legendary:{ bg:"#2a1800", fg:"#F8D030", bdr:"#4a3000" },
  }[r] || { bg:"#1a1a1a", fg:"#888", bdr:"#333" };
  return (
    <span style={{
      display:"inline-block", fontFamily:px, fontSize:8,
      padding:"2px 7px", borderRadius:6, textTransform:"uppercase",
      background:cfg.bg, color:cfg.fg, border:`1px solid ${cfg.bdr}`,
    }}>{r}</span>
  );
};

const HPBar = ({ pct }) => {
  const col = pct > 50 ? "#48c774" : pct > 20 ? "#F8D030" : "#CC0000";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, width:"100%" }}>
      <span style={{ fontFamily:px, fontSize:7, color:D.white, minWidth:14 }}>HP</span>
      <div style={{ flex:1, height:8, background:"#111", border:"1px solid #ffffff20", borderRadius:4, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:4, transition:"width .5s" }}/>
      </div>
      <span style={{ fontFamily:px, fontSize:8, color:D.muted, minWidth:28, textAlign:"right" }}>{pct}%</span>
    </div>
  );
};

const Card = ({ children, style={} }) => (
  <div style={{ background:D.card, border:`2px solid ${D.border}`, borderRadius:16, padding:"14px 16px", ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, disabled, variant="gold", style={} }) => {
  const variants = {
    gold: { bg:"#FFCB05", color:D.darker, shadow:"0 4px 0 #a07800" },
    red:  { bg:D.red,     color:"#fff",   shadow:"0 4px 0 #800000" },
    ghost:{ bg:"transparent", color:D.muted, shadow:"none", border:`2px solid ${D.border}` },
  };
  const v = variants[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%", padding:"12px 14px", fontFamily:body, fontSize:14,
      fontWeight:900, textTransform:"uppercase", letterSpacing:.5,
      background:v.bg, color:v.color, border:v.border||"2px solid rgba(0,0,0,.15)",
      borderRadius:12, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.4:1,
      boxShadow:v.shadow, transition:"all .1s", ...style,
    }}>{children}</button>
  );
};

// ── NAV ───────────────────────────────────────────────────────────────────────
const TABS = [
  {id:"town1",label:"Town Ⅰ"},{id:"town2",label:"Town Ⅱ"},
  {id:"battle",label:"Battle"},{id:"identify",label:"Identify"},{id:"equip",label:"Equip"},
];

// ── TOWN ─────────────────────────────────────────────────────────────────────
function TownScreen({ phase }) {
  const locs = [
    { icon:"🏥", label:"Pokémon Center", sub:"Heal party · Free",           col:D.red,             locked:false },
    { icon:"🛒", label:"Pokémart",        sub:"Potions & Balls",              col:t("Water").fg,     locked:false },
    { icon:"🔬", label:"Oak's Lab",       sub:phase===1?"Reach Lv 20 to unlock":"2 items to ID", col:D.yellow, locked:phase===1 },
    { icon:"💻", label:"PC Terminal",     sub:"Party & PC Box",              col:D.green,           locked:false },
    { icon:"⬇️", label:"Dungeon Entrance",sub:"Unlocked: Floor 8",          col:t("Ghost").fg,     locked:false },
  ];
  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"0 0 80px", fontFamily:body }}>
      {/* header */}
      <div style={{ padding:"16px 14px 12px", background:`linear-gradient(180deg,#1a2a5a,${D.navy})`, borderBottom:`2px solid ${D.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:px, fontSize:8, color:D.yellow, letterSpacing:2, marginBottom:6 }}>TOWN HUB</div>
            <div style={{ fontSize:26, fontWeight:900, color:D.white }}>Oak Island</div>
          </div>
          <div style={{ background:D.card, border:`2px solid ${D.yellow}`, borderRadius:12,
            padding:"8px 14px", textAlign:"right", boxShadow:`3px 3px 0 ${D.yellow}40` }}>
            <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:4 }}>POKÉDOLLARS</div>
            <div style={{ fontFamily:px, fontSize:16, color:D.yellow }}>₽1,840</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"0 12px" }}>
        {/* party strip */}
        <Card style={{ margin:"12px 0 10px", display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ fontFamily:px, fontSize:7, color:D.muted, minWidth:40 }}>PARTY</div>
          {[
            {e:"⚡",n:"Pikachu",hp:78,lv:24,type:"Electric"},
            {e:"🔥",n:"Charizard",hp:55,lv:31,type:"Fire"},
          ].map((p,i)=>(
            <div key={i} style={{ flex:1, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                background:t(p.type).bg, border:`2px solid ${t(p.type).bdr}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{p.e}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:800 }}>{p.n}</span>
                  <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>Lv{p.lv}</span>
                </div>
                <HPBar pct={p.hp}/>
              </div>
            </div>
          ))}
        </Card>

        {/* phase notice */}
        {phase===1 ? (
          <div style={{ background:"#0a1a0a", border:`2px solid ${D.green}`, borderRadius:12,
            padding:"10px 14px", marginBottom:12, fontSize:13, color:D.green, lineHeight:1.6, fontWeight:700 }}>
            ⚡ <strong>Pikachu is level 24.</strong> Level any Pokémon to <strong>Lv 20</strong> to unlock the item system and open Oak's lab.
          </div>
        ) : (
          <div style={{ background:"#1a1400", border:`2px solid ${D.yellow}`, borderRadius:12,
            padding:"10px 14px", marginBottom:12, fontSize:13, color:D.yellow, lineHeight:1.6, fontWeight:700 }}>
            ✨ <strong>Item system active!</strong> <span style={{ color:D.muted, fontWeight:600 }}>Wild Pokémon now carry items. 2 awaiting identification.</span>
          </div>
        )}

        {/* locations */}
        <div style={{ fontFamily:px, fontSize:8, color:D.muted, letterSpacing:2, padding:"12px 0 8px" }}>LOCATIONS</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          {locs.slice(0,4).map((l,i)=>(
            <div key={i} onClick={()=>{}} style={{
              background:D.card, border:`2px solid ${l.locked?D.border:D.border}`,
              borderRadius:16, padding:"14px 10px", cursor:l.locked?"not-allowed":"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              opacity:l.locked?.4:1, filter:l.locked?"grayscale(.8)":"none",
              transition:"all .15s", position:"relative",
            }}
            onMouseEnter={e=>{ if(!l.locked) e.currentTarget.style.borderColor=D.yellow; e.currentTarget.style.transform=l.locked?"none":"translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=D.border; e.currentTarget.style.transform="none"; }}>
              {l.locked && <span style={{ position:"absolute", top:8, right:10, fontSize:14 }}>🔒</span>}
              <span style={{ fontSize:28 }}>{l.icon}</span>
              <span style={{ fontSize:12, fontWeight:800, textAlign:"center" }}>{l.label}</span>
              <span style={{ fontSize:11, fontWeight:700, color:l.locked?D.muted:l.col, textAlign:"center", lineHeight:1.3 }}>{l.sub}</span>
            </div>
          ))}
        </div>
        {/* dungeon entrance — full width */}
        <div style={{ background:D.card, border:`2px solid ${D.border}`, borderRadius:16, padding:"14px",
          display:"flex", alignItems:"center", gap:14, cursor:"pointer", marginBottom:14 }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=D.yellow}
          onMouseLeave={e=>e.currentTarget.style.borderColor=D.border}>
          <span style={{ fontSize:28 }}>{locs[4].icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:800 }}>{locs[4].label}</div>
            <div style={{ fontSize:11, fontWeight:700, color:locs[4].col }}>{locs[4].sub}</div>
          </div>
          <div style={{ marginLeft:"auto", background:t("Ghost").bg, border:`1px solid ${t("Ghost").bdr}`,
            borderRadius:8, padding:"4px 10px", fontFamily:px, fontSize:9, color:t("Ghost").fg }}>
            FL.10 BOSS →
          </div>
        </div>

        {/* trainer card */}
        <div style={{ fontFamily:px, fontSize:8, color:D.muted, letterSpacing:2, padding:"0 0 8px" }}>TRAINER CARD</div>
        <Card style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[{l:"Correct",v:"247",c:D.green},{l:"Streak",v:"12×",c:D.yellow},{l:"Best Floor",v:"8",c:t("Ghost").fg}].map((s,i)=>(
            <div key={i} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:px, fontSize:14, color:s.c, lineHeight:1.6 }}>{s.v}</div>
              <div style={{ fontSize:11, color:D.muted, marginTop:4 }}>{s.l}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── BATTLE ────────────────────────────────────────────────────────────────────
function BattleScreen() {
  const [panel, setPanel] = useState("action");
  const [selMove, setSelMove] = useState(null);
  const [ans, setAns] = useState("");
  const [res, setRes] = useState(null);
  const [enemyHp, setEnemyHp] = useState(74);
  const [playerHp, setPlayerHp] = useState(82);
  const [pips, setPips] = useState(2);
  const [floats, setFloats] = useState([]);
  const [timer, setTimer] = useState(6);
  const [potions, setPotions] = useState({ p:4, sp:1 });
  const [potMsg, setPotMsg] = useState(null);
  const tiRef = useRef(null);
  const inpRef = useRef(null);

  const moves = [
    { name:"Thunderbolt", type:"Electric", power:90, pp:10, ppMax:15, eq:"90 × 2 = ?",     ans:180, superEff:true  },
    { name:"Quick Attack",type:"Normal",   power:40, pp:27, ppMax:30, eq:"40 + 0 = ?",      ans:40,  superEff:false },
    { name:"Iron Tail",   type:"Normal",   power:100,pp:7,  ppMax:15, eq:"100 ÷ 2 = ?",     ans:50,  superEff:false },
    { name:"Electro Ball",type:"Electric", power:80, pp:5,  ppMax:10, eq:"(80+8) × 2 = ?",  ans:176, superEff:true  },
  ];

  function pickMove(m) {
    setSelMove(m); setPanel("math"); setAns(""); setRes(null); setTimer(6);
    clearInterval(tiRef.current);
    tiRef.current = setInterval(() => setTimer(t => { if(t<=1){clearInterval(tiRef.current);return 0;} return t-1; }), 1000);
    setTimeout(() => inpRef.current?.focus(), 80);
  }

  function submitAns() {
    clearInterval(tiRef.current);
    const v = parseInt(ans); if(isNaN(v)) return;
    const ok = v === selMove.ans;
    setRes(ok ? "ok" : "no");
    const dmg = ok ? Math.round(selMove.ans * .12) : Math.round(selMove.ans * .09);
    setEnemyHp(h => Math.max(0, h - dmg));
    if(ok) setPips(p => Math.min(5, p+1)); else setPips(0);
    const id = Date.now();
    setFloats(f => [...f, {id, dmg, ok}]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1000);
    setTimeout(() => {
      setPlayerHp(h => Math.max(0, h - Math.round(6 + Math.random()*10)));
      setPanel("action"); setRes(null); setAns("");
    }, 1200);
  }

  function usePotion(key) {
    const heal = key==="p" ? 20 : 60;
    setPotions(p => ({ ...p, [key]: p[key]-1 }));
    setPlayerHp(h => Math.min(100, h+heal));
    setPotMsg(`Pikachu restored +${heal} HP!`);
    setTimeout(() => { setPotMsg(null); setPanel("action"); }, 1000);
  }

  const mathBg = res==="ok" ? "#0d2a10" : res==="no" ? "#2a0d0d" : D.card;

  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"0 0 80px", fontFamily:body }}>
      {/* floor bar */}
      <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${D.border}` }}>
        <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>FLOOR 8</span>
        <div style={{ flex:1, height:4, background:"#111", border:`1px solid ${D.border}`, borderRadius:2, overflow:"hidden" }}>
          <div style={{ width:"60%", height:"100%", background:D.yellow }}/>
        </div>
        <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>3/5</span>
      </div>

      <div style={{ padding:"0 12px" }}>
        {/* ── ARENA ── */}
        <div style={{
          background:"linear-gradient(180deg,#1a3a6a 0%,#0d2040 46%,#1a2a0e 46%,#0d1a06 100%)",
          border:`2px solid ${D.border}`, borderRadius:16, padding:"14px 16px 10px",
          position:"relative", overflow:"hidden", margin:"12px 0 10px", minHeight:200,
        }}>
          {/* enemy box — top left */}
          <div style={{ position:"absolute", top:10, left:12, background:D.card,
            border:`2px solid ${D.border}`, borderRadius:"12px 12px 4px 12px", padding:"8px 12px", minWidth:158, zIndex:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontFamily:px, fontSize:9 }}>GYARADOS</span>
              <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>Lv22</span>
            </div>
            <HPBar pct={enemyHp}/>
          </div>
          {/* enemy sprite — top right */}
          <div style={{ position:"absolute", top:8, right:14, fontSize:52, filter:"drop-shadow(0 4px 10px rgba(0,0,0,.6))", zIndex:1 }}>🐉</div>
          {/* player sprite — bottom left */}
          <div style={{ position:"absolute", bottom:16, left:18, fontSize:46, filter:"drop-shadow(0 4px 10px rgba(0,0,0,.6))", zIndex:1 }}>⚡</div>
          {/* player box — bottom right */}
          <div style={{ position:"absolute", bottom:10, right:12, background:D.card,
            border:`2px solid ${D.border}`, borderRadius:"12px 12px 12px 4px", padding:"8px 12px", minWidth:164, zIndex:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontFamily:px, fontSize:9 }}>PIKACHU</span>
              <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>Lv24</span>
            </div>
            <HPBar pct={playerHp}/>
            {/* exp bar */}
            <div style={{ height:4, background:"#111", borderRadius:2, marginTop:4, overflow:"hidden" }}>
              <div style={{ width:"62%", height:"100%", background:D.blue }}/>
            </div>
            {/* focus pips */}
            <div style={{ display:"flex", gap:4, marginTop:6, alignItems:"center" }}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{ width:10, height:10, borderRadius:"50%",
                  background:i<pips?D.yellow:"#111",
                  border:`2px solid ${i<pips?"#a07800":D.border}`,
                  boxShadow:i<pips?`0 0 6px ${D.yellow}80`:"none",
                  transition:"all .2s" }}/>
              ))}
              <span style={{ fontFamily:px, fontSize:6, color:D.muted, marginLeft:4 }}>FOCUS</span>
            </div>
          </div>
          {/* ground shadows */}
          <div style={{ position:"absolute", top:"40%", left:"18%", width:"28%", height:8, background:"rgba(0,0,0,.25)", borderRadius:"50%", filter:"blur(3px)" }}/>
          <div style={{ position:"absolute", top:"74%", right:"10%", width:"34%", height:10, background:"rgba(0,0,0,.3)", borderRadius:"50%", filter:"blur(4px)" }}/>
          {/* damage floats */}
          {floats.map(f=>(
            <div key={f.id} style={{ position:"absolute", top:18, left:"40%", fontFamily:px, fontSize:13,
              fontWeight:700, pointerEvents:"none", color:f.ok?D.yellow:D.red,
              animation:"floatDmg .9s ease-out forwards", textShadow:"0 2px 6px #000", zIndex:10 }}>
              -{f.dmg}
            </div>
          ))}
        </div>

        {/* matchup bar */}
        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:10,
          padding:"8px 12px", marginBottom:10, display:"flex", gap:16, flexWrap:"wrap" }}>
          <span style={{ fontFamily:px, fontSize:8, color:D.yellow }}>⚡ ×2 vs WATER</span>
          <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>YOU GO FIRST</span>
        </div>

        {/* passive held item reminder */}
        <div style={{ background:t("Electric").bg, border:`1px solid ${t("Electric").bdr}`,
          borderRadius:10, padding:"8px 12px", marginBottom:10, display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:12, fontWeight:800, color:t("Electric").fg }}>
            Volt Shard <span style={{ color:D.muted, fontWeight:600 }}>— +8 Sp.Atk always active. No button needed.</span>
          </span>
        </div>

        {/* ── ACTION PANEL ── */}
        {panel==="action" && (
          <div className="fade-up">
            <div style={{ fontFamily:px, fontSize:9, color:D.muted, marginBottom:10 }}>What will PIKACHU do?</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              {[
                { label:"FIGHT",  icon:"⚔️", col:t("Fire").fg,    bg:t("Fire").bg,    bdr:t("Fire").bdr,    action:()=>setPanel("moves") },
                { label:"BALL",   icon:"🔴", col:t("Water").fg,   bg:t("Water").bg,   bdr:t("Water").bdr,   action:()=>setPanel("ball") },
                { label:`POTION ×${potions.p+potions.sp}`,icon:"🧪",col:D.green,bg:"#0a1a0a",bdr:"#1a4020",action:()=>setPanel("potion") },
                { label:"FLEE",   icon:"🏃", col:D.muted,         bg:D.card2,         bdr:D.border,         action:()=>{} },
              ].map((btn,i)=>(
                <button key={i} onClick={btn.action} style={{
                  background:btn.bg, border:`2px solid ${btn.bdr}`,
                  borderRadius:12, padding:"14px 10px", cursor:"pointer",
                  fontFamily:body, fontSize:14, fontWeight:900, color:btn.col,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                  transition:"all .15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <span style={{ fontSize:22 }}>{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── MOVE PANEL ── */}
        {panel==="moves" && (
          <div className="fade-up">
            <div style={{ fontFamily:px, fontSize:9, color:D.muted, marginBottom:8 }}>Choose a move</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
              {moves.map((m,i)=>(
                <button key={i} onClick={()=>pickMove(m)} style={{
                  background:t(m.type).bg, border:`2px solid ${t(m.type).bdr}`,
                  borderRadius:12, padding:"10px 12px", cursor:"pointer",
                  textAlign:"left", fontFamily:body, transition:"all .15s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.opacity=".8"; e.currentTarget.style.transform="translateY(-1px)";}}
                onMouseLeave={e=>{e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="none";}}>
                  <div style={{ fontSize:13, fontWeight:800, color:t(m.type).fg, marginBottom:5 }}>{m.name}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <TypeBadge type={m.type}/>
                    <span style={{ fontFamily:px, fontSize:7, color:D.muted }}>PP {m.pp}/{m.ppMax}</span>
                  </div>
                  <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>PWR {m.power}</span>
                </button>
              ))}
            </div>
            <Btn variant="ghost" onClick={()=>setPanel("action")}>← Back</Btn>
          </div>
        )}

        {/* ── MATH PUZZLE ── */}
        {panel==="math" && selMove && (
          <div className="fade-up" style={{
            background:mathBg, border:`3px solid ${D.yellow}`,
            borderRadius:16, padding:16,
            boxShadow:`4px 4px 0 ${D.yellow}40`,
            transition:"background .4s",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                  <TypeBadge type={selMove.type} large/>
                  <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>{selMove.name.toUpperCase()}</span>
                </div>
                <div style={{ fontFamily:px, fontSize:19, color:D.yellow, lineHeight:1.8 }}>{selMove.eq}</div>
                {selMove.superEff && <div className="supereff-badge" style={{ marginTop:8 }}>SUPER EFFECTIVE!</div>}
              </div>
              {/* timer */}
              <div style={{ textAlign:"center", minWidth:44, flexShrink:0 }}>
                <div style={{ fontFamily:px, fontSize:24, color:timer<=2?D.red:timer<=4?D.yellow:D.white, lineHeight:1.2,
                  ...(timer<=2 ? { animation:"timerPulse .4s ease-in-out infinite" } : {}), }}>
                  {timer}
                </div>
                <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginTop:2 }}>SEC</div>
                <div style={{ width:38, height:4, background:"#111", border:`1px solid ${D.border}`, borderRadius:2, margin:"5px auto 0", overflow:"hidden" }}>
                  <div style={{ width:`${(timer/6)*100}%`, height:"100%", background:D.yellow, transition:"width 1s linear" }}/>
                </div>
              </div>
            </div>
            <input ref={inpRef} type="number" value={ans} placeholder="?" inputMode="numeric"
              onChange={e=>setAns(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submitAns()}
              style={{
                width:"100%", fontFamily:px, fontSize:22, textAlign:"center",
                background:res==="ok"?"#0a1a0a":res==="no"?"#1a0a0a":D.darker,
                color:D.white, border:`2px solid ${res==="ok"?D.green:res==="no"?D.red:D.border2}`,
                borderRadius:10, padding:12, outline:"none", transition:"all .2s",
              }}/>
            {res ? (
              <div style={{ textAlign:"center", fontFamily:px, fontSize:10, marginTop:10,
                color:res==="ok"?D.green:D.red }}>
                {res==="ok"?"CORRECT! Full power!":"WRONG! 75% power..."}
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, marginTop:10 }}>
                <Btn onClick={submitAns}>ATTACK!</Btn>
                <Btn variant="ghost" onClick={()=>{clearInterval(tiRef.current);setPanel("moves");}}>←</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── POTION PANEL ── */}
        {panel==="potion" && (
          <div className="fade-up">
            <div style={{ fontFamily:px, fontSize:9, color:D.muted, marginBottom:8 }}>Use a Potion — costs your turn</div>
            {/* dialogue box */}
            <div style={{ background:D.white, color:D.navy, border:`3px solid ${D.navy}`, borderRadius:12,
              padding:"10px 14px", fontSize:13, lineHeight:1.7, marginBottom:12,
              boxShadow:`4px 4px 0 ${D.navy}` }}>
              Held items like <strong>Volt Shard</strong> are always active — no button needed!
              Only consumable potions appear here.
            </div>
            {[{key:"p",name:"Potion",heal:20,cnt:potions.p},{key:"sp",name:"Super Potion",heal:60,cnt:potions.sp}].map((p,i)=>(
              <button key={i} onClick={()=>p.cnt>0&&usePotion(p.key)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:12,
                background:D.card, border:`2px solid ${p.cnt>0?D.green:D.border}`,
                borderRadius:14, padding:"12px 14px", cursor:p.cnt>0?"pointer":"not-allowed",
                marginBottom:8, fontFamily:body, opacity:p.cnt>0?1:.4, transition:"all .15s",
              }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#0a1a0a",
                  border:`2px solid ${D.green}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🧪</div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{p.name}</div>
                  <div style={{ fontSize:12, color:D.green, fontWeight:700 }}>Restores +{p.heal} HP</div>
                </div>
                <div style={{ fontFamily:px, fontSize:11 }}>×{p.cnt}</div>
              </button>
            ))}
            {potMsg && <div style={{ fontFamily:px, fontSize:10, textAlign:"center", color:D.green, padding:8 }}>{potMsg}</div>}
            <Btn variant="ghost" onClick={()=>setPanel("action")}>← Back</Btn>
          </div>
        )}

        {/* ── BALL PANEL ── */}
        {panel==="ball" && (
          <div className="fade-up">
            <div style={{ fontFamily:px, fontSize:9, color:D.muted, marginBottom:8 }}>Throw a Poké Ball</div>
            {[{n:"Poké Ball",r:"40%",c:12},{n:"Great Ball",r:"60%",c:3},{n:"Ultra Ball",r:"80%",c:1}].map((b,i)=>(
              <button key={i} style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
                background:D.card, border:`2px solid ${D.border}`, borderRadius:14,
                padding:"12px 14px", cursor:"pointer", marginBottom:8, fontFamily:body, transition:"all .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=t("Water").fg}
                onMouseLeave={e=>e.currentTarget.style.borderColor=D.border}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:t("Water").bg,
                  border:`2px solid ${t("Water").bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🔴</div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{b.n}</div>
                  <div style={{ fontSize:12, color:t("Water").fg, fontWeight:700 }}>Base catch rate: {b.r}</div>
                </div>
                <div style={{ fontFamily:px, fontSize:11 }}>×{b.c}</div>
              </button>
            ))}
            <Btn variant="ghost" onClick={()=>setPanel("action")}>← Back</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── IDENTIFY ──────────────────────────────────────────────────────────────────
function IdentScreen() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["","",""]);
  const [results, setResults] = useState([null,null,null]);
  const [hints, setHints] = useState([false,false,false]);
  const [done, setDone] = useState(false);

  const puzzles = [
    { label:"Sp. Atk bonus", eq:"48 ÷ 6 = ?",      ans:8,  full:"+8",    part:"+5",
      hint:"Count up in 6s: 6, 12, 18, 24, 30, 36, 42, 48 — that's 8 steps.",
      ok:'"Excellent! 48 ÷ 6 = 8. Sp. Atk is fully unlocked!"',
      no:'"Close! Think of sharing 48 into 6 equal groups. Partial bonus applied."' },
    { label:"Speed bonus",   eq:"(14+6) ÷ 4 = ?",  ans:5,  full:"+5",    part:"+3",
      hint:"Brackets first: 14+6 = 20. Then divide 20 by 4.",
      ok:'"Superb! Brackets before dividing — order of operations. Speed fully unlocked!"',
      no:'"Solve brackets before dividing. Partial Speed bonus applied."' },
    { label:"Electric boost",eq:"3 × 7 − 6 = ?",   ans:15, full:"+15%",  part:"+9%",
      hint:"Multiply first: 3×7 = 21. Then subtract 6 from 21.",
      ok:'"Outstanding! Multiply before subtract. Electric boost fully unlocked!"',
      no:'"Multiplication before subtraction. Partial type boost applied."' },
  ];

  const statCols = [t("Ghost").fg, t("Water").fg, t("Electric").fg];
  const prof = results[step]===true ? puzzles[step].ok
    : results[step]===false ? puzzles[step].no
    : '"Ah, a relic from the depths! Solve these puzzles to unlock its true power."';

  function submit(i) {
    const v = parseInt(answers[i]); if(isNaN(v)) return;
    const ok = v === puzzles[i].ans;
    const nr = [...results]; nr[i] = ok; setResults(nr);
    if(i<2) setTimeout(()=>setStep(i+1), 900);
    else setTimeout(()=>setDone(true), 900);
  }
  function setA(i,val){ const a=[...answers]; a[i]=val; setAnswers(a); }

  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"0 0 80px", fontFamily:body }}>
      {/* header */}
      <div style={{ padding:"16px 14px 12px", background:`linear-gradient(180deg,#1a2a10,${D.navy})`, borderBottom:`2px solid ${D.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:"50%",
            background:"linear-gradient(135deg,#2a3a10,#3a5a18)",
            border:`3px solid ${D.yellow}`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:24, boxShadow:`0 0 0 2px ${D.darker}` }}>🧪</div>
          <div>
            <div style={{ fontFamily:px, fontSize:10, color:D.yellow, marginBottom:4 }}>PROF. OAK</div>
            <div style={{ fontSize:13, color:D.muted, fontWeight:700 }}>Item Identification Lab</div>
          </div>
          {/* progress pips */}
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ width:12, height:12, borderRadius:"50%", transition:"all .3s",
                background:results[i]===true?D.green:results[i]===false?D.yellow:i===step?t("Water").fg:"#111",
                border:`2px solid ${results[i]===true?"#2a5a2a":results[i]===false?D.yellow:i===step?t("Water").bdr:D.border}` }}/>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 14px" }}>
        {/* dialogue box */}
        <div style={{ background:D.white, color:D.navy, border:`3px solid ${D.navy}`, borderRadius:12,
          padding:"12px 16px", fontSize:13, lineHeight:1.7, marginBottom:18, position:"relative",
          boxShadow:`4px 4px 0 ${D.navy}` }}>
          {prof}
          <span className="blinkcur" style={{ marginLeft:4 }}>▼</span>
        </div>

        {/* item card */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:t("Electric").bg,
              border:`2px solid ${t("Electric").bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>⚡</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:900, marginBottom:5 }}>{done?"Volt Shard":"??? Item"}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <RarityBadge r="Rare"/>
                <TypeBadge type="Electric"/>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:4 }}>DROPPED BY</div>
              <div style={{ fontSize:12, fontWeight:800 }}>Magneton</div>
              <div style={{ fontFamily:px, fontSize:7, color:D.muted }}>Floor 24</div>
            </div>
          </div>
          {puzzles.map((p,i)=>{
            const rev = results[i]!==null;
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 0", borderTop:`1px solid ${D.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:D.muted, display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:statCols[i] }}/>
                  {p.label}
                </div>
                <div style={{ fontFamily:px, fontSize:11, color:rev?(results[i]?D.green:D.yellow):D.border }}>
                  {rev ? (results[i] ? p.full : p.part+" ◐") : "?  ?  ?"}
                </div>
              </div>
            );
          })}
        </Card>

        {/* puzzle */}
        {!done && (
          <div className="fade-up" style={{
            background:results[step]===true?"#0d2a10":results[step]===false?"#2a0d0d":D.card,
            border:`3px solid ${D.yellow}`, borderRadius:16, padding:16,
            boxShadow:`4px 4px 0 ${D.yellow}40`, transition:"background .4s",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:px, fontSize:8, color:D.muted, marginBottom:8 }}>PUZZLE {step+1} / 3</div>
                <div style={{ fontFamily:px, fontSize:18, color:D.yellow, lineHeight:1.8 }}>{puzzles[step].eq}</div>
              </div>
              {!hints[step] && results[step]===null && (
                <button onClick={()=>{const h=[...hints];h[step]=true;setHints(h);}} style={{
                  background:"#0a1a0a", border:`2px solid ${D.green}`, borderRadius:10,
                  padding:"7px 12px", color:D.green, fontSize:13, fontWeight:800, cursor:"pointer",
                  fontFamily:body, whiteSpace:"nowrap", flexShrink:0,
                }}>💡 Hint</button>
              )}
            </div>
            {hints[step] && (
              <div style={{ background:"#0a1a0a", border:`1px solid ${D.green}`, borderRadius:10,
                padding:"9px 12px", marginBottom:10, fontSize:13, color:D.green, lineHeight:1.6 }}>
                {puzzles[step].hint}
              </div>
            )}
            {results[step]===null ? (
              <>
                <input type="number" placeholder="?" inputMode="numeric"
                  value={answers[step]}
                  onChange={e=>setA(step,e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&submit(step)}
                  style={{ width:"100%", fontFamily:px, fontSize:22, textAlign:"center",
                    background:D.darker, color:D.white, border:`2px solid ${D.border2}`,
                    borderRadius:10, padding:12, outline:"none" }}/>
                <Btn style={{ marginTop:10 }} onClick={()=>submit(step)}>CONFIRM</Btn>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"10px 0" }}>
                <div style={{ fontFamily:px, fontSize:10, color:results[step]?D.green:D.yellow }}>
                  {results[step]?"✓ FULLY UNLOCKED!":"◐ PARTIAL UNLOCK"}
                </div>
                {step<2 && <div style={{ fontSize:12, color:D.muted, marginTop:6 }}>Loading next puzzle…</div>}
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="fade-up" style={{ background:D.card, border:`3px solid ${D.yellow}`, borderRadius:16,
            padding:20, textAlign:"center", boxShadow:`4px 4px 0 ${D.yellow}40` }}>
            <div style={{ fontSize:36, marginBottom:8 }}>✨</div>
            <div style={{ fontFamily:px, fontSize:11, color:D.yellow, marginBottom:8 }}>IDENTIFIED!</div>
            <div style={{ fontSize:13, color:D.muted, marginBottom:16 }}>{results.filter(Boolean).length} of 3 stats fully unlocked</div>
            <Btn>EQUIP VOLT SHARD →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EQUIP ─────────────────────────────────────────────────────────────────────
const BAG = [
  {id:1,name:"Volt Shard",   type:"Electric",rarity:"Rare",     emoji:"⚡",bonuses:{HP:0,Atk:0,Def:0,"Sp.Atk":8,"Sp.Def":0,Spd:5}, boost:"Electric +15%"},
  {id:2,name:"Iron Band",    type:"Normal",  rarity:"Uncommon",  emoji:"⛓", bonuses:{HP:0,Atk:12,Def:6,"Sp.Atk":0,"Sp.Def":0,Spd:0}, boost:null},
  {id:3,name:"Swift Feather",type:"Normal",  rarity:"Rare",      emoji:"🪶",bonuses:{HP:0,Atk:0,Def:0,"Sp.Atk":0,"Sp.Def":0,Spd:18},boost:null},
  {id:4,name:"Stone Cloak",  type:"Normal",  rarity:"Uncommon",  emoji:"🪨",bonuses:{HP:8,Atk:0,Def:14,"Sp.Atk":0,"Sp.Def":8,Spd:0}, boost:null},
  {id:5,name:"Ember Core",   type:"Fire",    rarity:"Rare",      emoji:"🔥",bonuses:{HP:0,Atk:0,Def:0,"Sp.Atk":10,"Sp.Def":0,Spd:0},boost:"Fire +12%"},
  {id:6,name:"Gale Stone",   type:"Normal",  rarity:"Common",    emoji:"💨",bonuses:{HP:0,Atk:4,Def:0,"Sp.Atk":0,"Sp.Def":0,Spd:6}, boost:null},
];
const BASE   = { HP:61, Atk:56, Def:34, "Sp.Atk":50, "Sp.Def":42, Spd:82 };
const SMAX   = { HP:120, Atk:130, Def:90, "Sp.Atk":130, "Sp.Def":90, Spd:140 };

function EquipScreen() {
  const [slots, setSlots]       = useState([1, null, null]);
  const [openSlot, setOpenSlot] = useState(null);
  const [preview, setPreview]   = useState(null);
  const [tab, setTab]           = useState("stats");

  const slotItem = i => slots[i] ? BAG.find(x=>x.id===slots[i]) : null;
  const eq0 = slotItem(0);
  const bonus = eq0 ? eq0.bonuses : {};
  const total = Object.keys(BASE).reduce((s,k)=>s+BASE[k]+(bonus[k]||0),0);
  const totalB = Object.values(bonus).reduce((s,v)=>s+v,0);

  const slotDefs = [
    { idx:0, label:"Slot 1", unlocked:true, lock:null },
    { idx:1, label:"Slot 2", unlocked:false, lock:"Unlocks at Lv 36 (evolves → Raichu)" },
    { idx:2, label:"Slot 3", unlocked:false, lock:"Unlocks at Lv 50" },
  ];

  const avail = BAG.filter(item => {
    const others = slots.filter((_,i)=>i!==openSlot);
    return !others.includes(item.id);
  });

  function confirmEquip() {
    if(openSlot===null || !preview) return setOpenSlot(null);
    const ns=[...slots]; ns[openSlot]=preview.id; setSlots(ns);
    setOpenSlot(null); setPreview(null);
  }

  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"0 0 80px", fontFamily:body, position:"relative" }}>
      {/* header */}
      <div style={{ padding:"16px 14px 12px", background:`linear-gradient(180deg,#1a0a3a,${D.navy})`, borderBottom:`2px solid ${D.border}` }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:px, fontSize:8, color:D.yellow, letterSpacing:2, marginBottom:6 }}>EQUIP ITEMS</div>
            <div style={{ fontSize:22, fontWeight:900 }}>Pikachu <span style={{ fontSize:13, fontWeight:600, color:D.muted }}>Lv 24</span></div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:4 }}>STAT TOTAL</div>
            <div style={{ fontFamily:px, fontSize:18, color:D.white }}>{total}</div>
            {totalB>0 && <div style={{ fontFamily:px, fontSize:8, color:D.green }}>+{totalB} ITEM</div>}
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 14px" }}>
        {/* tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:14 }}>
          {[["stats","Stats"],["slots","Slots"],["math","Math"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              padding:"7px 14px", fontFamily:body, fontSize:13, fontWeight:800,
              border:`2px solid ${tab===id?D.yellow:D.border}`, borderRadius:10, cursor:"pointer",
              background:tab===id?D.card2:"transparent", color:tab===id?D.yellow:D.muted,
              transition:"all .15s",
            }}>{lbl}</button>
          ))}
        </div>

        {/* ── STATS TAB ── */}
        {tab==="stats" && (
          <div className="fade-up">
            <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:10 }}>
              {eq0 ? `WITH ${eq0.name.toUpperCase()}` : "NO ITEM EQUIPPED"}
            </div>
            <Card>
              {Object.entries(BASE).map(([k,v])=>{
                const b = bonus[k]||0;
                const pct = Math.round(v/SMAX[k]*100);
                const bpct = Math.round(b/SMAX[k]*100);
                return (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"9px 0", borderBottom:`1px solid ${D.border}` }}>
                    <div style={{ fontSize:12, fontWeight:800, color:D.muted, minWidth:58,
                      display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:STAT_COLS[k] }}/>
                      {k}
                    </div>
                    <div style={{ flex:1, height:10, background:"#111", border:`1px solid ${D.border}`,
                      borderRadius:5, overflow:"hidden", position:"relative" }}>
                      <div style={{ position:"absolute", height:"100%", borderRadius:5,
                        background:STAT_COLS[k]+"60", width:`${pct}%` }}/>
                      {b>0 && <div style={{ position:"absolute", height:"100%", borderRadius:5,
                        background:D.green, left:`${pct}%`, width:`${bpct}%`, transition:"width .5s" }}/>}
                    </div>
                    <div style={{ fontFamily:px, fontSize:11, fontWeight:700, minWidth:30, textAlign:"right" }}>{v+b}</div>
                    {b>0 && <div style={{ fontFamily:px, fontSize:9, padding:"2px 6px", borderRadius:6,
                      background:"#0a2a0a", color:D.green, border:`1px solid ${D.green}`,
                      minWidth:28, textAlign:"center" }}>+{b}</div>}
                  </div>
                );
              })}
              {eq0?.boost && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderTop:`1px solid ${D.border}` }}>
                  <span style={{ fontSize:13, fontWeight:700, color:D.muted }}>Type boost</span>
                  <span style={{ fontFamily:px, fontSize:10, color:D.yellow }}>{eq0.boost}</span>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── SLOTS TAB ── */}
        {tab==="slots" && (
          <div className="fade-up">
            <div style={{ fontSize:12, color:D.muted, fontWeight:700, marginBottom:12, lineHeight:1.6 }}>
              Tap a slot to browse your bag and equip an item. Slots unlock as Pikachu levels up.
            </div>
            {slotDefs.map(s=>{
              const eq = s.unlocked ? slotItem(s.idx) : null;
              return (
                <div key={s.idx} onClick={()=>s.unlocked&&setOpenSlot(s.idx)}
                  style={{ background:D.card2, borderRadius:14, padding:"12px 14px",
                    marginBottom:10, display:"flex", alignItems:"center", gap:10,
                    border:`2px solid ${eq?D.border:"transparent"}`,
                    borderStyle:eq?"solid":"dashed", borderColor:eq?D.border:D.border,
                    cursor:s.unlocked?"pointer":"not-allowed",
                    opacity:s.unlocked?1:.4,
                    transition:"all .15s",
                  }}
                  onMouseEnter={e=>{ if(s.unlocked) { e.currentTarget.style.borderColor=D.yellow; e.currentTarget.style.borderStyle="solid"; } }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=eq?D.border:D.border; e.currentTarget.style.borderStyle=eq?"solid":"dashed"; }}>
                  <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                    background:eq?t(eq.type).bg:D.darker, border:`2px solid ${eq?t(eq.type).bdr:D.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                    {eq?eq.emoji:s.unlocked?"＋":"🔒"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:px, fontSize:9, color:D.muted, marginBottom:5 }}>{s.label}</div>
                    {eq ? (
                      <>
                        <div style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>{eq.name}</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                          <RarityBadge r={eq.rarity}/>
                          {Object.entries(eq.bonuses).filter(([,v])=>v>0).map(([k,v])=>(
                            <span key={k} style={{ fontFamily:px, fontSize:8, color:D.green }}>+{v} {k}</span>
                          ))}
                        </div>
                      </>
                    ) : s.unlocked ? (
                      <div style={{ fontSize:13, color:D.muted, fontWeight:700 }}>Empty — tap to equip</div>
                    ) : (
                      <div style={{ fontSize:12, color:D.muted, fontWeight:700, lineHeight:1.4 }}>{s.lock}</div>
                    )}
                  </div>
                  {s.unlocked && <div style={{ fontSize:20, color:D.yellow }}>›</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── MATH TAB ── */}
        {tab==="math" && (
          <div className="fade-up">
            <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:10 }}>HOW EACH STAT IS CALCULATED</div>
            <Card>
              {Object.entries(BASE).map(([k,v])=>{
                const b = bonus[k]||0;
                return (
                  <div key={k} style={{ padding:"9px 0", borderBottom:`1px solid ${D.border}`,
                    fontSize:13, fontWeight:700, lineHeight:1.9 }}>
                    <span style={{ color:STAT_COLS[k] }}>{k}: </span>
                    <span style={{ color:D.muted }}>{v} (base)</span>
                    {b>0 && <span style={{ color:D.green }}> + {b} (item)</span>}
                    <span style={{ color:D.muted }}> = </span>
                    <span style={{ fontFamily:px, fontSize:11 }}>{v+b}</span>
                    {b>0 && <span style={{ color:D.green, marginLeft:8 }}>✓</span>}
                  </div>
                );
              })}
            </Card>
          </div>
        )}
      </div>

      {/* ── ITEM BROWSER SHEET ── */}
      {openSlot!==null && (
        <div onClick={e=>e.target===e.currentTarget&&setOpenSlot(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:200,
            display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div className="slide-up" style={{ background:D.darker, borderTop:`3px solid ${D.yellow}`,
            borderRadius:"24px 24px 0 0", maxHeight:"78vh", display:"flex", flexDirection:"column",
            maxWidth:420, width:"100%", margin:"0 auto" }}>
            {/* handle */}
            <div style={{ width:42, height:5, background:D.yellow, opacity:.6, borderRadius:3, margin:"12px auto 0" }}/>
            {/* header */}
            <div style={{ padding:"12px 14px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:px, fontSize:10, color:D.yellow, marginBottom:4 }}>{slotDefs[openSlot].label} — Choose item</div>
                <div style={{ fontSize:12, color:D.muted, fontWeight:700 }}>
                  {slotItem(openSlot) ? `Currently: ${slotItem(openSlot).name}` : "Slot is empty"}
                </div>
              </div>
              <button onClick={()=>{setOpenSlot(null);setPreview(null);}} style={{
                background:D.card2, border:`2px solid ${D.border}`, borderRadius:99,
                width:32, height:32, cursor:"pointer", color:D.muted, fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>

            {/* live preview strip */}
            {preview && (
              <div style={{ margin:"0 14px 8px", background:D.card,
                border:`2px solid ${t(preview.type).bdr}`, borderRadius:12, padding:"10px 12px" }}>
                <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:8 }}>PREVIEW — STAT CHANGES</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {Object.entries(preview.bonuses).filter(([,v])=>v>0).map(([k,v])=>{
                    const prev = slotItem(openSlot)?.bonuses[k]||0;
                    const diff = v-prev;
                    return (
                      <div key={k} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:STAT_COLS[k] }}/>
                        <span style={{ fontSize:12, fontWeight:700, color:D.muted }}>{k}</span>
                        <span style={{ fontFamily:px, fontSize:10 }}>{BASE[k]+v}</span>
                        <span style={{ fontFamily:px, fontSize:8, color:diff>0?D.green:diff<0?D.red:D.muted }}>
                          {diff>0?`+${diff}`:diff<0?String(diff):"="}
                        </span>
                      </div>
                    );
                  })}
                  {preview.boost && <span style={{ fontFamily:px, fontSize:8, color:D.yellow }}>{preview.boost}</span>}
                </div>
              </div>
            )}

            {/* list */}
            <div style={{ overflowY:"auto", flex:1 }}>
              {avail.map(item=>{
                const isCurrent = item.id===slots[openSlot];
                const isPrev = preview?.id===item.id;
                return (
                  <div key={item.id} onClick={()=>setPreview(item)} style={{
                    display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                    cursor:"pointer", borderBottom:`1px solid ${D.border}`,
                    borderLeft:`3px solid ${isPrev?D.yellow:isCurrent?D.muted:"transparent"}`,
                    background:isPrev?D.card2:"transparent", transition:"all .1s",
                  }}>
                    <div style={{ width:42, height:42, borderRadius:12, flexShrink:0,
                      background:t(item.type).bg, border:`2px solid ${t(item.type).bdr}`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                      {item.emoji}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:14, fontWeight:800 }}>{item.name}</span>
                        <RarityBadge r={item.rarity}/>
                        {isCurrent && <span style={{ fontFamily:px, fontSize:7, color:D.muted }}>ON</span>}
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {Object.entries(item.bonuses).filter(([,v])=>v>0).map(([k,v])=>(
                          <span key={k} style={{ fontFamily:px, fontSize:8, color:D.green }}>+{v} {k}</span>
                        ))}
                        {item.boost && <span style={{ fontFamily:px, fontSize:8, color:D.yellow }}>{item.boost}</span>}
                      </div>
                    </div>
                    <TypeBadge type={item.type}/>
                  </div>
                );
              })}
            </div>

            {/* confirm */}
            <div style={{ padding:"10px 14px 0" }}>
              <Btn onClick={confirmEquip}
                disabled={!preview||preview.id===slots[openSlot]}
                style={{ opacity:preview&&preview.id!==slots[openSlot]?1:.4 }}>
                {preview&&preview.id!==slots[openSlot] ? `EQUIP ${preview.name.toUpperCase()}` : "SELECT AN ITEM"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  useGlobalStyles();
  const [screen, setScreen] = useState("battle");
  const [k, setK] = useState(0);
  function go(s) { setScreen(s); setK(x=>x+1); }

  return (
    <div style={{ background:D.darker, minHeight:"100vh", fontFamily:body }}>
      {/* nav */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:D.darker,
        borderBottom:`2px solid ${D.yellow}`, padding:"8px 10px 0",
        display:"flex", gap:3, overflowX:"auto", scrollbarWidth:"none" }}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>go(tb.id)} style={{
            padding:"7px 12px", fontFamily:body, fontSize:12, fontWeight:800,
            border:`2px solid ${screen===tb.id?D.yellow:"transparent"}`,
            borderBottom:"none", borderRadius:"8px 8px 0 0", cursor:"pointer",
            background:screen===tb.id?D.card:"transparent",
            color:screen===tb.id?D.yellow:D.muted, whiteSpace:"nowrap", transition:"all .15s",
          }}>{tb.label}</button>
        ))}
      </div>

      <div key={k}>
        {screen==="town1"    && <TownScreen phase={1}/>}
        {screen==="town2"    && <TownScreen phase={2}/>}
        {screen==="battle"   && <BattleScreen/>}
        {screen==="identify" && <IdentScreen/>}
        {screen==="equip"    && <EquipScreen/>}
      </div>
    </div>
  );
}

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
      @keyframes glowY   { 0%,100%{box-shadow:0 0 8px #FFCB0540} 50%{box-shadow:0 0 22px #FFCB0590} }
      .fade-up  { animation:fadeUp  .3s ease both }
      .fade-in  { animation:fadeIn  .2s ease both }
      .slide-up { animation:slideUp .35s cubic-bezier(.34,.7,.64,1) both }
      .glowY    { animation:glowY   2s  ease-in-out infinite }
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-thumb{background:#3a3d5c;border-radius:2px}
    `;
    document.head.appendChild(s);
    return () => { document.head.removeChild(link); document.head.removeChild(s); };
  }, []);
}

const D = {
  darker:"#0a1220", navy:"#0F1B2D", card:"#22253a", card2:"#2a2d45",
  border:"#3a3d5c", border2:"#4a4d6c",
  yellow:"#FFCB05", red:"#CC0000", green:"#48c774",
  blue:"#3B4CCA", muted:"#8892b8", white:"#f0f4ff",
};
const TYPES = {
  Electric:{bg:"#302400",fg:"#F8D030",bdr:"#604800"},
  Water:   {bg:"#0a1030",fg:"#6890F0",bdr:"#1a2060"},
  Fire:    {bg:"#301808",fg:"#F08030",bdr:"#603018"},
  Grass:   {bg:"#0a2008",fg:"#78C850",bdr:"#1a4018"},
  Normal:  {bg:"#2a2a20",fg:"#A8A878",bdr:"#4a4a40"},
  Rock:    {bg:"#281c00",fg:"#B8A038",bdr:"#483c00"},
  Psychic: {bg:"#300818",fg:"#F85888",bdr:"#601830"},
};
const t = tp => TYPES[tp] || TYPES.Normal;
const px = "'Press Start 2P',monospace";
const ff = "'Nunito',sans-serif";

const STAT_COLS = { HP:"#F87171",Atk:"#FB923C",Def:"#6890F0","Sp.Atk":"#C084FC","Sp.Def":"#2DD4BF",Spd:"#F8D030" };
const SMAX      = { HP:120,Atk:130,Def:90,"Sp.Atk":130,"Sp.Def":90,Spd:140 };

const TypeBadge = ({ type }) => (
  <span style={{ fontFamily:ff, fontWeight:800, fontSize:10, padding:"2px 8px",
    borderRadius:99, textTransform:"uppercase",
    background:t(type).bg, color:t(type).fg, border:`1px solid ${t(type).bdr}` }}>{type}</span>
);
const RarityBadge = ({ r }) => {
  const cfg = {
    Common:   {bg:"#1a1a1a",fg:"#888",bdr:"#333"},
    Uncommon: {bg:"#0a2010",fg:"#48c774",bdr:"#1a4020"},
    Rare:     {bg:"#0a1030",fg:"#6890F0",bdr:"#1a2060"},
    Epic:     {bg:"#1a0a30",fg:"#C084FC",bdr:"#2a1a50"},
  }[r] || {bg:"#1a1a1a",fg:"#888",bdr:"#333"};
  return <span style={{ fontFamily:px, fontSize:8, padding:"2px 7px", borderRadius:4,
    background:cfg.bg, color:cfg.fg, border:`1px solid ${cfg.bdr}`, textTransform:"uppercase" }}>{r}</span>;
};

// ── DATA ──────────────────────────────────────────────────────────────────────
const PARTY = [
  { id:"pika", name:"Pikachu",  emoji:"⚡", type:"Electric", level:24, hp:78,
    base:{ HP:61, Atk:56, Def:34, "Sp.Atk":50, "Sp.Def":42, Spd:82 },
    slots:1, slotUnlocks:[20,36,50] },
  { id:"char", name:"Charizard",emoji:"🔥", type:"Fire",     level:31, hp:91,
    base:{ HP:78, Atk:84, Def:78, "Sp.Atk":109, "Sp.Def":85, Spd:100 },
    slots:1, slotUnlocks:[20,36,50] },
  { id:"vap",  name:"Vaporeon", emoji:"💧", type:"Water",    level:22, hp:55,
    base:{ HP:130,Atk:65, Def:60, "Sp.Atk":110, "Sp.Def":95, Spd:65 },
    slots:1, slotUnlocks:[20,36,50] },
];

const BAG = [
  {id:1,name:"Volt Shard",   type:"Electric",rarity:"Rare",    emoji:"⚡",bonuses:{HP:0,Atk:0,Def:0,"Sp.Atk":8,"Sp.Def":0,Spd:5}, boost:"Electric +15%"},
  {id:2,name:"Iron Band",    type:"Normal",  rarity:"Uncommon",emoji:"⛓", bonuses:{HP:0,Atk:12,Def:6,"Sp.Atk":0,"Sp.Def":0,Spd:0}, boost:null},
  {id:3,name:"Swift Feather",type:"Normal",  rarity:"Rare",    emoji:"🪶",bonuses:{HP:0,Atk:0,Def:0,"Sp.Atk":0,"Sp.Def":0,Spd:18},boost:null},
  {id:4,name:"Stone Cloak",  type:"Normal",  rarity:"Uncommon",emoji:"🪨",bonuses:{HP:8,Atk:0,Def:14,"Sp.Atk":0,"Sp.Def":8,Spd:0}, boost:null},
  {id:5,name:"Ember Core",   type:"Fire",    rarity:"Rare",    emoji:"🔥",bonuses:{HP:0,Atk:0,Def:0,"Sp.Atk":10,"Sp.Def":0,Spd:0},boost:"Fire +12%"},
  {id:6,name:"Gale Stone",   type:"Normal",  rarity:"Common",  emoji:"💨",bonuses:{HP:0,Atk:4,Def:0,"Sp.Atk":0,"Sp.Def":0,Spd:6}, boost:null},
];

export default function App() {
  useStyles();

  // equipped[pokemonId][slotIndex] = item id or null
  const [equipped, setEquipped] = useState({
    pika: [1, null, null],
    char: [2, null, null],
    vap:  [null, null, null],
  });

  const [selectedPokemon, setSelectedPokemon] = useState(null); // pokemon object
  const [openSlotIdx, setOpenSlotIdx]         = useState(null); // which slot is being changed
  const [preview, setPreview]                 = useState(null); // item being hovered in browser

  // ── helpers ────────────────────────────────────────────────────────────────
  const pkEquipped = pk => equipped[pk.id] || [null,null,null];
  const itemById   = id => id ? BAG.find(x=>x.id===id) : null;
  const activeBonus = (pk) => {
    const item = itemById((pkEquipped(pk))[0]);
    return item ? item.bonuses : {};
  };
  const totalStats = (pk) => {
    const bonus = activeBonus(pk);
    return Object.keys(pk.base).reduce((s,k)=>s+pk.base[k]+(bonus[k]||0),0);
  };

  function openBrowser(slotIdx) {
    setOpenSlotIdx(slotIdx);
    setPreview(null);
  }
  function closeBrowser() {
    setOpenSlotIdx(null);
    setPreview(null);
  }
  function confirmEquip() {
    if(!preview || !selectedPokemon) return closeBrowser();
    const slots = [...pkEquipped(selectedPokemon)];
    slots[openSlotIdx] = preview.id;
    setEquipped(e => ({ ...e, [selectedPokemon.id]: slots }));
    closeBrowser();
  }
  function unequip(slotIdx) {
    if(!selectedPokemon) return;
    const slots = [...pkEquipped(selectedPokemon)];
    slots[slotIdx] = null;
    setEquipped(e => ({ ...e, [selectedPokemon.id]: slots }));
  }

  // items not used in other slots of this Pokémon
  const availableItems = selectedPokemon ? BAG.filter(item => {
    const slots = pkEquipped(selectedPokemon);
    const others = slots.filter((_,i)=>i!==openSlotIdx);
    return !others.includes(item.id);
  }) : [];

  const hpColor = hp => hp>50?D.green:hp>20?D.yellow:D.red;

  return (
    <div style={{ background:D.darker, minHeight:"100vh", fontFamily:ff, maxWidth:420, margin:"0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ background:`linear-gradient(180deg,#1a0a3a,${D.darker})`,
        borderBottom:`2px solid ${D.border}`, padding:"14px 14px 12px" }}>
        {selectedPokemon ? (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>{ setSelectedPokemon(null); closeBrowser(); }}
              style={{ background:"transparent", border:`2px solid ${D.border}`, borderRadius:10,
                padding:"6px 10px", fontFamily:px, fontSize:9, color:D.muted, cursor:"pointer" }}>
              ← BACK
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:"50%",
                background:t(selectedPokemon.type).bg, border:`2px solid ${t(selectedPokemon.type).bdr}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                {selectedPokemon.emoji}
              </div>
              <div>
                <div style={{ fontFamily:px, fontSize:11, color:D.white }}>
                  {selectedPokemon.name}
                </div>
                <div style={{ fontFamily:px, fontSize:8, color:D.muted, marginTop:3 }}>
                  Lv{selectedPokemon.level} · {totalStats(selectedPokemon)} total stats
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:px, fontSize:8, color:D.yellow, letterSpacing:2, marginBottom:6 }}>EQUIP ITEMS</div>
            <div style={{ fontSize:14, fontWeight:700, color:D.muted }}>
              Choose a Pokémon to manage its items
            </div>
          </>
        )}
      </div>

      <div style={{ padding:"12px 14px", paddingBottom:80 }}>

        {/* ════════════════════════════════════════
            SCREEN A — PARTY LIST
            ════════════════════════════════════════ */}
        {!selectedPokemon && (
          <div className="fade-up">
            {PARTY.map((pk, pi) => {
              const slots  = pkEquipped(pk);
              const bonus  = activeBonus(pk);
              const totalB = Object.values(bonus).reduce((s,v)=>s+v,0);
              return (
                <button key={pk.id} onClick={()=>setSelectedPokemon(pk)}
                  style={{ width:"100%", background:D.card, border:`2px solid ${D.border}`,
                    borderRadius:16, padding:"14px", marginBottom:10, cursor:"pointer",
                    textAlign:"left", display:"flex", alignItems:"flex-start", gap:12,
                    transition:"all .15s", fontFamily:ff }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=D.yellow; e.currentTarget.style.transform="translateY(-1px)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=D.border; e.currentTarget.style.transform="none"; }}>

                  {/* sprite */}
                  <div style={{ width:52, height:52, borderRadius:12, flexShrink:0,
                    background:t(pk.type).bg, border:`2px solid ${t(pk.type).bdr}`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                    {pk.emoji}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    {/* name + level */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontFamily:px, fontSize:11 }}>{pk.name}</span>
                        <span style={{ fontFamily:px, fontSize:8, color:D.muted }}>Lv{pk.level}</span>
                      </div>
                      {totalB>0 && (
                        <span style={{ fontFamily:px, fontSize:8, padding:"2px 7px", borderRadius:4,
                          background:"#0a2a0a", color:D.green, border:`1px solid ${D.green}` }}>
                          +{totalB} stats
                        </span>
                      )}
                    </div>

                    {/* hp bar */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                      <span style={{ fontFamily:px, fontSize:7, color:D.white }}>HP</span>
                      <div style={{ flex:1, height:6, background:"#111", border:`1px solid #ffffff15`, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${pk.hp}%`, height:"100%", background:hpColor(pk.hp), borderRadius:3 }}/>
                      </div>
                      <span style={{ fontFamily:px, fontSize:7, color:D.muted }}>{pk.hp}%</span>
                    </div>

                    {/* item slots summary */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {[0].map(si => {
                        const item = itemById(slots[si]);
                        return item ? (
                          <div key={si} style={{ display:"flex", alignItems:"center", gap:5,
                            background:t(item.type).bg, border:`1px solid ${t(item.type).bdr}`,
                            borderRadius:8, padding:"3px 8px" }}>
                            <span style={{ fontSize:13 }}>{item.emoji}</span>
                            <span style={{ fontSize:11, fontWeight:800, color:t(item.type).fg }}>
                              {item.name}
                            </span>
                          </div>
                        ) : (
                          <div key={si} style={{ display:"flex", alignItems:"center", gap:5,
                            background:D.card2, border:`1px dashed ${D.border}`,
                            borderRadius:8, padding:"3px 10px" }}>
                            <span style={{ fontSize:11, fontWeight:700, color:D.muted }}>
                              Slot {si+1}: empty
                            </span>
                          </div>
                        );
                      })}
                      <div style={{ fontFamily:px, fontSize:8, color:D.yellow, padding:"3px 0",
                        display:"flex", alignItems:"center" }}>›</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════
            SCREEN B — POKÉMON DETAIL
            ════════════════════════════════════════ */}
        {selectedPokemon && openSlotIdx===null && (
          <div className="fade-up">
            {/* ── STAT BARS ── */}
            <div style={{ background:D.card, border:`2px solid ${D.border}`, borderRadius:16,
              padding:"14px", marginBottom:14 }}>
              <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:10 }}>
                STATS {(() => { const item=itemById(pkEquipped(selectedPokemon)[0]); return item?`WITH ${item.name.toUpperCase()}`:"· NO ITEM"; })()}
              </div>
              {Object.entries(selectedPokemon.base).map(([k,v]) => {
                const b   = activeBonus(selectedPokemon)[k] || 0;
                const pct = Math.round(v/SMAX[k]*100);
                const bpct= Math.round(b/SMAX[k]*100);
                return (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"8px 0", borderBottom:`1px solid ${D.border}` }}>
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
                    <div style={{ fontFamily:px, fontSize:11, minWidth:30, textAlign:"right" }}>{v+b}</div>
                    {b>0 && <div style={{ fontFamily:px, fontSize:9, padding:"2px 6px", borderRadius:6,
                      background:"#0a2a0a", color:D.green, border:`1px solid ${D.green}`,
                      minWidth:28, textAlign:"center" }}>+{b}</div>}
                  </div>
                );
              })}
            </div>

            {/* ── ITEM SLOTS ── */}
            <div style={{ fontFamily:px, fontSize:8, color:D.muted, letterSpacing:1, marginBottom:10 }}>
              ITEM SLOTS
            </div>
            {[0,1,2].map(si => {
              const unlocked = selectedPokemon.level >= selectedPokemon.slotUnlocks[si];
              const item     = unlocked ? itemById(pkEquipped(selectedPokemon)[si]) : null;
              const lockLv   = selectedPokemon.slotUnlocks[si];

              return (
                <div key={si} style={{ background:D.card2,
                  border:`2px solid ${unlocked?D.border:"transparent"}`,
                  borderStyle:unlocked?"solid":"dashed",
                  borderColor:unlocked?D.border:D.border,
                  borderRadius:14, padding:"12px 14px", marginBottom:10,
                  opacity:unlocked?1:.45, cursor:unlocked?"pointer":"not-allowed",
                  display:"flex", alignItems:"center", gap:12, transition:"all .15s" }}
                  onMouseEnter={e=>{ if(unlocked) e.currentTarget.style.borderColor=D.yellow; }}
                  onMouseLeave={e=>{ if(unlocked) e.currentTarget.style.borderColor=D.border; }}
                  onClick={()=>unlocked&&openBrowser(si)}>

                  {/* slot icon */}
                  <div style={{ width:46, height:46, borderRadius:12, flexShrink:0,
                    background:item?t(item.type).bg:D.darker,
                    border:`2px solid ${item?t(item.type).bdr:D.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                    {item ? item.emoji : unlocked ? "＋" : "🔒"}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:px, fontSize:9, color:D.muted, marginBottom:5 }}>
                      Slot {si+1}
                    </div>
                    {item ? (
                      <>
                        <div style={{ fontSize:14, fontWeight:800, marginBottom:5 }}>{item.name}</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                          <RarityBadge r={item.rarity}/>
                          {Object.entries(item.bonuses).filter(([,v])=>v>0).map(([k,v])=>(
                            <span key={k} style={{ fontFamily:px, fontSize:8, color:D.green }}>+{v} {k}</span>
                          ))}
                          {item.boost && <span style={{ fontFamily:px, fontSize:8, color:D.yellow }}>{item.boost}</span>}
                        </div>
                      </>
                    ) : unlocked ? (
                      <div style={{ fontSize:13, fontWeight:700, color:D.muted }}>
                        Empty — tap to equip an item
                      </div>
                    ) : (
                      <div style={{ fontSize:12, fontWeight:700, color:D.muted, lineHeight:1.4 }}>
                        Unlocks at Lv {lockLv}
                        {si===1?" (evolves → Raichu)":""}
                      </div>
                    )}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    {unlocked && <div style={{ fontSize:18, color:D.yellow }}>›</div>}
                    {item && unlocked && (
                      <button onClick={e=>{ e.stopPropagation(); unequip(si); }}
                        style={{ fontFamily:px, fontSize:7, padding:"3px 7px", borderRadius:6,
                          background:"transparent", color:D.muted,
                          border:`1px solid ${D.border}`, cursor:"pointer" }}>
                        REMOVE
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          ITEM BROWSER SHEET
          ════════════════════════════════════════ */}
      {openSlotIdx !== null && selectedPokemon && (
        <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)",
          zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
          onClick={e=>e.target===e.currentTarget&&closeBrowser()}>
          <div className="slide-up" style={{ background:D.darker, borderTop:`3px solid ${D.yellow}`,
            borderRadius:"24px 24px 0 0", maxHeight:"78vh", display:"flex", flexDirection:"column",
            maxWidth:420, width:"100%", margin:"0 auto" }}>

            {/* handle */}
            <div style={{ width:42, height:5, background:D.yellow, opacity:.6,
              borderRadius:3, margin:"12px auto 0" }}/>

            {/* sheet header */}
            <div style={{ padding:"12px 14px 8px", display:"flex", alignItems:"center",
              justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:px, fontSize:10, color:D.yellow, marginBottom:4 }}>
                  {selectedPokemon.name} · Slot {openSlotIdx+1}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:D.muted }}>
                  {itemById(pkEquipped(selectedPokemon)[openSlotIdx])
                    ? `Currently: ${itemById(pkEquipped(selectedPokemon)[openSlotIdx]).name}`
                    : "Slot is empty — choose an item"}
                </div>
              </div>
              <button onClick={closeBrowser} style={{ background:D.card2, border:`2px solid ${D.border}`,
                borderRadius:99, width:32, height:32, cursor:"pointer", color:D.muted,
                fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>

            {/* live stat preview */}
            {preview && (
              <div style={{ margin:"0 14px 8px", background:D.card,
                border:`2px solid ${t(preview.type).bdr}`, borderRadius:12, padding:"10px 12px" }}>
                <div style={{ fontFamily:px, fontSize:7, color:D.muted, marginBottom:8 }}>
                  PREVIEW — STAT CHANGES vs CURRENT
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {Object.entries(preview.bonuses).filter(([,v])=>v>0).map(([k,v]) => {
                    const cur = itemById(pkEquipped(selectedPokemon)[openSlotIdx])?.bonuses[k] || 0;
                    const diff = v - cur;
                    return (
                      <div key={k} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:6,height:6,borderRadius:"50%",background:STAT_COLS[k] }}/>
                        <span style={{ fontSize:12,fontWeight:700,color:D.muted }}>{k}</span>
                        <span style={{ fontFamily:px,fontSize:10 }}>{selectedPokemon.base[k]+v}</span>
                        <span style={{ fontFamily:px,fontSize:8,
                          color:diff>0?D.green:diff<0?D.red:D.muted }}>
                          {diff>0?`+${diff}`:diff<0?String(diff):"="}
                        </span>
                      </div>
                    );
                  })}
                  {preview.boost && <span style={{ fontFamily:px,fontSize:8,color:D.yellow }}>{preview.boost}</span>}
                </div>
              </div>
            )}

            {/* item list */}
            <div style={{ overflowY:"auto", flex:1 }}>
              {availableItems.map(item => {
                const isCurrent = item.id === pkEquipped(selectedPokemon)[openSlotIdx];
                const isPrev    = preview?.id === item.id;
                return (
                  <div key={item.id} onClick={()=>setPreview(item)} style={{
                    display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                    cursor:"pointer", borderBottom:`1px solid ${D.border}`,
                    borderLeft:`3px solid ${isPrev?D.yellow:isCurrent?D.muted:"transparent"}`,
                    background:isPrev?D.card2:"transparent", transition:"all .1s",
                  }}>
                    <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                      background:t(item.type).bg, border:`2px solid ${t(item.type).bdr}`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                      {item.emoji}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:14, fontWeight:800 }}>{item.name}</span>
                        <RarityBadge r={item.rarity}/>
                        {isCurrent && <span style={{ fontFamily:px,fontSize:7,color:D.muted }}>EQUIPPED</span>}
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {Object.entries(item.bonuses).filter(([,v])=>v>0).map(([k,v])=>(
                          <span key={k} style={{ fontFamily:px,fontSize:8,color:D.green }}>+{v} {k}</span>
                        ))}
                        {item.boost && <span style={{ fontFamily:px,fontSize:8,color:D.yellow }}>{item.boost}</span>}
                      </div>
                    </div>
                    <TypeBadge type={item.type}/>
                  </div>
                );
              })}
            </div>

            {/* confirm */}
            <div style={{ padding:"10px 14px 24px" }}>
              <button onClick={confirmEquip}
                disabled={!preview || preview.id===pkEquipped(selectedPokemon)[openSlotIdx]}
                style={{ width:"100%", padding:"13px", fontFamily:ff, fontSize:15,
                  fontWeight:900, textTransform:"uppercase",
                  background: (!preview||preview.id===pkEquipped(selectedPokemon)[openSlotIdx])
                    ? D.border : D.yellow,
                  color: (!preview||preview.id===pkEquipped(selectedPokemon)[openSlotIdx])
                    ? D.muted : D.darker,
                  border:"none", borderRadius:12, cursor:"pointer",
                  boxShadow: (!preview||preview.id===pkEquipped(selectedPokemon)[openSlotIdx])
                    ? "none" : `0 4px 0 #a07800`,
                  transition:"all .15s" }} className="glowY">
                {preview && preview.id!==pkEquipped(selectedPokemon)[openSlotIdx]
                  ? `EQUIP ${preview.name.toUpperCase()}`
                  : "SELECT AN ITEM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

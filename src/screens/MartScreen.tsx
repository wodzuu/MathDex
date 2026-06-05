import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { D, FONT_PIXEL, FONT_UI } from '../styles/tokens';
import { useGameStore, useActiveTrainer } from '../store/gameStore';
import type { Pokeballs, Potions } from '../types/gameState';

interface BallMartItem {
  key:   keyof Pokeballs;
  name:  string;
  emoji: string;
  price: number;
  desc:  string;
}

interface PotionMartItem {
  key:   keyof Potions;
  name:  string;
  emoji: string;
  price: number;
  desc:  string;
}

const BALL_ITEMS: BallMartItem[] = [
  { key: 'pokeball',  name: 'Poké Ball',  emoji: '🔴', price: 200,  desc: '40% base catch rate' },
  { key: 'greatBall', name: 'Great Ball', emoji: '🔵', price: 600,  desc: '60% base catch rate' },
  { key: 'ultraBall', name: 'Ultra Ball', emoji: '⚫', price: 1200, desc: '80% base catch rate' },
];

const POTION_ITEMS: PotionMartItem[] = [
  { key: 'potion',      name: 'Potion',       emoji: '🧪', price: 300,  desc: 'Restores 20 HP'  },
  { key: 'superPotion', name: 'Super Potion', emoji: '💊', price: 700,  desc: 'Restores 60 HP'  },
  { key: 'hyperPotion', name: 'Hyper Potion', emoji: '💉', price: 1200, desc: 'Restores 120 HP' },
];

export default function MartScreen() {
  const navigate = useNavigate();

  const trainer = useActiveTrainer();
  const spendPokeDollars = useGameStore(s => s.spendPokeDollars);
  const adjustPokeballs  = useGameStore(s => s.adjustPokeballs);
  const adjustPotions    = useGameStore(s => s.adjustPotions);

  const [ballCart,   setBallCart]   = useState<Partial<Record<keyof Pokeballs, number>>>({});
  const [potionCart, setPotionCart] = useState<Partial<Record<keyof Potions,   number>>>({});
  const [purchased,  setPurchased]  = useState(false);

  const pokeDollars = trainer.pokeDollars;

  const ballTotal   = BALL_ITEMS.reduce((sum, it) => sum + (ballCart[it.key]   ?? 0) * it.price, 0);
  const potionTotal = POTION_ITEMS.reduce((sum, it) => sum + (potionCart[it.key] ?? 0) * it.price, 0);
  const cartTotal   = ballTotal + potionTotal;
  const cartCount   = BALL_ITEMS.reduce((s, it) => s + (ballCart[it.key] ?? 0), 0)
                    + POTION_ITEMS.reduce((s, it) => s + (potionCart[it.key] ?? 0), 0);
  const canAfford   = pokeDollars >= cartTotal && cartTotal > 0;

  function incrBall(key: keyof Pokeballs, price: number) {
    if (cartTotal + price > pokeDollars) return;
    setBallCart(c => ({ ...c, [key]: (c[key] ?? 0) + 1 }));
  }
  function decrBall(key: keyof Pokeballs) {
    const qty = ballCart[key] ?? 0;
    if (qty === 0) return;
    setBallCart(c => ({ ...c, [key]: qty - 1 }));
  }
  function incrPotion(key: keyof Potions, price: number) {
    if (cartTotal + price > pokeDollars) return;
    setPotionCart(c => ({ ...c, [key]: (c[key] ?? 0) + 1 }));
  }
  function decrPotion(key: keyof Potions) {
    const qty = potionCart[key] ?? 0;
    if (qty === 0) return;
    setPotionCart(c => ({ ...c, [key]: qty - 1 }));
  }

  function handlePurchase() {
    if (!canAfford) return;
    spendPokeDollars(cartTotal);
    for (const item of BALL_ITEMS) {
      const qty = ballCart[item.key] ?? 0;
      if (qty > 0) adjustPokeballs(item.key, qty);
    }
    for (const item of POTION_ITEMS) {
      const qty = potionCart[item.key] ?? 0;
      if (qty > 0) adjustPotions(item.key, qty);
    }
    setBallCart({});
    setPotionCart({});
    setPurchased(true);
    setTimeout(() => setPurchased(false), 1400);
  }

  function renderBallItem(item: BallMartItem) {
    const qty    = ballCart[item.key] ?? 0;
    const owned  = trainer.pokeballs[item.key];
    const canAdd = cartTotal + item.price <= pokeDollars;
    return (
      <div key={item.key} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>{item.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 800, color: D.white }}>{item.name}</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 12, color: D.muted, fontWeight: 600, marginTop: 2 }}>{item.desc}</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, marginTop: 4 }}>OWNED: {owned}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 10, color: D.yellow, marginBottom: 8 }}>₽{item.price}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => decrBall(item.key)}
              style={{ width: 30, height: 30, borderRadius: 7, background: qty > 0 ? '#1a0808' : '#111', border: `1px solid ${qty > 0 ? D.red : D.border}`, color: qty > 0 ? D.red : D.muted, fontFamily: FONT_PIXEL, fontSize: 16, cursor: qty > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>−</button>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: qty > 0 ? D.white : D.muted, minWidth: 18, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => incrBall(item.key, item.price)}
              style={{ width: 30, height: 30, borderRadius: 7, background: canAdd ? '#08180a' : '#111', border: `1px solid ${canAdd ? D.green : D.border}`, color: canAdd ? D.green : D.muted, fontFamily: FONT_PIXEL, fontSize: 16, cursor: canAdd ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>+</button>
          </div>
        </div>
      </div>
    );
  }

  function renderPotionItem(item: PotionMartItem) {
    const qty    = potionCart[item.key] ?? 0;
    const owned  = trainer.potions[item.key];
    const canAdd = cartTotal + item.price <= pokeDollars;
    return (
      <div key={item.key} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>{item.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 800, color: D.white }}>{item.name}</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 12, color: D.muted, fontWeight: 600, marginTop: 2 }}>{item.desc}</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, marginTop: 4 }}>OWNED: {owned}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 10, color: D.yellow, marginBottom: 8 }}>₽{item.price}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => decrPotion(item.key)}
              style={{ width: 30, height: 30, borderRadius: 7, background: qty > 0 ? '#1a0808' : '#111', border: `1px solid ${qty > 0 ? D.red : D.border}`, color: qty > 0 ? D.red : D.muted, fontFamily: FONT_PIXEL, fontSize: 16, cursor: qty > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>−</button>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: qty > 0 ? D.white : D.muted, minWidth: 18, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => incrPotion(item.key, item.price)}
              style={{ width: 30, height: 30, borderRadius: 7, background: canAdd ? '#08180a' : '#111', border: `1px solid ${canAdd ? D.green : D.border}`, color: canAdd ? D.green : D.muted, fontFamily: FONT_PIXEL, fontSize: 16, cursor: canAdd ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>+</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', fontFamily: FONT_UI, color: D.white, paddingBottom: 120 }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: D.darker, zIndex: 10 }}>
        <button onClick={() => navigate('/')}
          style={{ background: 'transparent', border: `2px solid ${D.border}`, color: D.muted, borderRadius: 10, padding: '8px 14px', fontFamily: FONT_UI, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, marginBottom: 2 }}>POKÉMART</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.yellow }}>Oak Island Shop</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>BALANCE</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.yellow }}>₽{pokeDollars.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>

        {/* Balls section */}
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted, marginBottom: 10, letterSpacing: 1 }}>POKÉ BALLS</div>
        {BALL_ITEMS.map(renderBallItem)}

        {/* Potions section */}
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted, marginBottom: 10, marginTop: 18, letterSpacing: 1 }}>POTIONS</div>
        {POTION_ITEMS.map(renderPotionItem)}
      </div>

      {/* Sticky cart footer */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, background: D.card, borderTop: `2px solid ${D.border}`, padding: '12px 14px' }}>
        {purchased && (
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.green, textAlign: 'center', marginBottom: 8 }}>
            Purchase complete! ✓
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>CART TOTAL</div>
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 14, color: cartTotal > pokeDollars ? D.red : D.yellow }}>
              ₽{cartTotal.toLocaleString()}
            </div>
          </div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>
            {cartTotal > pokeDollars ? '⚠ NOT ENOUGH ₽' : cartCount > 0 ? `${cartCount} item${cartCount > 1 ? 's' : ''} selected` : 'Select items above'}
          </div>
        </div>
        <button
          onClick={handlePurchase}
          disabled={!canAfford}
          style={{ width: '100%', padding: 14, fontFamily: FONT_UI, fontSize: 15, fontWeight: 900, background: canAfford ? D.yellow : '#2a2a2a', color: canAfford ? D.darker : D.muted, border: 'none', borderRadius: 12, cursor: canAfford ? 'pointer' : 'default', transition: 'all .15s', boxShadow: canAfford ? '0 4px 0 #a07800' : 'none' }}
        >
          {cartCount === 0 ? 'Add items to cart' : canAfford ? `BUY NOW — ₽${cartTotal.toLocaleString()}` : 'Not enough ₽'}
        </button>
      </div>
    </div>
  );
}

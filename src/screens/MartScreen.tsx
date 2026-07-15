/**
 * Poké Mart — tap-to-buy shop. Every row is one big "Buy" button: tap it,
 * the price is deducted and the OWNED count pops. No cart, no checkout —
 * one tap, one item, instant feedback (kid-first).
 */

import { useNavigate } from 'react-router-dom';
import { D, FONT_PIXEL, FONT_UI } from '../styles/tokens';
import { useGameStore, useActiveTrainer } from '../store/gameStore';
import { getBallSpriteUrl, getItemSpriteUrl } from '../lib/sprites';
import { asset } from '../lib/assets';
import ScreenBackdrop from '../components/ui/ScreenBackdrop';
import type { Pokeballs, Potions } from '../types/gameState';

const ITEM_SPRITE_STYLE = { width: 34, height: 34, imageRendering: 'pixelated' as const, objectFit: 'contain' as const, flexShrink: 0 };

// Dimmed Poké Mart backdrop, fixed to the column behind the shop UI.
const MART_BG = asset('pokemart.jpg');
const MART_SCRIM = 'linear-gradient(180deg, rgba(10,18,32,0.55) 0%, rgba(10,18,32,0.72) 50%, rgba(10,18,32,0.82) 100%)';

interface BallMartItem {
  key:   keyof Pokeballs;
  name:  string;
  price: number;
  desc:  string;
}

interface PotionMartItem {
  key:   keyof Potions;
  name:  string;
  price: number;
  desc:  string;
}

const BALL_ITEMS: BallMartItem[] = [
  { key: 'pokeball',  name: 'Poké Ball',  price: 200,  desc: '40% base catch rate' },
  { key: 'greatBall', name: 'Great Ball', price: 600,  desc: '60% base catch rate' },
  { key: 'ultraBall', name: 'Ultra Ball', price: 1200, desc: '80% base catch rate' },
];

const POTION_ITEMS: PotionMartItem[] = [
  { key: 'potion',      name: 'Potion',       price: 100, desc: 'Restores 20 HP'  },
  { key: 'superPotion', name: 'Super Potion', price: 250, desc: 'Restores 60 HP'  },
  { key: 'hyperPotion', name: 'Hyper Potion', price: 500, desc: 'Restores 120 HP' },
];

/** One shop row: sprite, name/desc, owned count (pops on buy), price button. */
function MartRow({ sprite, name, desc, owned, price, canAfford, onBuy }: {
  sprite: string; name: string; desc: string; owned: number; price: number;
  canAfford: boolean; onBuy: () => void;
}) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <img src={sprite} alt={name} style={ITEM_SPRITE_STYLE} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 800, color: D.white }}>{name}</div>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, color: D.muted, fontWeight: 600, marginTop: 2 }}>{desc}</div>
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, marginTop: 4 }}>
          OWNED: <span key={owned} className="count-pop" style={{ fontSize: 9, color: D.white }}>{owned}</span>
        </div>
      </div>
      <button
        onClick={onBuy}
        disabled={!canAfford}
        style={{
          flexShrink: 0, minWidth: 92, padding: '10px 12px', borderRadius: 11,
          background: canAfford ? '#08180a' : '#111', border: `2px solid ${canAfford ? D.green : D.border}`,
          color: canAfford ? D.green : D.muted, fontFamily: FONT_PIXEL, fontSize: 9,
          cursor: canAfford ? 'pointer' : 'not-allowed', lineHeight: 1.6,
        }}
      >
        BUY<br />₽{price.toLocaleString()}
      </button>
    </div>
  );
}

export default function MartScreen() {
  const navigate = useNavigate();

  const trainer = useActiveTrainer();
  const spendPokeDollars = useGameStore(s => s.spendPokeDollars);
  const adjustPokeballs  = useGameStore(s => s.adjustPokeballs);
  const adjustPotions    = useGameStore(s => s.adjustPotions);

  const pokeDollars = trainer.pokeDollars;

  function buyBall(item: BallMartItem) {
    if (pokeDollars < item.price) return;
    spendPokeDollars(item.price);
    adjustPokeballs(item.key, 1);
  }
  function buyPotion(item: PotionMartItem) {
    if (pokeDollars < item.price) return;
    spendPokeDollars(item.price);
    adjustPotions(item.key, 1);
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', fontFamily: FONT_UI, color: D.white, paddingBottom: 28, position: 'relative' }}>
      <ScreenBackdrop src={MART_BG} scrim={MART_SCRIM} />
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Header — same layout as the Trainer view; the live balance on the
          right doubles as purchase feedback. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(12px + env(safe-area-inset-top)) 12px 12px', background: 'rgba(10, 18, 32, 0.92)', borderBottom: `1px solid ${D.border}` }}>
        <button onClick={() => navigate('/')}
          style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '7px 12px', color: '#c7cfe8', fontFamily: FONT_UI, fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>← Town</button>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: FONT_PIXEL, fontSize: 12, color: D.yellow }}>Poké Mart</span>
        <span style={{ width: 78, flexShrink: 0, textAlign: 'right', fontFamily: FONT_PIXEL, fontSize: 10, color: D.yellow }}>
          <span key={pokeDollars} className="count-pop" style={{ color: D.yellow }}>₽{pokeDollars.toLocaleString()}</span>
        </span>
      </div>

      <div style={{ padding: '14px 14px 0' }}>

        {/* Balls section */}
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted, marginBottom: 10, letterSpacing: 1 }}>POKÉ BALLS</div>
        {BALL_ITEMS.map((item) => (
          <MartRow
            key={item.key}
            sprite={getBallSpriteUrl(item.key)}
            name={item.name}
            desc={item.desc}
            owned={trainer.pokeballs[item.key]}
            price={item.price}
            canAfford={pokeDollars >= item.price}
            onBuy={() => buyBall(item)}
          />
        ))}

        {/* Potions section */}
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted, marginBottom: 10, marginTop: 18, letterSpacing: 1 }}>POTIONS</div>
        {POTION_ITEMS.map((item) => (
          <MartRow
            key={item.key}
            sprite={getItemSpriteUrl(item.key)}
            name={item.name}
            desc={item.desc}
            owned={trainer.potions[item.key]}
            price={item.price}
            canAfford={pokeDollars >= item.price}
            onBuy={() => buyPotion(item)}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

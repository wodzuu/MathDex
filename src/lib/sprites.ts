import type { Pokeballs, Potions } from '../types/gameState';

function pad(dexNumber: number): string {
  return String(dexNumber).padStart(4, '0');
}

/** Walking sprite — used in the battle view. */
export function getSpriteUrl(dexNumber: number): string {
  return `/pokemon_sprites/${pad(dexNumber)}_walk.gif`;
}

/** Idle sprite — used everywhere outside of battle. */
export function getIdleSpriteUrl(dexNumber: number): string {
  return `/pokemon_sprites/${pad(dexNumber)}_idle.gif`;
}

// ── Item sprites (public/ball_sprites, public/item_sprites) ────────────────────

const BALL_FILE: Record<keyof Pokeballs, string> = {
  pokeball:  'poke',
  greatBall: 'great',
  ultraBall: 'ultra',
};

export function getBallSpriteUrl(key: keyof Pokeballs): string {
  return `/ball_sprites/${BALL_FILE[key]}.png`;
}

const POTION_FILE: Record<keyof Potions, string> = {
  potion:      'potion',
  superPotion: 'super_potion',
  hyperPotion: 'hyper_potion',
};

export function getItemSpriteUrl(key: keyof Potions): string {
  return `/item_sprites/${POTION_FILE[key]}.png`;
}

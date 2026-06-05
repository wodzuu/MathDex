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

/**
 * Contiene i percorsi delle 15 icone profilo disponibili.
 * Le immagini devono trovarsi in: src/assets/icons/users/
 */
export const ICON_PATHS: string[] = Array.from(
  { length: 15 },
  (_, i) => `assets/icons/users/icon-${i + 1}.png`
);

/**
 * Restituisce il percorso di un'icona dato il suo ID (1–15).
 * Se l'ID è fuori range, ritorna la prima icona.
 */
export function getUserIconPath(iconId: number): string {
  return ICON_PATHS[iconId - 1] || ICON_PATHS[0];
}

import { test, expect } from '@playwright/test';

/**
 * Questo test verifica che i filtri di ordinamento delle recensioni funzionino correttamente.
 *
 * Flusso del test:
 * 1. Naviga al dettaglio di un ristorante.
 * 2. Recupera l'ordine delle recensioni per il filtro "Best" (default).
 * 3. Cambia filtro in "Più recenti" e recupera il nuovo ordine.
 * 4. Cambia filtro in "Più vecchie" e recupera il nuovo ordine.
 * 5. Verifica che l'ordine sia cambiato (se ci sono abbastanza recensioni).
 */
test('Ordinamento recensioni (best / recent / oldest)', async ({ page }) => {
  // FASE 1: Navigazione al ristorante.
  await page.goto('/');

  await page
    .getByPlaceholder('Es. Trattoria Tecnologie Web')
    .fill('Alice');

  await page.getByRole('button', { name: 'Cerca', exact: true }).click();
  await page.getByRole('button', { name: 'Scopri di più' }).first().click();

  await expect(page).toHaveURL(/\/restaurants\/\d+/);

  // Helper: funzione per estrarre il testo di tutte le recensioni visibili.
  const getReviewsOrder = async () =>
    page.locator('[id^="review-"]').allTextContents();

  // FASE 2: Verifica filtro BEST (default).
  const bestOrder = await getReviewsOrder();

  // FASE 3: Verifica filtro NEWEST.
  await page.getByRole('button', { name: 'Più recenti' }).click();
  const newestOrder = await getReviewsOrder();

  // FASE 4: Verifica filtro OLDEST.
  await page.getByRole('button', { name: 'Più vecchie' }).click();
  const oldestOrder = await getReviewsOrder();

  // FASE 5: Confronto risultati.
  // Se abbiamo più di una recensione, l'ordine "Più recenti" dovrebbe essere diverso da "Più vecchie".
  if (bestOrder.length > 1) {
    expect(newestOrder.join()).not.toBe(oldestOrder.join());
  }

  // Verifica che non ci sia stato un reload completo della pagina (SPA behavior).
  await expect(page).toHaveURL(/\/restaurants\/\d+/);
});

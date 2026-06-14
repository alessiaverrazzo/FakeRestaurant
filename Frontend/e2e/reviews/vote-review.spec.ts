import { test, expect } from '../auth.setup';

/**
 * Questo test verifica la funzionalità di voto (upvote/downvote) sulle recensioni.
 *
 * Flusso del test:
 * 1. Naviga al dettaglio di un ristorante.
 * 2. Se non ci sono recensioni, ne crea una al volo.
 * 3. Esegue un Upvote e verifica lo stato attivo.
 * 4. Cambia il voto in Downvote e verifica il cambio di stato.
 * 5. Verifica che l'ordinamento "Best" non causi reload imprevisti.
 */
test('Upvote e downvote su una recensione', async ({ authPage }) => {
  const page = authPage;

  await page.waitForSelector('app-login', { state: 'detached' });

  // FASE 1: Apertura ristorante.
  await page.getByRole('textbox', { name: 'Es. Trattoria Tecnologie Web' }).fill('alice');
  await page.getByRole('button', { name: 'Cerca', exact: true }).click();
  await page.getByRole('button', { name: 'Scopri di più' }).first().click();

  // Assicuriamoci di essere nel tab "Best" per vedere i voti.
  await page.getByRole('button', { name: 'Best' }).click();

  // FASE 2: Setup dati (Creazione recensione se mancante).
  const reviews = page.locator('[id^="review-"]');

  if (await reviews.count() === 0) {
    const reviewText = `Recensione per voto ${Date.now()}`;

    await page
      .locator('textarea[placeholder="Scrivi una recensione onestissima ✍️"]')
      .fill(reviewText);

    await page.getByRole('button', { name: 'Invia' }).click();

    await expect(page.getByText(reviewText)).toBeVisible();
  }

  // Selezioniamo la prima recensione disponibile come target.
  const review = page.locator('[id^="review-"]').first();
  await expect(review).toBeVisible();

  const upvoteBtn = review.getByRole('button', { name: 'Upvote' });
  const downvoteBtn = review.getByRole('button', { name: 'Downvote' });

  // Verifica iniziale: i bottoni devono essere abilitati.
  await expect(upvoteBtn).not.toHaveClass(/cursor-not-allowed/);

  // FASE 3: Test Upvote.
  await upvoteBtn.click();

  // Verifica visiva: classe 'active-up' applicata, 'active-down' assente.
  await expect(upvoteBtn).toHaveClass(/active-up/);
  await expect(downvoteBtn).not.toHaveClass(/active-down/);

  // FASE 4: Cambio voto in Downvote.
  await downvoteBtn.click();

  // Verifica visiva: classe 'active-down' applicata, 'active-up' assente.
  await expect(downvoteBtn).toHaveClass(/active-down/);
  await expect(upvoteBtn).not.toHaveClass(/active-up/);

  // FASE 5: Verifica stabilità lista.
  // Cliccando su "Best" non dovrebbero sparire recensioni.
  const orderBefore = await page.locator('[id^="review-"]').allTextContents();

  await page.getByRole('button', { name: 'Best' }).click();

  const orderAfter = await page.locator('[id^="review-"]').allTextContents();

  // Stesso numero di recensioni: nessun reload imprevisto.
  expect(orderAfter.length).toBe(orderBefore.length);
});

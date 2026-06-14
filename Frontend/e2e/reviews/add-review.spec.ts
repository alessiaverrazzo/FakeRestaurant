import { test, expect } from '../auth.setup';

/**
 * Questo test verifica il flusso di aggiunta di una nuova recensione
 * per un ristorante da parte di un utente autenticato.
 *
 * Flusso del test:
 * 1. Cerca un ristorante tramite la barra di ricerca.
 * 2. Naviga alla pagina di dettaglio del ristorante.
 * 3. Compila il campo di testo della recensione.
 * 4. Invia la recensione.
 * 5. Verifica che la recensione appaia nella lista con il testo e l'autore corretti.
 */
test('Aggiunta di una recensione principale', async ({ authPage }) => {
  // Utilizziamo la pagina autenticata fornita dalla fixture.
  const page = authPage;

  // FASE 1: Ricerca e apertura ristorante.
  await page
    .getByPlaceholder('Es. Trattoria Tecnologie Web')
    .fill('E2E');

  // Attendiamo che eventuali modali di login siano sparite (sicurezza).
  await page.waitForSelector('app-login', { state: 'detached' });

  await page.getByRole('button', { name: 'Cerca', exact: true }).click();
  await page.getByRole('button', { name: 'Scopri di più' }).first().click();

  await expect(page).toHaveURL(/\/restaurants\/\d+/);

  // FASE 2: Scrittura e invio recensione.
  const reviewText = `Recensione E2E ${Date.now()}`;

  await page
    .locator('textarea[placeholder="Scrivi una recensione onestissima ✍️"]')
    .fill(reviewText);

  await page.getByRole('button', { name: 'Invia' }).click();

  // Attendiamo che la rete sia inattiva per assicurare che la richiesta POST sia completata.
  await page.waitForLoadState('networkidle');

  // FASE 3: Verifica contenuto.
  await expect(page.getByText(reviewText)).toBeVisible();

  // FASE 4: Verifica autore.
  // Risaliamo al contenitore della recensione per verificare che l'autore sia quello loggato.
  const review = page.getByText(reviewText).locator('..');

  await expect(
    review.getByText('e2e_user')
  ).toBeVisible();
});

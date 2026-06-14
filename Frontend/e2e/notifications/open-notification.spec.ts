import { test, expect } from '../auth.setup';

/**
 * Questo test verifica il flusso di interazione con le notifiche utente.
 * Utilizza la fixture 'authPage' per avere un utente già autenticato.
 *
 * Flusso del test:
 * 1. Naviga alla home page.
 * 2. Verifica la presenza di notifiche.
 * 3. Apre il dropdown delle notifiche.
 * 4. Clicca sulla prima notifica.
 * 5. Verifica il reindirizzamento alla pagina del ristorante.
 */
test('Apertura notifica e navigazione al contenuto', async ({ authPage }) => {
  // Utilizziamo la pagina autenticata fornita dalla fixture
  const page = authPage;

  await page.goto('/');

  // FASE 1: Identificazione elementi notifiche.
  // Cerchiamo i componenti delle singole notifiche nel DOM.
  const notificationItems = page.locator('app-notification-item');

  // FASE 2: Controllo preliminare.
  // Se non ci sono notifiche disponibili per l'utente di test,
  // saltiamo il test per evitare falsi positivi/negativi.
  if (await notificationItems.count() === 0) {
    test.info().annotations.push({
      type: 'skip',
      description: 'Nessuna notifica disponibile per l’utente',
    });
    return;
  }

  // FASE 3: Apertura dropdown.
  // Clicchiamo sull'icona della campanella (il trigger del dropdown).
  await page
    .locator('app-notification-dropdown button')
    .first()
    .click();

  // FASE 4: Interazione con la notifica.
  // Prendiamo la prima notifica e verifichiamo che sia visibile dopo l'apertura del dropdown.
  const firstNotification = notificationItems.first();
  await expect(firstNotification).toBeVisible();

  // Clicchiamo sulla notifica.
  await firstNotification.click();

  // FASE 5: Verifica navigazione.
  // Il click dovrebbe portare alla pagina del ristorante associato alla notifica.
  await expect(page).toHaveURL(/\/restaurants\/\d+/);

  // FASE 6: Verifica evidenziazione recensione (Opzionale).
  // Se la notifica è legata a una recensione, controlliamo se viene applicata la classe di highlight.
  const highlightedReview = page.locator('.highlight-review');

  if (await highlightedReview.count() > 0) {
    await expect(highlightedReview.first()).toBeVisible();
  }
});

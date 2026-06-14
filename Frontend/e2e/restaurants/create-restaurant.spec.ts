import { test, expect } from '../auth.setup';

/**
 * Questo test verifica la creazione di un nuovo ristorante da parte di un utente autenticato.
 * Utilizza la fixture 'authPage' per garantire che l'utente sia loggato.
 *
 * Flusso del test:
 * 1. Accede alla pagina di creazione ristorante (gestendo menu desktop/mobile).
 * 2. Compila il form con nome e descrizione.
 * 3. Interagisce con la mappa per impostare la posizione.
 * 4. Carica un'immagine per il ristorante.
 * 5. Invia il form e verifica il reindirizzamento alla pagina del nuovo ristorante.
 */
test('Creazione di un nuovo ristorante', async ({ authPage }) => {
  // Utilizziamo la pagina autenticata fornita dalla fixture.
  const page = authPage;

  // FASE 1: Navigazione alla pagina di creazione.
  // Gestione responsive: il pulsante potrebbe essere nel menu hamburger su schermi piccoli.
  const desktopAdd = page.getByRole('button', { name: 'Nuovo ristorante' });
  const hamburger = page.locator('.hamburger-btn');

  if (await desktopAdd.isVisible()) {
    await desktopAdd.click();
  } else {
    await hamburger.click();
    await page.getByRole('button', { name: 'Nuovo ristorante' }).click();
  }

  // FASE 2: Compilazione del form.
  const restaurantName = `E2E ${Date.now()}`;

  await page.locator('input[formcontrolname="name"]').fill(restaurantName);
  await page.locator('textarea[formcontrolname="description"]').fill(
    'Ristorante creato automaticamente durante i test end-to-end.'
  );

  // FASE 3: Selezione posizione sulla mappa.
  // Clicchiamo sulla mappa Leaflet per impostare le coordinate.
  await page.locator('.leaflet-map').first().click();

  // FASE 4: Upload immagine.
  // Carichiamo un file immagine di test dalla cartella fixtures.
  await page.setInputFiles(
    'input[type="file"]',
    'e2e/fixtures/restaurant.jpg'
  );

  // FASE 5: Invio e verifica.
  await page.getByRole('button', { name: 'Salva ristorante' }).click();

  // Verifica del reindirizzamento alla pagina di dettaglio (URL contiene l'ID).
  await expect(page).toHaveURL(/\/restaurants\/\d+/);
  // Verifica che il titolo della pagina corrisponda al nome del ristorante creato.
  await expect(page.getByRole('heading', { level: 1 }))
    .toContainText(restaurantName);
});

import { test, expect } from '@playwright/test';

/**
 * Questo test verifica la funzionalità di ricerca dei ristoranti tramite la barra di ricerca.
 *
 * Flusso del test:
 * 1. Naviga alla home page.
 * 2. Inserisce una query di ricerca nella barra.
 * 3. Avvia la ricerca.
 * 4. Verifica il reindirizzamento alla pagina dei risultati.
 * 5. Verifica che ci siano risultati e naviga al dettaglio del primo risultato.
 */
test('Ricerca ristorante per nome', async ({ page }) => {
  // FASE 1: Navigazione alla home page.
  await page.goto('/');

  // FASE 2: Interazione con la barra di ricerca.
  const searchInput = page.getByPlaceholder('Es. Trattoria Tecnologie Web');
  await searchInput.fill('E2E');

  // FASE 3: Esecuzione della ricerca.
  await page.getByRole('button', { name: 'Cerca', exact: true }).click();

  // FASE 4: Verifica pagina dei risultati.
  // L'URL deve contenere la query string corretta.
  await expect(page).toHaveURL(/\/search\?query=E2E/);

  // FASE 5: Verifica risultati e navigazione al dettaglio.
  // Ci aspettiamo almeno un risultato con il pulsante "Scopri di più".
  const firstResultButton = page
    .getByRole('button', { name: 'Scopri di più' })
    .first();

  await expect(firstResultButton).toBeVisible();

  // Clicchiamo sul primo risultato per andare alla pagina del ristorante.
  await firstResultButton.click();

  // Verifica del reindirizzamento alla pagina di dettaglio.
  await expect(page).toHaveURL(/\/restaurants\/\d+/);
});

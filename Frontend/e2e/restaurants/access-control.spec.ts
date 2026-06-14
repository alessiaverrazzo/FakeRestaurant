import { test, expect } from '@playwright/test';

/**
 * Questo test verifica che le funzionalità protette (voto, recensione)
 * siano disabilitate o mostrino avvisi appropriati per gli utenti non autenticati.
 *
 * Flusso del test:
 * 1. Naviga alla home page come utente anonimo.
 * 2. Cerca un ristorante per accedere alla pagina di dettaglio.
 * 3. Tenta di votare una recensione e verifica che non sia possibile (tooltip).
 * 4. Tenta di inviare una recensione e verifica che il pulsante sia disabilitato o mostri un messaggio.
 */
test('Accesso negato alle funzionalità da non loggato', async ({ page }) => {
  // FASE 1: Navigazione alla home page.
  await page.goto('/');

  // FASE 2: Ricerca e apertura di un ristorante.
  // È necessario cercare perché i ristoranti potrebbero non essere visibili direttamente in home.
  const searchInput = page.getByRole('textbox', {
    name: 'Es. Trattoria Tecnologie Web'
  });

  await searchInput.fill('test');
  await page.getByRole('button', { name: 'Cerca', exact: true }).click();

  // Apertura del primo ristorante trovato nei risultati.
  await page.getByRole('button', { name: 'Scopri di più' }).first().click();

  // FASE 3: Verifica restrizioni sul VOTO.
  // L'utente non loggato non dovrebbe poter votare.
  const upvoteButton = page.locator('.vote-btn.upvote').first();

  // Simuliamo l'hover per vedere se appare un tooltip o un indicatore visivo.
  await upvoteButton.hover();
  await expect(upvoteButton.locator('.tooltip').first()).toBeVisible();

  // Il click non deve produrre effetti (o deve essere intercettato).
  await upvoteButton.click();

  // FASE 4: Verifica restrizioni sulla RECENSIONE.
  // Il pulsante di invio recensione dovrebbe essere disabilitato o mostrare un messaggio di errore.
  const submitButton = page.getByRole('button', { name: 'Invia' });
  const submitWrapper = submitButton.locator('..'); // Il wrapper potrebbe contenere il tooltip

  await submitButton.hover();
  await expect(submitWrapper.getByText('Devi accedere per inviare')).toBeVisible();

  // Il click non deve inviare il form.
  await submitButton.click();
});

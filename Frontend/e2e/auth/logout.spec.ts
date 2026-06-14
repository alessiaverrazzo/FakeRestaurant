import { test, expect } from '@playwright/test';

/**
 * Questo test verifica il corretto funzionamento del processo di logout.
 *
 * Flusso del test:
 * 1. Esegue il login tramite l'interfaccia utente per creare una sessione attiva.
 * 2. Verifica che l'utente sia correttamente loggato.
 * 3. Clicca sul pulsante di logout.
 * 4. Verifica che l'utente sia stato reindirizzato alla home page.
 * 5. Controlla che lo stato dell'interfaccia sia tornato a quello di un utente non autenticato.
 */
test('Logout utente', async ({ page }) => {
  // FASE 1: Setup - Esecuzione del login tramite UI per ottenere una sessione valida.
  await page.goto('/');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await page.locator('input[name="identifier"]').fill('e2e_user');
  await page.locator('input[name="password"]').fill('E2eTest!1234');
  await page.locator('form').getByRole('button', { name: 'Accedi' }).click();

  // FASE 2: Verifica preliminare - Assicurarsi che il login sia avvenuto con successo.
  await expect(
    page.getByRole('link', { name: 'Il mio profilo' })
  ).toBeVisible();

  // FASE 3: Azione principale - Esecuzione del logout.
  await page.getByRole('button', { name: /logout/i }).click();

  // FASE 4: Verifiche post-logout.
  // L'utente dovrebbe essere reindirizzato alla home page.
  await expect(page).toHaveURL('/');
  // L'interfaccia dovrebbe tornare allo stato "non autenticato".
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Accedi' })
  ).toBeVisible();

  await expect(
    page.getByText('Il mio profilo')
  ).not.toBeVisible();
});

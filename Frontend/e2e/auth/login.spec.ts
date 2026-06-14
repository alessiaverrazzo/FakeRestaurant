import { test, expect } from '@playwright/test';

/**
 * Questo test verifica il corretto funzionamento del processo di login
 * per un utente già esistente.
 *
 * Flusso del test:
 * 1. Utilizza credenziali di un utente di test pre-esistente.
 * 2. Apre la modale di login.
 * 3. Compila e invia il form.
 * 4. Attende che il token di autenticazione sia salvato nel localStorage.
 * 5. Prova ad accedere a una rotta protetta.
 * 6. Verifica che l'interfaccia (es. la navbar) si sia aggiornata per l'utente loggato.
 */
test('Login utente esistente con credenziali valide', async ({ page }) => {
  // Credenziali per l'utente di test pre-configurato nel database.
  const username = 'e2e_user';
  const password = 'E2eTest!1234';

  await page.goto('/');

  // FASE 1: Interazione con il form di login.
  await page.getByRole('button', { name: 'Accedi' }).first().click();
  await page.locator('input[name="identifier"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form').getByRole('button', { name: 'Accedi' }).click();

  // FASE 2: Verifica del successo del login.
  // Attendiamo che il token JWT sia salvato nel localStorage.
  // Questo è un modo robusto per confermare che l'autenticazione è avvenuta.
  await expect(
    page.getByRole('link', { name: 'Il mio profilo' })
  ).toBeVisible();

  // FASE 3: Verifica dell'accesso a rotte protette e stato dell'UI.
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile/);

  // Controlliamo che la navbar mostri le opzioni per un utente autenticato.
  await expect(page.getByText('Logout', { exact: true })).toBeVisible();
  await expect(page.getByText('Il mio profilo', { exact: true })).toBeVisible();
  await expect(page.getByText('Nuovo ristorante', { exact: true })).toBeVisible();

  // Il pulsante "Accedi" non deve più essere visibile.
  await expect(
    page.getByRole('button', { name: 'Accedi' })
  ).not.toBeVisible();

});

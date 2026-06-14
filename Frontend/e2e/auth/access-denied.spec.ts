import { test, expect } from '@playwright/test';

/**
 * Questo test verifica il comportamento corretto del sistema quando un utente
 * non autenticato tenta di accedere a una pagina protetta.
 *
 * Flusso del test:
 * 1. Naviga direttamente a una rotta protetta (es. '/profile').
 * 2. Verifica che venga mostrata la pagina "Accesso negato".
 * 3. Attende il reindirizzamento automatico alla home page.
 * 4. Controlla che l'utente sia effettivamente non autenticato (es. il pulsante "Accedi" è visibile).
 */
test('Accesso non autorizzato mostra pagina Access Denied e reindirizza', async ({ page }) => {
  // Tentativo di accesso diretto a una pagina protetta senza login
  await page.goto('/profile');

  // VERIFICA 1: La pagina "Accesso negato" viene visualizzata correttamente.
  await expect(
    page.getByRole('heading', { name: 'Accesso negato' })
  ).toBeVisible();
  await expect(
    page.getByText('Non hai il permesso per accedere a questa pagina.')
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Torna alla home' })
  ).toBeVisible();

  // VERIFICA 2: Il sistema reindirizza automaticamente l'utente alla home page.
  await page.waitForURL('http://localhost:4200/', { timeout: 5000 });

  // VERIFICA 3: L'utente risulta non autenticato sulla home page.
  await expect(
    page.getByRole('button', { name: 'Accedi' })
  ).toBeVisible();
});

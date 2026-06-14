import { test, expect } from '@playwright/test';

/**
 * Questo test verifica il processo di registrazione di un nuovo utente,
 * inclusa la selezione di un'icona personalizzata.
 *
 * Flusso del test:
 * 1. Genera dati utente univoci usando un timestamp.
 * 2. Naviga alla pagina di registrazione.
 * 3. Seleziona un'icona per il profilo.
 * 4. Compila e invia il form di registrazione.
 * 5. Verifica che il login avvenga automaticamente dopo la registrazione.
 * 6. Naviga alla pagina del profilo per confermare che i dati (es. icona) siano corretti.
 */
test('Registrazione utente con selezione icona', async ({ page }) => {
  // FASE 1: Creazione di dati utente univoci per evitare conflitti.
  const timestamp = Date.now();
  const username = `e2e_user_${timestamp}`;
  const email = `e2e_${timestamp}@test.it`;

  // FASE 2: Navigazione e compilazione del form di registrazione.
  await page.goto('/');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await page.getByText('Registrati').click();

  // Seleziona un'icona per il profilo utente.
  await page.getByRole('img', { name: 'Icona utente' }).nth(1).click();

  // Compila il form con i dati univoci.
  await page.locator('[formcontrolname="username"]').fill(username);
  await page.locator('[formcontrolname="email"]').fill(email);
  await page.locator('[formcontrolname="password"]').fill('password123');
  await page.getByRole('button', { name: 'Registrati' }).click();

  // FASE 3: Verifica del login automatico e dei dati del profilo.
  // Attendiamo che il token sia presente per assicurarci che il login sia avvenuto.
  await page.waitForFunction(() => !!localStorage.getItem('token'));

  // Accediamo a una rotta protetta per verificare che la sessione sia attiva.
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile/);

  // Verifichiamo che l'icona selezionata sia visibile nella pagina del profilo.
  await expect(page.getByRole('img', { name: 'User icon' })).toBeVisible();
});

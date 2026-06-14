import { test, expect } from '@playwright/test';

/**
 * Questo test copre l'intero ciclo di vita dell'eliminazione di un account.
 * Per garantire che il test sia atomico e indipendente, viene creato un nuovo
 * utente univoco a ogni esecuzione.
 *
 * Flusso del test:
 * 1. Crea un nuovo utente con username e email univoci.
 * 2. Esegue il login automatico dopo la registrazione.
 * 3. Naviga alla pagina del profilo.
 * 4. Accede alla sezione di modifica del profilo.
 * 5. Avvia e conferma il processo di eliminazione dell'account.
 * 6. Verifica che l'account sia stato eliminato e che l'utente sia stato reindirizzato alla home.
 */
test('Eliminazione account utente', async ({ page }) => {
  // FASE 1: Preparazione dei dati utente univoci per evitare conflitti tra test.
  const ts = Date.now();
  const username = `e2e_delete_${ts}`;
  const email = `e2e_delete_${ts}@test.it`;
  const password = 'password';

  // FASE 2: Registrazione di un nuovo utente.
  await page.goto('/');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await page.getByText('Registrati').click();

  // Seleziona il modale di registrazione per rendere i selettori più robusti.
  const registerModal = page.locator(
    'div.relative.bg-white-background'
  );
  await expect(
    registerModal.locator('input[formcontrolname="username"]')
  ).toBeVisible();

  // Compila il form di registrazione.
  await registerModal.locator('input[formcontrolname="username"]').fill(username);
  await registerModal.locator('input[formcontrolname="email"]').fill(email);
  await registerModal.locator('input[formcontrolname="password"]').fill(password);
  await registerModal.locator('.grid div').first().click();
  await registerModal.getByRole('button', { name: 'Registrati' }).click();

  // FASE 3: Verifica del login automatico e navigazione.
  // Dopo la registrazione, l'utente dovrebbe essere loggato e vedere il link al profilo.
  await expect(
    page.getByRole('link', { name: 'Il mio profilo' })
  ).toBeVisible();

  // Naviga alla pagina del profilo per iniziare il processo di eliminazione.
  await page.getByRole('link', { name: 'Il mio profilo' }).click();
  await expect(
    page.locator('span.text-xl.font-semibold.text-brown-dark')
  ).toHaveText(username);

  // FASE 4: Processo di eliminazione dell'account.
  await page.getByRole('button', { name: 'Modifica profilo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Modifica profilo' })
  ).toBeVisible();

  // Clicca sul pulsante per avviare l'eliminazione e conferma nel modale.
  await page.getByRole('button', { name: /Elimina account/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Conferma eliminazione' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conferma eliminazione' }).click();

  // FASE 5: Verifica finale.
  // Controlla che il messaggio di successo sia visibile.
  await expect(
    page.getByText('Account eliminato!')
  ).toBeVisible();

  // Verifica che l'utente sia stato reindirizzato alla home e non sia più loggato.
  await page.waitForURL('http://localhost:4200/');
  await expect(
    page.getByRole('button', { name: 'Accedi' })
  ).toBeVisible();
});

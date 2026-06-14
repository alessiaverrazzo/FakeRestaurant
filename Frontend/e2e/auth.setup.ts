import { test as base, expect, Page } from '@playwright/test';

// Definizione dei tipi per le Fixture personalizzate di Playwright.
// In questo caso, aggiungiamo 'authPage' che fornisce una pagina già autenticata.
type Fixtures = {
  authPage: Page;
};

// ======================================================
// CACHE GLOBALE (CONDIVISA TRA TUTTI I FILE DI TEST)
// ======================================================
// Struttura dei dati di autenticazione che verranno salvati in cache.
// Include il token JWT e le informazioni dell'utente restituite dal backend.
type CachedAuth = {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    icon_id: number;
  };
};

// Estensione dell'interfaccia globale di NodeJS per includere la proprietà __E2E_AUTH__.
// Questo permette di condividere i dati di login tra i vari test che girano nello stesso worker,
// evitando di effettuare una richiesta di login API per ogni singolo test.
declare global {
  // eslint-disable-next-line no-var
  var __E2E_AUTH__: CachedAuth | undefined;
}

// Estendiamo il test base di Playwright con la nostra fixture personalizzata.
export const test = base.extend<Fixtures>({
  authPage: async ({ page }, use) => {
    // ==================================================
    // LOGIN VIA API (UNA SOLA VOLTA PER TUTTA LA SUITE)
    // ==================================================
    // Controlliamo se abbiamo già effettuato il login in questo worker.
    if (!globalThis.__E2E_AUTH__) {
      // Se non siamo loggati, facciamo una richiesta POST diretta all'API di backend.
      // Questo è molto più veloce che compilare il form di login via UI.
      const response = await page.request.post(
        'http://localhost:3000/api/users/login',
        {
          data: {
            identifier: 'e2e_user', // Utente di test predefinito
            password: 'E2eTest!1234',
          },
        }
      );

      // Gestione errori: se il login fallisce, interrompiamo tutto con un errore chiaro.
      if (!response.ok()) {
        const status = response.status();
        const body = await response.text();

        throw new Error(
          `Errore login E2E.\n` +
          `Codice HTTP: ${status}\n` +
          `Risposta server: ${body}`
        );
      }

      // Salviamo la risposta (token e user) nella variabile globale per riutilizzarla.
      globalThis.__E2E_AUTH__ = await response.json();
    }

    // Recuperiamo i dati di autenticazione dalla cache globale.
    // L'operatore '!' assicura a TypeScript che la variabile è definita (grazie all'if sopra).
    const { token, user } = globalThis.__E2E_AUTH__!;

    // ==================================================
    // INIETTA SESSIONE PRIMA DEL BOOTSTRAP ANGULAR
    // ==================================================
    // Utilizziamo addInitScript per eseguire codice nel browser prima che la pagina carichi gli script dell'app.
    // Qui iniettiamo il token e l'utente nel localStorage, simulando un login avvenuto con successo.
    await page.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            iconId: user.icon_id, // Mappatura snake_case (DB) a camelCase (Frontend)
          })
        );
      },
      { token, user } // Passiamo i dati dal contesto Node al contesto Browser
    );

    // ==================================================
    // AVVIO APP GIÀ LOGGATA
    // ==================================================
    // Navighiamo alla home page. Grazie allo script iniettato sopra, l'app troverà
    // il token nel localStorage e considererà l'utente già loggato.
    await page.goto('/');

    // Verifica di sicurezza: controlliamo che il pulsante/link 'Logout' sia visibile.
    // Questo conferma che l'interfaccia utente ha riconosciuto lo stato di autenticazione.
    await expect(
      page.getByText('Logout'),
      'Logout non visibile: autenticazione E2E fallita'
    ).toBeVisible();

    // Passiamo la pagina autenticata al test che ha richiesto questa fixture.
    await use(page);
  },
});

export { expect };

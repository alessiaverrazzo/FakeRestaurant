# FakeRestaurant

FakeRestaurant è una web application sviluppata come progetto per il corso di **Tecnologie Web**.  
L’applicazione consente agli utenti di creare ristoranti immaginari, scrivere recensioni e interagire tramite un sistema di votazione stile upvote/downvote, con notifiche in tempo reale.

Il sistema è composto da:
- **Backend**: API REST
- **Frontend**: Single Page Application (SPA)

---

## Architettura del Sistema

### Frontend
- Framework: **Angular**
- Pattern architetturale: **MVVM (Model-View-ViewModel)**
- UI responsive realizzata con **Tailwind CSS**
- Utilizzo di componenti Standalone per migliori performance
- Visualizzazione mappa interattiva tramite **Leaflet**
- Notifiche in tempo reale tramite **Socket.io client**

### Backend
- Runtime: **Node.js**
- Framework: **Express**
- Linguaggio: **TypeScript**
- Architettura a livelli (Layered Architecture):
  - Controller
  - Services
  - Repository
  - Models / DTO
- Database: **PostgreSQL**
- ORM: **Sequelize**
- **Multer** per il caricamento di immagini

### Sicurezza
- Autenticazione tramite **JWT**
- Hashing delle password con **bcrypt**
- Protezione degli header HTTP con **Helmet**
- Gestione CORS e rate limiting
- Upload immagini tramite **Multer**
- Reset password via email tramite **Nodemailer**

---

## Requisiti

- Node.js (versione consigliata ≥ 18)
- npm
- **PostgreSQL installato e in esecuzione**

---

## Configurazione ambiente

Nel backend è presente un file .env per la configurazione dell’applicazione.

Per motivi di sicurezza, il file .env non è incluso nella repository.
È invece fornito un file .env.example da cui partire.
Per configurare l’ambiente (su sistemi Windows):

```bash
copy .env.example .env
```
Aprire il file .env appena creato e modificare le configurazioni per:
- Connessione al DB
- Configurazione SMTP

Il Secret JWT viene fornito solo ai fini di testing.

---

## Database

L’applicazione utilizza **PostgreSQL** come sistema di gestione del database.

### Database di test (E2E)

Per consentire l’esecuzione dei **test End-to-End automatici**, è fornito un dump SQL (`e2e_dump.sql`) contenente dati di esempio coerenti con gli scenari di test.

Il dump è pensato **esclusivamente per l’ambiente di test**.

### Import del database di test

Usare **pgAdmin** (GUI ufficiale di PostgreSQL).
1. Aprire pgAdmin
2. Collegare il server PostgreSQL
3. Click destro su Database -> Create -> Database
4. Nome: FakeRestaurantTest
5. Salva

Importare il dump (sempre da pgAdmin):
1. Click destro sul database appena creato -> Restore
2. Scegliere formato **Plain**
3. Scegliere il file `e2e_dump.sql`
4. Cliccare Restore

## Avvio del Backend

Posizionarsi nella cartella del backend, installare le dipendenze e avviare il server:

```bash
cd Backend
npm install
npm run dev
```

Il backend espone le API REST utilizzate dal frontend.

---

## Avvio del Frontend
Posizionarsi nella cartella del frontend, installare le dipendenze e avviare l’applicazione:

```bash
cd Frontend
npm install
npm start
```

L’applicazione sarà disponibile all’indirizzo:
http://localhost:4200

---
## Testing

### Unit Test – Backend

I test di unità del backend sono realizzati con **Jest**.

```bash
cd Backend
npm run test
```

---

### Unit Test – Frontend

I test di unità del frontend sono realizzati con **Vitest**.

```bash
cd Frontend
npm run test
```
---

### Test End-to-End (E2E)

I test End-to-End sono realizzati con **Playwright** e verificano i principali flussi dell’applicazione in modalità black-box.

Casi testati:
- registrazione utente
- login
- restrizioni per utenti non autenticati
- creazione di un ristorante
- ricerca ristorante per nome
- aggiunta di una recensione
- ordinamento delle recensioni
- upvote / downvote
- notifiche (ricezione e lettura)
- logout
- eliminazione account
- accesso negato alle rotte protette

⚠️ **Nota importante**  
I test E2E **presuppongono un database popolato** e l'avvio di **backend** e **frontend**.  
Devono quindi essere eseguiti **solo dopo l’import del dump SQL fornito**.

**Esecuzione:**
```bash
cd Frontend
npm run e2e 
```

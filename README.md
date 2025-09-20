# Rush Dashboard Frontend

Questo repository contiene il frontend della dashboard RUSH. Il progetto era stato originariamente avviato con Create React App (`react-scripts` 5). L'obiettivo di questa attività è stato analizzare la configurazione generata da CRA e migrare verso una toolchain moderna ma interamente configurabile in locale, mantenendo la compatibilità con React 19 e con l'infrastruttura esistente.

## 1. Analisi della configurazione CRA

| Area | Comportamento con CRA | Implicazioni per la migrazione |
| --- | --- | --- |
| **Script npm** | `npm start`, `npm run build`, `npm test` delegano a `react-scripts` che incapsula Webpack, Babel, ESLint e Jest. | Per avere pieno controllo è necessario sostituire gli script con entry point espliciti (dev server, build, lint). |
| **Routing SPA** | Dev server CRA abilita automaticamente l'HTML5 history fallback. | La nuova toolchain deve garantire fallback verso `index.html` sia in sviluppo che in anteprima build. |
| **Variabili d'ambiente** | Accesso tramite `process.env` e prefisso `REACT_APP_`; il codice usa solo `NODE_ENV` per logging. | È stato introdotto un resolver che supporta sia `import.meta.env` (nuovo toolchain) sia il vecchio `process.env` per compatibilità e permette di definire `VITE_API_BASE_URL`/`REACT_APP_API_BASE_URL`. |
| **Asset statici** | Cartella `public/` copiata così com'è; l'`index.html` usa `%PUBLIC_URL%`. | La build personalizzata copia `public/` (escluso `index.html`) e aggiorna i riferimenti HTML con percorsi assoluti `/...`. |

## 2. Nuova toolchain: Webpack 5 configurato a mano

Impossibilitati a scaricare nuove dipendenze dal registry, abbiamo scelto di riutilizzare l'ecosistema già presente (Webpack 5, Babel e PostCSS forniti transitivamente da CRA) ma con configurazione esplicita:

- **`webpack.config.js`** riproduce la pipeline di build e sviluppo con gestione di asset, CSS (PostCSS + Autoprefixer), code splitting e fallback per il routing.
- **Script Node dedicati** (`scripts/dev.js`, `scripts/build.js`, `scripts/preview.js`) sostituiscono gli entry point di `react-scripts`, mantenendo lo stesso `node_modules` già disponibile offline.
- **Iniezione variabili d'ambiente** via `webpack.DefinePlugin`, esponendo sia `process.env` sia `import.meta.env` (`MODE` e `VITE_API_BASE_URL`).
- **Gestione asset statici** tramite uno script di copia (`scripts/utils/copyPublicAssets.js`) che trasferisce la cartella `public/` nella build finale.

Questa soluzione fornisce controllo completo sulla toolchain pur restando utilizzabile senza scaricare nuovi pacchetti.

## 3. Comandi disponibili

Eseguire una sola volta `npm install` (se si dispone dell'accesso al registry) per sincronizzare `node_modules`. Nel container di sviluppo utilizzato la cartella `node_modules` era già presente.

```bash
npm run dev      # Avvia webpack-dev-server su http://localhost:3000 con history fallback
npm run build    # Compila la build di produzione in dist/ e copia gli asset pubblici
npm run preview  # Serve la build generata (fallback SPA incluso)
npm run lint     # Esegue ESLint sulle estensioni .js/.jsx della cartella src
npm test         # Avvia Jest tramite react-scripts per i test component/integration
```

## 4. Variabili d'ambiente

- Definisci `VITE_API_BASE_URL` oppure il legacy `REACT_APP_API_BASE_URL` in un file `.env` per cambiare l'endpoint backend.
- Il codice usa un resolver che controlla `import.meta.env` e, in fallback, `process.env`, così da funzionare sia con la nuova build Webpack sia con eventuali ambienti che usano ancora CRA.
- Il backend PHP supporta un fallback SQLite impostando `DB_DRIVER=sqlite`, ma richiede che l'estensione `pdo_sqlite` sia disponibile. Se l'estensione manca, l'API tenta automaticamente di utilizzare la configurazione MySQL (`DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`).

## 5. Asset e routing

- Tutto ciò che si trova in `public/` viene copiato (eccetto `index.html`, gestito da HtmlWebpackPlugin).
- Il dev server e il server di anteprima effettuano sempre il fallback verso `index.html`, consentendo il funzionamento del routing client-side (`react-router-dom`).

## 6. Requisiti

- Node.js 18 o superiore.
- npm 9+ (o il package manager preferito) già configurato con i pacchetti necessari.

## 7. Troubleshooting

- **Errore durante `npm install`**: se l'ambiente è offline, utilizza i pacchetti già presenti nella cartella `node_modules` oppure aggiorna il registry aziendale.
- **Variabile API non definita**: assicurati di impostare `VITE_API_BASE_URL`/`REACT_APP_API_BASE_URL` prima di avviare build o dev server.
- **Linting**: il comando `npm run lint` usa la configurazione `react-app` di ESLint (già inclusa da CRA). Assicurati che l'IDE non sovrascriva la config.

## 8. Test manuali per controllo upload

Eseguire i seguenti test dopo il deploy dell'API aggiornata:

1. **Viewer**
   - Effettua il login con un account avente ruolo `viewer`.
   - Prova a caricare un file Excel dalla dashboard.
   - Verifica che il server restituisca HTTP `403`, che compaia il toast "⛔ Accesso negato. Solo gli amministratori possono caricare o aggiornare file." e che nei log attività venga creato un evento `FILE_UPLOAD_BLOCKED` con i dettagli del tentativo.
2. **Admin**
   - Effettua il login con un account `admin`.
   - Carica un nuovo file Excel e verifica che l'upload abbia successo (toast di conferma e file presente nella lista).
   - Ripeti l'operazione con un file già presente per assicurarti che l'aggiornamento funzioni ancora correttamente.

Questi scenari garantiscono che solo gli amministratori possano caricare o aggiornare file mentre gli altri ruoli vengono bloccati lato server.

## 9. Sincronizzazione automatica dello schema API

- L'endpoint di login PHP (`api/index.php`) esegue ora automaticamente il bootstrap di `api/migrations/20240924_sync_schema.php` prima di interagire con il database. Il bootstrap verifica che la tabella `user_sessions` e la colonna `users.is_active` siano presenti, creando automaticamente gli elementi mancanti.
- In caso di problemi durante la sincronizzazione lo script interrompe la richiesta con HTTP `503` e messaggio "Eseguire migrazione schema", evitando che vengano eseguite query non sicure.
- Se per esigenze operative la sincronizzazione automatica viene disabilitata, assicurati di eseguire manualmente la migrazione (`api/migrations/20240924_sync_schema.php` con una connessione PDO valida) prima di riattivare le nuove policy di sessione.

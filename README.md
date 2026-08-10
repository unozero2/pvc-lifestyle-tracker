# Diario Stile di Vita & PVC

App web installabile (PWA) per il tracciamento giornaliero del piano di stile di vita (sonno, reflusso, caffeina/alcol, respirazione, attività fisica) legato al monitoraggio dell'extrasistolia ventricolare.

**Tutti i dati restano solo sul dispositivo della paziente** (localStorage del browser). Nessun server riceve o memorizza dati sanitari: l'hosting serve solo a distribuire il codice dell'app.

## Pubblicare su GitHub Pages (gratis)

1. Crea un nuovo repository su [github.com/new](https://github.com/new) (puoi chiamarlo ad es. `pvc-lifestyle-tracker`), pubblico o privato.
2. Da questa cartella, collega il repository ed esegui il push:

   ```bash
   git remote add origin https://github.com/<tuo-utente>/pvc-lifestyle-tracker.git
   git branch -M main
   git push -u origin main
   ```

3. Su GitHub vai su **Settings → Pages**. In "Build and deployment" scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`. Salva.
4. Dopo 1-2 minuti l'app sarà disponibile su:
   `https://<tuo-utente>.github.io/pvc-lifestyle-tracker/`

## Come la paziente installa l'app sul telefono Android

1. Apre il link sopra con **Chrome**.
2. Tocca il menu (⋮) in alto a destra → **Installa app** (o **Aggiungi a schermata Home**). In alternativa, dopo qualche secondo Chrome può mostrare un banner automatico "Installa".
3. L'icona compare nella home screen come una app normale, apribile anche offline dopo il primo caricamento.

## Aggiornare l'app in futuro

Modifica i file, poi:

```bash
git add -A
git commit -m "Aggiornamento app"
git push
```

GitHub Pages ripubblica automaticamente in 1-2 minuti. Il Service Worker aggiorna la cache dei dispositivi già installati al successivo avvio dell'app.

## Struttura

- `index.html` — struttura e le 4 sezioni (Oggi, Settimana, Andamento, Impostazioni)
- `app.js` — logica: fasi del piano, checklist, diario, grafici, notifiche, export
- `styles.css` — tema chiaro/scuro automatico, layout mobile
- `service-worker.js` — funzionamento offline e notifiche
- `manifest.json` — configurazione PWA (icona, nome, modalità standalone)
- `icons/` — icone dell'app

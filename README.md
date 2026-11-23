# Fortuna — La ruota della fortuna

Applicazione Angular per creare una ruota personalizzata, scegliere un vincitore e salvarne le opzioni nel browser.

## Funzionalità

- Aggiunta e rimozione di nomi o opzioni.
- Salvataggio esplicito e ripristino della lista con `localStorage`.
- Caricamento automatico della lista salvata nelle sessioni successive; se non esiste, vengono proposte opzioni standard.
- Due azioni dopo l'estrazione: girare di nuovo oppure escludere il vincitore e girare con le opzioni rimanenti.
- Popup al termine di ogni giro e storico dei vincitori, dal più recente al meno recente.
- Tre livelli di forza, regolabili prima di ogni giro.
- Trascinamento diretto della ruota, con inerzia proporzionale alla velocità del gesto.
- Tema chiaro/scuro selezionabile, con preferenza salvata nel browser.

## Struttura

```text
src/
  app/
    features/
      entries/   # Gestione e visualizzazione delle opzioni
      wheel/     # Disegno e animazione della ruota
    app.ts        # Stato della sessione e logica di gioco
    app.html      # Composizione della pagina
  styles.css      # Stili globali e layout responsive
```

I componenti seguono i nomi del dominio (`EntryList`, `Wheel`) senza suffissi generici come `Component`.

## Avvio

```bash
npm install
npm start
```

Apri `http://localhost:4200/` nel browser.

## Verifica

```bash
npm run build
npm test -- --watch=false
```

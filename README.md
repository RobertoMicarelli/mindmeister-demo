# MindMeister Import • Demo (Vite + React)

## Avvio locale
```bash
npm install
cp .env.local.example .env.local   # inserisci il tuo VITE_MM_CLIENT_ID
npm run dev
```
Apri l'URL (es. http://localhost:5173).

## Variabili
- VITE_MM_CLIENT_ID
- VITE_REDIRECT_URI (default http://localhost:5173/oauth/mindmeister/callback)
- VITE_SCOPES (default "mindmeister.read mindmeister.write")

## Note
- Flusso OAuth usato: **Implicit** (token nell'hash URL).
- Endpoint API per create/import sono placeholder (`<TODO_API_BASE>`). Sostituiscili con la base URL reale o con un tuo backend proxy.

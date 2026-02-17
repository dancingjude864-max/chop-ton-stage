# CHOP' TON STAGE

Plateforme web statique pour rechercher des stages en travail social et partager des retours d'expérience.

## Déploiement production (Supabase)

Le projet est prêt pour un stockage persistant via Supabase.

1. Crée un projet Supabase.
2. Ouvre `SQL Editor` et exécute le contenu de `supabase/schema.sql`.
3. Récupère:
- `Project URL`
- `anon public key`
4. Renseigne ces valeurs dans `config.js`.
5. Importe les structures CSV dans la table `public.structures`:

```bash
python3 scripts/import_structures_to_supabase.py \
  --url "https://<PROJECT_REF>.supabase.co" \
  --key "<ANON_PUBLIC_KEY>"
```

6. Commit + push, puis redeploy Vercel.

Sans configuration Supabase, l'app reste en mode fallback local (navigateur / API locale).

## Lancer en local

Depuis ce dossier:

```bash
python3 server.py
```

Puis ouvrez:

- `http://localhost:8080/index.html`

## Source CSV (Google Sheet)

Par défaut, l'application charge un Google Sheet publié en CSV.

Pour charger un Google Sheet publié en CSV, ajoutez le paramètre `csv` à l'URL:

- `http://localhost:8080/index.html?csv=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`

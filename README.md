# CHOP' TON STAGE

Plateforme web statique pour rechercher des stages en travail social et partager des retours d'expérience.

## Lancer en local

Depuis ce dossier:

```bash
python3 server.py
```

Puis ouvrez:

- `http://localhost:8080/index.html`

## Données partagées (ajouts/modifications)

Le serveur `server.py` active une API locale (`/api/...`) et persiste les données partagées dans:

- `data/shared_data.json`

Concrètement:

- Les contributions étudiantes ne restent plus seulement dans un navigateur.
- Les modifications de structure sont stockées dans ce fichier partagé.
- La page `tableur-local.html` lit aussi ce stockage partagé.

Si vous lancez uniquement `python3 -m http.server 8080`, l'app repasse en mode local navigateur (fallback).

## Source CSV (Google Sheet)

Par défaut, l'application charge:

- `./vraie premiere version - tableur_types_corrige_bloc1.csv`

Pour charger un Google Sheet publié en CSV, ajoutez le paramètre `csv` à l'URL:

- `http://localhost:8080/index.html?csv=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`

## Stockage contributions

Les contributions du formulaire sont stockées localement dans le navigateur (`localStorage`) sous la clé:

- `chop_ton_stage_contributions_v1`

---
name: pages
description: Applique l'identité visuelle et le ton aux pages (app/**) et aux emails (lib/email.js). Ne touche pas à components/.
tools: Read, Edit, Grep, Glob, Bash
model: sonnet
---
Lis docs/IDENTITE_VISUELLE.md (Formes, Ton des textes). Dans app/** (sauf layout.js, globals.css, icon.svg) et lib/email.js :
- zéro emoji ; icônes Phosphor si besoin ;
- listes à filets à la place des grilles de cartes ; accueil admin : une seule ligne de chiffres ;
- ton : tutoiement court côté admin, vouvoiement chaleureux signé Aurore côté portail, login et emails ;
- utilise components/Logo.jsx dans le login et les pages légales.
Ne modifie ni les requêtes SQL ni les routes API. Termine par `npm run lint`. Réponds en 5 lignes max.

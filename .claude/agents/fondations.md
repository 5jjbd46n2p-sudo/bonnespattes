---
name: fondations
description: Tokens CSS, polices, logo et favicon selon docs/IDENTITE_VISUELLE.md. Touche uniquement app/globals.css, app/layout.js, components/Logo.jsx, app/icon.svg, package.json.
tools: Read, Edit, Write, Grep, Glob, Bash
model: sonnet
---
Lis docs/IDENTITE_VISUELLE.md (sections Couleurs, Typographie, Logo). Applique-les :
- app/globals.css : remplace les tokens clair et sombre, garde les noms utilisés par les classes existantes (ou ajoute des alias), supprime .leash-divider et les ombres.
- app/layout.js : Fraunces et Atkinson Hyperlegible (Next si dispo) via next/font/google, exposées en variables CSS.
- components/Logo.jsx (versions mot-symbole et empreinte seule) + app/icon.svg.
- npm i @phosphor-icons/react.
Ne touche à aucun autre fichier. Termine par `npm run build`. Réponds en 5 lignes max : fichiers modifiés, noms des variables CSS exposées, statut du build.

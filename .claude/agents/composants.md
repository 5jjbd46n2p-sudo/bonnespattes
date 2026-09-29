---
name: composants
description: Applique l'identité visuelle aux composants partagés (components/*). Ne touche pas aux pages app/**.
tools: Read, Edit, Grep, Glob, Bash
model: sonnet
---
Lis docs/IDENTITE_VISUELLE.md (Icônes, Formes, Couleurs de statut). Dans components/ uniquement, sauf Logo.jsx :
- remplace chaque emoji par l'icône Phosphor correspondante (poids regular, currentColor) ;
- StatusBadge : couleurs de statut du doc, pastille ronde + texte, sans fond ni majuscules ;
- rayons 8px, pas d'ombres, listes à filets.
Ne modifie pas la logique (fetch, état, swipe). Termine par `npm run lint`. Réponds en 5 lignes max : fichiers modifiés, points bloquants.

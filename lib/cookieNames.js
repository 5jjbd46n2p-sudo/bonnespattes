// Noms des cookies de session. Sans dépendance : importé aussi par proxy.js.
//
// En production (HTTPS), préfixe « __Host- » : le navigateur n'accepte ces
// cookies que s'ils sont « secure », posés sur le chemin « / » et sans attribut
// « domain ». Un sous-domaine ou une page en http ne peut donc ni les créer ni
// les écraser (protection contre la fixation de session).
// En développement local (http://localhost), le préfixe rendrait la connexion
// impossible : on garde alors les anciens noms, lisibles et sans préfixe.
export function cookieNames(production = process.env.NODE_ENV === "production") {
  return production
    ? { session: "__Host-petsitter_session", mfa: "__Host-petsitter_mfa" }
    : { session: "petsitter_session", mfa: "petsitter_mfa" };
}

// Anciens noms (avant le préfixe) : effacés à la connexion et à la déconnexion
// pour ne pas laisser traîner un jeton inutile dans le navigateur.
export const LEGACY_COOKIE_NAMES = ["petsitter_session", "petsitter_mfa"];

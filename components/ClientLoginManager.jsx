"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientLoginManager({ clientId, login }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!login);
  const [email, setEmail] = useState(login?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedPassword, setSavedPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [emailWarning, setEmailWarning] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let pw = "";
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setEmailWarning("");
    const pw = password || generatePassword();
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pw, sendEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setSavedPassword(pw);
    setEmailSent(sendEmail && !data.emailWarning);
    if (data.emailWarning) setEmailWarning(data.emailWarning);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Supprimer l'accès de ce client ? Il ne pourra plus se connecter.")) return;
    await fetch(`/api/clients/${clientId}/login`, { method: "DELETE" });
    setSavedPassword("");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-forest-dark mb-3">Accès au portail client</h2>

      {savedPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm">
          <p className="font-semibold">Identifiants à transmettre au client :</p>
          <p>Email : {email}</p>
          <p>Mot de passe : {savedPassword}</p>
          {emailSent && <p className="text-forest mt-1">✓ Email envoyé automatiquement au client.</p>}
          {emailWarning && (
            <p className="text-danger mt-1">
              ⚠️ Email non envoyé ({emailWarning}) — transmets ces identifiants toi-même.
            </p>
          )}
          <p className="text-xs text-muted mt-1">
            Ce mot de passe ne sera plus affiché ensuite — note-le maintenant.
          </p>
        </div>
      )}

      {!editing && login ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">
              <span className="badge bg-emerald-100 text-emerald-800">Actif</span>
            </p>
            <p className="text-sm text-muted mt-1">{login.email}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm !py-1.5 !px-3">
              Réinitialiser
            </button>
            <button onClick={remove} className="text-xs text-danger hover:underline">
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <input
            type="email"
            required
            className="input"
            placeholder="Email de connexion"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Mot de passe (laisser vide pour en générer un)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="btn-ghost !px-3 text-sm shrink-0"
            >
              🔄
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button disabled={loading} className="btn-primary text-sm">
              {loading ? "Enregistrement..." : login ? "Réinitialiser le mot de passe" : "Créer l'accès"}
            </button>
            {login && (
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-sm">
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

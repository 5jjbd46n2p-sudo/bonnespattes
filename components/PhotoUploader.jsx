"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "@phosphor-icons/react";

export default function PhotoUploader({ visitId, photos }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function handleFiles(files) {
    setError("");
    setUploading(true);
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/visits/${visitId}/photos`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Échec de l'envoi d'une photo.");
        break;
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function removePhoto(id) {
    if (!confirm("Supprimer cette photo ?")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-pierre tabular-nums">{photos.length} photo{photos.length > 1 ? "s" : ""}</p>
        <label className="btn-primary text-sm !py-1.5 !px-3 cursor-pointer">
          {!uploading && <Camera size={20} aria-hidden="true" />}
          {uploading ? "Envoi..." : "Ajouter une photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.length && handleFiles(Array.from(e.target.files))}
          />
        </label>
      </div>
      {error && <p className="text-sm text-brique mb-2">{error}</p>}
      {photos.length === 0 ? (
        <p className="text-sm text-pierre">Aucune photo ajoutée pour cette visite.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group">
              <a href={`/api/photos/${p.id}/file`} target="_blank" rel="noopener noreferrer">
                <img
                  src={`/api/photos/${p.id}/file`}
                  alt="Photo de la visite"
                  className="w-full h-32 object-cover rounded-lg border border-trait"
                />
              </a>
              <button
                onClick={() => removePhoto(p.id)}
                aria-label="Supprimer cette photo"
                className="absolute top-1.5 right-1.5 bg-lin/90 text-brique rounded-lg w-8 h-8 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

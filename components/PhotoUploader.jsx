"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

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
        <p className="text-sm text-muted">{photos.length} photo{photos.length > 1 ? "s" : ""}</p>
        <label className="btn-accent text-sm !py-1.5 !px-3 cursor-pointer gap-1.5">
          {uploading ? "Envoi…" : (
            <>
              <Camera className="w-4 h-4" strokeWidth={1.9} />
              Ajouter une photo
            </>
          )}
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
      {error && <p className="text-sm text-danger mb-2">{error}</p>}
      {photos.length === 0 ? (
        <p className="text-sm text-muted">Aucune photo ajoutée pour cette visite.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group">
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={p.url}
                  alt="Photo de la visite"
                  className="w-full h-32 object-cover rounded-lg border border-border"
                />
              </a>
              <button
                onClick={() => removePhoto(p.id)}
                className="absolute top-1.5 right-1.5 bg-card/90 text-danger rounded-full w-7 h-7 text-xs md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer la photo"
              >
                <X className="w-4 h-4 mx-auto" strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

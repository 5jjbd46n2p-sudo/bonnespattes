"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";

export default function TaskChecklist({ visitId, tasks }) {
  const router = useRouter();
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(false);

  async function toggle(task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    router.refresh();
  }

  async function removeTask(taskId) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    router.refresh();
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setLoading(true);
    await fetch(`/api/visits/${visitId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newTask.trim() }),
    });
    setNewTask("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3">
        {tasks.length > 0 ? (
          <div className="list-group">
            {tasks.map((t) => (
              <label key={t.id} className="list-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t)}
                  className="w-5 h-5 accent-mousse"
                />
                <span className={`flex-1 text-sm ${t.done ? "line-through text-pierre" : ""}`}>{t.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeTask(t.id);
                  }}
                  aria-label={`Supprimer la tâche « ${t.label} »`}
                  className="text-brique p-1 rounded-lg hover:bg-sable"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-pierre">Aucune tâche pour cette visite.</p>
        )}
      </div>
      <form onSubmit={addTask} className="flex gap-2">
        <input
          className="input"
          placeholder="Ajouter une tâche..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button disabled={loading} className="btn-ghost text-sm !px-3 shrink-0">
          Ajouter
        </button>
      </form>
    </div>
  );
}

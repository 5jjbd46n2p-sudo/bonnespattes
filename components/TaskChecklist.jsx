"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="space-y-2 mb-3">
        {tasks.map((t) => (
          <label
            key={t.id}
            className={`flex items-center gap-3 border border-border rounded-lg p-3 cursor-pointer ${
              t.done ? "bg-emerald-50" : "bg-card"
            }`}
          >
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} className="w-4 h-4" />
            <span className={`flex-1 text-sm ${t.done ? "line-through text-muted" : ""}`}>{t.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                removeTask(t.id);
              }}
              className="text-xs text-danger"
            >
              ✕
            </button>
          </label>
        ))}
        {tasks.length === 0 && <p className="text-sm text-muted">Aucune tâche pour cette visite.</p>}
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

"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { formatGuideOn } from "@/lib/domain/studyGuides";
import { ErrorText, jsonInit, loadJson, Modal, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

// A study_guides row as the public list sends it, and as the editor holds
// it (a new guide has no id yet).
interface GuideRow {
  id?: string;
  guide_on: string;
  series: string | null;
  topic: string | null;
  scripture: string | null;
  spotify_url: string | null;
  pdf_url: string | null;
  color: string | null;
  sort_order: number;
}

type EditableField = "guide_on" | "series" | "topic" | "scripture" | "spotify_url" | "pdf_url" | "color";
const FIELDS: { key: EditableField; label: string; type: "date" | "text" }[] = [
  { key: "guide_on", label: "Date", type: "date" },
  { key: "series", label: "Series", type: "text" },
  { key: "topic", label: "Topic", type: "text" },
  { key: "scripture", label: "Scripture", type: "text" },
  { key: "spotify_url", label: "Spotify URL", type: "text" },
  { key: "pdf_url", label: "PDF URL", type: "text" },
  { key: "color", label: "Color", type: "text" },
];

const PATH = "/api/admin/content/study-guides";

const blankGuide: GuideRow = {
  guide_on: "",
  series: "",
  topic: "",
  scripture: "",
  spotify_url: "",
  pdf_url: "",
  color: "#3b82f6",
  sort_order: 0,
};

// Reads come from the public list; writes go to the admin API.
async function loadGuides(): Promise<GuideRow[]> {
  return (await loadJson<{ guides: GuideRow[] }>(await fetch("/api/content/study-guides"), "study guides")).guides;
}

export default function GuidesTab({ adminKey }: AdminTabProps) {
  const [editing, setEditing] = useState<GuideRow | null>(null);
  const save = useAdminSave(adminKey);
  const { data, error, loading, reload } = useLoaded(loadGuides);
  const guides = data ?? [];

  const saveGuide = () => {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    save.run(PATH, jsonInit(method, editing), () => {
      setEditing(null);
      reload();
    });
  };

  const deleteGuide = (id: string | undefined) => {
    if (id === undefined || !confirm("Delete this guide?")) return;
    save.run(`${PATH}?id=${encodeURIComponent(id)}`, { method: "DELETE" }, reload);
  };

  const closeEditor = () => {
    setEditing(null);
    save.setError(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Study Guides</h2>
        <button
          onClick={() => setEditing(blankGuide)}
          className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Guide
        </button>
      </div>

      {!editing && <ErrorText message={save.error ?? error} />}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {guides.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || "#3b82f6" }} />
                <div>
                  <p className="font-medium text-white">{g.topic}</p>
                  <p className="text-sm text-gray-400">
                    {g.series} · {formatGuideOn(g.guide_on)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(g)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-gray-400 hover:text-white">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => deleteGuide(g.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={closeEditor} title={editing.id ? "Edit Guide" : "Add Guide"}>
          <div className="grid gap-3">
            {FIELDS.map(({ key, label, type }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 uppercase">{label}</label>
                <input
                  type={type}
                  value={editing[key] ?? ""}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]"
                />
              </div>
            ))}
            <ErrorText message={save.error} />
            <button onClick={saveGuide} className="bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-2 rounded-lg font-medium">
              Save Guide
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

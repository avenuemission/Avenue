"use client";

import { useCallback, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/client/adminFetch";
import { ErrorText, jsonInit, loadJson, Modal, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

// A pathway_groups row as the admin GET sends it, and as the editor holds
// it (a new group has no id yet).
interface GroupRow {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  time: string | null;
  coordinator: string | null;
  phone: string | null;
  running: boolean;
  description: string | null;
  sort_order: number;
}

type EditableField = "name" | "latitude" | "longitude" | "time" | "coordinator" | "phone" | "description";
const FIELDS: EditableField[] = ["name", "latitude", "longitude", "time", "coordinator", "phone", "description"];
const isNumeric = (field: EditableField) => field === "latitude" || field === "longitude";

const PATH = "/api/admin/content/pathway-groups";

const blankGroup: GroupRow = {
  name: "",
  latitude: 0,
  longitude: 0,
  time: "",
  coordinator: "",
  phone: "",
  running: false,
  description: "",
  sort_order: 0,
};

export default function PathwaysTab({ adminKey }: AdminTabProps) {
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const save = useAdminSave(adminKey);
  const loadGroups = useCallback(
    async () => (await loadJson<{ groups: GroupRow[] }>(await adminFetch(PATH, adminKey), "pathway groups")).groups,
    [adminKey]
  );
  const { data, error, loading, reload } = useLoaded(loadGroups);
  const groups = data ?? [];

  const saveGroup = () => {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    save.run(PATH, jsonInit(method, editing), () => {
      setEditing(null);
      reload();
    });
  };

  const deleteGroup = (id: number | undefined) => {
    if (id === undefined || !confirm("Delete this group?")) return;
    save.run(`${PATH}?id=${id}`, { method: "DELETE" }, reload);
  };

  const closeEditor = () => {
    setEditing(null);
    save.setError(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Pathway Groups</h2>
        <button
          onClick={() => setEditing(blankGroup)}
          className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      {!editing && <ErrorText message={save.error ?? error} />}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div>
                <p className="font-medium text-white">{g.name}</p>
                <p className="text-sm text-gray-400">
                  {g.coordinator} · {g.time} · {g.running ? "Running" : "Starting soon"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(g)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-gray-400 hover:text-white">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => deleteGroup(g.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={closeEditor} title={editing.id ? "Edit Group" : "Add Group"}>
          <div className="grid gap-3">
            {FIELDS.map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 uppercase">{field}</label>
                <input
                  type={isNumeric(field) ? "number" : "text"}
                  value={editing[field] ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      [field]: isNumeric(field) ? parseFloat(e.target.value) || 0 : e.target.value,
                    })
                  }
                  className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.running}
                onChange={(e) => setEditing({ ...editing, running: e.target.checked })}
                className="rounded border-gray-600"
              />
              Running
            </label>
            <ErrorText message={save.error} />
            <button onClick={saveGroup} className="bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-2 rounded-lg font-medium">
              Save Group
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

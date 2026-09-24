"use client";

import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { ErrorText, jsonInit, loadJson, Modal, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

interface EventRow {
  key: string;
  title: string;
  description: string | null;
  location: string | null;
  time: string | null;
  sort_order: number;
}

interface EventDateRow {
  id: string;
  event_key: string;
  event_date: string;
  event_time: string;
}

interface NewDate {
  event_key: string;
  event_date: string;
  event_time: string;
}

type EditableField = "title" | "description" | "location" | "time";
const FIELDS: EditableField[] = ["title", "description", "location", "time"];

const PATH = "/api/admin/content/intersection-events";
const blankDate: NewDate = { event_key: "", event_date: "", event_time: "19:00" };

// Reads come from the public list; writes go to the admin API.
async function loadEvents(): Promise<{ events: EventRow[]; dates: EventDateRow[] }> {
  return loadJson<{ events: EventRow[]; dates: EventDateRow[] }>(
    await fetch("/api/content/intersection-events"),
    "events"
  );
}

export default function EventsTab({ adminKey }: AdminTabProps) {
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [newDate, setNewDate] = useState<NewDate>(blankDate);
  const save = useAdminSave(adminKey);
  const { data, error, reload } = useLoaded(loadEvents);
  const events = data?.events ?? [];
  const dates = data?.dates ?? [];

  const saveEvent = () => {
    if (!editingEvent) return;
    save.run(PATH, jsonInit("PUT", editingEvent), () => {
      setEditingEvent(null);
      reload();
    });
  };

  const addDate = () => {
    if (!newDate.event_key || !newDate.event_date) return;
    save.run(PATH, jsonInit("POST", newDate), () => {
      setNewDate(blankDate);
      reload();
    });
  };

  const deleteDate = (id: string) => {
    if (!confirm("Delete this date?")) return;
    save.run(`${PATH}?id=${encodeURIComponent(id)}`, { method: "DELETE" }, reload);
  };

  const closeEditor = () => {
    setEditingEvent(null);
    save.setError(null);
  };

  return (
    <div>
      {!editingEvent && <ErrorText message={save.error ?? error} />}

      <div className="grid gap-4 mb-6">
        {events.map((e) => (
          <div key={e.key} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{e.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{e.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {e.location} · {e.time}
                </p>
              </div>
              <button onClick={() => setEditingEvent(e)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-gray-400 hover:text-white">
                <Save className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3">
              <p className="text-xs uppercase text-gray-500 mb-2">Upcoming dates</p>
              <div className="flex flex-wrap gap-2">
                {dates
                  .filter((d) => d.event_key === e.key)
                  .map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs"
                    >
                      {d.event_date} @ {d.event_time}
                      <button onClick={() => deleteDate(d.id)} className="text-gray-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <h3 className="text-sm font-semibold mb-3">Add Event Date</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <select
            value={newDate.event_key}
            onChange={(e) => setNewDate({ ...newDate, event_key: e.target.value })}
            className="bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Select event</option>
            {events.map((e) => (
              <option key={e.key} value={e.key}>
                {e.title}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newDate.event_date}
            onChange={(e) => setNewDate({ ...newDate, event_date: e.target.value })}
            className="bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="time"
            value={newDate.event_time}
            onChange={(e) => setNewDate({ ...newDate, event_time: e.target.value })}
            className="bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          onClick={addDate}
          className="mt-3 flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Date
        </button>
      </div>

      {editingEvent && (
        <Modal onClose={closeEditor} title="Edit Event">
          <div className="grid gap-3">
            {FIELDS.map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 uppercase">{field}</label>
                <input
                  type="text"
                  value={editingEvent[field] ?? ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, [field]: e.target.value })}
                  className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
            <ErrorText message={save.error} />
            <button onClick={saveEvent} className="bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-2 rounded-lg font-medium">
              Save Event
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

// "Receive Event Updates via Email": posts to /api/forms/event-updates.
export default function EventUpdatesForm() {
  const [formData, setFormData] = useState({ name: "", email: "", company: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      try {
        const res = await fetch("/api/forms/event-updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.name, email: formData.email, company: formData.company, data: {} }),
        });
        if (!res.ok) throw new Error(`Form failed (${res.status})`);
        setSubmitted(true);
        setFormData({ name: "", email: "", company: "" });
        setTimeout(() => setSubmitted(false), 3000);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field - hidden from humans, bots will fill it */}
      <input
        type="text"
        name="company"
        value={formData.company}
        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
      />
      <div>
        <label className="block text-gray-400 text-xs md:text-sm mb-2 text-left uppercase tracking-wider">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
          required
        />
      </div>
      <div>
        <label className="block text-gray-400 text-xs md:text-sm mb-2 text-left uppercase tracking-wider">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
          required
        />
      </div>
      <button
        type="submit"
        className="btn-lamp px-12 py-3 text-sm"
      >
        Submit
      </button>
      {submitted && (
        <p className="text-green-400 text-sm">
          Thank you for subscribing!
        </p>
      )}
    </form>
  );
}

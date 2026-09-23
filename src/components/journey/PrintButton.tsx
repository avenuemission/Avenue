"use client";

// Opens the browser print dialog, which also offers Save as PDF.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print min-h-[44px] px-5 rounded-full border border-[var(--border)] text-white text-sm font-semibold"
    >
      Print or save as PDF
    </button>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <section className="min-h-[70vh] bg-black flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <span className="eyebrow mb-4">404</span>
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
          Page not found
        </h1>
        <p className="mt-6 text-[var(--muted)] md:text-lg leading-relaxed">
          This road doesn&apos;t lead anywhere. Let&apos;s get you back on the avenue.
        </p>
        <div className="mt-10">
          <Link
            href="/"
            className="inline-block bg-[var(--accent)] text-white px-10 py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm"
          >
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}

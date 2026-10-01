import Link from "next/link";
import PageTitle from "@/components/ui/PageTitle";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/ui/JsonLd";
import { FAQS } from "@/content/faq";
import { faqStructuredData } from "@/lib/domain/structuredData";

export const revalidate = 300;

// Every answer is open on the page (no accordion), so readers, search
// engines and AI assistants all see the same text as the FAQPage JSON-LD.
export default function FaqPage() {
  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <JsonLd data={faqStructuredData(FAQS)} />
      <PageTitle title="FAQ">
        &ldquo;Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you
        have.&rdquo; – Apostle Peter
      </PageTitle>

      <Section eyebrow="Questions" title="Common Questions" lead="Who we are, where we meet, and how to join." centered>
        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <Reveal key={faq.question} delay={index * 50}>
              <div className="panel p-6">
                <h3 className="text-lg md:text-xl font-semibold text-white">{faq.question}</h3>
                <p className="mt-3 text-base md:text-lg leading-relaxed text-[var(--muted)]">{faq.answer}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex flex-wrap justify-center gap-3">
          <Link href="/pathways" className="btn-lamp px-8 py-3 text-sm">
            Find a Pathway
          </Link>
          <Link href="/intersection" className="btn-night px-8 py-3 text-sm">
            Intersection
          </Link>
        </Reveal>
      </Section>
    </div>
  );
}

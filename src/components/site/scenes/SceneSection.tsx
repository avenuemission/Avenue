import type { ReactNode } from "react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import SceneStage from "./SceneStage";

interface SceneSectionProps {
  /** One of the night scene SVGs. */
  scene: ReactNode;
  eyebrow: string;
  title: string;
  /** The explainer paragraphs. */
  children: ReactNode;
  /** Anything under the copy, such as links. */
  footer?: ReactNode;
}

/**
 * A night scene with its explainer copy: scene left and copy right on
 * desktop, stacked with the scene first on phones.
 */
export default function SceneSection({ scene, eyebrow, title, children, footer }: SceneSectionProps) {
  return (
    <Section width="wide">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
        <Reveal className="min-w-0">
          <div className="rounded-2xl bg-[var(--night)] p-3.5 overflow-hidden">
            <SceneStage>{scene}</SceneStage>
          </div>
        </Reveal>

        <Reveal delay={100} className="scene-copy min-w-0">
          <span className="eyebrow mb-4">{eyebrow}</span>
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white text-balance">{title}</h2>
          <div className="mt-6 space-y-4 text-[var(--muted)] md:text-lg leading-relaxed max-w-md">{children}</div>
          {footer}
        </Reveal>
      </div>
    </Section>
  );
}

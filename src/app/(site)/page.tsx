import type { Metadata } from "next";
import Link from "next/link";
import SceneStage from "@/components/site/scenes/SceneStage";
import SkylineScene from "@/components/site/scenes/SkylineScene";
import { pageMetadata } from "@/lib/domain/pageMeta";

export const metadata: Metadata = pageMetadata("/");

export const revalidate = 300;

/**
 * The landing hero: Melbourne at night with six streets running to a cross
 * on the horizon (docs/design/landing-skyline-mockup.html, draft 5). Desktop:
 * the scene fills the hero with the text top left over a dark scrim. Phones:
 * the scene on top, cropped around the cross, and the text centred below.
 */
export default function Home() {
  return (
    <div className="bg-[var(--night)] overflow-hidden">
      <section className="relative md:h-[calc(100svh-4rem)] md:min-h-[560px]">
        <div className="skyline-frame">
          <SceneStage trigger="load" className="scene-skyline">
            <SkylineScene />
          </SceneStage>
          <div aria-hidden="true" className="skyline-scrim hidden md:block" />
        </div>

        <div className="relative z-10 px-6 pt-5 pb-16 text-center md:absolute md:left-[5.5%] md:top-[12%] md:w-[min(40%,30rem)] md:p-0 md:text-left">
          <h1 className="text-[26px] md:text-3xl lg:text-4xl xl:text-[44px] font-bold uppercase tracking-tight text-white leading-[1.05] text-balance mb-3 md:mb-4">
            Unleashing <span className="whitespace-nowrap">God-given</span> potential
          </h1>
          <p
            className="hero-in text-[#b9c0cf] text-sm md:text-[15px] xl:text-base leading-relaxed max-w-sm mx-auto md:mx-0 md:max-w-[26rem] mb-5 md:mb-6"
            style={{ animationDelay: "120ms" }}
          >
            Avenue is a decentralised movement of people following Jesus, convinced that disciple-making
            doesn&apos;t require more church buildings, just the willingness to open the spaces we already have
          </p>
          <Link
            href="/vision"
            className="hero-in btn-lamp px-8 py-3"
            style={{ animationDelay: "240ms" }}
          >
            EXPLORE
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import SceneStage from "@/components/site/scenes/SceneStage";
import SkylineScene from "@/components/site/scenes/SkylineScene";

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

        <div className="relative z-10 px-6 pt-5 pb-16 text-center md:absolute md:left-[5.5%] md:top-[11%] md:w-[min(42%,34rem)] md:p-0 md:text-left">
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase tracking-tight text-white leading-[1.02] text-balance mb-3 md:mb-5">
            Unleashing <span className="whitespace-nowrap">God-given</span> potential
          </h1>
          <p
            className="hero-in text-[#b9c0cf] text-sm md:text-base lg:text-lg leading-relaxed max-w-sm mx-auto md:mx-0 md:max-w-md mb-5 md:mb-7"
            style={{ animationDelay: "120ms" }}
          >
            Avenue is a decentralised movement of people following Jesus, convinced that disciple-making
            doesn&apos;t require more church buildings, just the willingness to open the spaces we already have
          </p>
          <Link
            href="/vision"
            className="hero-in inline-block bg-[var(--accent)] text-white px-8 py-3 rounded-full font-medium tracking-wider hover:brightness-110 transition-all"
            style={{ animationDelay: "240ms" }}
          >
            EXPLORE
          </Link>
        </div>
      </section>
    </div>
  );
}

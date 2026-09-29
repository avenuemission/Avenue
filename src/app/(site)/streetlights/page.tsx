import Image from "next/image";
import ImageCarousel from "@/components/site/ImageCarousel";
import PageTitle from "@/components/ui/PageTitle";
import Reveal from "@/components/ui/Reveal";
import RowLinkContent from "@/components/ui/RowLinkContent";
import SceneSection from "@/components/site/scenes/SceneSection";
import StreetlightsScene from "@/components/site/scenes/StreetlightsScene";
import HomeboundAlbum from "./_components/HomeboundAlbum";
import MissionInitiatives from "./_components/MissionInitiatives";
import { getCarouselImages } from "@/lib/server/content";
import { shuffled } from "@/lib/domain/shuffle";
import { CREATIVE_INITIATIVES } from "@/content/site";

export const revalidate = 300;

export default async function StreetlightsPage() {
  const carousel = await getCarouselImages("streetlights_carousel");

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <PageTitle title="Streetlights">
        &ldquo;The King will reply, &apos;Truly I tell you, whatever you did for
        one of the least of these brothers and sisters of mine, you did for
        me&apos;&rdquo; – Jesus
      </PageTitle>

      {/* Image Carousel - Scroll-linked */}
      <ImageCarousel images={shuffled(carousel)} />

      {/* Light for the street: the night scene */}
      <SceneSection scene={<StreetlightsScene />} eyebrow="Light for the street" title="Every pathway lights its street">
        <p>God has placed each pathway in its neighbourhood on purpose. Streetlights are how it shines there.</p>
        <p>
          Homeless outreach, songwriting, podcasts, mission trips, partnerships with local churches and
          organisations. Avenue helps every group turn a God-given idea into light for the people around them.
        </p>
      </SceneSection>

      {/* Mission Initiatives Section */}
      <section id="mission-initiatives" className="relative py-16 scroll-mt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/beach.png"
            alt="Beach"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10">
          <Reveal className="text-center mb-12">
            <span className="eyebrow mb-4">Serve</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Mission Initiatives
            </h2>
          </Reveal>

          <MissionInitiatives />
        </div>
      </section>

      {/* Creative Initiatives Section */}
      <section id="creative-initiatives" className="relative py-20 scroll-mt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/ocean_grove_night.png"
            alt="Ocean Grove at Night"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 text-center">
          <Reveal className="mb-12">
            <span className="eyebrow mb-4">Create</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Creative Initiatives
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-3 max-w-[560px] mx-auto mb-12">
            <Reveal delay={0}>
              <HomeboundAlbum />
            </Reveal>
            <Reveal delay={80}>
              <a
                href={CREATIVE_INITIATIVES.pathwaysPodcast.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="row-link"
              >
                <RowLinkContent title="Pathways" subtitle="Podcast" />
              </a>
            </Reveal>
            <Reveal delay={160}>
              <a
                href={CREATIVE_INITIATIVES.saturdayClub.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="row-link"
              >
                <RowLinkContent title="The Saturday" subtitle="Club" />
              </a>
            </Reveal>
            <Reveal delay={240}>
              <a href="/apest-quiz" className="row-link">
                <RowLinkContent title="APEST" subtitle="Quiz" />
              </a>
            </Reveal>
          </div>

          <p className="text-white italic text-sm md:text-base max-w-2xl mx-auto">
            As humanity carries the breath of God, we also carry the breath of
            creativity. We love ideas, both big and small, and are keen to
            support and facilitate.
          </p>

          <p className="text-white italic text-sm md:text-base mt-8">
            &ldquo;In the beginning God created the heavens and the earth.&rdquo;
          </p>
        </div>
      </section>

      {/* Tithe Section */}
      <section id="giving" className="bg-black py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 text-center">
          <Reveal className="mb-8">
            <span className="eyebrow mb-4">Give</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Support Avenue
            </h2>
          </Reveal>

          <p className="text-[var(--muted)] text-base md:text-lg leading-relaxed mb-8">
            Your generous giving helps Avenue Streetlights bless people in our
            communities and beyond. Together, we can continue to serve, create,
            and share the love of Jesus with those in need.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <a
              href="https://egiving.org.au/Avenue?filter=tithe"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lamp px-12 py-4 text-lg"
            >
              Tithe
            </a>
            <a
              href="https://egiving.org.au/Avenue?filter=local"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-night inline-block px-12 py-4 text-lg"
            >
              Local Offering
            </a>
          </div>

          <p className="text-white italic text-sm md:text-base max-w-xl mx-auto">
            &ldquo;Each of you should give what you have decided in your heart
            to give, not reluctantly or under compulsion, for God loves a
            cheerful giver.&rdquo; – 2 Corinthians 9:7
          </p>
        </div>
      </section>

    </div>
  );
}

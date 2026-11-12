import Image from "next/image";
import Link from "next/link";
import PathwayMap from "@/components/site/PathwayMap";
import ImageCarousel from "@/components/site/ImageCarousel";
import WeeklyTopic from "@/components/site/WeeklyTopic";
import PageTitle from "@/components/ui/PageTitle";
import Reveal from "@/components/ui/Reveal";
import SceneSection from "@/components/site/scenes/SceneSection";
import PathwaysScene from "@/components/site/scenes/PathwaysScene";
import CountUp from "./_components/CountUp";
import { getCarouselImages, getPathwayGroups, getSiteStats, getStudyGuides } from "@/lib/server/content";
import { statValue } from "@/lib/domain/content";
import { weeklyTopic } from "@/lib/domain/studyGuides";
import { melbourneDateOf } from "@/lib/domain/dates/melbourne";
import { shuffled } from "@/lib/domain/shuffle";

export const revalidate = 300;

export default async function PathwaysPage() {
  const [stats, groups, guides, carousel] = await Promise.all([
    getSiteStats(),
    getPathwayGroups(),
    getStudyGuides(),
    getCarouselImages("pathways_carousel"),
  ]);
  const week = weeklyTopic(guides, melbourneDateOf(new Date()));

  return (
    <div className="min-h-screen bg-black overflow-x-clip">
      <PageTitle title="Pathways">
        &ldquo;Every day they continued to meet together in the temple courts.
        They broke bread in their homes and ate together with glad and sincere
        hearts.&rdquo; – Doctor Luke
      </PageTitle>

      {/* Image Carousel - Scroll-linked */}
      <ImageCarousel images={shuffled(carousel)} />

      {/* How it works: the night scene */}
      <SceneSection scene={<PathwaysScene />} eyebrow="How it works" title="Church around a table">
        <p>
          A pathway is a microchurch. A few people meet in a home, a library or a school, wherever God has placed
          them.
        </p>
        <p>
          We eat together, read the Bible together, pray and look out for one another. When a pathway grows, it sends
          people out to light up the next home, so the avenue keeps getting brighter.
        </p>
      </SceneSection>

      {/* Statistics Section */}
      <section className="bg-black py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="grid grid-cols-3 gap-8 md:gap-16 text-center">
            <div>
              <div className="text-5xl md:text-8xl font-bold text-white">
                <CountUp end={statValue(stats, "communities")} />
              </div>
              <div className="text-xs md:text-sm text-[var(--muted)] uppercase tracking-wider mt-2">
                Pathway Communities
              </div>
            </div>
            <div>
              <div className="text-5xl md:text-8xl font-bold text-white">
                <CountUp end={statValue(stats, "countries")} />
              </div>
              <div className="text-xs md:text-sm text-[var(--muted)] uppercase tracking-wider mt-2">
                Countries
              </div>
            </div>
            <div>
              <div className="text-5xl md:text-8xl font-bold text-white">
                <CountUp end={statValue(stats, "languages")} />
              </div>
              <div className="text-xs md:text-sm text-[var(--muted)] uppercase tracking-wider mt-2">
                Languages
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Find a Pathway Section */}
      <section className="bg-black py-16 md:py-24 overflow-x-clip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left Content: level with the top of the map, and stays in view beside the form */}
            <Reveal className="space-y-5 px-2 lg:sticky lg:top-28">
              <span className="eyebrow">Join a group</span>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold uppercase tracking-tight text-white leading-[1.05] text-balance">
                Find a Pathway Community Near You
              </h2>
              <p className="text-[var(--muted)] text-sm sm:text-base leading-relaxed max-w-lg">
                Pathway groups are microchurch communities growing together,
                empowered by the Spirit of God. We meet in homes, libraries,
                schools, wherever the LORD has sent us. We eat together, read
                the bible together, discuss and encourage others through
                friendship and prayer.
              </p>
            </Reveal>

            {/* Right Content - Map and Form */}
            <Reveal delay={100} className="relative w-full">
              <PathwayMap groups={groups} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* This Week's Topic + Pathways Podcast */}
      <WeeklyTopic current={week.current} upcoming={week.upcoming} />

      {/* Start Your Own Pathway Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/monash_bbq.png"
            alt="Monash BBQ"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">

            {/* Left - Call to become a leader */}
            <Reveal className="space-y-6 px-2">
              <span className="eyebrow">Lead</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
                Make Disciples
              </h2>

              <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed">
                Jesus never asked us to fill rooms. He asked us to make
                disciples who go on to make disciples of their own. That happens
                in living rooms and around tables, carried by ordinary people
                who decide to pick it up.
              </p>

              <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed">
                Becoming a pathway leader is where that begins at Avenue. We
                train you, walk with you, and give you everything you need to
                gather people and grow them. You bring the willingness.
              </p>

              <div className="pt-4">
                {/* No prefetch: /login pulls in supabase-js. */}
                <Link
                  href="/login"
                  prefetch={false}
                  className="btn-lamp px-10 py-3 text-sm"
                >
                  Become a Pathway Leader
                </Link>
              </div>

              <p className="text-white italic text-sm md:text-base pt-6">
                &ldquo;The harvest is plentiful but the workers are few.&rdquo; &ndash; Jesus
              </p>
            </Reveal>

            {/* Right - Stats */}
            <div className="relative w-full overflow-hidden">
              <div className="w-full max-w-full flex flex-col items-end justify-start pt-8 px-2">
                <div className="text-right">
                  <div className="text-7xl sm:text-8xl md:text-9xl font-bold text-white mb-4">
                    <CountUp end={statValue(stats, "new_groups")} />
                  </div>
                  <div className="text-sm md:text-base text-gray-400 uppercase tracking-wider leading-relaxed">
                    New Pathway
                    <br />
                    Groups Starting
                    <br />
                    Soon
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}

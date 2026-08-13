"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import PathwayMap from "@/components/PathwayMap";
import ImageCarousel from "@/components/PathwaysCarousel";
import WeeklyTopic from "@/components/WeeklyTopic";
import PageTitle from "@/components/ui/PageTitle";
import Reveal from "@/components/ui/Reveal";
import { getPathwayStats } from "@/lib/content";


// Counter animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

export default function PathwaysPage() {
  const [stats, setStats] = useState({ communities: 6, countries: 1, languages: 5, newGroupsStartingSoon: 3 });

  useEffect(() => {
    getPathwayStats().then((loaded) => {
      setStats({
        communities: loaded.communities ?? 6,
        countries: loaded.countries ?? 1,
        languages: loaded.languages ?? 5,
        newGroupsStartingSoon: loaded.new_groups ?? 3,
      });
    });
  }, []);

  // Animated counters
  const communitiesCount = useCountUp(stats.communities);
  const countriesCount = useCountUp(stats.countries);
  const languagesCount = useCountUp(stats.languages);
  const newGroupsCount = useCountUp(stats.newGroupsStartingSoon);

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <PageTitle title="Pathways">
        &ldquo;Every day they continued to meet together in the temple courts.
        They broke bread in their homes and ate together with glad and sincere
        hearts.&rdquo; – Doctor Luke
      </PageTitle>

      {/* Image Carousel - Scroll-linked */}
      <ImageCarousel folder="pathways_carousel" />

      {/* Statistics Section */}
      <section className="bg-black py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="grid grid-cols-3 gap-8 md:gap-16 text-center">
            <div>
              <div className="text-5xl md:text-8xl font-bold text-white">
                {communitiesCount}
              </div>
              <div className="text-xs md:text-sm text-[var(--muted)] uppercase tracking-wider mt-2">
                Pathway Communities
              </div>
            </div>
            <div>
              <div className="text-5xl md:text-8xl font-bold text-white">
                {countriesCount}
              </div>
              <div className="text-xs md:text-sm text-[var(--muted)] uppercase tracking-wider mt-2">
                Countries
              </div>
            </div>
            <div>
              <div className="text-5xl md:text-8xl font-bold text-white">
                {languagesCount}
              </div>
              <div className="text-xs md:text-sm text-[var(--muted)] uppercase tracking-wider mt-2">
                Languages
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Find a Pathway Section */}
      <section className="bg-black py-16 md:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <Reveal className="space-y-6 px-2">
              <span className="eyebrow">Join a group</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white leading-tight">
                Find a Pathway Community Near You
              </h2>
              <p className="text-[var(--muted)] text-sm sm:text-base md:text-lg leading-relaxed max-w-lg">
                Pathway groups are house church communities growing together,
                empowered by the Spirit of God. We meet in homes, libraries,
                schools, wherever the LORD has sent us. We eat together, read
                the bible together, discuss and encourage others through
                friendship and prayer.
              </p>
            </Reveal>

            {/* Right Content - Map and Form */}
            <Reveal delay={100} className="relative w-full">
              <PathwayMap />
            </Reveal>
          </div>
        </div>
      </section>

      {/* This Week's Topic + Pathways Podcast */}
      <WeeklyTopic />

      {/* Start Your Own Pathway Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/monash_bbq.png"
            alt="Monash BBQ"
            fill
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
                <Link
                  href="/login#signup"
                  className="inline-block bg-[var(--accent)] text-white px-10 py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm"
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
                    {newGroupsCount}
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

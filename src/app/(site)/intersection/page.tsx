import Image from "next/image";
import ImageCarousel from "@/components/site/ImageCarousel";
import PageTitle from "@/components/ui/PageTitle";
import Reveal from "@/components/ui/Reveal";
import SceneSection from "@/components/site/scenes/SceneSection";
import IntersectionScene from "@/components/site/scenes/IntersectionScene";
import EventCountdown from "./_components/EventCountdown";
import EventUpdatesForm from "./_components/EventUpdatesForm";
import StayConnected from "./_components/StayConnected";
import { getCarouselImages, getIntersectionEvents } from "@/lib/server/content";
import { shuffled } from "@/lib/domain/shuffle";
import { prayerAndPraiseEvent } from "@/lib/domain/structuredData";
import JsonLd from "@/components/ui/JsonLd";

export const revalidate = 300;

export default async function IntersectionPage() {
  const [events, carousel] = await Promise.all([getIntersectionEvents(), getCarouselImages("intersection_carousel")]);
  const prayerAndPraise = events.find((e) => e.key === "prayerAndPraise");
  if (!prayerAndPraise) throw new Error("intersection_events has no prayerAndPraise row");

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Prayer & Praise for search engines: the next one, and the weekly schedule. */}
      <JsonLd data={prayerAndPraiseEvent(new Date())} />
      <PageTitle title="Intersection">
        &ldquo;May the God of endurance and encouragement grant you to live in
        such harmony with one another, in accord with Christ Jesus, that
        together you may with one voice glorify the God and Father of our Lord
        Jesus Christ.&rdquo; – Apostle Paul
      </PageTitle>

      {/* Image Carousel - Scroll-linked */}
      <ImageCarousel images={shuffled(carousel)} />

      {/* Where pathways meet: the night scene */}
      <SceneSection scene={<IntersectionScene />} eyebrow="Where roads meet" title="Where pathways meet">
        <p>Each pathway walks its own street, and every street leads back to Jesus.</p>
        <p>
          When our paths cross, we gather as one family: weekly Prayer and Praise, combined pathway nights, quarterly
          sermons, Avenue camps and plenty of fun in between. Many homes, one voice.
        </p>
      </SceneSection>

      {/* Event Countdown Section */}
      <section className="relative py-16">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/prayer_and_praise.png"
            alt="Prayer and Praise"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10">
          <Reveal className="text-center mb-12">
            <span className="eyebrow mb-4">What&apos;s on</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Event Countdown
            </h2>
          </Reveal>

          <div className="max-w-md mx-auto">
            {/* Prayer & Praise */}
            <Reveal>
              <div className="panel p-6 space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-white uppercase tracking-wider">
                  {prayerAndPraise.title}
                </h3>
                <p className="text-gray-300 text-sm md:text-base">
                  {prayerAndPraise.description}
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">
                    <span className="text-gray-500 uppercase">Location:</span>{" "}
                    {prayerAndPraise.location}
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500 uppercase">Time:</span>{" "}
                    {prayerAndPraise.time}
                  </p>
                </div>
                <div className="pt-4">
                  <EventCountdown dates={prayerAndPraise.dates} />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stay in the Loop Section */}
      <section className="relative py-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/lookout.png"
            alt="Lookout"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 text-center">
          <Reveal className="mb-12">
            <span className="eyebrow mb-4">Stay connected</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Stay in the Loop
            </h2>
          </Reveal>

          {/* Social Media Buttons */}
          <StayConnected />

          {/* Email Subscription Form */}
          <div className="max-w-lg mx-auto">
            <p className="text-white text-sm md:text-base uppercase tracking-wider mb-8">
              Receive Event Updates via Email
            </p>

            <EventUpdatesForm />
          </div>
        </div>
      </section>

    </div>
  );
}

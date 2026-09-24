import Image from "next/image";
import ImageCarousel from "@/components/site/ImageCarousel";
import PageTitle from "@/components/ui/PageTitle";
import Reveal from "@/components/ui/Reveal";
import EventCountdown from "./_components/EventCountdown";
import EventUpdatesForm from "./_components/EventUpdatesForm";
import StayConnected from "./_components/StayConnected";
import { getCarouselImages, getIntersectionEvents } from "@/lib/server/content";
import { shuffled } from "@/lib/domain/shuffle";

export const revalidate = 300;

export default async function IntersectionPage() {
  const [events, carousel] = await Promise.all([getIntersectionEvents(), getCarouselImages("intersection_carousel")]);
  const prayerAndPraise = events.find((e) => e.key === "prayerAndPraise");
  if (!prayerAndPraise) throw new Error("intersection_events has no prayerAndPraise row");

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <PageTitle title="Intersection">
        &ldquo;May the God of endurance and encouragement grant you to live in
        such harmony with one another, in accord with Christ Jesus, that
        together you may with one voice glorify the God and Father of our Lord
        Jesus Christ.&rdquo; – Apostle Paul
      </PageTitle>

      {/* Image Carousel - Scroll-linked */}
      <ImageCarousel images={shuffled(carousel)} />

      {/* Intersection Diagram and Description Section */}
      <section className="bg-black pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left - Diagram */}
            <div className="relative flex justify-center lg:justify-start overflow-visible">
              <div
                className="
                  relative
                  h-[450px] md:h-[550px] lg:h-[600px] xl:h-[650px]   /* ⭐ Medium size */
                  w-full overflow-visible
                "
              >
                <Image
                  src="/images/intersection_diagram.png"
                  alt="Intersection Diagram"
                  fill
                  sizes="(min-width: 1024px) 1000px, 100vw"
                  className="
                    object-contain
                    scale-[1.0] md:scale-[1.15] lg:scale-[1.25]      /* ⭐ Less aggressive scaling */
                    lg:-translate-x-12 lg:translate-y-6              /* ⭐ Softer positioning */
                  "
                />
              </div>
            </div>


            {/* Right - Content */}
            <Reveal delay={100} className="space-y-6 lg:pl-8">
              <span className="eyebrow">Where roads meet</span>
              <p className="text-[var(--muted)] md:text-lg leading-relaxed max-w-md">
                As pathway groups gather around Jesus, they occasionally come
                into contact, and during these intersections, we come together to
                worship God in one spirit. We express our worship through
                community, music, prayer, and leisure, creating moments that
                draw us closer to God and to one another. These gatherings take
                many forms, including weekly Prayer and Praise sessions,
                combined pathway events, quarterly sermons, Avenue camps, and a
                variety of other meaningful and fun social activities.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

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

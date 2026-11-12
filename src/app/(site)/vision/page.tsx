import Image from "next/image";
import Link from "next/link";
import ImageCarousel from "@/components/site/ImageCarousel";
import DisclosureGroup from "./_components/DisclosureGroup";
import CrossTheAvenue from "./_components/CrossTheAvenue";
import WatchVideos from "./_components/WatchVideos";
import { getCarouselImages } from "@/lib/server/content";
import { shuffled } from "@/lib/domain/shuffle";
import PageTitle from "@/components/ui/PageTitle";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import SceneSection from "@/components/site/scenes/SceneSection";
import VisionScene from "@/components/site/scenes/VisionScene";

const valuesData = [
  {
    title: "The Gospel is our cause",
    content: "We see the Bible as the story of God moving to be with humanity.",
  },
  {
    title: "The Spirit is our guide",
    content: "We partner with what the Spirit is already doing in our world.",
  },
  {
    title: "Worship is our response",
    content: "We give our whole life to loving God and loving others.",
  },
  {
    title: "Multiplication is our mission",
    content: "We multiply into many by investing in one.",
  },
  {
    title: "Inclusivity is our culture",
    content: "We are intentional about building bridges with people.",
  },
];

const beliefsData = [
  {
    question: "What do we believe about God?",
    answer:
      "We believe in one God: Father, Son, and Holy Spirit. God is love and the Creator of all things. Jesus Christ is our Savior, fully God and fully human, who lived, died, and rose again for our salvation. The Holy Spirit works in us to guide, comfort, and transform us. The Spirit's inspired scriptures are the way we know the heart of God",
  },
  {
    question: "What do we believe about humanity?",
    answer:
      "We believe every person is created in God's image, designed for relationship with Him and others. Though sin has separated us from God, He seeks to restore us through Jesus Christ who desires to be with his creation. While sin has left a stain that leads to the tendency to do evil, everyone has the free choice to respond to God's salvation.",
  },
  {
    question: "What do we believe about salvation?",
    answer:
      "We believe that salvation is a gift of grace through faith in Jesus and is through no work of our own. Jesus' life, death, and resurrection provide forgiveness and new life. Through Him, we are called to live in freedom of that salvation by living as obedient disciples who are becoming more like him in every way.",
  },
  {
    question: "What do we believe about the church?",
    answer:
      "We believe the church is a community of believers who follow Jesus together, worship God, and share His love with the world. The church is not a building but a movement of people living out God's mission. Through baptism, we give our lives to Jesus and join the family of God. We also share in the Lord's Supper as a way of remembering and celebrating the sacrifice of Jesus, allowing for all to have a seat at the table.",
  },
  {
    question: "What do we believe about daily living?",
    answer:
      "We believe faith shapes every part of life and the Bible is our guide for living out our faith practically. God calls us to love Him and others, care for our bodies, serve our communities, give generously and live with integrity. We also believe in the gift of the Seventh-day Sabbath; a time to pause, worship, delight in God and connect with others. It reminds us that our worth is found not in what we do, but in who we are as His children.",
  },
  {
    question: "What do we believe about the end?",
    answer:
      "We believe Jesus will return to make all things new. The second coming is a wedding where the righteous will join Jesus in heaven. Jesus will also restore the earth with justice and finally end suffering, dwelling with his people who will reign with him forever in the new earth. Until then, we live with the hope of his return, sharing His love and truth with the world.",
  },
];

export const revalidate = 300;

export default async function VisionPage() {
  // Pooled from all three areas and shuffled as one set.
  const carousel = (
    await Promise.all(["pathways_carousel", "intersection_carousel", "streetlights_carousel"].map(getCarouselImages))
  ).flat();

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <PageTitle title="Vision">
        &ldquo;Therefore go and make disciples of all nations, baptizing them in
        the name of the Father and of the Son and of the Holy Spirit, and
        teaching them to obey everything I have commanded you. And surely I am
        with you always, to the very end of the age.&rdquo; – Jesus
      </PageTitle>

      {/* Pooled carousel from all three areas, shuffled */}
      <ImageCarousel images={shuffled(carousel)} />

      {/* ===================== */}
      {/* WATCH: two short videos */}
      {/* ===================== */}
      <Section eyebrow="Watch" title="Meet Avenue" width="wide">
        <WatchVideos />
      </Section>

      {/* ===================== */}
      {/* THE MODEL */}
      {/* ===================== */}
      <SceneSection
        scene={<VisionScene />}
        eyebrow="The model"
        title="One light, many homes"
        footer={
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { href: "/pathways", label: "Pathways" },
              { href: "/intersection", label: "Intersection" },
              { href: "/streetlights", label: "Streetlights" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        }
      >
        <p>Everything begins with Jesus, the light at the centre of it all.</p>
        <p>
          Pathways are house churches: small communities meeting in homes, growing together around Him. From every
          home, streetlights reach out into the neighbourhood. And where pathways cross, they meet at the intersection
          to worship God in one spirit.
        </p>
      </SceneSection>

      {/* ===================== */}
      {/* OUR VISION */}
      {/* ===================== */}
      <Section eyebrow="Direction" title="Our Vision" lead="Where we are headed and what drives us." centered>
        <div className="space-y-4 mb-10">
          <DisclosureGroup
            items={[
              { question: "MISSION", answer: "To unleash God-given potential.", delay: 0 },
              { question: "VISION", answer: "To be an expanding network of missional microchurches.", delay: 60 },
              {
                question: "VALUES",
                delay: 120,
                answer: (
                  <div className="space-y-4">
                    {valuesData.map((value) => (
                      <div key={value.title} className="border-l-2 border-[var(--accent)]/50 pl-4">
                        <h4 className="text-white text-base md:text-lg font-semibold mb-1">
                          {value.title}
                        </h4>
                        <p className="text-[var(--muted)] text-sm md:text-base leading-relaxed">
                          {value.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* 2027 Goal: bordered panel, accent eyebrow */}
        <Reveal>
          <div className="panel p-8 md:p-10 text-center">
            <span className="eyebrow mb-3">Vision for End of 2027</span>
            <p className="text-white text-2xl md:text-4xl font-bold leading-snug">
              10 Pathway Groups
              <br className="hidden md:block" /> with 20 Healthy Leaders
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ===================== */}
      {/* BELIEFS: the one photo moment */}
      {/* ===================== */}
      <section className="relative w-full">
        <div className="absolute inset-0">
          <Image src="/images/alan_baptism.png" alt="Baptism" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="relative z-10 py-20 md:py-28 px-6">
          <div className="max-w-4xl mx-auto">
            <Reveal className="text-center mb-12">
              <span className="eyebrow mb-5">What we hold</span>
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
                Beliefs
              </h2>
              <p className="mt-4 mx-auto max-w-2xl text-lg text-gray-300 leading-relaxed">
                We are a church supported by the Seventh-Day Adventist Church.
                Here is a snapshot of what we believe:
              </p>
            </Reveal>

            <div className="space-y-4">
              <DisclosureGroup
                items={beliefsData.map((belief, index) => ({
                  question: belief.question,
                  answer: belief.answer,
                  delay: index * 50,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* CROSS THE AVENUE: a small game to close the page */}
      {/* ===================== */}
      <Section
        eyebrow="Take a breather"
        title="Cross the Avenue"
        lead="Hop across the streets of Melbourne at night. Every streetlight you pass comes on."
        width="wide"
        centered
      >
        <CrossTheAvenue />
      </Section>
    </div>
  );
}

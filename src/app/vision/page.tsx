"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";

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
      "We believe in one God—Father, Son, and Holy Spirit—who is love and the Creator of all things. Jesus Christ is our Savior, fully God and fully human, who lived, died, and rose again for our salvation. The Holy Spirit works in us to guide, comfort, and transform us. The Spirit's inspired scriptures are the way we know the heart of God",
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

interface GlassBubbleProps {
  title: string;
  content: string;
  isExpanded: boolean;
  onClick: () => void;
}

function GlassBubble({ title, content, isExpanded, onClick }: GlassBubbleProps) {
  return (
    <>
      {/* Collapsed bubble */}
      <button
        onClick={onClick}
        className={`
          relative px-8 py-6 rounded-3xl cursor-pointer
          transition-all duration-500 ease-out
          backdrop-blur-xl bg-white/10 border border-white/20
          hover:bg-white/15 hover:border-white/30 hover:scale-105
          shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
          ${isExpanded ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"}
        `}
      >
        <h3 className="text-white text-xl md:text-2xl font-semibold tracking-wide">
          {title}
        </h3>
      </button>

      {/* Expanded modal overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={onClick}
        >
          <div
            className="
              relative max-w-2xl w-full p-8 md:p-12 rounded-3xl
              backdrop-blur-2xl bg-white/15 border border-white/25
              shadow-[0_25px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
              animate-scaleIn
            "
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClick}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-6">
              {title}
            </h3>
            <p className="text-gray-200 text-lg md:text-xl leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

interface BeliefCardProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onClick: () => void;
}

function BeliefCard({ question, answer, isExpanded, onClick }: BeliefCardProps) {
  return (
    <div
      className={`
        relative rounded-2xl cursor-pointer overflow-hidden
        transition-all duration-500 ease-out
        backdrop-blur-xl bg-white/10 border border-white/20
        hover:bg-white/15 hover:border-white/30
        shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between p-6">
        <h3 className="text-white text-lg md:text-xl font-semibold pr-4">
          {question}
        </h3>
        <ChevronDown
          className={`text-white/70 flex-shrink-0 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          size={24}
        />
      </div>
      <div
        className={`
          overflow-hidden transition-all duration-500 ease-out
          ${isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <p className="px-6 pb-6 text-gray-200 text-base md:text-lg leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function VisionPage() {
  const [expandedBubble, setExpandedBubble] = useState<string | null>(null);
  const [expandedBelief, setExpandedBelief] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black overflow-hidden">

      {/* ===================== */}
      {/* HERO SECTION */}
      {/* ===================== */}
      <section className="relative w-full">

        {/* Earth Horizon Image */}
        <div className="relative h-[500px] md:h-[800px] w-full overflow-hidden">
          <Image
            src="/images/vision_page_earth_horizon_day.png"
            alt="Earth horizon from space"
            fill
            className="object-bottom object-cover"
            priority
          />

          {/* TOP-ALIGNED QUOTE */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 w-full max-w-5xl">
            <p className="text-white italic text-center text-sm md:text-lg drop-shadow-lg">
              &ldquo;Therefore go and make disciples of all nations, baptizing
              them in the name of the Father and of the Son and of the Holy
              Spirit, and teaching them to obey everything I have commanded you.
              And surely I am with you always, to the very end of the age.&rdquo;
              – Jesus
            </p>
          </div>
        </div>

      </section>



      {/* ===================== */}
      {/* AVENUE ORBIT SECTION */}
      {/* ===================== */}
      <section className="bg-black py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">

          <div className="grid lg:grid-cols-2 gap-10 items-center">

          {/* Orbit Diagram */}
          <div className="relative flex justify-center lg:justify-start overflow-visible">
            <div
              className="
                relative
                h-[450px] md:h-[500px] lg:h-[550px] xl:h-[600px]
                w-full
                overflow-visible
              "
            >
            <Image
              src="/images/vision_avenue_orbit.png"
              alt="Avenue Orbit Diagram"
              fill
              className="
                object-left object-contain

                /* ===== MOBILE ===== */
                scale-[0.85]           /* bigger than 0.6 */
                translate-x-0          /* center, not right */
                translate-y-4          /* slight down shift */

                /* ===== TABLET ===== */
                md:scale-[1.1]         /* medium sized */
                md:translate-x-4       /* slight push right */
                md:translate-y-10      /* moderate down shift */

                /* ===== LAPTOP ===== */
                lg:scale-[1.5]         /* keep your good laptop scale */
                lg:-translate-x-40     /* your preferred left shift */
                lg:translate-y-20      /* your preferred downward shift */
              "

            />

            </div>
          </div>




            {/* Text Section */}
            <div className="text-white space-y-6 lg:pl-8">
              <h2 className="text-4xl md:text-6xl font-bold">
                AVENUE ORBIT
              </h2>

              <div className="space-y-4 text-gray-300 md:text-lg leading-relaxed max-w-md">
                <p>
                  Everything is centred around Jesus. Pathway groups are house
                  church communities growing together, empowered by the Spirit
                  of God.
                </p>
                <p>
                  Surrounding these church communities, an orbit is created
                  called streetlights, a space for serving those in need and
                  divine-inspired initiatives.
                </p>
                <p>
                  Each pathway group is connected through one intersection orbit, a place for worshipping God in one spirit.
                </p>
              </div>

              {/* Explore More Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Link
                  href="/pathways"
                  className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold uppercase tracking-wider hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                >
                  Pathways
                </Link>
                <Link
                  href="/intersection"
                  className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold uppercase tracking-wider hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                >
                  Intersection
                </Link>
                <Link
                  href="/streetlights"
                  className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold uppercase tracking-wider hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                >
                  Streetlights
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* MISSION / VISION / VALUES SECTION */}
      {/* ===================== */}
      <section className="relative w-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/ocean_grove.png"
            alt="Ocean Grove"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center py-24 md:py-32 px-6">
          {/* Three Bubbles */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {/* Mission Bubble */}
            <GlassBubble
              title="MISSION"
              content="To unleash God-given potential"
              isExpanded={expandedBubble === "mission"}
              onClick={() =>
                setExpandedBubble(expandedBubble === "mission" ? null : "mission")
              }
            />

            {/* Vision Bubble */}
            <GlassBubble
              title="VISION"
              content="To be an expanding network of missional microchurches"
              isExpanded={expandedBubble === "vision"}
              onClick={() =>
                setExpandedBubble(expandedBubble === "vision" ? null : "vision")
              }
            />

            {/* Values Bubble */}
            <div className="relative">
              <button
                onClick={() =>
                  setExpandedBubble(expandedBubble === "values" ? null : "values")
                }
                className={`
                  relative px-8 py-6 rounded-3xl cursor-pointer
                  transition-all duration-500 ease-out
                  backdrop-blur-xl bg-white/10 border border-white/20
                  hover:bg-white/15 hover:border-white/30 hover:scale-105
                  shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                  ${expandedBubble === "values" ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"}
                `}
              >
                <h3 className="text-white text-xl md:text-2xl font-semibold tracking-wide">
                  VALUES
                </h3>
              </button>

              {/* Values Expanded Modal */}
              {expandedBubble === "values" && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                  onClick={() => setExpandedBubble(null)}
                >
                  <div
                    className="
                      relative max-w-3xl w-full p-8 md:p-12 rounded-3xl
                      backdrop-blur-2xl bg-white/15 border border-white/25
                      shadow-[0_25px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
                      max-h-[80vh] overflow-y-auto
                    "
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setExpandedBubble(null)}
                      className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                      <X size={24} />
                    </button>
                    <h3 className="text-white text-2xl md:text-3xl font-bold mb-8">
                      VALUES
                    </h3>
                    <div className="space-y-6">
                      {valuesData.map((value, index) => (
                        <div key={index} className="border-l-2 border-white/30 pl-4">
                          <h4 className="text-white text-lg md:text-xl font-semibold mb-2">
                            {value.title}
                          </h4>
                          <p className="text-gray-200 text-base md:text-lg leading-relaxed">
                            {value.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* BELIEFS SECTION */}
      {/* ===================== */}
      <section className="relative min-h-screen w-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/alan_baptism.png"
            alt="Baptism"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-white text-center mb-6">
              BELIEFS
            </h2>
            <p className="text-gray-200 text-center text-lg md:text-xl mb-12 max-w-2xl mx-auto">
              Here is a snapshot of what we believe:
            </p>

            {/* Belief Cards */}
            <div className="space-y-4">
              {beliefsData.map((belief, index) => (
                <BeliefCard
                  key={index}
                  question={belief.question}
                  answer={belief.answer}
                  isExpanded={expandedBelief === belief.question}
                  onClick={() =>
                    setExpandedBelief(
                      expandedBelief === belief.question ? null : belief.question
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

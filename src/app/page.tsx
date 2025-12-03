import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Hero Section - Full viewport */}
      <section className="relative h-screen flex items-center">
        {/* Background - Dark space */}
        <div className="absolute inset-0 bg-black" />

        <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-center md:justify-start">
          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col items-center justify-start h-full px-6 text-center pt-16">
            {/* Earth Image - Top */}
            <div className="relative w-[280px] h-[280px] mb-4">
              <Image
                src="/images/home_page_earth.jpg"
                alt="Earth from space"
                fill
                className="object-contain"
                priority
              />
            </div>
            
            {/* Text Content - Below Earth */}
            <div className="max-w-xs pb-20">
              <h1 className="text-3xl font-bold text-white leading-tight mb-3">
                ON EARTH
                <br />
                AS IN HEAVEN
              </h1>
              <p className="text-gray-300 text-xs mb-4 px-2 leading-relaxed">
                Avenue is a democratized movement of people following Jesus,
                convinced that disciple-making doesn&apos;t require more church
                buildings, just the willingness to open the spaces we already
                have
              </p>
              <Link
                href="/vision"
                className="inline-block bg-blue-800 text-white px-8 py-3 rounded-full font-medium tracking-wider hover:bg-blue-700 transition-colors"
              >
                EXPLORE
              </Link>
            </div>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden md:flex items-center w-full h-full">
            {/* Left Content - Positioned closer to earth */}
            <div className="absolute left-[15%] md:left-[20%] lg:left-[25%] z-20 max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                ON EARTH
                <br />
                AS IN HEAVEN
              </h1>
              <p className="text-gray-400 text-sm md:text-base max-w-md mb-8">
                Avenue is a democratized movement of people following Jesus,
                convinced that disciple-making doesn&apos;t require more church
                buildings, just the willingness to open the spaces we already
                have
              </p>
              <Link
                href="/vision"
                className="inline-block bg-blue-800 text-white px-8 py-3 rounded-full font-medium tracking-wider hover:bg-blue-700 transition-colors"
              >
                EXPLORE
              </Link>
            </div>

            {/* Right Content - Much Larger Earth Image */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[15%] md:translate-x-[10%] lg:translate-x-[5%]">
              <div className="relative w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] lg:w-[1500px] lg:h-[1500px] xl:w-[1800px] xl:h-[1800px]">
                <Image
                  src="/images/home_page_earth.jpg"
                  alt="Earth from space"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

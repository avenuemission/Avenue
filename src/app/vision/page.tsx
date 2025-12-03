import Image from "next/image";

export default function VisionPage() {
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
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-6">
            <p className="text-white italic text-center max-w-3xl text-sm md:text-lg drop-shadow-lg">
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
      <section className="bg-black py-2">
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
                  Each pathway group is connected through one orbit—the
                  intersection orbit, a place for worshipping God in one spirit.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}

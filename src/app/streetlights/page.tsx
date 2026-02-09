"use client";

import { useState } from "react";
import Image from "next/image";
import VideoModal from "@/components/VideoModal";
import {
  CREATIVE_INITIATIVES,
  MISSION_INITIATIVES,
  PRAYER_HOTLINE,
} from "@/lib/data";
import { Phone, MessageSquare, Mail } from "lucide-react";

interface Song {
  title: string;
  youtubeUrl: string;
  spotifyUrl: string;
}

export default function StreetlightsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    idea: "",
    website: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.idea) {
      try {
        // Submit to Netlify Forms
        const netlifyData = new FormData();
        netlifyData.append("form-name", "idea-submission");
        netlifyData.append("name", formData.name);
        netlifyData.append("email", formData.email);
        netlifyData.append("idea", formData.idea);
        await fetch("/", {
          method: "POST",
          body: netlifyData,
        });

        // Send email notification
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ideaSubmission",
            data: { ...formData },
          }),
        });
        setSubmitted(true);
        setFormData({ name: "", email: "", idea: "", website: "" });
        setTimeout(() => setSubmitted(false), 3000);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }
  };

  const handleAlbumClick = () => {
    // Open first available song
    const firstSong = CREATIVE_INITIATIVES.homeboundAlbum.songs.find(
      (s) => s.youtubeUrl
    );
    if (firstSong) {
      setSelectedSong(firstSong);
      setShowAlbumModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Hero Section with Starry Sky */}
      <section className="relative w-full">
        {/* Starry Sky Background */}
        <div className="relative h-[500px] md:h-[800px] w-full overflow-hidden">
          {/* Background Image */}
          <Image
            src="/images/streetlights_stary_sky.png"
            alt="Starry night sky"
            fill
            className="
              object-cover
              translate-y-10
              md:translate-y-20
              lg:translate-y-28
            "
            priority
          />

          {/* GRADIENT OVERLAY — black (top) to transparent (bottom) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-transparent pointer-events-none"></div>

          {/* Quote overlay on top */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 w-full max-w-5xl z-10">
            <p className="text-white italic text-center text-sm md:text-lg drop-shadow-lg">
              &ldquo;The King will reply, &apos;Truly I tell you, whatever you did
              for one of the least of these brothers and sisters of mine, you did
              for me&apos;&rdquo; – Jesus
            </p>
          </div>
        </div>

      </section>


      {/* Streetlights Description Section */}
      <section className="relative py-12 overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/50 to-black animate-gradient-shift" style={{ backgroundSize: '200% 200%' }} />
          <div className="absolute inset-0 bg-gradient-to-tl from-blue-900/20 via-transparent to-blue-950/30 animate-gradient-shift-reverse" style={{ backgroundSize: '200% 200%' }} />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse-slower" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">
            STREETLIGHTS
          </h1>

          <div className="space-y-6 text-gray-300 text-base md:text-lg leading-relaxed">
            <p>
              We believe God has intentionally placed each pathway group in a
              unique location and community, breathing His spirit of service,
              creativity, and purpose into every one of them. Avenue exists to
              empower these groups to be visionaries, innovators, and
              humanitarians, people who respond to God&apos;s call with boldness
              and compassion.
            </p>
            <p>
              Through Avenue&apos;s support, pathway groups have launched
              meaningful initiatives such as homeless outreach, songwriting
              projects, podcast creation, mission trips, and collaborations with
              local organisations and churches. Each effort reflects a shared
              desire to bring hope, creativity, and the love of Jesus into their
              surrounding communities.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Initiatives Section */}
      <section id="mission-initiatives" className="relative py-16 scroll-mt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/beach.png"
            alt="Beach"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-12">
            MISSION INITIATIVES
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {MISSION_INITIATIVES.map((initiative, index) => (
              <div
                key={index}
                className="bg-gray-900/40 border border-gray-700 rounded-xl p-6 space-y-4 hover:bg-gray-900/60 transition-colors"
              >
                <h3 className="text-base md:text-lg font-semibold text-white uppercase tracking-wider">
                  {initiative.title}
                </h3>
                <p className="text-gray-300 text-sm md:text-base">{initiative.description}</p>

                {initiative.hasContact && (
                  <div className="flex gap-4 pt-2">
                    <a
                      href={`tel:${PRAYER_HOTLINE.phone}`}
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <Phone size={16} />
                      CALL
                    </a>
                    <a
                      href={`sms:${PRAYER_HOTLINE.phone}`}
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <MessageSquare size={16} />
                      TEXT
                    </a>
                    <a
                      href={`mailto:${PRAYER_HOTLINE.email}`}
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <Mail size={16} />
                      EMAIL
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
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
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-12">
            CREATIVE INITIATIVES
          </h2>

          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {/* Homebound Album Button */}
            <button
              onClick={handleAlbumClick}
              className="bg-blue-800 hover:bg-blue-700 text-white px-10 py-8 rounded-full font-medium transition-all duration-300 min-w-[200px]"
            >
              <span className="block text-xl uppercase tracking-wider">
                Homebound
              </span>
              <span className="block text-sm uppercase tracking-wider mt-1">
                Album
              </span>
            </button>

            {/* Pathways Podcast Button */}
            <a
              href={CREATIVE_INITIATIVES.pathwaysPodcast.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-800 hover:bg-blue-700 text-white px-10 py-8 rounded-full font-medium transition-all duration-300 min-w-[200px] flex flex-col items-center justify-center"
            >
              <span className="block text-xl uppercase tracking-wider">
                Pathways
              </span>
              <span className="block text-sm uppercase tracking-wider mt-1">
                Podcast
              </span>
            </a>

            {/* Saturday Club Button */}
            <a
              href={CREATIVE_INITIATIVES.saturdayClub.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-800 hover:bg-blue-700 text-white px-10 py-8 rounded-full font-medium transition-all duration-300 min-w-[200px] flex flex-col items-center justify-center"
            >
              <span className="block text-xl uppercase tracking-wider">
                The Saturday
              </span>
              <span className="block text-sm uppercase tracking-wider mt-1">
                Club
              </span>
            </a>

            {/* APEST Quiz Button */}
            <a
              href="/apest-quiz"
              className="bg-blue-800 hover:bg-blue-700 text-white px-10 py-8 rounded-full font-medium transition-all duration-300 min-w-[200px] flex flex-col items-center justify-center"
            >
              <span className="block text-xl uppercase tracking-wider">
                APEST
              </span>
              <span className="block text-sm uppercase tracking-wider mt-1">
                Quiz
              </span>
            </a>
          </div>

          <p className="text-white italic text-sm md:text-base max-w-2xl mx-auto">
            As humanity carries the breath of God, we also carry the breath of
            creativity. We love ideas, both big and small, and are keen to
            support and facilitate. Please let us know your ideas below:
          </p>
        </div>
      </section>

      {/* Idea Submission Section */}
      <section className="bg-gradient-to-b from-blue-950/60 via-blue-950/40 to-black py-16">
        <div className="max-w-lg mx-auto px-6 sm:px-10">
          <h3 className="text-2xl md:text-3xl font-semibold text-white text-center mb-8 uppercase tracking-wider">
            Tell Us Your Ideas
          </h3>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-netlify="true"
            name="idea-submission"
          >
            <input type="hidden" name="form-name" value="idea-submission" />
            {/* Honeypot field - hidden from humans, bots will fill it */}
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
              tabIndex={-1}
              autoComplete="off"
            />
            <div>
              <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
                Name (Optional)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
                Email (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
                Your Ideas
              </label>
              <textarea
                value={formData.idea}
                onChange={(e) =>
                  setFormData({ ...formData, idea: e.target.value })
                }
                rows={6}
                className="w-full bg-transparent border-2 border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                required
              />
            </div>
            <div className="text-center">
              <button
                type="submit"
                className="bg-blue-700 text-white px-12 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm"
              >
                Submit
              </button>
            </div>
            {submitted && (
              <p className="text-green-400 text-sm text-center">
                Thank you for sharing your idea!
              </p>
            )}
          </form>

          <p className="text-white italic text-sm md:text-base text-center mt-12">
            &ldquo;In the beginning God created the heavens and the earth.&rdquo;
          </p>
        </div>
      </section>

      {/* Tithe Section */}
      <section id="giving" className="bg-gradient-to-b from-black via-blue-950/40 to-black py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8">
            SUPPORT AVENUE
          </h2>

          <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8">
            Your generous giving helps Avenue Streetlights bless people in our
            communities and beyond. Together, we can continue to serve, create,
            and share the love of Jesus with those in need.
          </p>

          <a
            href="https://tithe.ly/give_new/www/#/tithely/give-one-time/1827900"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-700 hover:bg-blue-600 text-white px-12 py-4 rounded-full font-medium transition-colors uppercase tracking-wider text-lg mb-10"
          >
            Give Now
          </a>

          <p className="text-white italic text-sm md:text-base max-w-xl mx-auto">
            &ldquo;Each of you should give what you have decided in your heart
            to give, not reluctantly or under compulsion, for God loves a
            cheerful giver.&rdquo; – 2 Corinthians 9:7
          </p>
        </div>
      </section>

      {/* Album Modal with Song Selection */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowAlbumModal(false)}
          />
          <div className="relative z-10 w-full max-w-4xl mx-4 bg-gray-900 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">
                Homebound Album
              </h3>
              <button
                onClick={() => setShowAlbumModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video">
              {selectedSong?.youtubeUrl ? (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedSong.youtubeUrl.split("v=")[1]}?autoplay=1`}
                  title={selectedSong.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <p className="text-gray-400">Coming soon...</p>
                </div>
              )}
            </div>

            {/* Song List */}
            <div className="p-4 border-t border-gray-800">
              <h4 className="text-sm text-gray-400 mb-3">Select a song:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CREATIVE_INITIATIVES.homeboundAlbum.songs.map((song, index) => (
                  <button
                    key={index}
                    onClick={() => song.youtubeUrl && setSelectedSong(song)}
                    disabled={!song.youtubeUrl}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedSong?.title === song.title
                        ? "bg-blue-600 text-white"
                        : song.youtubeUrl
                        ? "bg-gray-800 text-white hover:bg-gray-700"
                        : "bg-gray-800/50 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {song.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keep VideoModal for potential future use */}
      <VideoModal
        isOpen={false}
        onClose={() => {}}
        youtubeUrl=""
        title=""
      />
    </div>
  );
}

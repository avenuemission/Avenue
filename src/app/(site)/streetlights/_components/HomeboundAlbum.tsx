"use client";

import { useState } from "react";
import Portal from "@/components/ui/Portal";
import RowLinkContent from "@/components/ui/RowLinkContent";
import { CREATIVE_INITIATIVES } from "@/content/site";

interface Song {
  title: string;
  youtubeUrl: string;
  spotifyUrl: string;
}

// The Homebound Album button and its song player.
export default function HomeboundAlbum() {
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

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
    <>
      <button type="button" onClick={handleAlbumClick} className="row-link">
        <RowLinkContent title="Homebound" subtitle="Album" />
      </button>

      {/* Album Modal with Song Selection */}
      {showAlbumModal && (
        <Portal>
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
                          ? "bg-[var(--accent-soft)] text-white ring-1 ring-[var(--accent)]"
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
        </Portal>
      )}
    </>
  );
}

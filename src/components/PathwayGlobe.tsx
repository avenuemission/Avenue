"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { getPathwayGroups } from "@/lib/content";

// Dynamically import react-globe.gl to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface PathwayGroup {
  id: number;
  name: string;
  coordinates: [number, number];
  time: string;
  coordinator: string;
  phone: string;
}

interface SelectedGroup extends PathwayGroup {
  screenX?: number;
  screenY?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeRef = any;

export default function PathwayGlobe() {
  const globeRef = useRef<GlobeRef>(null);
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const [pathwayGroups, setPathwayGroups] = useState<PathwayGroup[]>([]);

  // Load groups from Supabase on mount
  useEffect(() => {
    getPathwayGroups().then((groups: PathwayGroup[]) => {
      if (groups.length > 0) setPathwayGroups(groups);
    });
  }, []);

  // Filter groups based on search
  const filteredGroups = pathwayGroups.filter(
    (group: PathwayGroup) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.coordinator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById("globe-container");
      if (container) {
        setDimensions({
          width: Math.max(container.clientWidth, 700),
          height: Math.max(Math.min(container.clientWidth, 700), 600),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Center on Australia on mount
  useEffect(() => {
    if (globeRef.current) {
      setTimeout(() => {
        globeRef.current?.pointOfView({ lat: -37.8, lng: 145.0, altitude: 1.5 }, 1000);
      }, 500);
    }
  }, []);

  const handlePointClick = useCallback((point: object) => {
    const group = point as PathwayGroup;
    setSelectedGroup(group);

    if (globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: group.coordinates[0],
          lng: group.coordinates[1],
          altitude: 0.5,
        },
        1000
      );
    }
  }, []);

  const handleSearchSelect = (group: PathwayGroup) => {
    setSelectedGroup(group);
    setSearchQuery("");

    if (globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: group.coordinates[0],
          lng: group.coordinates[1],
          altitude: 0.5,
        },
        1000
      );
    }
  };

  // Prepare points data for the globe
  const pointsData = pathwayGroups.map((group: PathwayGroup) => ({
    ...group,
    lat: group.coordinates[0],
    lng: group.coordinates[1],
    size: 0.15,
    color: "#3b82f6",
  }));

  return (
    <div className="relative w-full">
      {/* Search Bar */}
      <div className="absolute top-4 right-4 z-20 w-64">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900/90 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          {searchQuery && filteredGroups.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleSearchSelect(group)}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors"
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Globe Container */}
      <div
        id="globe-container"
        className="relative w-full flex justify-center items-center"
        style={{ minHeight: "650px" }}
      >
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.01}
          pointRadius={0.15}
          pointLabel={(d: object) => {
            const point = d as PathwayGroup;
            return `<div class="bg-gray-900 px-3 py-2 rounded-lg text-white text-sm">
              <strong>${point.name}</strong>
            </div>`;
          }}
          onPointClick={handlePointClick}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.15}
        />
      </div>

      {/* Selected Group Info Panel */}
      {selectedGroup && (
        <div className="absolute bottom-4 left-4 z-20 bg-gray-900/95 border border-gray-700 rounded-xl p-4 max-w-xs">
          <button
            onClick={() => setSelectedGroup(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
          <h3 className="text-lg font-semibold text-white mb-2">
            {selectedGroup.name}
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-400">
              <span className="text-gray-500">Time:</span> {selectedGroup.time}
            </p>
            <p className="text-gray-400">
              <span className="text-gray-500">Coordinator:</span>{" "}
              {selectedGroup.coordinator}
            </p>
            <p className="text-gray-400">
              <span className="text-gray-500">Contact:</span>{" "}
              <a
                href={`tel:${selectedGroup.phone}`}
                className="text-blue-400 hover:underline"
              >
                {selectedGroup.phone}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

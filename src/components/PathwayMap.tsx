"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PATHWAY_GROUPS } from "@/lib/data";
import { loadPathwayGroups, PathwayGroup } from "@/lib/loadPathwayGroups";

type SelectedGroup = PathwayGroup;

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Create full web connections - connect every group to every other group
function findAllConnections(
  groups: PathwayGroup[]
): Array<[PathwayGroup, PathwayGroup]> {
  const connections: Array<[PathwayGroup, PathwayGroup]> = [];
  
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      connections.push([groups[i], groups[j]]);
    }
  }
  
  return connections;
}


declare global {
  interface Window {
    google: typeof google;
    initPathwayMap: () => void;
  }
}

export default function PathwayMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", group: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pathwayGroups, setPathwayGroups] = useState<PathwayGroup[]>(PATHWAY_GROUPS);

  // Load pathway groups from CSV on mount
  useEffect(() => {
    loadPathwayGroups().then((groups) => {
      if (groups.length > 0) {
        setPathwayGroups(groups);
      }
    });
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    // Melbourne center coordinates
    const melbourneCenter = { lat: -37.85, lng: 145.2 };

    // Create map with satellite view
    const map = new window.google.maps.Map(mapRef.current, {
      center: melbourneCenter,
      zoom: 10,
      mapTypeId: "satellite",
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: "all",
          elementType: "labels",
          stylers: [{ visibility: "on" }],
        },
      ],
    });

    mapInstanceRef.current = map;

    // Create cross icon function with color parameter
    const createCrossIcon = (color: string) => ({
      path: "M-2,-12 L2,-12 L2,-4 L6,-4 L6,0 L2,0 L2,12 L-2,12 L-2,0 L-6,0 L-6,-4 L-2,-4 Z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 1.5,
      anchor: new window.google.maps.Point(0, 0),
    });

    // Add markers for each pathway group
    pathwayGroups.forEach((group) => {
      // Blue for running groups, purple for coming soon
      const iconColor = group.running ? "#3b82f6" : "#8b5cf6";
      
      const marker = new window.google.maps.Marker({
        position: { lat: group.coordinates[0], lng: group.coordinates[1] },
        map: map,
        title: group.running ? group.name : `${group.name} - Coming Soon!`,
        icon: createCrossIcon(iconColor),
      });

      marker.addListener("click", () => {
        setSelectedGroup(group);
        map.panTo({ lat: group.coordinates[0], lng: group.coordinates[1] });
        map.setZoom(12);
      });

      markersRef.current.push(marker);
    });

    // Draw network lines connecting all groups (web pattern)
    const connections = findAllConnections(pathwayGroups);
    connections.forEach(([group1, group2]) => {
      const polyline = new window.google.maps.Polyline({
        path: [
          { lat: group1.coordinates[0], lng: group1.coordinates[1] },
          { lat: group2.coordinates[0], lng: group2.coordinates[1] },
        ],
        geodesic: true,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.7,
        strokeWeight: 2,
      });
      polyline.setMap(map);
      polylinesRef.current.push(polyline);
    });

    setMapLoaded(true);
  }, [pathwayGroups]);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Set up callback for when Google Maps loads
    window.initPathwayMap = initMap;

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      return;
    }

    // Load Google Maps script
    const script = document.createElement("script");
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initPathwayMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup markers and polylines
      markersRef.current.forEach((marker) => marker.setMap(null));
      polylinesRef.current.forEach((polyline) => polyline.setMap(null));
      markersRef.current = [];
      polylinesRef.current = [];
    };
  }, [initMap]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.phone && formData.group) {
      try {
        // Send email notification
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "joinPathway",
            data: formData,
          }),
        });
        setFormSubmitted(true);
        setFormData({ name: "", email: "", phone: "", group: "" });
        setTimeout(() => setFormSubmitted(false), 3000);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Map Container */}
      <div className="relative w-full rounded-xl overflow-hidden border border-gray-700">
        <div
          ref={mapRef}
          className="w-full h-[400px] md:h-[500px]"
          style={{ minHeight: "400px" }}
        />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white">Loading map...</div>
          </div>
        )}

        {/* Selected Group Info Panel */}
        {selectedGroup && (
          <div className={`absolute bottom-4 left-4 z-20 bg-gray-900/95 border rounded-xl p-4 max-w-xs ${selectedGroup.running ? 'border-gray-700' : 'border-purple-500'}`}>
            <button
              onClick={() => setSelectedGroup(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white mb-2">
              {selectedGroup.name}
            </h3>
            {!selectedGroup.running && (
              <p className="text-purple-400 font-semibold text-sm mb-2">
                Coming soon!
              </p>
            )}
            <div className="space-y-2 text-sm">
              <p className="text-gray-300 text-xs leading-relaxed">
                {selectedGroup.description}
              </p>
              <p className="text-gray-400">
                <span className="text-gray-500">Time:</span> {selectedGroup.time}
              </p>
              <p className="text-gray-400">
                <span className="text-gray-500">Coordinator:</span>{" "}
                {selectedGroup.coordinator}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Connect Form */}
      <div className="space-y-6">
        <h3 className="text-xl md:text-2xl font-bold text-white">
          Join a Pathway Group
        </h3>
        <p className="text-blue-400 text-sm md:text-base uppercase tracking-wider font-medium">
          Fill out the form below to connect with a pathway group near you.
        </p>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <input type="hidden" name="form-name" value="pathway-connect" />

          <div>
            <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs md:text-sm mb-2 uppercase tracking-wider">
              Group to Connect
            </label>
            <select
              name="group"
              value={formData.group}
              onChange={(e) =>
                setFormData({ ...formData, group: e.target.value })
              }
              className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
              required
            >
              <option value="" className="bg-gray-900">
                Select a pathway group...
              </option>
              {pathwayGroups.map((group) => (
                <option key={group.id} value={group.name} className="bg-gray-900">
                  {group.name} - {group.time}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="bg-blue-700 text-white px-12 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm"
          >
            Connect
          </button>

          {formSubmitted && (
            <p className="text-green-400 text-sm">
              Thank you! We&apos;ll connect you with the group soon.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

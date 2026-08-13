"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import CountdownTimer from "./CountdownTimer";
import { LogIn, ChevronDown, Heart } from "lucide-react";

const streetlightsDropdown = [
  { href: "/streetlights", label: "Overview" },
  { href: "/streetlights#mission-initiatives", label: "Mission Initiatives" },
  { href: "/streetlights#creative-initiatives", label: "Creative Initiatives" },
  { href: "/apest-quiz", label: "APEST Quiz" },
  { href: "/streetlights#giving", label: "Giving" },
];

const navLinks = [
  { href: "/vision", label: "VISION" },
  { href: "/pathways", label: "PATHWAYS" },
  { href: "/intersection", label: "INTERSECTION" },
  { href: "/streetlights", label: "STREETLIGHTS", hasDropdown: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streetlightsOpen, setStreetlightsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStreetlightsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/Avenue.png"
              alt="Avenue"
              width={140}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              link.hasDropdown ? (
                <div key={link.href} className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setStreetlightsOpen(!streetlightsOpen)}
                    className={`flex items-center space-x-1 text-sm font-medium tracking-wider transition-colors duration-200 ${
                      pathname.startsWith("/streetlights") || pathname === "/apest-quiz"
                        ? "text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${streetlightsOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  {streetlightsOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-black/95 backdrop-blur-md border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                      {streetlightsDropdown.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setStreetlightsOpen(false)}
                          className="block px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium tracking-wider transition-colors duration-200 ${
                    pathname === link.href
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Countdown Timer, Giving and Login */}
          <div className="hidden sm:flex items-center space-x-3">
            <CountdownTimer variant="navbar" />
            <Link
              href="/streetlights#giving"
              className="flex items-center space-x-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full px-4 py-2 transition-colors"
            >
              <Heart className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white uppercase tracking-wider">
                Giving
              </span>
            </Link>
            <Link
              href="/login"
              className="flex items-center space-x-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full px-4 py-2 transition-colors"
            >
              <LogIn className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white uppercase tracking-wider">
                Login
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/95 border-t border-gray-800">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-base font-medium tracking-wider transition-colors ${
                  link.hasDropdown 
                    ? (pathname.startsWith("/streetlights") || pathname === "/apest-quiz"
                        ? "text-white bg-gray-800/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/30")
                    : (pathname === link.href
                        ? "text-white bg-gray-800/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/30")
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Countdown Timer, Giving and Login */}
            <div className="px-3 py-4 space-y-3">
              <CountdownTimer variant="navbar" />
              <Link
                href="/streetlights#giving"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full px-4 py-2 transition-colors"
              >
                <Heart className="w-4 h-4 text-white" />
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  Giving
                </span>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full px-4 py-2 transition-colors"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  Login
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

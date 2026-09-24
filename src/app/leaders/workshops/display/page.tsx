"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/client/auth";
import { ArrowLeft, Monitor, QrCode } from "lucide-react";
import QRCode from "qrcode";

export default function WorkshopDisplayPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!sessionCode.trim()) {
      setQrDataUrl("");
      return;
    }

    const generateQR = async () => {
      setGenerating(true);
      try {
        const url = await QRCode.toDataURL(
          "https://www.avenuemission.com/technological-stewardship",
          {
            width: 400,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          }
        );
        setQrDataUrl(url);
      } catch {
        setQrDataUrl("");
      }
      setGenerating(false);
    };

    generateQR();
  }, [sessionCode]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">

      <header className="relative z-10 border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/leaders/workshops")}
              className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Workshops
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Workshop Display</h1>
          <p className="text-gray-400 text-sm">Enter a session code to generate a display for participants.</p>
        </div>

        {/* Session code input */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-8 max-w-md">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Session Code
          </label>
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
            placeholder="e.g. WORKSHOP1"
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors uppercase text-lg"
          />
          <p className="text-gray-500 text-xs mt-2">
            Type the workshop code participants will use to join.
          </p>
        </div>

        {/* Display area */}
        {sessionCode.trim() && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 max-w-2xl">
            <div className="text-center space-y-6">
              {/* Header */}
              <div>
                <p className="text-gray-500 text-sm uppercase tracking-wider mb-2">
                  Join the Workshop
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Scan to Begin
                </h2>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-64 h-64 sm:w-80 sm:h-80"
                  />
                ) : generating ? (
                  <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-100 rounded-xl flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-gray-300 animate-pulse" />
                  </div>
                ) : null}
              </div>

              {/* URL */}
              <div className="bg-gray-100 rounded-lg px-6 py-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                  Or visit
                </p>
                <p className="text-gray-900 font-mono text-lg sm:text-xl font-semibold">
                  www.avenuemission.com/technological-stewardship
                </p>
              </div>

              {/* Session Code */}
              <div className="border-t border-gray-200 pt-6">
                <p className="text-gray-500 text-sm mb-2">Your session code</p>
                <p className="text-4xl sm:text-5xl font-bold text-blue-600 font-mono tracking-wider">
                  {sessionCode.toUpperCase()}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-lg px-6 py-4 text-left">
                <div className="flex items-start gap-3">
                  <Monitor className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-blue-900 text-sm font-medium">
                      How to join
                    </p>
                    <p className="text-blue-700 text-sm mt-1">
                      1. Scan the QR code or visit the URL above<br />
                      2. Enter the session code when prompted<br />
                      3. Complete the survey at your own pace
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

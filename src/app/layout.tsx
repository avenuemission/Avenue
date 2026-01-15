import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avenue - On Earth As In Heaven",
  description:
    "Avenue is a decentralised movement of people following Jesus, convinced that disciple-making doesn’t require more church buildings, just the willingness to open the spaces we already have",
  icons: {
    icon: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.avenuemission.com/#organization",
        "name": "Avenue Mission",
        "url": "https://www.avenuemission.com",
        "logo": "https://www.avenuemission.com/images/Avenue.png",
        "description": "Avenue is a decentralised movement of people following Jesus, convinced that disciple-making doesn't require more church buildings, just the willingness to open the spaces we already have"
      },
      {
        "@type": "WebSite",
        "@id": "https://www.avenuemission.com/#website",
        "url": "https://www.avenuemission.com",
        "name": "Avenue Mission",
        "publisher": { "@id": "https://www.avenuemission.com/#organization" }
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Vision",
        "url": "https://www.avenuemission.com/vision"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Pathways",
        "url": "https://www.avenuemission.com/pathways"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Intersection",
        "url": "https://www.avenuemission.com/intersection"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Streetlights",
        "url": "https://www.avenuemission.com/streetlights"
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-64LCYGHM07" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-64LCYGHM07');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}

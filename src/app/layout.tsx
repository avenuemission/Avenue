import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/site/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Mono is small and only used by the navbar countdown and a few labels, so
// it is not preloaded.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Avenue - Unleashing God-given potential",
  description:
    "Avenue is a decentralised movement of people following Jesus, convinced that disciple-making doesn’t require more church buildings, just the willingness to open the spaces we already have",
  // Icons come from the app-directory files: icon.png (browsers/Android),
  // apple-icon.png (iOS home screen) and favicon.ico (legacy). Don't set
  // metadata.icons here, because it overrides those files.
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
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel no-JS fallback: next/image would lazy-load it, so it would never fire. */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1098566062339846&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
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
        {/* Google Analytics: loads after the page is interactive. */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-64LCYGHM07" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-64LCYGHM07');
          `}
        </Script>
        {/* Meta Pixel Code: loads after the page is interactive. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1098566062339846');
            fbq('track', 'PageView');
          `}
        </Script>
      </body>
    </html>
  );
}

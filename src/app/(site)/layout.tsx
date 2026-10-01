import FooterGate from "@/components/site/FooterGate";
import SiteFooter from "@/components/site/SiteFooter";

// The public pages share the footer; the home page hides it (FooterGate).
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FooterGate>
        <SiteFooter />
      </FooterGate>
    </>
  );
}

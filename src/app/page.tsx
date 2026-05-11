import HeroSection from "@/components/HeroSection";
import ZipLookup from "@/components/ZipLookup";
import TipsSection from "@/components/TipsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <HeroSection />
      <main id="main-content" className="py-8">
        <ZipLookup />
      </main>
      <TipsSection />
      <Footer />
    </>
  );
}

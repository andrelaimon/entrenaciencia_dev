import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PillarsSection from '@/components/PillarsSection';
import ResourcesSection from '@/components/ResourcesSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PillarsSection />
        <ResourcesSection />
      </main>
      <Footer />
    </>
  );
}

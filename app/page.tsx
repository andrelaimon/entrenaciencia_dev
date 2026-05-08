import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import WhySection from '@/components/WhySection';
import PillarsSection from '@/components/PillarsSection';
import CloserSection from '@/components/CloserSection';
import ResourcesSection from '@/components/ResourcesSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhySection />
        <PillarsSection />
        <CloserSection />
        <ResourcesSection />
      </main>
      <Footer />
    </>
  );
}

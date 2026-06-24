import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import Navigation from './components/Navigation';
import Section1Hero from './sections/Section1Hero';
import Section2Features from './sections/Section2Features';
import Section3Agent from './sections/Section3Agent';
import Section4Vault from './sections/Section4Vault';
import Section5Network from './sections/Section5Network';
import Section6Testimonials from './sections/Section6Testimonials';
import Section7Pricing from './sections/Section7Pricing';
import Section8Footer from './sections/Section8Footer';

gsap.registerPlugin(ScrollTrigger);

function App() {
  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });

    // Connect Lenis to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Global scroll snap for pinned sections
  useEffect(() => {
    // Wait for all ScrollTriggers to be created
    const setupSnap = () => {
      const pinned = ScrollTrigger.getAll()
        .filter((st) => st.vars.pin)
        .sort((a, b) => a.start - b.start);

      const maxScroll = ScrollTrigger.maxScroll(window);
      if (!maxScroll || pinned.length === 0) return;

      // Build pinned ranges and snap targets (center of each pinned section)
      const pinnedRanges = pinned.map((st) => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            // Check if within any pinned range (with small buffer)
            const inPinned = pinnedRanges.some(
              (r) => value >= r.start - 0.02 && value <= r.end + 0.02
            );
            if (!inPinned) return value; // Flowing section: free scroll

            // Find nearest pinned center
            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.center - value) < Math.abs(closest - value)
                  ? r.center
                  : closest,
              pinnedRanges[0]?.center ?? 0
            );

            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: 'power2.out',
        },
      });
    };

    // Delay to ensure all section ScrollTriggers are registered
    const timer = setTimeout(setupSnap, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative" style={{ backgroundColor: '#0B0C10' }}>
      <Navigation />

      <main className="relative">
        {/* Pinned sections need proper z-index stacking */}
        <Section1Hero />
        <Section2Features />
        <Section3Agent />
        <Section4Vault />
        <Section5Network />
        <Section6Testimonials />
        <Section7Pricing />
        <Section8Footer />
      </main>
    </div>
  );
}

export default App;

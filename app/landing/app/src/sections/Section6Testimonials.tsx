import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote: "GhostPay feels like messaging a really smart accountant.",
    name: 'Alkazm',
    role: 'Freelancer',
    avatar: '/images/avatar-01.jpg',
    zDepth: -120,
    rotateY: -6,
    opacity: 0.45,
  },
  {
    quote: "I stopped checking banking apps. It just handles it.",
    name: 'Nikoi',
    role: 'Founder',
    avatar: '/images/avatar-02.jpg',
    zDepth: 0,
    rotateY: 0,
    opacity: 0.75,
  },
  {
    quote: "The scheduling feature saves me 2 hours a week.",
    name: 'Alter',
    role: 'PM',
    avatar: '/images/avatar-03.jpg',
    zDepth: 120,
    rotateY: 8,
    opacity: 1,
  },
];

export default function Section6Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=140%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0% - 30%)
      // Stack group flies in from left with rotation
      scrollTl.fromTo(
        stackRef.current,
        { x: '-40vw', rotateY: 45, z: -300, opacity: 0 },
        { x: 0, rotateY: 0, z: 0, opacity: 1, ease: 'none' },
        0
      );

      // Front card text
      const frontCard = cardsRef.current[2];
      if (frontCard) {
        const textEls = frontCard.querySelectorAll('.card-text');
        scrollTl.fromTo(
          textEls,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.02, ease: 'none' },
          0.1
        );
      }

      // SETTLE (30% - 70%) - hold position

      // EXIT (70% - 100%)
      scrollTl.fromTo(
        stackRef.current,
        { rotateY: 0, x: 0, opacity: 1 },
        { rotateY: -25, x: '22vw', opacity: 0, ease: 'power2.in' },
        0.70
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden z-[60]"
      style={{ backgroundColor: '#0B0C10' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial-glow opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

      {/* Section title */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10">
        <span className="micro-label">WHAT THEY SAY</span>
      </div>

      {/* Echo Stack */}
      <div
        className="perspective-container absolute flex items-center justify-center"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: '90vw',
          maxWidth: '700px',
          height: '54vh',
          minHeight: '380px',
        }}
      >
        <div
          ref={stackRef}
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="absolute inset-0 glass-card p-6 md:p-10 flex flex-col justify-between"
              style={{
                transformStyle: 'preserve-3d',
                transform: `translateZ(${t.zDepth}px) rotateY(${t.rotateY}deg)`,
                opacity: t.opacity,
                zIndex: i + 1,
              }}
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-[#B347FF] opacity-50" strokeWidth={1.5} />

              {/* Quote text */}
              <p className="card-text font-heading text-xl md:text-2xl lg:text-3xl font-medium text-[#F4F6FF] leading-snug max-w-[480px]">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="card-text flex items-center gap-4">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover border border-[rgba(255,255,255,0.15)]"
                />
                <div>
                  <p className="font-heading font-medium text-[#F4F6FF]">{t.name}</p>
                  <p className="text-sm text-[#A7B0C8]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

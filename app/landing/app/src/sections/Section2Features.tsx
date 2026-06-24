import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageSquare, Clock, Fingerprint } from 'lucide-react';
import GlassCard from '../components/GlassCard';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: MessageSquare,
    title: 'Natural Input',
    description: '"Send $50 to Alex for dinner." Done.',
  },
  {
    icon: Clock,
    title: 'Smart Scheduling',
    description: 'Recurring, delayed, or conditional payments.',
  },
  {
    icon: Fingerprint,
    title: 'Instant Confirm',
    description: 'Biometric yes. No forms.',
  },
];

export default function Section2Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: true,
          },
        }
      );

      // Cards animation with stagger
      cardsRef.current.forEach((card) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 80, rotateX: 12, opacity: 0 },
          {
            y: 0,
            rotateX: 0,
            opacity: 1,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              end: 'top 55%',
              scrub: true,
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative w-full py-[8vh] md:py-[10vh] z-20"
      style={{ backgroundColor: '#0B0C10' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none" />

      <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Title block */}
        <div ref={titleRef} className="text-center mb-10 md:mb-16 opacity-0">
          <h2 className="font-heading text-3xl md:text-[42px] font-semibold text-[#F4F6FF] mb-4 tracking-tight">
            A surface built for speed.
          </h2>
          <p className="text-base md:text-lg text-[#A7B0C8] max-w-[560px] mx-auto">
            Type what you want. GhostPay translates intent into transactions.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 perspective-container">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="opacity-0"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <GlassCard className="p-6 md:p-8 h-full flex flex-col gap-4 hover:border-[rgba(179,71,255,0.65)] transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-[rgba(179,71,255,0.1)] flex items-center justify-center group-hover:bg-[rgba(179,71,255,0.2)] transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-[#B347FF]" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-xl md:text-2xl font-semibold text-[#F4F6FF]">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-[#A7B0C8] leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

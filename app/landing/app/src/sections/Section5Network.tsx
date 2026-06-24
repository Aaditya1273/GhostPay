import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Globe, Link2, CreditCard, Wallet, Building2, Coins, Banknote, Landmark } from 'lucide-react';
import GlassCard from '../components/GlassCard';

gsap.registerPlugin(ScrollTrigger);

const orbitIcons = [
  { Icon: CreditCard, angle: 0 },
  { Icon: Wallet, angle: 45 },
  { Icon: Building2, angle: 90 },
  { Icon: Coins, angle: 135 },
  { Icon: Banknote, angle: 180 },
  { Icon: Link2, angle: 225 },
  { Icon: Globe, angle: 270 },
  { Icon: Landmark, angle: 315 },
];

export default function Section5Network() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Title
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

      // Orbit ring
      gsap.fromTo(
        orbitRef.current,
        { scale: 0.9, rotate: -10, opacity: 0 },
        {
          scale: 1,
          rotate: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: orbitRef.current,
            start: 'top 80%',
            end: 'top 40%',
            scrub: true,
          },
        }
      );

      // Orbit dots - radial outward stagger
      dotsRef.current.forEach((dot, i) => {
        if (!dot) return;
        const angle = (i * 45 * Math.PI) / 180;
        const dist = 16;
        gsap.fromTo(
          dot,
          { x: -Math.cos(angle) * dist, y: -Math.sin(angle) * dist, opacity: 0, scale: 0.8 },
          {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            scrollTrigger: {
              trigger: orbitRef.current,
              start: 'top 75%',
              end: 'top 40%',
              scrub: true,
            },
          }
        );
      });

      // Text cards
      cardsRef.current.forEach((card) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              end: 'top 60%',
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
      className="relative w-full py-[10vh] md:py-[12vh] z-50"
      style={{ backgroundColor: '#0B0C10' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none" />

      <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Title */}
        <div ref={titleRef} className="text-center mb-12 md:mb-16 opacity-0">
          <h2 className="font-heading text-3xl md:text-[42px] font-semibold text-[#F4F6FF] mb-4 tracking-tight">
            Connected to everything.
          </h2>
          <p className="text-base md:text-lg text-[#A7B0C8] max-w-[520px] mx-auto">
            Banks, cards, wallets, chains. One invisible layer.
          </p>
        </div>

        {/* Orbit visualization */}
        <div className="flex justify-center mb-12 md:mb-16">
          <div
            ref={orbitRef}
            className="relative w-[280px] h-[280px] md:w-[360px] md:h-[360px] opacity-0"
          >
            {/* Orbit ring */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 360 360"
              fill="none"
            >
              <circle
                cx="180"
                cy="180"
                r="170"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
                strokeDasharray="8 6"
              />
            </svg>

            {/* Center icon */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[rgba(179,71,255,0.1)] border border-[rgba(179,71,255,0.3)] flex items-center justify-center">
              <img src="/images/ghost-mascot.png" alt="GhostPay" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            </div>

            {/* Orbit dots */}
            {orbitIcons.map(({ Icon, angle }, i) => {
              const rad = (angle * Math.PI) / 180;
              const r = 170;
              const x = 180 + r * Math.cos(rad);
              const y = 180 + r * Math.sin(rad);
              return (
                <div
                  key={i}
                  ref={(el) => { dotsRef.current[i] = el; }}
                  className="absolute w-10 h-10 md:w-12 md:h-12 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center"
                  style={{
                    left: `${(x / 360) * 100}%`,
                    top: `${(y / 360) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-[#A7B0C8]" strokeWidth={1.5} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px] mx-auto">
          {[
            { title: 'Multi-chain ready', desc: 'Ethereum, Solana, Bitcoin, and 20+ networks supported natively.' },
            { title: 'Bank-grade APIs', desc: 'SOC 2 Type II compliant infrastructure with 99.99% uptime SLA.' },
          ].map((item, i) => (
            <div
              key={item.title}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="opacity-0"
            >
              <GlassCard className="p-6 h-full">
                <h3 className="font-heading text-xl font-semibold text-[#F4F6FF] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[#A7B0C8] leading-relaxed">{item.desc}</p>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

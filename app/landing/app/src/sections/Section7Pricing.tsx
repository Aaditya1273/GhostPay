import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Sparkles } from 'lucide-react';
import GlassCard from '../components/GlassCard';

gsap.registerPlugin(ScrollTrigger);

// ─── Plan data ────────────────────────────────────────────────────────────────
// desktopProps drives the RESTING transform on desktop (applied by GSAP).
// Mobile always lands at rotate:0, y:0, scale:1.
const plans = [
  {
    name: 'Phantom',
    description: 'For personal use',
    price: '$0',
    period: '/mo',
    features: ['5 sends per month', 'Basic scheduling', 'Standard support', 'Web access'],
    cta: 'Start Free',
    highlighted: false,
    desktopProps: { rotate: -5, y: 0, scale: 1 },
    zIndex: 10,
  },
  {
    name: 'Poltergeist',
    description: 'For power users',
    price: '$12',
    period: '/mo',
    features: ['Unlimited sends', 'Smart scheduling', 'Priority support', 'API access', 'Multi-chain'],
    cta: 'Go Pro',
    highlighted: true,
    desktopProps: { rotate: 0, y: -28, scale: 1.06 },
    zIndex: 20,
  },
  {
    name: 'Haunt',
    description: 'For teams',
    price: '$49',
    period: '/mo',
    features: ['Multi-agent', 'Shared vaults', 'SSO & SAML', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Sales',
    highlighted: false,
    desktopProps: { rotate: 5, y: 0, scale: 1 },
    zIndex: 10,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Section7Pricing() {
  const sectionRef  = useRef<HTMLElement>(null);
  const titleRef    = useRef<HTMLDivElement>(null);
  const cardsRef    = useRef<(HTMLDivElement | null)[]>([]);
  const badgeRef    = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // ── Set initial invisible states via GSAP (avoids Tailwind opacity-0 trap)
      gsap.set(titleRef.current, { y: 40, opacity: 0 });
      gsap.set(cardsRef.current.filter(Boolean), { y: 80, opacity: 0 });

      // ── Title scrub-in
      gsap.to(titleRef.current, {
        y: 0,
        opacity: 1,
        scrollTrigger: {
          trigger: titleRef.current,
          start: 'top 80%',
          end: 'top 55%',
          scrub: true,
        },
      });

      // ── Cards: responsive via gsap.matchMedia
      // All three cards share a single trigger (the center card) so they
      // animate in as a cohesive group rather than independently.
      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        // Desktop: fan to their tilted/elevated resting positions
        cardsRef.current.forEach((card, i) => {
          if (!card) return;
          const { rotate, y, scale } = plans[i].desktopProps;

          gsap.to(card, {
            y,
            rotate,
            scale,
            opacity: 1,
            scrollTrigger: {
              // Trigger on the center card so all three animate together
              trigger: cardsRef.current[1],
              start: 'top 85%',
              end: 'top 50%',
              scrub: true,
            },
          });
        });
      });

      mm.add('(max-width: 767px)', () => {
        // Mobile: simple stacked reveal, no rotation
        cardsRef.current.forEach((card) => {
          if (!card) return;
          gsap.to(card, {
            y: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              end: 'top 62%',
              scrub: true,
            },
          });
        });
      });

      // ── "Most Popular" badge: continuous gentle float (not scroll-tied)
      if (badgeRef.current) {
        gsap.to(badgeRef.current, {
          y: -5,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative w-full py-[10vh] md:py-[16vh] z-[70]"
      style={{ backgroundColor: '#0B0C10' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none" />

      <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">

        {/* ── Title */}
        <div ref={titleRef} className="text-center mb-10 md:mb-24">
          <h2 className="font-heading text-3xl md:text-[42px] font-semibold text-[#F4F6FF] mb-4 tracking-tight">
            Pick your presence.
          </h2>
          <p className="text-base md:text-lg text-[#A7B0C8] max-w-[480px] mx-auto">
            Start free, upgrade when you need more power.
          </p>
        </div>

        {/* ── Pricing cards
              perspective-container must have `perspective: 900px` in your CSS.
              On desktop the outer two cards fan out via GSAP-applied rotateZ;
              the center card floats 28px higher and scales up slightly.       */}
        <div
          className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-5 perspective-container"
        >
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="w-full md:w-[300px] flex-shrink-0"
              style={{ position: 'relative', zIndex: plan.zIndex }}
            >
              <GlassCard
                strong={plan.highlighted}
                className={`p-6 md:p-8 h-full flex flex-col ${
                  plan.highlighted
                    ? 'ring-1 ring-[#B347FF] shadow-[0_0_40px_rgba(179,71,255,0.18)]'
                    : ''
                }`}
              >
                {/* Plan header */}
                <div className="mb-6">
                  {plan.highlighted && (
                    <span
                      ref={badgeRef}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                 bg-[rgba(179,71,255,0.15)] border border-[rgba(179,71,255,0.35)]
                                 text-[#B347FF] text-xs font-medium mb-4"
                    >
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </span>
                  )}
                  <h3 className="font-heading text-2xl font-semibold text-[#F4F6FF] mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[#A7B0C8]">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="font-heading text-4xl md:text-5xl font-bold text-[#F4F6FF]">
                    {plan.price}
                  </span>
                  <span className="text-[#A7B0C8] ml-0.5">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-8" aria-label={`${plan.name} features`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className="w-4 h-4 text-[#B347FF] mt-0.5 flex-shrink-0"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-[#A7B0C8]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  aria-label={`${plan.cta} — ${plan.name} plan`}
                  className={`w-full py-3 rounded-full font-heading font-semibold text-sm
                              transition-all duration-300 ${
                    plan.highlighted
                      ? 'bg-[#B347FF] text-[#0B0C10] hover:scale-105 hover:shadow-[0_0_30px_rgba(179,71,255,0.45)]'
                      : 'border border-[rgba(255,255,255,0.2)] text-[#F4F6FF] hover:border-[#B347FF] hover:text-[#B347FF]'
                  }`}
                >
                  {plan.cta}
                </button>
              </GlassCard>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GhostMascot from '../components/GhostMascot';
import { Github, Twitter, MessageCircle, Mail } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const footerLinks = [
  {
    title: 'Product',
    links: ['Features', 'Security', 'Pricing', 'Changelog'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Press'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Status', 'Support'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Cookies', 'Licenses'],
  },
];

const socialLinks = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Github, label: 'GitHub' },
  { icon: MessageCircle, label: 'Discord' },
  { icon: Mail, label: 'Email' },
];

export default function Section8Footer() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Main CTA card
      gsap.fromTo(
        cardRef.current,
        { scale: 0.92, rotateX: 10, opacity: 0 },
        {
          scale: 1,
          rotateX: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 80%',
            end: 'top 45%',
            scrub: true,
          },
        }
      );

      // Ghost mascot
      gsap.fromTo(
        ghostRef.current,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: ghostRef.current,
            start: 'top 85%',
            end: 'top 60%',
            scrub: true,
          },
        }
      );

      // Footer columns stagger
      if (footerRef.current) {
        const cols = footerRef.current.querySelectorAll('.footer-col');
        gsap.fromTo(
          cols,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 85%',
              end: 'top 65%',
              scrub: true,
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="footer"
      className="relative w-full min-h-screen z-[80] flex flex-col"
      style={{ backgroundColor: '#0B0C10' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial-glow opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

      {/* Main CTA area */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-[12vh]">
        <div className="perspective-container w-full max-w-[700px]">
          <div
            ref={cardRef}
            className="glass-card-strong w-full min-h-[420px] md:min-h-[480px] relative overflow-hidden flex flex-col items-center justify-center p-8 md:p-12 text-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Ghost mascot */}
            <div
              ref={ghostRef}
              className="w-24 h-24 md:w-32 md:h-32 mb-6"
            >
              <GhostMascot className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(179,71,255,0.4)]" />
            </div>

            {/* Text */}
            <h2 className="font-heading text-3xl md:text-5xl font-semibold text-[#F4F6FF] mb-4 tracking-tight">
              Ready to disappear?
            </h2>
            <p className="text-base md:text-lg text-[#A7B0C8] max-w-[400px] mb-8">
              Join the waitlist. We'll invite you in quietly.
            </p>

            {/* CTA Button */}
            <button className="px-8 py-4 rounded-full bg-[#B347FF] text-[#0B0C10] font-heading font-semibold text-base hover:scale-105 hover:shadow-[0_0_40px_rgba(179,71,255,0.5)] transition-all duration-300">
              Join the Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        ref={footerRef}
        className="w-full border-t border-[rgba(255,255,255,0.06)] px-6 md:px-12 py-10 md:py-14"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-10">
            {/* Brand column */}
            <div className="footer-col col-span-2 md:col-span-1">
              <a href="#" className="font-heading text-xl font-semibold text-[#F4F6FF] mb-4 inline-block">
                Ghost<span className="text-[#B347FF]">Pay</span>
              </a>
              <p className="text-sm text-[#A7B0C8] mt-2">
                The invisible agent bank.
              </p>
              {/* Social icons */}
              <div className="flex gap-3 mt-4">
                {socialLinks.map((social) => (
                  <button
                    key={social.label}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#A7B0C8] hover:text-[#B347FF] hover:border-[rgba(179,71,255,0.4)] transition-all duration-300"
                  >
                    <social.icon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {footerLinks.map((group) => (
              <div key={group.title} className="footer-col">
                <h4 className="font-heading text-sm font-medium text-[#F4F6FF] mb-4">
                  {group.title}
                </h4>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link}>
                      <button className="text-sm text-[#A7B0C8] hover:text-[#F4F6FF] transition-colors duration-300">
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-[rgba(255,255,255,0.06)] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#A7B0C8]">
              &copy; {new Date().getFullYear()} GhostPay Inc. All rights reserved.
            </p>
            <div className="flex gap-6">
              <button className="text-xs text-[#A7B0C8] hover:text-[#F4F6FF] transition-colors duration-300">
                Privacy
              </button>
              <button className="text-xs text-[#A7B0C8] hover:text-[#F4F6FF] transition-colors duration-300">
                Terms
              </button>
              <button className="text-xs text-[#A7B0C8] hover:text-[#F4F6FF] transition-colors duration-300">
                Status
              </button>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}

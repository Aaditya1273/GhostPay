# GhostPay — Technical Specification

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.0 | UI framework |
| react-dom | ^18.3.0 | DOM renderer |
| gsap | ^3.12.0 | Core animation engine (ScrollTrigger, SplitText plugins) |
| lenis | ^1.1.0 | Smooth scroll with inertia |
| tailwindcss | ^3.4.0 | Utility-first CSS |
| autoprefixer | ^10.4.0 | CSS vendor prefixes |
| postcss | ^8.4.0 | CSS processing |
| typescript | ^5.5.0 | Type safety |
| vite | ^5.4.0 | Build tool |
| @vitejs/plugin-react | ^4.3.0 | React fast refresh for Vite |

GSAP plugins used (all free, included in `gsap` package):
- **ScrollTrigger** — scroll-driven animations and pinning
- **SplitText** — word/character splitting for headline reveals

---

## Component Inventory

### Layout

| Component | Source | Reuse |
|-----------|--------|-------|
| **Navigation** | Custom | Global — fixed header with wordmark, nav links, CTA pill |
| **Footer** | Custom | Section 8 only — links grid |

### Sections

| Component | pin | Notes |
|-----------|-----|-------|
| **Section1Hero** | true | Load animation + scroll exit only |
| **Section2Features** | false | 3-column card grid, flowing |
| **Section3Agent** | true | 3D card with chat bubbles, ghost mascot |
| **Section4Vault** | true | Lock UI, status chips, vault card |
| **Section5Network** | false | Orbit ring visual, integration cards |
| **Section6Testimonials** | true | Stacked 3D card echo stack |
| **Section7Pricing** | false | 3 pricing cards, highlighted Pro plan |
| **Section8FooterCTA** | false | Final CTA card + footer links |

### Reusable Components

| Component | Source | Used By |
|-----------|--------|---------|
| **GlassCard** | Custom | All sections — 3D glass surface with preserve-3d, border, shadow |
| **GhostMascot** | Custom | Sections 1, 3, 4, 8 — `<img>` wrapper with float animation class |
| **ChatBubble** | Custom | Section 3 — agent/user message bubbles |
| **OrbitCard** | Custom | Section 1 — small floating feature cards |
| **StatusChip** | Custom | Section 4 — small pill labels (Encrypted, Biometric, Audited) |
| **PricingCard** | Custom | Section 7 — plan card with optional highlight border |
| **TestimonialCard** | Custom | Section 6 — quote card with avatar |

### Hooks

| Hook | Purpose |
|------|---------|
| **useLenis** | Initialize Lenis, connect to ScrollTrigger scrollerProxy |
| **useScrollAnimation** | GSAP ScrollTrigger timeline setup/cleanup pattern |

---

## Animation Implementation Table

| Animation | Library | Approach | Complexity |
|-----------|---------|----------|------------|
| **Hero load entrance (card, ghost, text, orbit cards)** | GSAP timeline | `gsap.timeline()` on mount; staggered fromTo with translateZ/rotateX/Y; ~1.2s total | 🔒 High |
| **Hero scroll exit (card + orbit divergence)** | GSAP ScrollTrigger | Scrubbed timeline; card moves toward camera (translateZ+); orbit cards diverge to edges; opacity held to 95% | 🔒 High |
| **Section 3 entrance (agent card slides in)** | GSAP ScrollTrigger | fromTo: translateX(60vw) rotateY(-55deg) translateZ(-220px) → settled; scrubbed 0–30% | 🔒 High |
| **Section 3 exit (ghost pops forward)** | GSAP ScrollTrigger | Ghost translateZ(40px) → translateZ(220px); card rotates away; 70–100% | 🔒 High |
| **Section 4 entrance (vault lockdown)** | GSAP ScrollTrigger | fromTo: translateZ(-600px) rotateX(25deg) scale(0.92) → settled; lock scale+rotate pop | 🔒 High |
| **Section 6 echo stack (3D card cascade)** | GSAP ScrollTrigger | Stack group translateX/rotateY/translateZ entrance; middle card ambient drift loop | 🔒 High |
| **Global scroll snap (pinned sections only)** | GSAP ScrollTrigger | `snap` callback derived from pinned section ranges; targets settle centers (50%); flowing sections return original | 🔒 High |
| **Headline word stagger reveal** | GSAP SplitText | Split by words; each from y:24px opacity:0 → settled; stagger 0.05–0.08s | Medium |
| **Ghost ambient float** | CSS keyframes | `translateY(-6px → +6px)` over 3.5s, infinite; applied via class | Low |
| **Lock ring pulse** | CSS keyframes | `scale(1 → 1.04)` over 4s, infinite | Low |
| **Features cards scroll reveal** | GSAP ScrollTrigger | fromTo: y:80px rotateX(12deg) opacity:0 → settled; scrubbed; stagger 0.15s | Medium |
| **Network orbit ring reveal** | GSAP ScrollTrigger | fromTo: scale(0.9) rotate(-10deg) opacity:0 → settled; logo dots stagger radial | Medium |
| **Pricing cards scroll reveal** | GSAP ScrollTrigger | fromTo: y:90px rotateX(14deg) opacity:0 → settled; stagger 0.12s | Medium |
| **Nav show/hide on scroll** | GSAP ScrollTrigger | Toggle opacity/translateY based on scroll direction (optional polish) | Low |

---

## State & Logic Plan

### Lenis ↔ ScrollTrigger Bridge
Lenis must drive ScrollTrigger's scroll position. Implementation:
- Initialize Lenis in a root-level provider/hook
- Call `ScrollTrigger.scrollerProxy()` or use Lenis's `scroll` event to `ScrollTrigger.update()`
- All ScrollTrigger instances use default (window) scroller; Lenis wraps native scroll

### Hero ScrollTrigger Conflict Prevention
The hero has **two independent animation systems**:
1. **Load timeline** — plays once on mount, brings elements to settled state
2. **Scroll timeline** — handles exit only (70–100%), assumes settled state at start

Critical implementation:
- Scroll timeline must use a **fromTo()** that starts from the **settled state** (not a hidden state), so there is no conflict with the load animation end-state
- `onLeaveBack` on hero ScrollTrigger forces all hero elements back to fully visible settled state

### Ghost Mascot Instances
The same ghost image appears in 4 sections. Each instance is independent (not a shared component with state). Implementation:
- Each section imports `GhostMascot` with the appropriate image source
- Section 4 uses the `ghost_mascot_locked` variant
- All others use `ghost_mascot_main`

---

## Other Key Decisions

### No React Animation Libraries
GSAP + ScrollTrigger handles everything. No Framer Motion, no react-spring. This keeps scroll-linked transforms predictable and avoids React reconciliation overhead on scrubbed animations.

### 3D via CSS (not Three.js)
All depth effects use CSS `transform-style: preserve-3d` + `perspective` on parent containers. No WebGL/Three.js. This is lighter, sharper for UI cards, and avoids the complexity of a canvas layer for what is fundamentally DOM-based content.

### Image Assets
All images are static PNGs (ghost mascots transparent, avatars opaque). No SVG illustrations except the procedural dot-grid and orbit-ring graphics. Images are placed in `public/images/` and referenced by path.

### Font Loading
Space Grotesk and Inter loaded via Google Fonts `<link>` in `index.html`. No self-hosted font files to keep setup minimal.

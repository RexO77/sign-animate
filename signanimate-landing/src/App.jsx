import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import gsap from 'gsap';

const HERO_IMAGE = '/rare-hero.jpg';
const HERO_FALLBACK_IMAGE = '/hero_ink_texture.png';

const NAV_LINKS = [
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Craft', href: '#craft' },
  { label: 'Examples', href: '#examples' },
];

const EXAMPLES = [
  { name: 'Quiet Stroke', type: 'GIF', path: 'M20,96 C60,30 120,130 164,80 C194,46 242,92 292,64' },
  { name: 'Editorial Flow', type: 'MP4', path: 'M14,92 C62,12 118,134 164,70 C212,18 260,120 306,74' },
  { name: 'Fine Line', type: 'SVG', path: 'M28,88 C74,38 118,110 156,74 C194,44 238,88 302,78' },
  { name: 'Ink Sweep', type: 'PNG', path: 'M14,90 C48,56 104,30 148,78 C198,126 248,58 310,62' },
  { name: 'Letter Blend', type: 'CODE', path: 'M18,96 C58,28 126,142 178,86 C224,38 270,104 318,68' },
  { name: 'Long Tail', type: 'JPEG', path: 'M26,90 C60,58 110,24 166,86 C226,152 278,76 334,74' },
];

const PROCESS_STEPS = [
  {
    title: 'Draw or upload',
    body: 'Start from a live sketch, pasted signature, or image upload. The editor keeps the natural rhythm of your hand.',
  },
  {
    title: 'Choose motion',
    body: 'Dial in pace, reveal style, and stroke order until the movement feels true to the original signature.',
  },
  {
    title: 'Export and embed',
    body: 'Ship animation-ready GIF, MP4, SVG, and clean embed code without adding accounts or paywalls.',
  },
];

const CRAFT_PRINCIPLES = [
  {
    title: 'Free forever',
    body: 'No trials, no upgrade pressure, no hidden plan wall. The whole tool stays open for everyone.',
  },
  {
    title: 'Quality over growth hacks',
    body: 'Built slowly with attention to motion, feel, and output quality instead of vanity funnels and gimmicks.',
  },
  {
    title: 'Hobby project energy',
    body: 'Made by a builder who cares about signatures as gestures. Small scope, high standards, honest iteration.',
  },
];

const NoiseOverlay = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      pointerEvents: 'none',
      opacity: 0.04,
      backgroundImage:
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
    }}
  />
);

const Navbar = ({ scrolled, onTryForFree }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl">
      <nav
        className={`rounded-full px-6 py-4 flex items-center justify-between transition-all duration-300 ${
          scrolled
            ? 'bg-dark/75 border border-bg/15 shadow-xl backdrop-blur-xl'
            : 'bg-dark/35 border border-bg/10 backdrop-blur-md'
        }`}
      >
        <a href="#top" className="flex items-center gap-2 group">
          <span className="font-sans font-bold tracking-tight text-xl text-bg">SignAnimate</span>
          <svg viewBox="0 0 100 20" className="w-12 h-3 overflow-visible">
            <path d="M5,15 Q30,5 50,15 T95,5" fill="none" className="stroke-2 stroke-accent" />
          </svg>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="font-sans text-sm font-semibold text-bg/80 hover:text-bg transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex">
          <button
            type="button"
            onClick={onTryForFree}
            className="min-h-[44px] bg-accent text-bg px-6 py-2.5 rounded-full font-sans font-semibold text-sm hover:brightness-105 transition-all"
          >
            Open Editor
          </button>
        </div>

        <button type="button" onClick={() => setMenuOpen((prev) => !prev)} className="md:hidden text-bg">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden mt-3 rounded-2xl border border-bg/12 bg-dark/85 backdrop-blur-xl p-4 flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-sans text-sm font-semibold text-bg/85 hover:text-bg transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onTryForFree();
            }}
            className="mt-2 min-h-[44px] bg-accent text-bg rounded-full font-sans font-semibold text-sm"
          >
            Open Editor
          </button>
        </div>
      )}
    </header>
  );
};

const Hero = ({ onTryForFree }) => {
  const heroRef = useRef(null);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-fade', {
        y: 26,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const scrollToExamples = () => {
    const section = document.getElementById('examples');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="top" ref={heroRef} className="relative min-h-[100dvh] w-full overflow-hidden pt-32 md:pt-36 pb-24 px-6 md:px-14">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImageSrc}
          alt="Hand-drawn rare signature in warm ink on a dark textured background"
          onError={() => setHeroImageSrc(HERO_FALLBACK_IMAGE)}
          className="hero-image-drift w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,10,18,0.45),rgba(7,10,18,0.9))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(231,180,79,0.2),transparent_48%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-end">
        <div className="flex flex-col gap-6 md:gap-7">
          <p className="hero-fade font-mono text-[11px] tracking-[0.2em] uppercase text-bg/75">*rare - craft over shortcuts</p>

          <h1 className="flex flex-col gap-2">
            <span className="hero-fade font-sans font-extrabold text-bg text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight">
              Make signatures that feel rare.
            </span>
            <span className="hero-fade font-serif italic text-[#f5d57a] text-4xl sm:text-5xl md:text-6xl leading-[0.95]">
              Free forever. Built for craft.
            </span>
          </h1>

          <p className="hero-fade max-w-2xl font-sans text-lg md:text-xl leading-relaxed text-bg/78">
            Something rare is not better or worse. It is less seen. SignAnimate helps you turn that unusual handwriting gesture into living motion without charging for the core craft.
          </p>

          <div className="hero-fade flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
            <button
              type="button"
              onClick={onTryForFree}
              className="min-h-[46px] bg-accent text-bg px-8 py-3 rounded-full font-sans font-semibold text-base hover:brightness-105 transition-all"
            >
              Open Editor
            </button>
            <button
              type="button"
              onClick={scrollToExamples}
              className="min-h-[46px] rounded-full border border-bg/30 bg-dark/25 px-6 py-3 text-bg/88 font-sans font-semibold hover:bg-dark/40 transition-colors"
            >
              See Examples
            </button>
          </div>

          <p className="hero-fade font-mono text-xs uppercase tracking-[0.18em] text-bg/62">No account. No paywall. No trial expiration.</p>
        </div>

        <div className="hero-fade rounded-[2rem] border border-bg/18 bg-dark/45 backdrop-blur-xl p-6 md:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bg/58 mb-3">Signature motion preview</p>
          <svg viewBox="0 0 560 170" className="w-full overflow-visible">
            <path
              className="signature-draw"
              d="M20,108 C96,38 168,138 226,86 C286,34 352,112 414,70 C454,44 508,68 544,54"
              fill="none"
              stroke="#f5d57a"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
            />
          </svg>
          <div className="mt-5 pt-4 border-t border-bg/14 flex items-center justify-between gap-3">
            <span className="font-sans text-sm text-bg/72">Export GIF, MP4, SVG, and embed code in one pass.</span>
            <button
              type="button"
              onClick={onTryForFree}
              className="min-h-[44px] shrink-0 rounded-full bg-bg text-dark px-4 py-2 font-sans text-sm font-semibold hover:bg-bg/90 transition-colors inline-flex items-center gap-1"
            >
              Open <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => (
  <section id="how-it-works" className="w-full bg-bg py-20 md:py-24 px-6 md:px-14">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12 md:mb-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/60 mb-4">How it works</p>
        <h2 className="font-sans font-bold text-dark text-3xl md:text-5xl tracking-tight leading-tight">A clean workflow for hand-drawn signatures.</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PROCESS_STEPS.map((step, index) => (
          <article key={step.title} className="rounded-[1.6rem] border border-primary/12 bg-[#f5f2e8] p-7 md:p-8 shadow-sm">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-4">0{index + 1}</p>
            <h3 className="font-sans font-semibold text-dark text-2xl leading-tight mb-4">{step.title}</h3>
            <p className="font-sans text-muted text-base leading-relaxed">{step.body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const CraftPrinciples = () => (
  <section id="craft" className="w-full bg-dark py-20 md:py-24 px-6 md:px-14">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12 md:mb-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent/80 mb-4">Craft principles</p>
        <h2 className="font-sans font-bold text-bg text-3xl md:text-5xl tracking-tight leading-tight">Made as a free tool for people who care about details.</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CRAFT_PRINCIPLES.map((principle) => (
          <article key={principle.title} className="rounded-[1.6rem] border border-bg/12 bg-bg/5 p-7 md:p-8 backdrop-blur-sm">
            <h3 className="font-sans font-semibold text-bg text-2xl leading-tight mb-4">{principle.title}</h3>
            <p className="font-sans text-bg/72 text-base leading-relaxed">{principle.body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Examples = () => (
  <section id="examples" className="w-full bg-[#161d19] py-20 md:py-24 px-6 md:px-14">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12 md:mb-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent/75 mb-4">Examples</p>
        <h2 className="font-sans font-bold text-bg text-3xl md:text-5xl tracking-tight leading-tight">Animated signature outputs with a human edge.</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXAMPLES.map((example) => (
          <article key={example.name} className="rounded-[1.6rem] border border-bg/12 bg-dark/60 p-5 shadow-xl">
            <div className="rounded-[1.1rem] bg-bg/5 border border-bg/10 p-4 mb-4">
              <svg viewBox="0 0 360 130" className="w-full h-24 overflow-visible">
                <path
                  d={example.path}
                  fill="none"
                  stroke="#f5d57a"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="example-stroke"
                />
              </svg>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-sans font-semibold text-bg text-sm">{example.name}</p>
              <span className="rounded-md bg-accent/16 border border-accent/28 px-2 py-1 font-mono text-[10px] tracking-[0.16em] text-accent uppercase">
                {example.type}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTA = ({ onTryForFree }) => (
  <section className="w-full bg-accent py-20 md:py-28 px-6 md:px-14 text-center">
    <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
      <h2 className="font-sans font-bold text-bg text-4xl md:text-6xl tracking-tight leading-tight">Ready to animate your signature?</h2>
      <p className="font-sans text-bg/85 text-lg md:text-xl leading-relaxed">
        Open the editor and create as many exports as you want. This project stays free and focused on craft.
      </p>
      <button
        type="button"
        onClick={onTryForFree}
        className="min-h-[46px] rounded-full bg-dark text-bg px-8 py-3 font-sans font-semibold text-base hover:bg-dark/90 transition-colors"
      >
        Open Editor
      </button>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-bg/76">No account. No paywall. No trial pressure.</p>
    </div>
  </section>
);

const Footer = ({ onTryForFree }) => (
  <footer className="w-full bg-dark text-bg px-6 md:px-14 py-12 border-t border-bg/10">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      <div>
        <p className="font-sans font-bold text-2xl">SignAnimate</p>
        <p className="font-serif italic text-accent text-lg">Rare signatures, moving with intent.</p>
        <p className="font-mono text-xs text-bg/50 mt-3">A free hobby project focused on craft and quality.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {NAV_LINKS.map((link) => (
          <a key={link.label} href={link.href} className="font-sans text-sm text-bg/78 hover:text-bg transition-colors">
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={onTryForFree}
          className="min-h-[44px] rounded-full border border-bg/25 px-5 py-2 font-sans text-sm font-semibold hover:bg-bg/10 transition-colors"
        >
          Open Editor
        </button>
      </div>
    </div>
  </footer>
);

function App({ onTryForFree }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <NoiseOverlay />
      <Navbar scrolled={scrolled} onTryForFree={onTryForFree} />
      <main className="w-full flex flex-col items-center overflow-x-hidden bg-dark">
        <Hero onTryForFree={onTryForFree} />
        <HowItWorks />
        <CraftPrinciples />
        <Examples />
        <FinalCTA onTryForFree={onTryForFree} />
      </main>
      <Footer onTryForFree={onTryForFree} />
    </>
  );
}

export default App;

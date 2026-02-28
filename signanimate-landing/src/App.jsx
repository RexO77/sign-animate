import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import gsap from 'gsap';

const NAV_LINKS = [
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Craft', href: '#craft' },
  { label: 'Examples', href: '#examples' },
];

const HERO_FORMATS = [
  { label: 'GIF', detail: 'Loop-ready for socials' },
  { label: 'MP4', detail: 'Lossless timeline export' },
  { label: 'SVG', detail: 'Sharp, editable vector' },
  { label: 'CODE', detail: 'Clean embed snippet' },
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
  const previewRef = useRef(null);
  const [activeFormat, setActiveFormat] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-reveal', {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.11,
        ease: 'power3.out',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const rotation = window.setInterval(() => {
      setActiveFormat((current) => (current + 1) % HERO_FORMATS.length);
    }, 2200);

    return () => window.clearInterval(rotation);
  }, []);

  const scrollToExamples = () => {
    const section = document.getElementById('examples');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--spot-x', `${x.toFixed(2)}%`);
    event.currentTarget.style.setProperty('--spot-y', `${y.toFixed(2)}%`);
  };

  const handleHeroPointerLeave = (event) => {
    event.currentTarget.style.setProperty('--spot-x', '72%');
    event.currentTarget.style.setProperty('--spot-y', '26%');
  };

  const handlePreviewMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 8;
    const rotateX = (0.5 - py) * 8;
    if (previewRef.current) {
      previewRef.current.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
      previewRef.current.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
    }
  };

  const handlePreviewLeave = () => {
    if (previewRef.current) {
      previewRef.current.style.setProperty('--tilt-x', '0deg');
      previewRef.current.style.setProperty('--tilt-y', '0deg');
    }
  };

  return (
    <section
      id="top"
      ref={heroRef}
      onMouseMove={handleHeroPointerMove}
      onMouseLeave={handleHeroPointerLeave}
      style={{ '--spot-x': '72%', '--spot-y': '26%' }}
      className="relative min-h-[100dvh] w-full overflow-hidden pt-28 md:pt-32 pb-16 md:pb-20 px-6 md:px-14"
    >
      <div className="absolute inset-0 -z-10 bg-[#0b1017]">
        <div className="hero-grid absolute inset-0" />
        <div
          className="absolute inset-0 transition-[background] duration-300"
          style={{ background: 'radial-gradient(circle at var(--spot-x) var(--spot-y), rgba(245, 213, 122, 0.32), rgba(245, 213, 122, 0) 42%)' }}
        />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-orb hero-orb-three" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,12,20,0.42),rgba(8,12,20,0.92))]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto min-h-[74vh] grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-14 items-center">
        <div className="flex flex-col gap-7">
          <h1 className="flex flex-col gap-3">
            <span className="hero-reveal font-sans font-extrabold text-bg text-5xl sm:text-6xl md:text-7xl leading-[0.94] tracking-tight">
              Signature animation
              <br />
              with precision.
            </span>
            <span className="hero-reveal font-serif italic text-[#f5d57a] text-[2.25rem] sm:text-5xl md:text-6xl leading-[0.95]">
              Fast, clean, and free.
            </span>
          </h1>

          <p className="hero-reveal max-w-xl font-sans text-lg md:text-xl leading-relaxed text-bg/78">
            Draw or upload a signature, tune the motion, and export polished GIF, MP4, SVG, or embed code.
          </p>

          <div className="hero-reveal flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
            <button
              type="button"
              onClick={onTryForFree}
              className="min-h-[48px] bg-accent text-bg px-8 py-3 rounded-full font-sans font-semibold text-base hover:brightness-105 transition-all inline-flex items-center gap-2"
            >
              Open Editor <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={scrollToExamples}
              className="min-h-[48px] rounded-full border border-bg/28 bg-bg/8 px-6 py-3 text-bg/88 font-sans font-semibold hover:bg-bg/14 transition-colors"
            >
              See Examples
            </button>
          </div>
        </div>

        <div className="hero-reveal relative self-center">
          <svg viewBox="0 0 620 280" className="absolute -top-12 -left-8 w-[130%] max-w-none opacity-28 pointer-events-none">
            <path d="M24,206 C154,24 280,308 430,106 C506,6 584,116 614,58" fill="none" className="hero-orbit-line stroke-accent/50" strokeWidth="1.4" />
            <path d="M20,232 C132,146 248,90 380,160 C484,216 558,124 612,144" fill="none" className="hero-orbit-line stroke-bg/45" strokeWidth="1" />
          </svg>

          <div
            ref={previewRef}
            className="hero-tilt-card relative rounded-[2rem] border border-bg/18 bg-[#111723]/88 backdrop-blur-xl p-6 md:p-7 shadow-[0_28px_80px_rgba(0,0,0,0.5)]"
            onMouseMove={handlePreviewMove}
            onMouseLeave={handlePreviewLeave}
            style={{ '--tilt-x': '0deg', '--tilt-y': '0deg' }}
          >
            <div className="absolute inset-0 rounded-[2rem] border border-[#f5d57a]/18 pointer-events-none" />
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-accent/30 blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between gap-3 mb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bg/58">Live stroke engine</p>
              <span className="rounded-full border border-bg/20 bg-bg/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bg/68">
                8ms preview
              </span>
            </div>

            <div className="rounded-2xl border border-bg/14 bg-[#0b111b] p-4 md:p-5">
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
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {HERO_FORMATS.map((format, index) => (
                <button
                  type="button"
                  key={format.label}
                  onMouseEnter={() => setActiveFormat(index)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    index === activeFormat
                      ? 'border-accent/60 bg-accent/18'
                      : 'border-bg/14 bg-bg/5 hover:border-bg/30'
                  }`}
                >
                  <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-bg/72">{format.label}</p>
                  <p className="font-sans text-xs text-bg/62 mt-1">{format.detail}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 h-1 rounded-full bg-bg/10 overflow-hidden">
              <span
                className="block h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${((activeFormat + 1) / HERO_FORMATS.length) * 100}%` }}
              />
            </div>

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

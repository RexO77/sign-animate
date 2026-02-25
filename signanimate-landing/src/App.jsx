import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, Code, Check, CheckCircle2, Copy, Play } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- Noise Overlay ---
const NoiseOverlay = () => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      pointerEvents: 'none',
      opacity: 0.05,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    }}
    aria-hidden="true"
  />
);

// --- Navbar ---
const Navbar = ({ scrolled }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] px-6 py-4 flex items-center justify-between ${scrolled ? 'bg-bg/70 backdrop-blur-xl border border-primary/20 shadow-lg' : 'bg-transparent text-bg shadow-none'} `}>
      {/* Brand */}
      <div className="flex items-center gap-2 cursor-pointer group hover:-translate-y-[1px] transition-transform">
        <span className={`font-sans font-bold text-xl ${scrolled ? 'text-primary' : 'text-bg'}`}>
          SignAnimate
        </span>
        <svg viewBox="0 0 100 20" className="w-12 h-3 overflow-visible">
          <path d="M5,15 Q30,5 50,15 T95,5" fill="none" className={`stroke-2 ${scrolled ? 'stroke-primary' : 'stroke-bg'}`} style={{ strokeDasharray: 100, strokeDashoffset: 0 }} />
        </svg>
      </div>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-8">
        {['How It Works', 'Features', 'Examples', 'Pricing'].map(link => (
          <a key={link} href="#" className={`font-sans text-sm font-semibold transition-transform hover:-translate-y-[1px] ${scrolled ? 'text-primary/80 hover:text-primary' : 'text-bg/80 hover:text-bg'}`}>
            {link}
          </a>
        ))}
      </div>

      {/* CTA Button */}
      <div className="hidden md:flex">
        <button className="bg-accent text-bg px-6 py-2.5 rounded-full font-sans font-semibold text-sm relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]">
          <span className="relative z-10">Try It Free</span>
          <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
        </button>
      </div>

      {/* Mobile Menu Toggle */}
      <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X className={scrolled ? 'text-primary' : 'text-bg'} /> : <Menu className={scrolled ? 'text-primary' : 'text-bg'} />}
      </button>
    </nav>
  );
};

// --- Hero Section ---
const Hero = ({ onScrollChange }) => {
  const heroRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Entrance Animation
      gsap.from('.hero-element', {
        y: 40, opacity: 0,
        duration: 0.9, stagger: 0.08, ease: 'power3.out',
        delay: 0.2
      });

      // Scroll Indicator bounce
      gsap.to('.scroll-indicator', {
        y: 10, yoyo: true, repeat: -1, duration: 1.5, ease: 'power1.inOut'
      });

      // Scrolled state logic for Navbar
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'bottom 80%',
        onEnter: () => onScrollChange(true),
        onLeaveBack: () => onScrollChange(false)
      });
    }, heroRef);
    return () => ctx.revert();
  }, [onScrollChange]);

  return (
    <section ref={heroRef} className="relative min-h-[100dvh] w-full flex flex-col justify-end bg-dark overflow-hidden pb-32 md:pb-20 px-8 md:pl-16">
      <div className="absolute inset-0 z-0">
        <img src="/hero_ink_texture.png" alt="Dark ink parchment" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-primary/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-5xl">
        <h1 className="flex flex-col gap-0 mb-6">
          <span className="hero-element font-sans font-extrabold text-bg text-5xl md:text-[5rem] leading-none mb-2">
            Your signature
          </span>
          <span className="hero-element font-sans font-normal text-bg/60 text-3xl md:text-[3rem] leading-none mb-4">
            is the
          </span>
          <span className="hero-element font-serif italic text-bg text-7xl md:text-[9rem] leading-none tracking-tight">
            signature.
          </span>
        </h1>

        <p className="hero-element font-mono text-bg/60 text-sm md:text-base mb-10 tracking-wide uppercase">
          animate · export · embed — in seconds
        </p>

        <button className="hero-element bg-accent text-bg px-8 py-4 rounded-full font-sans font-bold text-lg relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1">
          <span className="relative z-10">Try It Free</span>
          <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
        </button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
        <span className="font-mono text-xs text-bg uppercase tracking-widest">scroll</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="scroll-indicator text-bg">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
};

// --- Demo Strip ---
const DemoStrip = () => {
  const demos = [
    { name: 'Cursive Bold', type: 'GIF', path: 'M20,60 Q40,10 60,60 T100,60 T140,60 Q120,20 160,20 T180,60', stroke: 3 },
    { name: 'Classic Formal', type: 'MP4', path: 'M10,80 Q50,-20 90,80 T170,80', stroke: 2 },
    { name: 'Modern Minimal', type: 'SVG', path: 'M30,50 L80,50 M80,20 L80,80', stroke: 4 },
    { name: 'Executive', type: 'CODE', path: 'M20,50 C40,0 80,100 100,50 C120,0 160,100 180,50', stroke: 2 },
    { name: 'Flourished', type: 'PNG', path: 'M10,90 Q40,-30 80,90 C80,90 120,0 150,90 C180,90 140,40 200,40', stroke: 2 },
    { name: 'Condensed', type: 'JPEG', path: 'M40,20 L40,80 M40,50 Q80,20 80,80 M80,50 Q120,20 120,80 M120,50 Q160,20 160,80', stroke: 3 },
  ];

  return (
    <section className="w-full py-12 bg-bg overflow-hidden relative">
      <div className="flex md:gap-8 gap-4 w-max hover:[&>div]:animation-play-state-paused">
        {/* Duplicate array for seamless loop */}
        {[...demos, ...demos].map((demo, i) => (
          <div key={i} className="animate-marquee hover:[animation-play-state:paused] flex-shrink-0 w-72 md:w-96 rounded-[2rem] bg-dark border border-primary/20 p-6 flex flex-col gap-6 shadow-2xl relative group">
            <div className="h-32 bg-surface/5 rounded-[1.5rem] flex items-center justify-center p-4">
              <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
                <path
                  d={demo.path}
                  fill="none"
                  className="stroke-bg/90 stroke-dasharray-[300] stroke-dashoffset-[300] transition-colors group-hover:stroke-bg animate-[dash_2.5s_ease-in-out_infinite_alternate]"
                  strokeWidth={demo.stroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-bg/90 tracking-wide text-sm">{demo.name}</span>
              <span className="bg-accent/20 text-accent font-mono text-xs px-2 py-1 rounded-md">{demo.type}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
};

// --- Features Section ---
const Features = () => {
  return (
    <section className="py-24 px-6 md:px-16 w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Card 1: Style Shuffler */}
        <div className="bg-surface border border-primary/10 rounded-[2rem] p-8 shadow-sm flex flex-col h-[28rem] hover:-translate-y-1 transition-transform group relative overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center -mt-8">
            <div className="absolute w-44 h-24 bg-bg shadow-lg rounded-2xl border border-primary/10 -rotate-3 overflow-hidden transition-transform duration-700 delay-0 group-hover:-translate-y-4 group-hover:-rotate-6 z-10 flex items-center justify-center">
              <span className="font-serif italic text-dark text-xl">Fade In</span>
            </div>
            <div className="absolute w-44 h-24 bg-bg shadow-lg rounded-2xl border border-primary/10 rotate-1 overflow-hidden transition-transform duration-700 delay-100 group-hover:translate-x-4 group-hover:rotate-3 z-20 flex items-center justify-center">
              <span className="font-serif italic text-dark text-xl">Draw Stroke</span>
            </div>
            <div className="absolute w-44 h-24 bg-bg shadow-lg rounded-2xl border border-primary/10 rotate-[4deg] overflow-hidden transition-transform duration-700 delay-200 group-hover:translate-y-4 group-hover:rotate-6 z-30 flex items-center justify-center bg-dark text-bg">
              <span className="font-serif italic text-xl text-accent">Ink Bloom</span>
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="font-sans font-bold text-xl text-dark mb-2">Animate in Seconds</h3>
            <p className="font-sans text-muted text-sm leading-relaxed">Choose from dozens of motion styles. Your signature, alive.</p>
          </div>
        </div>

        {/* Card 2: Export Typewriter */}
        <div className="bg-surface border border-primary/10 rounded-[2rem] p-8 shadow-sm flex flex-col h-[28rem] hover:-translate-y-1 transition-transform relative group">
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-xs text-accent">Live Export</span>
          </div>
          <div className="flex-1 mt-8 mb-6 bg-dark/5 rounded-2xl p-4 font-mono text-xs text-dark/70 overflow-hidden relative border border-primary/5">
            <div className="flex flex-col gap-2">
              <p>&gt; Exporting signature...</p>
              <p className="opacity-50 group-hover:opacity-100 transition-opacity delay-100">&gt; Format: MP4 ✓</p>
              <p className="opacity-30 group-hover:opacity-100 transition-opacity delay-200">&gt; Format: SVG ✓</p>
              <p className="opacity-10 group-hover:opacity-100 transition-opacity delay-300">&gt; Ready to share.</p>
              <span className="inline-block w-2 h-4 bg-accent animate-blink mt-1"></span>
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="font-sans font-bold text-xl text-dark mb-2">Export Everything</h3>
            <p className="font-sans text-muted text-sm leading-relaxed">GIF, MP4, PNG, JPEG, SVG, or clean embed code. Ship it anywhere.</p>
          </div>
        </div>

        {/* Card 3: Embed Protocol */}
        <div className="bg-surface border border-primary/10 rounded-[2rem] p-8 shadow-sm flex flex-col h-[28rem] hover:-translate-y-1 transition-transform group">
          <div className="flex-1 flex flex-col items-center justify-center mb-6 relative">
            <div className="w-full bg-dark text-bg/90 rounded-2xl p-4 font-mono text-[10px] sm:text-xs border border-primary/20 shadow-xl opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-[1.02] transform duration-500">
              <pre><code>
                <span className="text-muted">&lt;</span><span className="text-accent">script</span> src=<span className="text-[#a5b4fc]">"signanimate.js"</span>
                data-id=<span className="text-[#a5b4fc]">"sig_abc123"</span><span className="text-muted">&gt;</span>
                <span className="text-muted">&lt;/</span><span className="text-accent">script</span><span className="text-muted">&gt;</span>
              </code></pre>
            </div>
            <div className="absolute bottom-4 right-4 bg-accent text-bg px-3 py-1.5 rounded-full text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity delay-300 flex items-center gap-1 shadow-lg">
              Copied <Check size={12} />
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="font-sans font-bold text-xl text-dark mb-2">Embed Anywhere</h3>
            <p className="font-sans text-muted text-sm leading-relaxed">One script tag. Your animated signature, live on any website.</p>
          </div>
        </div>

      </div>
    </section>
  );
};

// --- Philosophy Section ---
const Philosophy = () => {
  const philRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from('.phil-word', {
        scrollTrigger: {
          trigger: philRef.current,
          start: 'top 70%',
        },
        y: 20, opacity: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: 'power3.out'
      });

      gsap.to('.phil-bg', {
        scrollTrigger: {
          trigger: philRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        y: '20%'
      });
    }, philRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={philRef} className="relative w-full py-32 md:py-48 bg-dark overflow-hidden flex items-center justify-center px-6">
      <div className="absolute inset-0 z-0">
        <img src="/philosophy_parchment_texture.png" alt="Parchment texture" className="phil-bg w-full h-[120%] object-cover opacity-10 absolute top-[-10%]" />
      </div>

      <div className="relative z-10 max-w-4xl text-center flex flex-col gap-12">
        <div className="flex flex-col gap-2">
          <p className="font-sans text-xl md:text-2xl text-bg/60">
            {'Most signature tools focus on:'.split(' ').map((w, i) => <span key={i} className="phil-word inline-block mr-2">{w}</span>)}
          </p>
          <p className="font-sans text-xl md:text-2xl text-bg/80">
            {'static images.'.split(' ').map((w, i) => <span key={i} className="phil-word inline-block mr-2">{w}</span>)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-sans font-semibold text-2xl md:text-3xl text-bg">
            {'We focus on:'.split(' ').map((w, i) => <span key={i} className="phil-word inline-block mr-2">{w}</span>)}
          </p>
          <p className="font-serif italic text-6xl md:text-[7rem] text-accent leading-none">
            {'motion.'.split(' ').map((w, i) => <span key={i} className="phil-word inline-block mr-2">{w}</span>)}
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          <p className="font-sans text-lg md:text-xl text-bg/70">
            {"Your signature isn't a stamp.".split(' ').map((w, i) => <span key={i} className="phil-word inline-block mr-2">{w}</span>)}
          </p>
          <p className="font-serif italic text-4xl md:text-6xl text-bg leading-none">
            {"It's a gesture.".split(' ').map((w, i) => <span key={i} className="phil-word inline-block mr-2">{w}</span>)}
          </p>
        </div>
      </div>
    </section>
  );
};

// --- How It Works ---
const HowItWorks = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Only apply sticky pinning on desktop (>768px)
    if (window.innerWidth < 768) return;

    let ctx = gsap.context(() => {
      const panels = gsap.utils.toArray('.hiw-panel');

      panels.forEach((panel, i) => {
        if (i === panels.length - 1) return; // skip last

        ScrollTrigger.create({
          trigger: panel,
          start: 'top top',
          pin: true,
          pinSpacing: false
        });

        gsap.to(panel, {
          scrollTrigger: {
            trigger: panels[i + 1],
            start: 'top bottom',
            end: 'top top',
            scrub: true
          },
          scale: 0.92,
          filter: "blur(12px)",
          opacity: 0.4,
          ease: "none"
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="w-full bg-[#E5E2D8] py-12 md:py-0">

      {/* Panel 1 */}
      <div className="hiw-panel w-full md:h-screen sticky top-0 bg-bg md:rounded-b-[2.5rem] flex flex-col md:flex-row items-center border-b border-primary/10 overflow-hidden shdow-sm">
        <div className="w-full md:w-1/2 p-12 md:p-24 flex flex-col justify-center h-full">
          <span className="font-mono text-accent text-lg mb-4">01</span>
          <h2 className="font-sans font-bold text-4xl md:text-5xl text-dark mb-6 tracking-tight">Start with your signature.</h2>
          <p className="font-sans text-muted text-lg md:text-xl leading-relaxed max-w-md">Draw directly in the canvas, upload an image, or paste from your clipboard. SignAnimate reads it instantly.</p>
        </div>
        <div className="w-full md:w-1/2 h-96 md:h-full bg-surface/50 flex items-center justify-center relative overflow-hidden">
          <svg viewBox="0 0 200 200" className="w-64 h-64 animate-[spin_20s_linear_infinite]">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#2E4036" strokeWidth="2" strokeDasharray="10 20" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#2E4036" strokeWidth="1" strokeDasharray="5 15" className="origin-center animate-[spin_10s_linear_infinite_reverse]" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-serif italic text-4xl text-dark">N. Skanda</div>
          </div>
        </div>
      </div>

      {/* Panel 2 */}
      <div className="hiw-panel w-full md:h-screen sticky top-0 bg-bg md:rounded-[2.5rem] flex flex-col md:flex-row items-center border-b border-primary/10 overflow-hidden shadow-sm">
        <div className="w-full md:w-1/2 p-12 md:p-24 flex flex-col justify-center h-full order-1 md:order-2">
          <span className="font-mono text-accent text-lg mb-4">02</span>
          <h2 className="font-sans font-bold text-4xl md:text-5xl text-dark mb-6 tracking-tight">Pick how it moves.</h2>
          <p className="font-sans text-muted text-lg md:text-xl leading-relaxed max-w-md">From a clean ink-draw to a cinematic fade-bloom. Preview every style in real time before committing.</p>
        </div>
        <div className="w-full md:w-1/2 h-96 md:h-full bg-dark flex flex-col items-center justify-center relative overflow-hidden order-2 md:order-1">
          <div className="grid grid-cols-5 gap-4 opacity-50 relative">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-bg hover:bg-primary transition-colors duration-300" />
            ))}
            <div className="absolute inset-y-0 -inset-x-8 bg-accent/20 w-1 animate-pulse" style={{ animation: 'marquee 5s linear infinite alternate' }} />
          </div>
        </div>
      </div>

      {/* Panel 3 */}
      <div className="hiw-panel w-full md:h-screen sticky top-0 bg-bg md:rounded-t-[2.5rem] flex flex-col md:flex-row items-center overflow-hidden shadow-xl">
        <div className="w-full md:w-1/2 p-12 md:p-24 flex flex-col justify-center h-full">
          <span className="font-mono text-accent text-lg mb-4">03</span>
          <h2 className="font-sans font-bold text-4xl md:text-5xl text-dark mb-6 tracking-tight">Export exactly what you need.</h2>
          <p className="font-sans text-muted text-lg md:text-xl leading-relaxed max-w-md">GIF for email. MP4 for social. PNG for print. SVG for web. Embed code for your site. One click each.</p>
        </div>
        <div className="w-full md:w-1/2 h-96 md:h-full bg-surface/80 flex items-center justify-center relative shadow-inner">
          <svg viewBox="0 0 300 100" className="w-full h-48 px-8">
            <path
              d="M0,50 L50,50 L75,20 L100,80 L125,50 L300,50"
              fill="none"
              stroke="#CC5833"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-dasharray-[400] stroke-dashoffset-[400] animate-[dash_3s_ease-out_infinite]"
            />
          </svg>
        </div>
      </div>

    </section>
  );
};

// --- Social Proof ---
const SocialProof = () => {
  const proofRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from('.stat-num', {
        scrollTrigger: {
          trigger: proofRef.current,
          start: 'top 80%',
        },
        innerText: 0,
        snap: { innerText: 1 },
        duration: 2,
        ease: 'power3.out',
        stagger: 0.2
      });
    }, proofRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={proofRef} className="w-full bg-primary py-24 px-6 md:px-0">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-bg/20">
        <div className="flex flex-col gap-2 pt-8 md:pt-0">
          <h4 className="font-mono text-5xl md:text-6xl text-bg"><span className="stat-num">12000</span>+</h4>
          <p className="font-sans text-bg/60 uppercase tracking-widest text-sm font-semibold">signatures animated</p>
        </div>
        <div className="flex flex-col gap-2 pt-8 md:pt-0">
          <h4 className="font-mono text-5xl md:text-6xl text-bg"><span className="stat-num">47</span></h4>
          <p className="font-sans text-bg/60 uppercase tracking-widest text-sm font-semibold">formats supported</p>
        </div>
        <div className="flex flex-col gap-2 pt-8 md:pt-0">
          <h4 className="font-mono text-5xl md:text-6xl text-bg">&lt; <span className="stat-num">3</span>s</h4>
          <p className="font-sans text-bg/60 uppercase tracking-widest text-sm font-semibold">to animate</p>
        </div>
      </div>
    </section>
  );
};

// --- Pricing ---
const Pricing = () => {
  return (
    <section className="py-32 px-6 md:px-16 w-full max-w-7xl mx-auto">
      <div className="text-center mb-20 max-w-2xl mx-auto">
        <h2 className="font-sans font-extrabold text-4xl md:text-5xl text-dark mb-4">Pricing that scales.</h2>
        <p className="font-sans text-lg text-muted">From casual creators to pro ateliers. Pick your plan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

        {/* Free Tier */}
        <div className="bg-bg border border-primary/20 rounded-[2rem] p-10 flex flex-col hover:-translate-y-2 transition-transform duration-300">
          <h3 className="font-sans font-bold text-2xl text-dark mb-2">Free</h3>
          <p className="font-mono text-4xl text-dark mb-8">$0<span className="text-muted text-base">/mo</span></p>
          <ul className="flex flex-col gap-4 mb-10 flex-1">
            {['5 exports/month', 'GIF & PNG formats', 'Watermarked'].map(feat => (
              <li key={feat} className="flex items-center gap-3 font-sans text-muted text-sm border-b border-primary/5 pb-3">
                <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
          <button className="w-full py-4 rounded-full border border-primary text-primary font-sans font-semibold hover:bg-primary hover:text-bg transition-colors">
            Get Started
          </button>
        </div>

        {/* Pro Tier (Featured) */}
        <div className="bg-primary border border-primary rounded-[2.5rem] p-10 flex flex-col md:scale-105 shadow-2xl relative transform hover:-translate-y-2 transition-transform duration-300 z-10 ring-2 ring-accent ring-offset-4 ring-offset-bg">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-bg px-4 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest">Most Popular</div>
          <h3 className="font-sans font-bold text-2xl text-bg mb-2">Pro</h3>
          <p className="font-mono text-4xl text-bg mb-8">$12<span className="text-bg/60 text-base">/mo</span></p>
          <ul className="flex flex-col gap-4 mb-10 flex-1">
            {['Unlimited exports', 'All formats (MP4, SVG, Code)', 'No watermark', 'Custom motion styles'].map(feat => (
              <li key={feat} className="flex items-center gap-3 font-sans text-bg/80 text-sm border-b border-bg/10 pb-3">
                <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
          <button className="w-full py-4 rounded-full bg-accent text-bg font-sans font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
            Try It Free
          </button>
        </div>

        {/* Studio Tier */}
        <div className="bg-dark border border-dark rounded-[2rem] p-10 flex flex-col hover:-translate-y-2 transition-transform duration-300">
          <h3 className="font-sans font-bold text-2xl text-bg mb-2">Studio</h3>
          <p className="font-mono text-4xl text-bg mb-8">$49<span className="text-bg/60 text-base">/mo</span></p>
          <ul className="flex flex-col gap-4 mb-10 flex-1">
            {['Everything in Pro', 'Unlimited team seats', 'API access', 'White-label custom domains', 'Priority 24/7 support'].map(feat => (
              <li key={feat} className="flex items-center gap-3 font-sans text-bg/60 text-sm border-b border-bg/10 pb-3">
                <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
          <button className="w-full py-4 rounded-full border border-bg/30 text-bg font-sans font-semibold hover:bg-bg hover:text-dark transition-colors">
            Contact Us
          </button>
        </div>

      </div>
    </section>
  );
};

// --- Final CTA ---
const FinalCTA = () => {
  return (
    <section className="w-full py-32 md:py-48 bg-accent flex flex-col items-center justify-center text-center px-6 rounded-t-[4rem]">
      <div className="max-w-4xl flex flex-col items-center gap-8">
        <h2 className="flex flex-col gap-2">
          <span className="font-sans font-extrabold text-bg/90 text-4xl md:text-[4rem] leading-none">Your signature</span>
          <span className="font-serif italic text-bg text-6xl md:text-[7rem] leading-none">deserves to move.</span>
        </h2>
        <button className="mt-8 bg-dark text-bg px-10 py-5 rounded-full font-sans font-bold text-xl relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-2xl">
          <span className="relative z-10 flex items-center gap-2">Try It Free <span className="group-hover:translate-x-1 transition-transform">→</span></span>
          <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
        </button>
        <p className="font-mono text-bg/70 text-sm mt-4 tracking-wide">
          No credit card required · Export in seconds · Cancel anytime
        </p>
      </div>
    </section>
  );
};

// --- Footer ---
const Footer = () => {
  return (
    <footer className="w-full bg-dark text-bg pt-20 pb-10 px-8 md:px-16 -mt-8 relative z-10 rounded-t-[4rem]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">

        <div className="flex flex-col gap-4">
          <span className="font-sans font-bold text-2xl text-bg">SignAnimate</span>
          <span className="font-serif italic text-accent text-xl">Your signature, alive.</span>
          <p className="font-mono text-bg/40 text-xs mt-auto pt-8">© 2025 SignAnimate. All rights reserved.</p>
        </div>

        <div className="flex flex-col gap-4">
          <h5 className="font-sans font-semibold text-bg/60 uppercase tracking-widest text-xs mb-2">Product</h5>
          {['Features', 'How It Works', 'Pricing', 'Examples', 'Changelog'].map(link => (
            <a key={link} href="#" className="font-sans text-sm text-bg/80 hover:text-accent transition-colors">{link}</a>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h5 className="font-sans font-semibold text-bg/60 uppercase tracking-widest text-xs mb-2">Company</h5>
          {['About', 'Blog', 'Careers', 'Contact', 'Press'].map(link => (
            <a key={link} href="#" className="font-sans text-sm text-bg/80 hover:text-accent transition-colors">{link}</a>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h5 className="font-sans font-semibold text-bg/60 uppercase tracking-widest text-xs mb-2">Legal</h5>
          {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(link => (
            <a key={link} href="#" className="font-sans text-sm text-bg/80 hover:text-accent transition-colors">{link}</a>
          ))}
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-bg/10 pt-8 flex flex-col md:flex-row items-center justify-between">
        <p className="font-mono text-bg/40 text-xs hidden md:block">Built with precision.</p>
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <span className="font-mono text-bg/60 text-xs tracking-wide">All systems operational</span>
        </div>
      </div>
    </footer>
  );
};

// --- App Root ---
function App() {
  const [scrolled, setScrolled] = useState(false);

  return (
    <>
      <NoiseOverlay />
      <Navbar scrolled={scrolled} />
      <main className="w-full flex flex-col items-center overflow-x-hidden">
        <Hero onScrollChange={setScrolled} />
        <DemoStrip />
        <Features />
        <Philosophy />
        <HowItWorks />
        <SocialProof />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

export default App;

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { HERO_FORMATS } from '../constants';

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

    const scrollToShowcase = () => {
        const section = document.getElementById('showcase');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
            className="section-shell section-shell-dark relative min-h-[100dvh] w-full overflow-hidden pt-28 md:pt-32 pb-16 md:pb-20 px-6 md:px-14"
        >
            <div className="hero-scaffold absolute inset-0 z-0" />

            {/* Gradient bridge for smooth dark→light transition */}
            <div className="hero-fade-bridge" />

            <div className="relative z-10 max-w-6xl mx-auto min-h-[74vh] grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-14 items-center">
                {/* Left panel — headline, description, buttons */}
                <div className="hero-panel flex flex-col gap-7">
                    <h1 className="flex flex-col gap-3">
                        <span className="hero-reveal font-sans font-extrabold text-bg text-5xl sm:text-6xl md:text-7xl leading-[0.94] tracking-tight">
                            Signature animation
                            <br />
                            with precision.
                        </span>
                        <span className="hero-reveal font-serif italic text-accent text-[2.25rem] sm:text-5xl md:text-6xl leading-[0.95]">
                            Fast, clean, and free.
                        </span>
                    </h1>

                    <p className="hero-reveal max-w-xl font-sans text-lg md:text-xl leading-relaxed text-bg/70">
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
                            onClick={scrollToShowcase}
                            className="min-h-[48px] rounded-full border border-bg/40 bg-bg/8 px-6 py-3 text-bg font-sans font-semibold hover:bg-bg/15 transition-colors"
                        >
                            View Showcase
                        </button>
                    </div>
                </div>

                {/* Right panel — preview card */}
                <div className="hero-reveal hero-panel relative self-center">
                    <svg viewBox="0 0 620 280" className="absolute -top-12 -left-8 w-[130%] max-w-none opacity-28 pointer-events-none">
                        <path d="M24,206 C154,24 280,308 430,106 C506,6 584,116 614,58" fill="none" className="hero-orbit-line stroke-accent/50" strokeWidth="1.4" />
                        <path d="M20,232 C132,146 248,90 380,160 C484,216 558,124 612,144" fill="none" className="hero-orbit-line stroke-bg/45" strokeWidth="1" />
                    </svg>

                    <div
                        ref={previewRef}
                        className="hero-tilt-card relative rounded-[2rem] border border-bg/12 bg-dark/80 backdrop-blur-sm p-6 md:p-7"
                        onMouseMove={handlePreviewMove}
                        onMouseLeave={handlePreviewLeave}
                        style={{ '--tilt-x': '0deg', '--tilt-y': '0deg' }}
                    >
                        <div className="flex items-center justify-between gap-3 mb-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bg/80">Live stroke engine</p>
                            <span className="rounded-full border border-bg/20 bg-bg/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bg/80">
                                8ms preview
                            </span>
                        </div>

                        <div className="rounded-2xl border border-bg/10 bg-dark/50 p-4 md:p-5">
                            <svg viewBox="0 0 560 170" className="w-full overflow-visible">
                                <path
                                    className="signature-draw"
                                    d="M20,108 C96,38 168,138 226,86 C286,34 352,112 414,70 C454,44 508,68 544,54"
                                    fill="none"
                                    stroke="#FFF8F2"
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
                                    className={`rounded-xl border px-3 py-2 text-left transition-all ${index === activeFormat
                                            ? 'border-accent/50 bg-accent/14'
                                            : 'border-bg/10 bg-bg/4 hover:border-bg/20'
                                        }`}
                                >
                                    <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-bg/90">{format.label}</p>
                                    <p className="font-sans text-xs text-bg/65 mt-1">{format.detail}</p>
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 h-1 rounded-full bg-bg/8 overflow-hidden">
                            <span
                                className="block h-full rounded-full bg-accent transition-all duration-500"
                                style={{ width: `${((activeFormat + 1) / HERO_FORMATS.length) * 100}%` }}
                            />
                        </div>

                        <div className="mt-5 pt-4 border-t border-bg/10 flex items-center justify-between gap-3">
                            <span className="font-sans text-sm text-bg/70">Export GIF, MP4, SVG, and embed code in one pass.</span>
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

export default Hero;

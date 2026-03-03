import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { useHaptics } from '../hooks/useHaptics';

const Hero = ({ onTryForFree }) => {
    const heroRef = useRef(null);
    const { haptic } = useHaptics();

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-reveal', {
                y: 20,
                opacity: 0,
                duration: 1,
                stagger: 0.15,
                ease: 'power3.out',
                delay: 0.1,
            });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    const scrollToShowcase = () => {
        const section = document.getElementById('showcase');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <section
            id="top"
            ref={heroRef}
            className="relative min-h-[90dvh] w-full pt-40 md:pt-48 pb-24 px-6 md:px-14 flex flex-col items-center overflow-hidden"
        >
            {/* The vibrant mesh gradient behind the logo area */}
            <div className="hero-mesh-bg" />

            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
                <h1 className="hero-reveal font-handwritten text-primary text-[3.5rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6.5rem] leading-[1.02] whitespace-pre-wrap">
                    Purpose built tool to animate your signature in
                </h1>

                <div className="hero-reveal mt-10 md:mt-12 flex flex-wrap justify-center gap-3 sm:gap-4 max-w-2xl px-4">
                    <span className="pill-tag pill-tag-magenta">GIFs</span>
                    <span className="pill-tag pill-tag-blue">SVG Vectors</span>
                    <span className="pill-tag pill-tag-orange">MP4 Output</span>
                    <span className="pill-tag pill-tag-yellow">Embed Code</span>
                </div>

                <div className="hero-reveal mt-20 flex w-full max-w-[280px] sm:max-w-none flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        type="button"
                        onClick={() => { haptic('cta'); onTryForFree(); }}
                        className="w-full sm:w-auto min-h-[50px] bg-primary text-surface px-8 py-3 rounded-full font-sans font-semibold text-[15px] hover:bg-primary/90 transition-all shadow-[0_8px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.18)] flex items-center justify-center gap-2"
                    >
                        Open Editor
                    </button>

                    <button
                        type="button"
                        onClick={() => { haptic('secondary'); scrollToShowcase(); }}
                        className="w-full sm:w-auto min-h-[50px] bg-surface text-primary border border-primary/10 px-8 py-3 rounded-full font-sans font-semibold text-[15px] hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        View Showcase <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>

        </section>
    );
};

export default Hero;

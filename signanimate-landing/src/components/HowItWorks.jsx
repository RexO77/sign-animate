import React from 'react';
import { PROCESS_STEPS } from '../constants';

const HowItWorks = () => (
    <section id="how-it-works" className="relative w-full bg-surface py-24 md:py-32 px-6 md:px-14">
        <div className="section-edge-gradient-alt" />
        <div className="max-w-6xl mx-auto relative z-10">
            <div className="max-w-2xl mb-14 md:mb-16">
                <p className="font-sans font-semibold text-sm tracking-wide text-primary/60 mb-4 uppercase">How it works</p>
                <h2 className="font-serif text-primary text-[2.5rem] md:text-[3.5rem] leading-[1.05] tracking-tight">A clean workflow for hand-drawn signatures.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {PROCESS_STEPS.map((step, index) => (
                    <article key={step.title} className="flex flex-col">
                        <p className="font-sans font-semibold text-sm tracking-wide text-accent mb-5 bg-accent/10 w-fit px-3 py-1 rounded-full">{String(index + 1).padStart(2, '0')}</p>
                        <h3 className="font-sans font-bold text-primary text-2xl leading-tight mb-3">{step.title}</h3>
                        <p className="font-sans text-primary/70 text-base leading-relaxed">{step.body}</p>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

export default HowItWorks;

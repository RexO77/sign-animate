import React from 'react';
import { PROCESS_STEPS } from '../constants';

const HowItWorks = () => (
    <section id="how-it-works" className="section-shell relative w-full border-t border-dotted border-primary/25 bg-bg py-20 md:py-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12 md:mb-14">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/60 mb-4">How it works</p>
                <h2 className="font-sans font-bold text-dark text-3xl md:text-5xl tracking-tight leading-tight">A clean workflow for hand-drawn signatures.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PROCESS_STEPS.map((step, index) => (
                    <article key={step.title} className="rounded-[1.6rem] border border-primary/16 bg-bg/78 p-7 md:p-8 shadow-sm">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-4">0{index + 1}</p>
                        <h3 className="font-sans font-semibold text-dark text-2xl leading-tight mb-4">{step.title}</h3>
                        <p className="font-sans text-muted text-base leading-relaxed">{step.body}</p>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

export default HowItWorks;

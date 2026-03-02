import React from 'react';
import { CRAFT_PRINCIPLES } from '../constants';

const CraftPrinciples = () => (
    <section id="craft" className="section-shell relative w-full border-t border-dotted border-primary/25 bg-surface py-20 md:py-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12 md:mb-14">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-4">Craft principles</p>
                <h2 className="font-sans font-bold text-dark text-3xl md:text-5xl tracking-tight leading-tight">Made as a free tool for people who care about details.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {CRAFT_PRINCIPLES.map((principle) => (
                    <article key={principle.title} className="rounded-[1.6rem] border border-primary/14 bg-bg/86 p-7 md:p-8 backdrop-blur-sm">
                        <h3 className="font-sans font-semibold text-dark text-2xl leading-tight mb-4">{principle.title}</h3>
                        <p className="font-sans text-muted text-base leading-relaxed">{principle.body}</p>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

export default CraftPrinciples;

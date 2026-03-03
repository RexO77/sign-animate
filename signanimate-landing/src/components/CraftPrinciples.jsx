import React from 'react';
import { CRAFT_PRINCIPLES } from '../constants';

const CraftPrinciples = () => (
    <section id="craft" className="relative w-full bg-bg py-24 md:py-32 px-6 md:px-14">
        <div className="section-edge-gradient" />
        <div className="max-w-6xl mx-auto relative z-10">
            <div className="max-w-2xl mb-14 md:mb-16">
                <p className="font-sans font-semibold text-sm tracking-wide text-primary/60 mb-4 uppercase">Craft principles</p>
                <h2 className="font-serif text-primary text-[2.5rem] md:text-[3.5rem] leading-[1.05] tracking-tight">Made as a free tool for people who care about details.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {CRAFT_PRINCIPLES.map((principle) => (
                    <article key={principle.title} className="flex flex-col">
                        <h3 className="font-sans font-bold text-primary text-2xl leading-tight mb-3">{principle.title}</h3>
                        <p className="font-sans text-primary/70 text-base leading-relaxed">{principle.body}</p>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

export default CraftPrinciples;

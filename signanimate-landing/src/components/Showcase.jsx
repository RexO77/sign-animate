import React from 'react';
import { SHOWCASE_ITEMS } from '../constants';

const Showcase = () => (
    <section id="showcase" className="relative w-full bg-surface py-24 md:py-32 px-6 md:px-14">
        <div className="section-edge-gradient" />
        <div className="max-w-6xl mx-auto relative z-10">
            <div className="max-w-2xl mb-14 md:mb-16">
                <p className="font-sans font-semibold text-sm tracking-wide text-primary/60 mb-4 uppercase">Showcase</p>
                <h2 className="font-serif text-primary text-[2.5rem] md:text-[3.5rem] leading-[1.05] tracking-tight">Signature motion in product context.</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {SHOWCASE_ITEMS.map((item, index) => {
                    const strokeClass = `example-stroke-${(index % 6) + 1}`;
                    return (
                        <article key={item.name} className="group rounded-[1.6rem] border border-primary/5 bg-bg/50 p-6 flex flex-col hover:border-primary/10 transition-colors">
                            <div className="rounded-[1.1rem] bg-surface p-4 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                <svg viewBox="0 0 360 130" className="w-full h-24 overflow-visible">
                                    <path
                                        d={item.path}
                                        fill="none"
                                        stroke="#ff481b"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={strokeClass}
                                    />
                                </svg>
                            </div>

                            <div className="mb-4 flex items-center gap-3 opacity-60">
                                <span className="font-sans font-semibold text-xs tracking-wide text-primary">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="h-px flex-1 bg-primary/10" />
                            </div>

                            <div className="space-y-1">
                                <p className="font-sans font-bold text-primary text-lg">{item.name}</p>
                                <p className="font-sans text-sm text-primary/70">{item.context}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    </section>
);

export default Showcase;

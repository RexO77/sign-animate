import React from 'react';
import { SHOWCASE_ITEMS } from '../constants';

const Showcase = () => (
    <section id="showcase" className="section-shell relative w-full border-t border-dotted border-primary/12 bg-bg py-20 md:py-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12 md:mb-14">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-4">Showcase</p>
                <h2 className="font-sans font-bold text-dark text-3xl md:text-5xl tracking-tight leading-tight">Signature motion in product context.</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {SHOWCASE_ITEMS.map((item, index) => (
                    <article key={item.name} className="rounded-[1.6rem] border border-primary/10 bg-surface/60 p-5">
                        <div className="rounded-[1.1rem] bg-bg border border-primary/8 p-4 mb-4">
                            <svg viewBox="0 0 360 130" className="w-full h-24 overflow-visible">
                                <path
                                    d={item.path}
                                    fill="none"
                                    stroke="#C43700"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="example-stroke"
                                />
                            </svg>
                        </div>

                        <div className="mb-3 flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/45">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="h-px flex-1 border-t border-primary/10" />
                        </div>

                        <div className="space-y-1">
                            <p className="font-sans font-semibold text-dark text-sm">{item.name}</p>
                            <p className="font-sans text-sm text-muted">{item.context}</p>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

export default Showcase;

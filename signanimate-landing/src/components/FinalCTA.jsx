import React from 'react';
import { MARQUEE_PHRASES } from '../constants';

const MarqueeBelt = () => {
    const separator = <span className="mx-6 text-bg/25 select-none" aria-hidden="true">·</span>;

    const phraseRow = MARQUEE_PHRASES.map((phrase, i) => (
        <React.Fragment key={i}>
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-bg/60 whitespace-nowrap">{phrase}</span>
            {separator}
        </React.Fragment>
    ));

    return (
        <div className="w-full overflow-hidden bg-dark border-y border-bg/6 py-4" aria-hidden="true">
            <div className="marquee-track flex items-center">
                <div className="marquee-belt flex items-center shrink-0">{phraseRow}</div>
                <div className="marquee-belt flex items-center shrink-0" aria-hidden="true">{phraseRow}</div>
            </div>
        </div>
    );
};

const FinalCTA = ({ onTryForFree }) => (
    <>
        <section className="relative w-full bg-accent py-24 md:py-32 px-6 md:px-14 text-center">
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
                <h2 className="font-sans font-bold text-bg text-4xl md:text-6xl tracking-tight leading-tight">Ready to animate your signature?</h2>
                <p className="font-sans text-bg/92 text-lg md:text-xl leading-relaxed max-w-2xl">
                    Open the editor and create as many exports as you want. This project stays free and focused on craft.
                </p>
                <button
                    type="button"
                    onClick={onTryForFree}
                    className="min-h-[48px] rounded-full bg-bg text-accent px-8 py-3 font-sans font-bold text-base hover:bg-bg/92 transition-colors"
                >
                    Open Editor
                </button>
            </div>
        </section>
        <MarqueeBelt />
    </>
);

export default FinalCTA;

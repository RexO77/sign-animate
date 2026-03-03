import React from 'react';
import { MARQUEE_PHRASES } from '../constants';
import { useHaptics } from '../hooks/useHaptics';

const MarqueeBelt = () => {
    const separator = <span className="mx-6 text-primary/15 select-none" aria-hidden="true">·</span>;

    const phraseRow = MARQUEE_PHRASES.map((phrase, i) => (
        <React.Fragment key={i}>
            <span className="font-sans font-semibold text-xs uppercase tracking-widest text-primary/40 whitespace-nowrap">{phrase}</span>
            {separator}
        </React.Fragment>
    ));

    return (
        <div className="w-full overflow-hidden bg-surface py-5 border-t border-primary/5" aria-hidden="true">
            <div className="marquee-track flex items-center">
                <div className="marquee-belt flex items-center shrink-0">{phraseRow}</div>
                <div className="marquee-belt flex items-center shrink-0" aria-hidden="true">{phraseRow}</div>
            </div>
        </div>
    );
};

const FinalCTA = ({ onTryForFree }) => {
    const { haptic } = useHaptics();

    return (
        <>
            <section className="relative w-full bg-primary py-24 md:py-32 px-6 md:px-14 text-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
                    <h2 className="font-serif text-surface text-[2.5rem] md:text-[4rem] leading-[1.05] tracking-tight">Ready to animate your signature?</h2>
                    <p className="font-sans text-surface/80 text-lg md:text-xl leading-relaxed max-w-2xl px-4">
                        Open the editor and create as many exports as you want. This project stays free and focused on craft.
                    </p>
                    <button
                        type="button"
                        onClick={() => { haptic('cta'); onTryForFree(); }}
                        className="min-h-[50px] rounded-full bg-surface text-primary px-10 py-3 font-sans font-bold text-base hover:bg-white transition-colors mt-2"
                    >
                        Open Editor
                    </button>
                </div>
            </section>
            <MarqueeBelt />
        </>
    );
};

export default FinalCTA;

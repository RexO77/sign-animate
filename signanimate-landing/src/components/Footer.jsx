import React from 'react';
import { NAV_LINKS } from '../constants';
import { useHaptics } from '../hooks/useHaptics';

const Footer = ({ onTryForFree }) => {
    const { haptic } = useHaptics();

    return (
        <footer className="w-full bg-surface text-primary px-6 md:px-14 py-16 border-t border-primary/5 pb-24">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
                <div>
                    <p className="font-sans font-bold text-2xl tracking-tight text-primary">SignAnimate</p>
                    <p className="font-handwritten text-primary/60 text-2xl mt-1">Rare signatures, moving with intent.</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 w-full sm:w-auto">
                    {NAV_LINKS.map((link) => (
                        <a key={link.label} href={link.href} onClick={() => haptic('nav')} className="font-sans text-sm font-semibold text-primary/70 hover:text-primary transition-colors">
                            {link.label}
                        </a>
                    ))}
                    <button
                        type="button"
                        onClick={() => { haptic('cta'); onTryForFree(); }}
                        className="min-h-[44px] rounded-full bg-primary text-surface px-6 py-2 font-sans text-sm font-semibold hover:bg-primary/90 transition-all w-fit"
                    >
                        Open Editor
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-primary/5 flex justify-between items-center">
                <p className="font-sans text-xs text-primary/40 font-medium">A free hobby project focused on craft and quality.</p>
                <p className="font-sans text-xs text-primary/40 font-medium whitespace-nowrap">© {new Date().getFullYear()}</p>
            </div>
        </footer>
    );
};

export default Footer;

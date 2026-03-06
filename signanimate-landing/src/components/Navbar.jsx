import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useHaptics } from '../hooks/useHaptics';

const Navbar = ({ scrolled, onTryForFree }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const { haptic } = useHaptics();

    return (
        <header className={`fixed left-0 right-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'top-4 md:top-6' : 'top-6 md:top-8'}`}>
            <nav
                className={`flex items-center justify-between w-[92%] max-w-4xl px-5 md:px-6 py-3.5 transition-all duration-300 rounded-full border shadow-sm ${scrolled
                    ? 'bg-surface/75 backdrop-blur-xl border-primary/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                    : 'bg-surface/40 backdrop-blur-md border-primary/5 shadow-transparent'
                    }`}
            >
                <a href="#top" aria-label="SignAnimate home" className="flex items-center gap-2 group shrink-0">
                    <img src="/logo.svg" alt="S." className="h-8 w-8 select-none" />
                </a>

                <div className="hidden md:flex flex-1 items-center justify-center gap-8 border-l border-r border-primary/10 mx-6 px-6 h-6">
                    {NAV_LINKS.map((link) => (
                        <a key={link.label} href={link.href} className="font-sans text-xs font-semibold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex shrink-0">
                    <button
                        type="button"
                        onClick={() => { haptic('cta'); onTryForFree(); }}
                        className="min-h-[36px] bg-primary text-surface px-5 py-1.5 rounded-full font-sans font-semibold text-xs transition-all hover:bg-primary/90 flex items-center justify-center"
                    >
                        Editor
                    </button>
                </div>

                <button type="button" onClick={() => { haptic('toggle'); setMenuOpen((prev) => !prev); }} className="md:hidden text-primary shrink-0 ml-auto">
                    {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </nav>

            {menuOpen && (
                <div className="md:hidden absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-surface/95 backdrop-blur-xl border border-primary/10 rounded-3xl p-6 flex flex-col gap-5 shadow-lg">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={() => { haptic('nav'); setMenuOpen(false); }}
                            className="font-sans text-base font-semibold text-primary/80 hover:text-primary transition-colors text-center"
                        >
                            {link.label}
                        </a>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            haptic('cta');
                            setMenuOpen(false);
                            onTryForFree();
                        }}
                        className="mt-2 min-h-[44px] bg-primary text-surface rounded-full font-sans font-semibold text-sm hover:bg-primary/90 w-full"
                    >
                        Open Editor
                    </button>
                </div>
            )}
        </header>
    );
};

export default Navbar;

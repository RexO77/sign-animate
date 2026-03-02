import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';

const Navbar = ({ scrolled, onTryForFree }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl">
            <nav
                className={`rounded-full px-6 py-4 flex items-center justify-between transition-all duration-300 ${scrolled
                        ? 'bg-dark/75 border border-bg/15 shadow-xl backdrop-blur-xl'
                        : 'bg-dark/35 border border-bg/10 backdrop-blur-md'
                    }`}
            >
                <a href="#top" className="flex items-center gap-2 group">
                    <span className="font-sans font-bold tracking-tight text-xl text-bg">SignAnimate</span>
                    <svg viewBox="0 0 100 20" className="w-12 h-3 overflow-visible">
                        <path d="M5,15 Q30,5 50,15 T95,5" fill="none" className="stroke-2 stroke-accent" />
                    </svg>
                </a>

                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map((link) => (
                        <a key={link.label} href={link.href} className="font-sans text-sm font-semibold text-bg/80 hover:text-bg transition-colors">
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex">
                    <button
                        type="button"
                        onClick={onTryForFree}
                        className="min-h-[44px] bg-accent text-bg px-6 py-2.5 rounded-full font-sans font-semibold text-sm hover:brightness-105 transition-all"
                    >
                        Open Editor
                    </button>
                </div>

                <button type="button" onClick={() => setMenuOpen((prev) => !prev)} className="md:hidden text-bg">
                    {menuOpen ? <X /> : <Menu />}
                </button>
            </nav>

            {menuOpen && (
                <div className="md:hidden mt-3 rounded-2xl border border-bg/12 bg-dark/85 backdrop-blur-xl p-4 flex flex-col gap-3">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="font-sans text-sm font-semibold text-bg/85 hover:text-bg transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            setMenuOpen(false);
                            onTryForFree();
                        }}
                        className="mt-2 min-h-[44px] bg-accent text-bg rounded-full font-sans font-semibold text-sm"
                    >
                        Open Editor
                    </button>
                </div>
            )}
        </header>
    );
};

export default Navbar;

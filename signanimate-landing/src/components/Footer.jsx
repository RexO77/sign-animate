import React from 'react';
import { NAV_LINKS } from '../constants';

const Footer = ({ onTryForFree }) => (
    <footer className="w-full bg-dark text-bg px-6 md:px-14 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
                <p className="font-sans font-bold text-2xl text-bg">SignAnimate</p>
                <p className="font-serif italic text-accent text-lg mt-1">Rare signatures, moving with intent.</p>
                <p className="font-mono text-xs text-bg/55 mt-3">A free hobby project focused on craft and quality.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                {NAV_LINKS.map((link) => (
                    <a key={link.label} href={link.href} className="font-sans text-sm text-bg/70 hover:text-bg transition-colors">
                        {link.label}
                    </a>
                ))}
                <button
                    type="button"
                    onClick={onTryForFree}
                    className="min-h-[44px] rounded-full bg-accent text-bg px-5 py-2 font-sans text-sm font-semibold hover:brightness-110 transition-all"
                >
                    Open Editor
                </button>
            </div>
        </div>
    </footer>
);

export default Footer;

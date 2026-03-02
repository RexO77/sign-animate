import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import CraftPrinciples from './components/CraftPrinciples';
import Showcase from './components/Showcase';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

function App({ onTryForFree }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Navbar scrolled={scrolled} onTryForFree={onTryForFree} />
      <main className="guide-shell relative w-full overflow-x-hidden bg-bg">
        <div className="relative z-10 flex w-full flex-col items-center">
          <Hero onTryForFree={onTryForFree} />
          <HowItWorks />
          <CraftPrinciples />
          <Showcase />
          <FinalCTA onTryForFree={onTryForFree} />
        </div>
      </main>
      <Footer onTryForFree={onTryForFree} />
    </>
  );
}

export default App;

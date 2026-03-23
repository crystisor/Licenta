import React from 'react';
import { 
  Book, 
  Shield, 
  Coins, 
  Hammer, 
  ScrollText, 
  Zap, 
  History,
  Menu,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { ELARA_CHARACTER } from './types';

export default function App() {
  const char = ELARA_CHARACTER;

  const calculateModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : mod;
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary/30 pb-24">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#121A26] shadow-[0_10px_40px_rgba(255,255,255,0.06)] flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-3 active:scale-95 transition-transform cursor-pointer">
          <Book className="text-primary w-6 h-6" />
          <h1 className="font-headline uppercase tracking-[0.1rem] text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(159,127,0,0.5)]">
            The Gilded Archive
          </h1>
        </div>
        <div className="w-8 h-8 rounded-full border border-primary/30 overflow-hidden active:scale-95 transition-transform cursor-pointer">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr8gq9cuNE-4FNVYF9D1L-Z4Jm5Zbs0ZOeH5V1VCqZ6UC1X5VJHkMyNPrslib8IFSTDhGjH-QQNifF7FLPB7VMeMv1LujvlPaN8xwRJbHSgRUekLWJWmX5QKrg02eJJrAP2G9miIvt2p3ZSLkvpLXS5fUUPLGwrsdFZXaYDTUFkSBp5mHAEfWxUh1SSsWcG7RCYmgqBrIkSXZVEc6KkHDWCXtKPhnowpeh0YGVq81VuZB1o0mYw7wvtE9sE8JmXo65jcIqmWcY5QHu" 
            alt="Avatar"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      <main className="pt-20 px-4 flex flex-col items-center gap-8 max-w-md mx-auto">
        {/* Character Card */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full aspect-[3/4.2] mt-6 flex flex-col items-center"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-full"></div>
          
          {/* Card Frame */}
          <div className="relative w-full h-full bg-surface-container-low rounded-lg p-3 card-shadow border border-primary/20 overflow-hidden">
            <div className="absolute inset-2 border border-primary/10 pointer-events-none"></div>
            
            {/* Portrait */}
            <div className="relative w-full h-3/5 bg-surface-container-lowest rounded-sm overflow-hidden border-2 border-[#1c1b1b] shadow-inner">
              <img 
                className="w-full h-full object-cover grayscale-[20%] sepia-[10%] contrast-[110%]" 
                src={char.portraitUrl} 
                alt={char.name}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-0 right-0 p-1">
                <Zap className="text-primary/40 w-8 h-8" />
              </div>
            </div>

            {/* Name Banner */}
            <div className="relative -mt-6 z-20 flex justify-center">
              <div className="bg-gradient-to-b from-[#d4af37] to-[#9f7f00] px-8 py-1.5 rounded-sm shadow-xl transform rotate-[-1deg] border-x-2 border-on-primary-container">
                <h2 className="font-headline text-on-primary font-bold text-lg tracking-wide whitespace-nowrap">
                  {char.name}
                </h2>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 flex-1 bg-surface-container-high/80 rounded px-4 py-3 border-t border-primary/20 relative">
              <p className="font-body text-on-surface-variant text-center leading-tight italic text-[15px]">
                <span className="font-bold text-primary not-italic">Description:</span> {char.description}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Stats Grid */}
        <section className="w-full bg-surface-container-low p-6 rounded-lg border border-outline-variant/20 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className="font-headline text-primary text-xl font-bold uppercase tracking-widest">Attributes</h3>
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60">Scribal Records 12-B</span>
            </div>
            <Shield className="text-primary/60 w-5 h-5" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(char.attributes).map(([key, value], idx) => (
              <div 
                key={key}
                className={`flex flex-col items-center p-3 rounded border-b-2 border-primary/30 ${
                  idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-highest'
                }`}
              >
                <span className="font-label text-[10px] text-on-surface-variant uppercase mb-1">{key}</span>
                <span className="font-headline text-2xl font-bold text-on-surface">{value}</span>
                <span className="font-label text-[10px] text-primary">{calculateModifier(value)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Lore Snippet */}
        <section className="w-full px-2 mb-10">
          <div className="relative p-6 bg-surface-container-lowest border-l-4 border-primary/50">
            <div className="absolute -top-3 -right-3 bg-surface p-1 rounded-full">
              <History className="text-primary/60 w-5 h-5" />
            </div>
            <p className="font-body italic text-on-surface-variant leading-relaxed">
              "{char.lore}"
            </p>
            <div className="mt-4 flex justify-end">
              <button className="bg-surface-container-high px-4 py-2 border border-primary/20 text-primary font-label text-xs uppercase tracking-tighter hover:bg-surface-container-highest transition-colors flex items-center gap-1">
                View Full Dossier
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 bg-surface z-50 h-20 rounded-t-lg border-t border-primary/20 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <NavItem icon={<ScrollText size={20} />} label="Archive" />
        <NavItem icon={<Hammer size={20} />} label="Forge" />
        <NavItem icon={<Coins size={20} />} label="Market" />
        <NavItem icon={<Book size={20} />} label="Grimoire" active />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`flex flex-col items-center justify-center transition-all duration-200 active:translate-y-0.5 ${
        active 
          ? 'bg-gradient-to-tr from-primary to-on-primary-container text-surface rounded-md px-4 py-1 shadow-[0_0_15px_rgba(233,195,73,0.3)]' 
          : 'text-surface-container-highest hover:text-primary'
      }`}
    >
      <div className="mb-1">{icon}</div>
      <span className="font-label text-[10px] uppercase font-semibold tracking-wider">{label}</span>
    </a>
  );
}

import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import './warm-springs-2.css';
import { Nav } from './warmSprings2/components/Nav';
import { HeroSection } from './warmSprings2/sections/HeroSection';
import { MethodSection } from './warmSprings2/sections/MethodSection';
import { AudienceSection } from './warmSprings2/sections/AudienceSection';
import { ResultsSection } from './warmSprings2/sections/ResultsSection';
import { ProgramSection } from './warmSprings2/sections/ProgramSection';
import { TeamSection } from './warmSprings2/sections/TeamSection';
import { VenueSection } from './warmSprings2/sections/VenueSection';
import { PriceSection } from './warmSprings2/sections/PriceSection';
import { FinalCtaSection } from './warmSprings2/sections/FinalCtaSection';

export default function WarmSprings2Page() {
  useEffect(() => {
    document.documentElement.classList.add('ws2-page');
    return () => document.documentElement.classList.remove('ws2-page');
  }, []);

  return (
    <>
      <Helmet>
        <title>Тёплые ключи 2 — интенсив по групповой психотерапии | Тбилиси 2026</title>
        <meta
          name="description"
          content="Обучающе-терапевтический интенсив по групповой психотерапии методом «Тёплые ключи 2». Тбилиси, 31 июля — 2 августа 2026."
        />
      </Helmet>

      <Nav />
      <HeroSection />
      <MethodSection />
      <AudienceSection />
      <ResultsSection />
      <ProgramSection />
      <TeamSection />
      <VenueSection />
      <PriceSection />
      <FinalCtaSection />

      <footer className="ws2-footer">
        <p>Содружество психологов Dom &middot; 2026</p>
      </footer>
    </>
  );
}

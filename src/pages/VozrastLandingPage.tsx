import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import '@fontsource-variable/playfair-display';
import './vozrast-landing.css';
import { Nav } from './vozrastLanding/components/Nav';
import { HeroSection } from './vozrastLanding/sections/HeroSection';
import { AboutSection } from './vozrastLanding/sections/AboutSection';
import { AudienceSection } from './vozrastLanding/sections/AudienceSection';
import { WeekSection } from './vozrastLanding/sections/WeekSection';
import { PlatformSection } from './vozrastLanding/sections/PlatformSection';
import { PracticeSection } from './vozrastLanding/sections/PracticeSection';
import { ProgramSection } from './vozrastLanding/sections/ProgramSection';
import { QuotesSection } from './vozrastLanding/sections/QuotesSection';
import { ReviewsSection } from './vozrastLanding/sections/ReviewsSection';
import { TeamSection } from './vozrastLanding/sections/TeamSection';
import { PriceSection } from './vozrastLanding/sections/PriceSection';
import { FaqSection } from './vozrastLanding/sections/FaqSection';
import { FinalCtaSection } from './vozrastLanding/sections/FinalCtaSection';

export default function VozrastLandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('vz-page');
    return () => document.documentElement.classList.remove('vz-page');
  }, []);

  return (
    <>
      <Helmet>
        <title>Понимание и помощь человеку в контексте возраста — курс по психологии развития</title>
        <meta
          name="description"
          content="Программа повышения квалификации по психологии развития: весь жизненный путь человека за 14 недель. Онлайн, 17 сентября — 17 декабря 2026. Удостоверение о повышении квалификации."
        />
      </Helmet>

      <Nav />
      <HeroSection />
      <AboutSection />
      <AudienceSection />
      <WeekSection />
      <PlatformSection />
      <PracticeSection />
      <ProgramSection />
      <QuotesSection />
      <ReviewsSection />
      <TeamSection />
      <PriceSection />
      <FaqSection />
      <FinalCtaSection />

      <footer className="vz-footer">
        <p>
          DOM Academy &middot; АНО ДПО «Экзистенциально-гуманистическое образование» &middot; 2026
        </p>
      </footer>
    </>
  );
}

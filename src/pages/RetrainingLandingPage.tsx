import { Helmet } from 'react-helmet-async';
import { CITY_CONFIGS, type RetrainingCity } from './retrainingLanding/data';
import { CtaLink } from './retrainingLanding/ui';
import { HeroSection } from './retrainingLanding/sections/HeroSection';
import { PathSection } from './retrainingLanding/sections/PathSection';
import { AudienceSection } from './retrainingLanding/sections/AudienceSection';
import { DifferenceSection } from './retrainingLanding/sections/DifferenceSection';
import { ProgramSection } from './retrainingLanding/sections/ProgramSection';
import { FormatSection } from './retrainingLanding/sections/FormatSection';
import { MindsetSection } from './retrainingLanding/sections/MindsetSection';
import { TeamSection } from './retrainingLanding/sections/TeamSection';
import { DiplomaSection } from './retrainingLanding/sections/DiplomaSection';
import { AdmissionSection } from './retrainingLanding/sections/AdmissionSection';
import { PriceSection } from './retrainingLanding/sections/PriceSection';
import { FaqSection } from './retrainingLanding/sections/FaqSection';
import { FinalCtaSection } from './retrainingLanding/sections/FinalCtaSection';

export default function RetrainingLandingPage({ city }: { city: RetrainingCity }) {
  const cfg = CITY_CONFIGS[city];

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Helmet>
        <title>{cfg.seoTitle}</title>
        <meta name="description" content={cfg.seoDescription} />
      </Helmet>

      <div className="mx-auto flex max-w-[1080px] flex-col gap-[18px] px-4 pb-8 max-[420px]:gap-3">
        <header className="flex items-center justify-between gap-3 pt-5">
          <p className="font-display text-[1.05rem] font-medium">
            DOM Academy
            <span className="ml-2 text-[0.72rem] font-normal text-ink-faint">
              · переподготовка · {cfg.cityName}
            </span>
          </p>
          <div className="max-[640px]:hidden">
            <CtaLink secondary>Оставить заявку</CtaLink>
          </div>
        </header>

        <HeroSection cfg={cfg} />
        <PathSection />
        <AudienceSection cfg={cfg} />
        <DifferenceSection cfg={cfg} />
        <ProgramSection />
        <FormatSection cfg={cfg} />
        <MindsetSection />
        <TeamSection />
        <DiplomaSection />
        <AdmissionSection />
        <PriceSection cfg={cfg} />
        <FaqSection cfg={cfg} />
        <FinalCtaSection />

        <footer className="pb-2 pt-4 text-center text-[0.7rem] text-ink-faint">
          DOM Academy &middot; АНО ДПО «Экзистенциально-гуманистическое образование» &middot; 2027
        </footer>
      </div>
    </div>
  );
}

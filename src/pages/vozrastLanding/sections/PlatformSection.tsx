import { FadeSection } from '../components/FadeSection';
import { askImage, platformFeatures } from '../data';

export function PlatformSection() {
  return (
    <FadeSection id="platform" className="vz-section vz-platform">
      <div className="vz-container">
        <h2 className="vz-h2">Своя учебная платформа</h2>
        <p className="vz-platform-intro">
          Курс живёт не в чатах и рассылках, а на собственной платформе DOM Academy:
          лекции, конспекты, вопросы, тесты и материалы — в одном месте, доступ
          бессрочный.
        </p>
        {platformFeatures.map((feature, idx) => (
          <div
            key={feature.id}
            className={`vz-feature ${idx % 2 === 1 ? 'vz-feature-reverse' : ''}`}
          >
            <div className="vz-feature-text">
              <p className="vz-kicker">{feature.kicker}</p>
              <h3>{feature.title}</h3>
              {feature.text.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
            <div className="vz-feature-media-col">
              <div className="vz-feature-media">
                <img
                  src={feature.image}
                  alt={feature.imageAlt}
                  width={1400}
                  height={feature.id === 'tests' ? 1194 : 875}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              {feature.id === 'konspekt' ? (
                <div className="vz-feature-extra">
                  <img
                    src={askImage.image}
                    alt={askImage.imageAlt}
                    width={1400}
                    height={875}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

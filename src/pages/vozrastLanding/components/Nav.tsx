import { CTA_TEXT, TG_LINK } from '../data';

export function Nav() {
  return (
    <nav className="vz-nav">
      <div className="vz-nav-inner">
        <span className="vz-nav-logo">Психология возраста</span>
        <div className="vz-nav-links">
          <a href="#about">О программе</a>
          <a href="#week">Формат</a>
          <a href="#platform">Платформа</a>
          <a href="#program">Программа</a>
          <a href="#team">Ведущие</a>
          <a href="#price">Стоимость</a>
        </div>
        <a href={TG_LINK} target="_blank" rel="noopener noreferrer" data-track-click="cta-nav" className="vz-nav-cta">
          {CTA_TEXT}
        </a>
      </div>
    </nav>
  );
}

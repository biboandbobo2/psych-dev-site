import { TG_LINK } from '../data';

export function Nav() {
  return (
    <nav className="ws2-nav">
      <div className="ws2-nav-inner">
        <span className="ws2-nav-logo">Тёплые ключи 2</span>
        <div className="ws2-nav-links">
          <a href="#method">О методе</a>
          <a href="#program">Программа</a>
          <a href="#team">Ведущие</a>
          <a href="#price">Стоимость</a>
        </div>
        <a href={TG_LINK} target="_blank" rel="noopener noreferrer" className="ws2-nav-cta">
          Заявка
        </a>
      </div>
    </nav>
  );
}

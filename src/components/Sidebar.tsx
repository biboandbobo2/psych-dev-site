import { NavLink } from 'react-router-dom';
import { usePeriods } from '../hooks/usePeriods';

export default function Sidebar() {
  const periods = usePeriods();

  return (
    <aside className="lg:w-[220px] w-full overflow-y-auto">
      <nav>
        <ul className="space-y-1">
          {periods.map(p => (
            <li key={p.slug}>
              <NavLink
                to={`/${p.slug}`}
                className={({ isActive }) =>
                  `block px-3 py-1 rounded ${isActive ? 'bg-brand text-white font-semibold' : 'hover:bg-gray-100'}`
                }
              >
                {p.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

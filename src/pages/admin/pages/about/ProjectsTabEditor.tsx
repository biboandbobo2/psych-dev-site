import { Link } from 'react-router-dom';
import type { AboutTab } from '../../../about/aboutContent';

type ProjectsTab = Extract<AboutTab, { kind: 'projects' }>;

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';

export function ProjectsTabEditor({
  tab,
  onChange,
}: {
  tab: ProjectsTab;
  onChange: (patch: Partial<ProjectsTab>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#C6D7EA] bg-[#F4F9FF] p-3 text-sm text-[#2C3E50]">
        Карточки проектов собираются автоматически. Динамические — из коллекции{' '}
        <span className="font-mono">projectPages</span> (создаются и редактируются на{' '}
        <Link to="/superadmin/pages" className="text-[#2F6DB5] underline">
          списке страниц
        </Link>
        ). Статические перечислены в коде —{' '}
        <span className="font-mono">src/pages/projects/staticProjects.ts</span>.
        Здесь редактируется только intro над списком.
      </div>
      <div>
        <label className={LABEL_CLASS}>Intro вкладки</label>
        <textarea
          value={tab.intro}
          onChange={(e) => onChange({ intro: e.target.value })}
          rows={3}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>
    </div>
  );
}

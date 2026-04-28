import type { AuthorFormState } from '../useCourseIntroEditor';
import { INPUT_CLASS, LABEL_CLASS } from './styles';

interface AuthorLinksEditorProps {
  author: AuthorFormState;
  onChange: (patch: Partial<AuthorFormState>) => void;
}

export function AuthorLinksEditor({ author, onChange }: AuthorLinksEditorProps) {
  const updateLink = (index: number, patch: Partial<{ label: string; url: string }>) => {
    const next = author.links.map((link, i) => (i === index ? { ...link, ...patch } : link));
    onChange({ links: next });
  };
  const addLink = () => onChange({ links: [...author.links, { label: '', url: '' }] });
  const removeLink = (index: number) =>
    onChange({ links: author.links.filter((_, i) => i !== index) });

  return (
    <div className="space-y-2">
      <div className={LABEL_CLASS}>Ссылки (соцсети, сайт)</div>
      {author.links.length === 0 ? (
        <p className="text-xs text-[#8A97AB]">Пока нет ссылок.</p>
      ) : (
        <ul className="space-y-2">
          {author.links.map((link, idx) => (
            <li key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(idx, { label: e.target.value })}
                placeholder="Название"
                className={`${INPUT_CLASS} sm:flex-1`}
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(idx, { url: e.target.value })}
                placeholder="https://..."
                className={`${INPUT_CLASS} sm:flex-[2]`}
              />
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={addLink}
        className="rounded-md bg-[#EEF2F7] px-3 py-1.5 text-sm text-[#2C3E50] hover:bg-[#DDE5EE]"
      >
        + Добавить ссылку
      </button>
    </div>
  );
}

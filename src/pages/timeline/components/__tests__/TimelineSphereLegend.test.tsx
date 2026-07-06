import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimelineSphereLegend } from '../TimelineSphereLegend';
import type { NodeT } from '../../types';

const nodes: NodeT[] = [
  { id: 'a', age: 10, label: 'A', isDecision: false, sphere: 'family' },
  { id: 'b', age: 20, label: 'B', isDecision: false, sphere: 'family' },
  { id: 'c', age: 30, label: 'C', isDecision: false, sphere: 'career' },
  { id: 'd', age: 40, label: 'D', isDecision: false }, // без сферы — не в легенде
];

describe('TimelineSphereLegend', () => {
  it('показывает только сферы с событиями и их количество', () => {
    render(<TimelineSphereLegend nodes={nodes} activeSphere={null} onChange={() => {}} />);
    expect(screen.getByTitle(/Семья/)).toBeInTheDocument();
    expect(screen.getByTitle(/Карьера/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Образование/)).not.toBeInTheDocument();
    expect(screen.getByTitle(/Семья/)).toHaveTextContent('2');
  });

  it('клик по сфере включает фильтр, повторный — сбрасывает', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TimelineSphereLegend nodes={nodes} activeSphere={null} onChange={onChange} />
    );
    fireEvent.click(screen.getByTitle(/Семья/));
    expect(onChange).toHaveBeenCalledWith('family');

    rerender(<TimelineSphereLegend nodes={nodes} activeSphere="family" onChange={onChange} />);
    fireEvent.click(screen.getByTitle(/Семья/));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('кнопка «Показать все» сбрасывает фильтр', () => {
    const onChange = vi.fn();
    render(<TimelineSphereLegend nodes={nodes} activeSphere="career" onChange={onChange} />);
    fireEvent.click(screen.getByText('Показать все'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('ничего не рендерит без событий со сферами', () => {
    const { container } = render(
      <TimelineSphereLegend
        nodes={[{ id: 'x', age: 5, label: 'X', isDecision: false }]}
        activeSphere={null}
        onChange={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

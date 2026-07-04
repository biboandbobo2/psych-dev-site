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
    expect(screen.getByText('Семья')).toBeInTheDocument();
    expect(screen.getByText('Карьера')).toBeInTheDocument();
    expect(screen.queryByText('Образование')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // family
  });

  it('клик по сфере включает фильтр, повторный — сбрасывает', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TimelineSphereLegend nodes={nodes} activeSphere={null} onChange={onChange} />
    );
    fireEvent.click(screen.getByText('Семья'));
    expect(onChange).toHaveBeenCalledWith('family');

    rerender(<TimelineSphereLegend nodes={nodes} activeSphere="family" onChange={onChange} />);
    fireEvent.click(screen.getByText('Семья'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('кнопка «Все» сбрасывает фильтр', () => {
    const onChange = vi.fn();
    render(<TimelineSphereLegend nodes={nodes} activeSphere="career" onChange={onChange} />);
    fireEvent.click(screen.getByText('Все'));
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

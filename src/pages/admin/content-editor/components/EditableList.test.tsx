import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditableList } from './EditableList';
import type { ListItem } from '../types';

function EditableListHarness({
  primaryField = 'title',
}: {
  primaryField?: 'title' | 'name';
}) {
  let items: ListItem[] = [];
  const handleChange = vi.fn((nextItems: ListItem[]) => {
    items = nextItems;
  });

  const rendered = render(
    <EditableList
      items={items}
      onChange={handleChange}
      label="Test list"
      placeholder="Введите значение"
      showUrl
      primaryField={primaryField}
    />
  );

  return { handleChange, ...rendered };
}

describe('EditableList', () => {
  it('creates and updates name-based items for concepts/authors', () => {
    const { handleChange, rerender } = EditableListHarness({ primaryField: 'name' });

    fireEvent.click(screen.getByRole('button', { name: /\+ добавить/i }));

    const addedItems = handleChange.mock.calls.at(-1)?.[0] as ListItem[];
    expect(addedItems).toEqual([{ name: '', url: '' }]);

    handleChange.mockClear();

    rerender(
      <EditableList
        items={addedItems}
        onChange={handleChange}
        label="Test list"
        placeholder="Введите значение"
        showUrl
        primaryField="name"
      />
    );

    fireEvent.change(screen.getAllByPlaceholderText('Введите значение')[0], {
      target: { value: 'Внимание' },
    });

    const updatedItems = handleChange.mock.calls.at(-1)?.[0] as ListItem[];
    expect(updatedItems).toEqual([{ name: 'Внимание', url: '' }]);
  });
});

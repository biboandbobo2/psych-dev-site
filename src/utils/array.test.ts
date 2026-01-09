import { describe, it, expect } from 'vitest';
import { shuffleArray, shuffleArraySeeded } from './array';

describe('shuffleArray', () => {
  it('возвращает массив той же длины', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
  });

  it('содержит все элементы исходного массива', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it('не мутирует исходный массив', () => {
    const input = [1, 2, 3, 4, 5];
    const inputCopy = [...input];
    shuffleArray(input);
    expect(input).toEqual(inputCopy);
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('возвращает копию для массива из одного элемента', () => {
    const input = [42];
    const result = shuffleArray(input);
    expect(result).toEqual([42]);
    expect(result).not.toBe(input); // Должна быть новая ссылка
  });

  it('работает с массивами объектов', () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = shuffleArray(input);
    expect(result).toHaveLength(3);
    expect(result.map((x) => x.id).sort()).toEqual([1, 2, 3]);
  });
});

describe('shuffleArraySeeded', () => {
  it('возвращает массив той же длины', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArraySeeded(input, 12345);
    expect(result).toHaveLength(input.length);
  });

  it('содержит все элементы исходного массива', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArraySeeded(input, 12345);
    expect(result.sort()).toEqual(input.sort());
  });

  it('не мутирует исходный массив', () => {
    const input = [1, 2, 3, 4, 5];
    const inputCopy = [...input];
    shuffleArraySeeded(input, 12345);
    expect(input).toEqual(inputCopy);
  });

  it('детерминированно — один seed даёт один результат', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const seed = 42;

    const result1 = shuffleArraySeeded(input, seed);
    const result2 = shuffleArraySeeded(input, seed);

    expect(result1).toEqual(result2);
  });

  it('разные seed дают разные результаты', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const result1 = shuffleArraySeeded(input, 1);
    const result2 = shuffleArraySeeded(input, 2);

    // Очень маловероятно что разные seed дадут одинаковый порядок
    expect(result1).not.toEqual(result2);
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(shuffleArraySeeded([], 12345)).toEqual([]);
  });

  it('работает с массивами строк', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = shuffleArraySeeded(input, 999);
    expect(result).toHaveLength(4);
    expect(result.sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

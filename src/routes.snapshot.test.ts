import { describe, expect, it } from 'vitest';
import * as routesModule from './routes';

const {
  SITE_NAME,
  NOT_FOUND_REDIRECT,
  ROUTE_CONFIG,
  ROUTE_BY_PERIOD,
  CLINICAL_ROUTE_CONFIG,
  CLINICAL_ROUTE_BY_PERIOD,
  GENERAL_ROUTE_CONFIG,
  GENERAL_ROUTE_BY_PERIOD,
} = routesModule as {
  SITE_NAME: string;
  NOT_FOUND_REDIRECT: boolean;
  ROUTE_CONFIG: Array<Record<string, unknown>>;
  ROUTE_BY_PERIOD: Record<string, unknown>;
  CLINICAL_ROUTE_CONFIG: Array<Record<string, unknown>>;
  CLINICAL_ROUTE_BY_PERIOD: Record<string, unknown>;
  GENERAL_ROUTE_CONFIG: Array<Record<string, unknown>>;
  GENERAL_ROUTE_BY_PERIOD: Record<string, unknown>;
};

describe('routes module', () => {
  it('exports stable constants', () => {
    expect(SITE_NAME).toBe('DOM Academy');
    expect(NOT_FOUND_REDIRECT).toBe(false);
  });

  it('ROUTE_CONFIG: snapshot of full development course config', () => {
    expect(ROUTE_CONFIG).toMatchSnapshot();
  });

  it('CLINICAL_ROUTE_CONFIG: snapshot of full clinical course config', () => {
    expect(CLINICAL_ROUTE_CONFIG).toMatchSnapshot();
  });

  it('GENERAL_ROUTE_CONFIG: snapshot of full general course config', () => {
    expect(GENERAL_ROUTE_CONFIG).toMatchSnapshot();
  });

  it('ROUTE_BY_PERIOD: snapshot of lookup table', () => {
    expect(ROUTE_BY_PERIOD).toMatchSnapshot();
  });

  it('CLINICAL_ROUTE_BY_PERIOD: snapshot of lookup table', () => {
    expect(CLINICAL_ROUTE_BY_PERIOD).toMatchSnapshot();
  });

  it('GENERAL_ROUTE_BY_PERIOD: snapshot of lookup table', () => {
    expect(GENERAL_ROUTE_BY_PERIOD).toMatchSnapshot();
  });

  it('ROUTE_CONFIG: paths and keys are unique', () => {
    const paths = ROUTE_CONFIG.map((r) => r.path as string);
    const keys = ROUTE_CONFIG.map((r) => r.key as string);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('CLINICAL_ROUTE_CONFIG: paths and keys are unique', () => {
    const paths = CLINICAL_ROUTE_CONFIG.map((r) => r.path as string);
    const keys = CLINICAL_ROUTE_CONFIG.map((r) => r.key as string);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('GENERAL_ROUTE_CONFIG: paths and keys are unique', () => {
    const paths = GENERAL_ROUTE_CONFIG.map((r) => r.path as string);
    const keys = GENERAL_ROUTE_CONFIG.map((r) => r.key as string);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ROUTE_BY_PERIOD: every entry references a config with matching periodId', () => {
    for (const [periodId, entry] of Object.entries(ROUTE_BY_PERIOD)) {
      expect((entry as { periodId: string }).periodId).toBe(periodId);
      expect(ROUTE_CONFIG).toContain(entry);
    }
  });

  it('CLINICAL_ROUTE_BY_PERIOD: every entry references a config with matching periodId', () => {
    for (const [periodId, entry] of Object.entries(CLINICAL_ROUTE_BY_PERIOD)) {
      expect((entry as { periodId: string }).periodId).toBe(periodId);
      expect(CLINICAL_ROUTE_CONFIG).toContain(entry);
    }
  });

  it('GENERAL_ROUTE_BY_PERIOD: every entry references a config with matching periodId', () => {
    for (const [periodId, entry] of Object.entries(GENERAL_ROUTE_BY_PERIOD)) {
      expect((entry as { periodId: string }).periodId).toBe(periodId);
      expect(GENERAL_ROUTE_CONFIG).toContain(entry);
    }
  });

  it('module exports the full public surface', () => {
    expect(Object.keys(routesModule).sort()).toEqual(
      [
        'CLINICAL_ROUTE_BY_PERIOD',
        'CLINICAL_ROUTE_CONFIG',
        'GENERAL_ROUTE_BY_PERIOD',
        'GENERAL_ROUTE_CONFIG',
        'NOT_FOUND_REDIRECT',
        'ROUTE_BY_PERIOD',
        'ROUTE_CONFIG',
        'SITE_NAME',
      ].sort(),
    );
  });
});

import { CLINICAL_ROUTE_CONFIG } from './clinical';
import { ROUTE_CONFIG } from './development';
import { GENERAL_ROUTE_CONFIG } from './general';
import { byPeriodLookup } from './lookup';

export const SITE_NAME = 'DOM Academy';
export const NOT_FOUND_REDIRECT = false;

export { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG };
export type { RouteConfig, RouteMeta } from './types';

export const ROUTE_BY_PERIOD = byPeriodLookup(ROUTE_CONFIG);
export const CLINICAL_ROUTE_BY_PERIOD = byPeriodLookup(CLINICAL_ROUTE_CONFIG);
export const GENERAL_ROUTE_BY_PERIOD = byPeriodLookup(GENERAL_ROUTE_CONFIG);

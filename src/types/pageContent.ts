import type { AboutTab } from '../pages/about/aboutContent';
import type { Partner } from '../pages/about/partnersContent';

export interface AboutPageDocument {
  version: number;
  lastModified?: string;
  tabs: AboutTab[];
  partners: Partner[];
}

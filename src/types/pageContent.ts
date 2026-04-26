import type { AboutTab } from '../pages/about/aboutContent';
import type { Partner } from '../pages/about/partnersContent';
import type { ProjectImage, ProjectCta } from '../pages/projects/ProjectPage';

export interface AboutPageDocument {
  version: number;
  lastModified?: string;
  tabs: AboutTab[];
  partners: Partner[];
}

export interface ProjectPageDocument {
  version: number;
  lastModified?: string;
  title: string;
  subtitle?: string;
  intro: string;
  paragraphs?: string[];
  images?: ProjectImage[];
  cta?: ProjectCta;
}

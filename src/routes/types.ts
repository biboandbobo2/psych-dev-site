export interface RouteMeta {
  title: string;
  description: string;
}

export interface RouteConfig {
  path: string;
  key: string;
  navLabel: string;
  periodId: string;
  themeKey: string;
  meta: RouteMeta;
  videoSrc?: string;
  placeholderText?: string;
  placeholderDefaultEnabled?: boolean;
}

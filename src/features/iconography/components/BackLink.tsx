import { Link, useLocation } from 'react-router-dom';
export function BackLink() {
  const { state } = useLocation();
  const requested = typeof state?.returnTo === 'string' ? state.returnTo : '';
  const safe = /^\/iconography(?:\/(?:catalog|learn|schools\/[a-z-]+|icon\/[a-z0-9-]+))?(?:[?#]|$)/.test(requested);
  return <Link className="ico-button ico-button-outline ico-back" state={safe ? state?.returnState : undefined} to={safe ? requested : '/iconography/catalog'}>{safe && typeof state?.returnLabel === 'string' ? state.returnLabel : 'Назад к коллекции'}</Link>;
}

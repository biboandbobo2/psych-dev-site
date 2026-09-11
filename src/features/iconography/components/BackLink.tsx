import { Link, useLocation } from 'react-router-dom';

const safeReturn = /^\/iconography(?:\/(?:catalog|learn|schools\/[a-z-]+|icon\/[a-z0-9-]+))?(?:[?#]|$)/;

export function BackLink() {
  const { state } = useLocation();
  const requested = typeof state?.returnTo === 'string' ? state.returnTo : '';
  const safe = safeReturn.test(requested);
  const label = safe && typeof state?.returnLabel === 'string' ? state.returnLabel : 'Назад к коллекции';
  return (
    <Link
      className="ico-button ico-button-outline ico-back"
      to={safe ? requested : '/iconography/catalog'}
      state={safe ? state?.returnState : undefined}
    >{label}</Link>
  );
}

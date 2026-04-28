import { TG_LINK } from '../data';

const CONFIRM_INTERVIEW_TEXT =
  'Готовы записаться на собеседование? Я открою Telegram, где можно написать ведущим.';

export function confirmInterviewRedirect() {
  if (window.confirm(CONFIRM_INTERVIEW_TEXT)) {
    window.open(TG_LINK, '_blank', 'noopener,noreferrer');
  }
}

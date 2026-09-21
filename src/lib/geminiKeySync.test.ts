import { describe, it, expect } from 'vitest';
import { shouldMigrateLegacyGeminiKey } from './geminiKeySync';

/**
 * Ленивая миграция BYOK-ключа в users/{uid}/private/settings. Ошибка здесь
 * либо затрёт свежий ключ старым, либо оставит ключ в корневом документе,
 * который читают супер-админ и со-админ.
 */
describe('geminiKeySync — перенос legacy-ключа Gemini в приватный поддокумент', () => {
  it('legacy есть, приватный прочитан и пуст → переносим', () => {
    expect(
      shouldMigrateLegacyGeminiKey({
        legacyKey: 'AIzaSyOLD',
        privateSnapshotSeen: true,
        privateKey: null,
      })
    ).toBe(true);
  });

  it('приватный снапшот ещё не пришёл → ждём, не переносим', () => {
    expect(
      shouldMigrateLegacyGeminiKey({
        legacyKey: 'AIzaSyOLD',
        privateSnapshotSeen: false,
        privateKey: null,
      })
    ).toBe(false);
  });

  it('в приватном уже есть ключ → не затираем его legacy-значением', () => {
    expect(
      shouldMigrateLegacyGeminiKey({
        legacyKey: 'AIzaSyOLD',
        privateSnapshotSeen: true,
        privateKey: 'AIzaSyNEW',
      })
    ).toBe(false);
  });

  it('legacy-ключа нет → переносить нечего', () => {
    expect(
      shouldMigrateLegacyGeminiKey({
        legacyKey: null,
        privateSnapshotSeen: true,
        privateKey: null,
      })
    ).toBe(false);
  });
});

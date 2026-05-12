/**
 * Публикация теста в коллекцию `tests` из JSON-исходника + (опционально) заливка
 * фото в Firebase Storage с проставлением `imageUrl` каждому вопросу.
 *
 * Объединяет три бывших одноразовых скрипта из /tmp/exam-general/ в один
 * переиспользуемый инструмент.
 *
 * Использование:
 *   npx tsx scripts/publishTestFromJson.ts <json-path> [options]
 *
 * Опции:
 *   --photos <dir>      Папка с фото; имя файла берётся из поля `_photoFile`
 *                       в соответствующем вопросе JSON.
 *   --update <testId>   Обновить существующий документ вместо создания нового.
 *   --status <status>   published | draft | unpublished (по умолчанию: published).
 *   --dry-run           Не писать в Firestore/Storage, показать что было бы сделано.
 *
 * Аутентификация: Application Default Credentials (gcloud auth application-default login).
 *
 * Формат JSON-исходника (упрощённо):
 *   {
 *     "test": {
 *       "title": "...",
 *       "course": "general" | "development" | "clinical" | "<custom>",
 *       "rubric": "full-course" | "<period-id>",
 *       "prerequisiteTestId"?: string,
 *       "requiredPercentage": number,
 *       "defaultRevealPolicy"?: { mode: "immediately" | "after_test" | ... },
 *       "appearance"?: { ... },
 *       "questions": [
 *         {
 *           "id": "q1-wundt",
 *           "questionText": "...",
 *           "answers": [{ "id": "q1-a1", "text": "..." }, ...],
 *           "correctAnswerId": "q1-a1",
 *           "shuffleAnswers": true,
 *           "revealPolicy": { "mode": "immediately" },
 *           "explanation": "...",
 *           "resourcesRight": [{ "title": "...", "url": "..." }],
 *           "_photoFile"?: "01-vundt.jpg"  // опционально, заливается из --photos dir
 *         }
 *       ]
 *     }
 *   }
 *
 * Чек-лист авторства тестов — см. docs/guides/testing-system.md.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';

interface TestSource {
  test: {
    title: string;
    course: string;
    rubric: string;
    prerequisiteTestId?: string;
    requiredPercentage?: number;
    defaultRevealPolicy?: { mode: string; attempts?: number };
    appearance?: Record<string, unknown>;
    questions: Array<{
      id: string;
      _photoFile?: string;
      [k: string]: unknown;
    }>;
  };
}

interface CliOptions {
  jsonPath: string;
  photosDir?: string;
  updateTestId?: string;
  status: 'published' | 'draft' | 'unpublished';
  dryRun: boolean;
}

const SUPER_ADMIN_UID = 'OfAixOLZDdbBO5oVjYkB09D0UNH2';

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('Usage: tsx scripts/publishTestFromJson.ts <json-path> [--photos dir] [--update testId] [--status published|draft] [--dry-run]');
    process.exit(1);
  }
  const opts: CliOptions = {
    jsonPath: resolve(args[0]),
    status: 'published',
    dryRun: false,
  };
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--photos') opts.photosDir = resolve(args[++i]);
    else if (a === '--update') opts.updateTestId = args[++i];
    else if (a === '--status') opts.status = args[++i] as CliOptions['status'];
    else if (a === '--dry-run') opts.dryRun = true;
    else { console.error('Unknown arg:', a); process.exit(1); }
  }
  return opts;
}

async function uploadPhoto(
  bucket: NonNullable<ReturnType<typeof initAdmin>['bucket']>,
  testId: string,
  questionId: string,
  localPath: string,
): Promise<string> {
  const dst = `tests/${testId}/questions/${questionId}/image.jpg`;
  const token = randomUUID();
  await bucket.upload(localPath, {
    destination: dst,
    contentType: 'image/jpeg',
    metadata: {
      contentType: 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dst)}?alt=media&token=${token}`;
}

async function main() {
  const opts = parseArgs();
  if (!existsSync(opts.jsonPath)) {
    console.error('JSON not found:', opts.jsonPath);
    process.exit(1);
  }

  const source = JSON.parse(readFileSync(opts.jsonPath, 'utf8')) as TestSource;
  if (!source.test || !Array.isArray(source.test.questions)) {
    console.error('Invalid JSON: ожидаю { test: { ..., questions: [...] } }');
    process.exit(1);
  }

  const { db, bucket } = initAdmin();
  const t = source.test;
  const now = FieldValue.serverTimestamp();

  // Подготовка questions: удаляем служебные поля, нормализуем revealPolicy/correctAnswerId
  const questions = t.questions.map((q) => {
    const cleaned: Record<string, unknown> = { ...q };
    delete cleaned._photoFile;
    return cleaned;
  });

  let testId = opts.updateTestId;

  if (opts.dryRun) {
    console.log('[dry-run] would', opts.updateTestId ? 'update' : 'create', 'test:', t.title);
    console.log('  course:', t.course, 'rubric:', t.rubric, 'status:', opts.status);
    console.log('  questions:', questions.length);
    if (opts.photosDir) {
      const withPhotos = t.questions.filter((q) => q._photoFile);
      console.log('  photos to upload:', withPhotos.length);
      for (const q of withPhotos) {
        const fp = join(opts.photosDir, q._photoFile!);
        console.log('   -', q.id, '<-', fp, existsSync(fp) ? '✓' : '✗ MISSING');
      }
    }
    return;
  }

  // 1. Создаём/обновляем документ
  if (testId) {
    await db.collection('tests').doc(testId).update({
      title: t.title,
      course: t.course,
      rubric: t.rubric,
      ...(t.prerequisiteTestId ? { prerequisiteTestId: t.prerequisiteTestId } : {}),
      requiredPercentage: t.requiredPercentage ?? 70,
      questionCount: questions.length,
      defaultRevealPolicy: t.defaultRevealPolicy,
      appearance: t.appearance,
      questions,
      status: opts.status,
      updatedAt: now,
    });
    console.log(`✓ updated tests/${testId}`);
  } else {
    const ref = await db.collection('tests').add({
      title: t.title,
      course: t.course,
      rubric: t.rubric,
      ...(t.prerequisiteTestId ? { prerequisiteTestId: t.prerequisiteTestId } : {}),
      status: opts.status,
      requiredPercentage: t.requiredPercentage ?? 70,
      questionCount: questions.length,
      defaultRevealPolicy: t.defaultRevealPolicy,
      appearance: t.appearance,
      questions,
      createdBy: SUPER_ADMIN_UID,
      createdAt: now,
      updatedAt: now,
    });
    testId = ref.id;
    console.log(`✓ created tests/${testId}`);
  }

  // 2. Опционально: фото → Storage → imageUrl
  if (opts.photosDir && bucket) {
    const withPhotos = t.questions.filter((q) => q._photoFile);
    if (withPhotos.length === 0) {
      console.log('  (нет вопросов с _photoFile, пропускаю заливку фото)');
    } else {
      const updated = [...questions];
      let uploaded = 0;
      for (const srcQ of withPhotos) {
        const fp = join(opts.photosDir, srcQ._photoFile!);
        if (!existsSync(fp)) {
          console.warn('  ! ' + srcQ.id + ': файл ' + srcQ._photoFile + ' не найден, пропуск');
          continue;
        }
        const idx = updated.findIndex((q) => (q as { id: string }).id === srcQ.id);
        if (idx < 0) continue;
        const imageUrl = await uploadPhoto(bucket, testId!, srcQ.id, fp);
        (updated[idx] as Record<string, unknown>).imageUrl = imageUrl;
        uploaded += 1;
        console.log(`  ✓ ${srcQ.id} ← ${srcQ._photoFile}`);
      }
      if (uploaded > 0) {
        await db.collection('tests').doc(testId).update({
          questions: updated,
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`✓ imageUrl проставлен для ${uploaded} вопросов`);
      }
    }
  }

  console.log(`\nGoto: https://academydom.com/tests/dynamic/${testId}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});

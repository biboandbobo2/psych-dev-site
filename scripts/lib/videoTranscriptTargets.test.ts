import { describe, expect, it } from 'vitest';
import { collectTranscriptTargets } from './videoTranscriptTargets';

function createMockDb(docSets: Record<string, Array<{ id: string; data: Record<string, unknown> }>>) {
  return {
    collection(name: string) {
      return {
        async get() {
          return {
            docs: (docSets[name] ?? []).map((doc) => ({
              id: doc.id,
              data: () => doc.data,
            })),
            forEach(callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) {
              (docSets[name] ?? []).forEach((doc) => callback({ id: doc.id, data: () => doc.data }));
            },
          };
        },
        doc(id: string) {
          return {
            async get() {
              const found = (docSets[`${name}/${id}`] ?? [])[0];
              return {
                exists: Boolean(found),
                data: () => found?.data ?? {},
              };
            },
            collection(childName: string) {
              return {
                async get() {
                  return {
                    docs: (docSets[`${name}/${id}/${childName}`] ?? []).map((doc) => ({
                      id: doc.id,
                      data: () => doc.data,
                    })),
                    forEach(
                      callback: (doc: { id: string; data: () => Record<string, unknown> }) => void
                    ) {
                      (docSets[`${name}/${id}/${childName}`] ?? []).forEach((doc) =>
                        callback({ id: doc.id, data: () => doc.data })
                      );
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as FirebaseFirestore.Firestore;
}

describe('collectTranscriptTargets', () => {
  it('собирает и дедуплицирует youtube видео из sections и legacy полей', async () => {
    const db = createMockDb({
      periods: [
        {
          id: 'preschool',
          data: {
            title: 'Дошкольный возраст',
            sections: {
              video_section: {
                content: [
                  { title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
                ],
              },
            },
          },
        },
      ],
      'intro/singleton': [],
      'clinical-topics': [],
      'general-topics': [],
      courses: [{ id: 'custom-course', data: {} }],
      'courses/custom-course/lessons': [
        {
          id: 'lesson-1',
          data: {
            title: 'Кастомная лекция',
            video_url: 'https://youtu.be/dQw4w9WgXcQ',
          },
        },
        {
          id: 'lesson-2',
          data: {
            title: 'Лекция 2',
            video_playlist: [
              { title: 'Другая лекция', url: 'https://www.youtube.com/watch?v=oHg5SJYRHA0' },
            ],
          },
        },
      ],
    });

    const targets = await collectTranscriptTargets(db);

    expect(targets).toHaveLength(2);
    expect(targets[0]).toMatchObject({
      youtubeVideoId: 'dQw4w9WgXcQ',
    });
    expect(targets[0].references).toHaveLength(2);
    expect(targets[1]).toMatchObject({
      youtubeVideoId: 'oHg5SJYRHA0',
    });
  });
});

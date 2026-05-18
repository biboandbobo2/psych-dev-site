import type { VideoTranscriptSegment } from '../../shared/videoTranscripts/schema';

export type MergeSpeaker = 'L' | 'S';

export interface MergeParagraph {
  anchorSec: number;
  speaker: MergeSpeaker;
  text: string;
}

export interface FwV3Line {
  startSec: number;
  text: string;
}

export interface BuildSegmentsOptions {
  targetReplyDurationSec?: number;
  totalDurationSec?: number;
}

const MERGE_LINE_RE = /^\[(\d{1,3}):(\d{2})\]\s*\[([ЛС])\]:\s*(.+)$/u;
const FW_V3_LINE_RE = /^\[\s*(\d+(?:\.\d+)?)s\]\s*(.+)$/;

const SPEAKER_PREFIX: Record<MergeSpeaker, string> = {
  L: 'Л',
  S: 'С',
};

export function parseMergeFile(content: string): MergeParagraph[] {
  const paragraphs: MergeParagraph[] = [];

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = MERGE_LINE_RE.exec(line);
    if (!match) continue;

    const [, mm, ss, speakerLabel, text] = match;
    paragraphs.push({
      anchorSec: Number(mm) * 60 + Number(ss),
      speaker: speakerLabel === 'Л' ? 'L' : 'S',
      text: text.trim(),
    });
  }

  return paragraphs;
}

export function parseFwV3File(content: string): FwV3Line[] {
  const lines: FwV3Line[] = [];

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = FW_V3_LINE_RE.exec(line);
    if (!match) continue;
    lines.push({
      startSec: Number(match[1]),
      text: match[2].trim(),
    });
  }

  return lines;
}

function splitTextIntoChunks(text: string, targetChunks: number): string[] {
  const sentences = text
    .split(/(?<=[.!?…])\s+(?=[А-ЯA-Z«"„])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1 || targetChunks <= 1) {
    return [text];
  }

  const chunkCount = Math.min(targetChunks, sentences.length);
  const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const targetChunkLength = totalLength / chunkCount;

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index];
    const sentencesLeft = sentences.length - index;
    const chunksLeft = chunkCount - chunks.length;

    currentChunk.push(sentence);
    currentLength += sentence.length;

    const isLastChunk = chunks.length === chunkCount - 1;
    const exceedsTarget = currentLength >= targetChunkLength;
    const mustFlushToFitRemaining = chunksLeft > 1 && sentencesLeft <= chunksLeft;

    if (!isLastChunk && (exceedsTarget || mustFlushToFitRemaining)) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentLength = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

function findAnchorFwV3Start(
  fwV3Lines: FwV3Line[],
  targetSec: number,
  windowEndSec: number
): number | null {
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestStart: number | null = null;

  for (const fwLine of fwV3Lines) {
    if (fwLine.startSec < targetSec - 5 || fwLine.startSec > windowEndSec) {
      continue;
    }
    const diff = Math.abs(fwLine.startSec - targetSec);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestStart = fwLine.startSec;
    }
  }

  return bestStart;
}

interface FwV3Bucket {
  startSec: number;
  endSec: number;
}

function groupFwV3IntoBuckets(
  fwV3Lines: FwV3Line[],
  windowStartSec: number,
  windowEndSec: number,
  targetBucketDurationSec: number
): FwV3Bucket[] {
  const linesInWindow = fwV3Lines.filter(
    (line) => line.startSec >= windowStartSec - 1 && line.startSec < windowEndSec
  );
  if (linesInWindow.length === 0) return [];

  const buckets: FwV3Bucket[] = [];
  let bucketStart = linesInWindow[0].startSec;
  let bucketLastStart = bucketStart;

  for (let i = 1; i < linesInWindow.length; i += 1) {
    const fwLine = linesInWindow[i];
    if (fwLine.startSec - bucketStart >= targetBucketDurationSec) {
      buckets.push({ startSec: bucketStart, endSec: fwLine.startSec });
      bucketStart = fwLine.startSec;
    }
    bucketLastStart = fwLine.startSec;
  }

  buckets.push({
    startSec: bucketStart,
    endSec: Math.max(windowEndSec, bucketLastStart + 1),
  });

  return buckets;
}

function distributeTextProportionally(text: string, bucketCount: number): string[] {
  if (bucketCount <= 1) return [text];

  const sentences = text
    .split(/(?<=[.!?…])\s+(?=[А-ЯA-Z«"„])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const atoms = sentences.length >= bucketCount
    ? sentences
    : text.split(/(?<=[,;—–])\s+/).map((atom) => atom.trim()).filter(Boolean);

  if (atoms.length <= 1) {
    const charsPerBucket = Math.ceil(text.length / bucketCount);
    const result: string[] = [];
    for (let i = 0; i < bucketCount; i += 1) {
      result.push(text.slice(i * charsPerBucket, (i + 1) * charsPerBucket).trim());
    }
    return result.filter(Boolean);
  }

  const totalLength = atoms.reduce((sum, atom) => sum + atom.length, 0);
  const targetBucketLength = totalLength / bucketCount;
  const out: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < atoms.length; i += 1) {
    const atom = atoms[i];
    const atomsLeft = atoms.length - i;
    const bucketsLeft = bucketCount - out.length;

    current.push(atom);
    currentLength += atom.length;

    const isLastBucket = out.length === bucketCount - 1;
    const exceedsTarget = currentLength >= targetBucketLength;
    const mustFlush = bucketsLeft > 1 && atomsLeft <= bucketsLeft;

    if (!isLastBucket && (exceedsTarget || mustFlush)) {
      out.push(current.join(' '));
      current = [];
      currentLength = 0;
    }
  }

  if (current.length > 0) {
    out.push(current.join(' '));
  }

  while (out.length < bucketCount) out.push('');
  return out;
}

export function buildSegmentsFromMerge(
  paragraphs: MergeParagraph[],
  fwV3Lines: FwV3Line[],
  options: BuildSegmentsOptions = {}
): VideoTranscriptSegment[] {
  const targetReplyDurationSec = options.targetReplyDurationSec ?? 15;
  const lastFwSec = fwV3Lines.length > 0 ? fwV3Lines[fwV3Lines.length - 1].startSec : 0;
  const totalDurationSec = options.totalDurationSec ?? lastFwSec + 4;

  const segments: VideoTranscriptSegment[] = [];
  let segmentIndex = 0;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const nextAnchorSec =
      paragraphIndex < paragraphs.length - 1
        ? paragraphs[paragraphIndex + 1].anchorSec
        : totalDurationSec;

    const windowDurationSec = Math.max(1, nextAnchorSec - paragraph.anchorSec);
    const useFwV3Backbone = windowDurationSec > targetReplyDurationSec * 3;
    const speakerPrefix = SPEAKER_PREFIX[paragraph.speaker];

    if (useFwV3Backbone) {
      const buckets = groupFwV3IntoBuckets(
        fwV3Lines,
        paragraph.anchorSec,
        nextAnchorSec,
        targetReplyDurationSec
      );

      if (buckets.length > 0) {
        const textChunks = distributeTextProportionally(paragraph.text, buckets.length);
        buckets.forEach((bucket, bucketIndex) => {
          const chunkText = textChunks[bucketIndex]?.trim() || '';
          if (!chunkText) return;

          const startMs = Math.round(bucket.startSec * 1000);
          const endMs = Math.round(Math.max(bucket.endSec, bucket.startSec + 1) * 1000);

          segments.push({
            index: segmentIndex,
            startMs,
            endMs,
            durationMs: Math.max(0, endMs - startMs),
            text: `${speakerPrefix}: ${chunkText}`,
          });
          segmentIndex += 1;
        });
        return;
      }
    }

    const targetChunks = Math.max(1, Math.round(windowDurationSec / targetReplyDurationSec));
    const chunks = splitTextIntoChunks(paragraph.text, targetChunks);
    const chunkDurationSec = windowDurationSec / chunks.length;

    chunks.forEach((chunkText, chunkIndex) => {
      const targetSec = paragraph.anchorSec + chunkIndex * chunkDurationSec;
      const windowEndSec = paragraph.anchorSec + (chunkIndex + 1) * chunkDurationSec;
      const anchoredStartSec =
        findAnchorFwV3Start(fwV3Lines, targetSec, windowEndSec) ?? targetSec;
      const endSec =
        chunkIndex === chunks.length - 1
          ? nextAnchorSec
          : paragraph.anchorSec + (chunkIndex + 1) * chunkDurationSec;

      const startMs = Math.round(anchoredStartSec * 1000);
      const endMs = Math.round(Math.max(endSec, anchoredStartSec + 1) * 1000);

      segments.push({
        index: segmentIndex,
        startMs,
        endMs,
        durationMs: Math.max(0, endMs - startMs),
        text: `${speakerPrefix}: ${chunkText.trim()}`,
      });
      segmentIndex += 1;
    });
  });

  return segments;
}

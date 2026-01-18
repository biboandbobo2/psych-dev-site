import { EmojiText } from '../../../../components/Emoji';
import type { VideoFormEntry } from '../types';
import { VideoPlaylistEditor } from './VideoPlaylistEditor';

interface ContentVideoSectionProps {
  videos: VideoFormEntry[];
  setVideos: (items: VideoFormEntry[]) => void;
  defaultTitle: string;
}

/**
 * Form section for video lecture
 */
export function ContentVideoSection({ videos, setVideos, defaultTitle }: ContentVideoSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold">
        <EmojiText text="🎥 Видео-лекция" />
      </h2>
      <VideoPlaylistEditor items={videos} onChange={setVideos} defaultTitle={defaultTitle} />
    </div>
  );
}

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FeedItemModal } from "../../pages/home/components/FeedItemModal";
import type { GroupFeedItem } from "../../types/groupFeed";

vi.mock("./index", () => ({
  MyZoomAttendance: ({ eventId }: { eventId: string }) => (
    <span>eventId: {eventId}</span>
  ),
}));
vi.mock("../../lib/MarkdownView", () => ({ MarkdownView: () => null }));
afterEach(cleanup);
it("передаёт callable исходный ID события без префикса ленты", () => {
  const item: GroupFeedItem = {
    id: "e:event-123",
    groupId: "group",
    groupName: "Группа",
    kind: "event",
    text: "Встреча",
    zoomLink: "https://example.com",
    createdAt: null,
  };
  render(<FeedItemModal item={item} onClose={() => {}} />);
  expect(screen.getByText("eventId: event-123")).toBeInTheDocument();
});

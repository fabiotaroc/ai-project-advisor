import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCitationMetadataFromParts,
  parseMessageCitationMetadata,
  renderCitationMarkersAsMarkdownLinks,
} from "@/lib/chat-citations";

const chunkId = "11111111-1111-1111-1111-111111111111";
const invalidChunkId = "22222222-2222-2222-2222-222222222222";

describe("chat citation metadata", () => {
  it("builds metadata only for markers backed by returned source chunks", () => {
    const metadata = buildCitationMetadataFromParts([
      {
        type: "tool-search_sources",
        output: [
          {
            chunk_id: chunkId,
            source_material_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            source_title: "Discovery notes",
            excerpt: "The cited source excerpt.",
            char_start: 10,
            char_end: 42,
          },
        ],
      },
      {
        type: "text",
        text: `Grounded sentence. 〖cite:${chunkId}〗 Ungrounded sentence. 〖cite:${invalidChunkId}〗`,
      },
    ]);

    assert.equal(metadata?.items.length, 1);
    assert.equal(metadata?.items[0].chunkId, chunkId);
  });

  it("renders valid markers as markdown citation links and removes invalid markers", () => {
    const metadata = parseMessageCitationMetadata({
      version: 1,
      items: [
        {
          key: chunkId,
          chunkId,
          sourceMaterialId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          sourceTitle: "Discovery notes",
          excerpt: "The cited source excerpt.",
          charStart: 10,
          charEnd: 42,
        },
      ],
    });

    const rendered = renderCitationMarkersAsMarkdownLinks(
      `Grounded. 〖cite:${chunkId}〗 Invalid. 〖cite:${invalidChunkId}〗`,
      metadata,
    );

    assert.equal(
      rendered,
      `Grounded. [1](advisor-citation:${chunkId}) Invalid. `,
    );
  });
});

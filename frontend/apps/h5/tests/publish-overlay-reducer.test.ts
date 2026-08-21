import assert from "node:assert/strict";
import test from "node:test";

import { initialPublishOverlayState, publishOverlayReducer } from "../src/overlays/publish/reducer";

const pendingDraft = {
  createdAt: "2026-08-21T00:00:00.000Z",
  publishState: "draft",
  title: "待继续的回收任务",
  type: "recycle"
} as LocalPublishInfoDraft;

test("prompt stores the matching publish type and pending draft", () => {
  assert.deepEqual(
    publishOverlayReducer(initialPublishOverlayState, {
      draft: pendingDraft,
      publishType: "recycle",
      type: "prompt"
    }),
    {
      initialDraft: null,
      initialType: "delegation",
      pendingDraft,
      pendingType: "recycle"
    }
  );
});

test("open uses the selected draft and clears the pending confirmation", () => {
  const promptedState = publishOverlayReducer(initialPublishOverlayState, {
    draft: pendingDraft,
    publishType: "recycle",
    type: "prompt"
  });

  assert.deepEqual(
    publishOverlayReducer(promptedState, {
      draft: pendingDraft,
      publishType: "recycle",
      type: "open"
    }),
    {
      initialDraft: pendingDraft,
      initialType: "recycle",
      pendingDraft: null,
      pendingType: "recycle"
    }
  );
});

test("closePending only clears the pending draft", () => {
  const promptedState = publishOverlayReducer(initialPublishOverlayState, {
    draft: pendingDraft,
    publishType: "recycle",
    type: "prompt"
  });

  assert.deepEqual(publishOverlayReducer(promptedState, { type: "closePending" }), {
    ...promptedState,
    pendingDraft: null
  });
});

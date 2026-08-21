import assert from "node:assert/strict";
import test from "node:test";

import { initialOverlayState, overlayReducer } from "../src/overlays/reducer";

test("open replaces the overlay in the same lane", () => {
  const firstCheckout = { lane: "secondary", targetId: "product-1", type: "checkout" } as const;
  const secondCheckout = { lane: "secondary", targetId: "product-2", type: "checkout" } as const;

  const openedState = overlayReducer(initialOverlayState, { entry: firstCheckout, type: "open" });
  const replacedState = overlayReducer(openedState, { entry: secondCheckout, type: "open" });

  assert.deepEqual(replacedState, {
    confirm: null,
    primary: null,
    secondary: secondCheckout
  });
});

test("close removes only the requested overlay type", () => {
  const checkout = { lane: "secondary", targetId: "product-1", type: "checkout" } as const;
  const openedState = overlayReducer(initialOverlayState, { entry: checkout, type: "open" });

  assert.deepEqual(overlayReducer(openedState, { overlayType: "checkout", type: "close" }), initialOverlayState);
});

test("closeAll clears every overlay lane", () => {
  const state = {
    ...initialOverlayState,
    secondary: { lane: "secondary", targetId: "product-1", type: "checkout" } as const
  };

  assert.deepEqual(overlayReducer(state, { type: "closeAll" }), initialOverlayState);
});

test("closeMany clears matching overlay types without affecting other lanes", () => {
  const checkout = { lane: "primary", targetId: "product-1", type: "checkout" } as const;
  const tutorApplications = {
    lane: "secondary",
    targetId: "demand-1",
    type: "tutorApplications"
  } as const;
  const state = {
    confirm: null,
    primary: checkout,
    secondary: tutorApplications
  };

  assert.deepEqual(
    overlayReducer(
      state as OverlayState,
      {
        overlayTypes: ["tutorApplications"],
        type: "closeMany"
      } as OverlayAction
    ),
    {
      confirm: null,
      primary: checkout,
      secondary: null
    }
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";

const h5SourceRoot = new URL("../src/", import.meta.url);

/** 读取 H5 源码文件，供卡片交互边界契约断言使用。 */
function readH5Source(relativePath) {
  return readFileSync(new URL(relativePath, h5SourceRoot), "utf8");
}

test("试课申请卡片 footer 非交互区域可选中且按钮不冒泡", () => {
  const tutorCardSource = readH5Source("pages/home/edu/components/TutorCard.tsx");
  const tutorApplicationsSource = readH5Source("overlays/tutor/components/TutorApplications.tsx");

  assert.match(tutorCardSource, /selectOnFooter\?: boolean/);
  assert.match(tutorCardSource, /closest\(FOOTER_INTERACTIVE_TARGET_SELECTOR\)/);
  assert.match(tutorCardSource, /if \(!selectOnFooter \|\| !onSelect \|\| isInteractiveTarget\)/);
  assert.match(tutorApplicationsSource, /selectOnFooter/);
});

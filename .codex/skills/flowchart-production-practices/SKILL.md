---
name: flowchart-production-practices
description: Methodology for creating and editing precise SVG process flowcharts and accompanying process documentation. Use when working on flowcharts, numbered process diagrams, decision trees, state transition visuals, SVG flow diagrams, or when users request visual layout rules such as axis alignment, branch routing, numbering, return lines, or diagram production standards.
---

# Flowchart Production Practices

## Core Rule

Treat the flowchart as both a semantic model and a visual artifact. Keep the business/process table, product documentation, and SVG diagram consistent; never update only the visible drawing when the flow meaning changed.

## Production Workflow

1. Read the current diagram source, nearby documentation, and any product requirement text that defines the process.
2. Identify node types before editing: process/status nodes use rectangles; decision nodes use diamonds; shared merge/junction lines are connectors, not process nodes.
3. Update semantics first: actor, state, action, decision, branch result, and terminal result.
4. Update numbering and labels consistently across SVG, Markdown tables, and product documentation.
5. Update coordinates and paths after semantics are stable.
6. Treat every node change as a diagram layout change: update node size, text wrapping, anchors, branch direction, return routing, obsolete connectors, and affected downstream spacing together.
7. Validate with XML parsing, text residual search, rendered screenshots of the edited region, and a rendered whole-diagram scan for global layout anomalies.

## Numbering

- Number from `1` in visual reading order, top to bottom.
- When inserting a main-chain node, shift downstream main-chain numbers unless the user explicitly asks to preserve an existing number.
- Put only the same number, or the same number with branch suffixes such as `9A` and `9B`, on the same row.
- Do not leave hidden gaps in numbering unless the gap is intentionally documented.
- Do not leave orphan branch suffixes. If merging or deleting a branch leaves only one node for a number, remove the `A/B` suffix and update the diagram, process tables, return labels, and explanatory text together.
- When adding a step before existing branches, update return labels and documentation references at the same time.
- When adding a node, first decide whether it is a main-chain step, branch step, decision, status, or terminal result. Main-chain insertions require downstream numbering shifts; branch insertions require branch suffix and row alignment; unnumbered terminal/result nodes are allowed only when they are visual outcomes of an existing numbered decision.

## Layout

- A newly inserted node gets its own full row and the same vertical spacing as neighboring rows; do not squeeze it between rows as a smaller node.
- The next step normally stays on the previous step's vertical axis.
- If a user asks for one node to directly point to another, first decide whether that target is the main-chain continuation. When it is, place the target on the source node's axis and draw the direct main line instead of keeping an intermediate result or lateral detour.
- Keep the main chain visually dominant and axial. Auxiliary branches, exception paths, modification loops, and retries should move to side axes and then rejoin the correct semantic target.
- Child nodes must sit on the parent axis, or symmetrically on both sides of the parent axis. If content grows, extend the parent branch length or canvas instead of compressing spacing.
- Keep each row visually stable: equal height rhythm, uniform text size, and no text collisions.
- After any node text, node type, branch, or return-line change, inspect the whole diagram layout, not only the edited node. Check for text overflow, node overlap, branch crossings, cramped labels, broken axis alignment, and off-canvas routing.
- Text changes may require shape changes. If a label grows, split it into readable lines, enlarge the rectangle or diamond, and move connector anchors to the new edge rather than letting text overflow or relying on the old geometry.
- Node type changes require geometry changes. When a rectangle becomes a decision diamond, re-place the diamond center, resize its points for the label, redraw all incoming/outgoing anchors, and add explicit branch targets.
- If a child node's own branches are cramped, first increase the parent branch length or parent-child distance, then route the child branches. Do not solve child branch crowding by squeezing the child node or letting labels/lines overlap.
- Expand the SVG canvas when needed; do not shorten branches or crowd nodes to avoid resizing.

## Node Change Method

- Start from meaning, not drawing: define the node's role, actor, state/action/decision wording, branch outcomes, and terminal conditions before editing coordinates.
- Merge equivalent terminal results. If multiple paths end in the same semantic outcome, keep one terminal/result node and route the paths into it instead of duplicating visually separate endings with the same meaning.
- When collapsing branches, remove the obsolete node, its incoming/outgoing connectors, its labels, and any suffix-based table rows in the same edit.
- Preserve visual rhythm: inserted or expanded nodes should keep the established row gap and axis, or deliberately expand the canvas/branch length to make room.
- Recompute anchors after every geometry change: old paths that pointed to the previous rectangle/diamond edge often become visually wrong even if the XML still parses.
- If a new decision outcome does not map cleanly to an existing process node, create an explicit result/status node instead of overloading a nearby old node.
- Delete obsolete paths and labels in the same edit that makes them obsolete. Search for stale return text, arrow paths, and branch labels after removing a flow.

## Branching

- Use diamonds only for real decisions. Label outgoing branches explicitly with `是` and `否`.
- Keep yes/no text close to the arrow-side vertical segment, about 20px from the line.
- Use red stroke and red arrow markers for `否` branches. When a `否` branch lands on a process rectangle, use reduced opacity on that target when the diagram style calls for it.
- Keep left/right branch lengths equal where a decision fans out, using consistent units such as 10px increments.
- Preserve the diagram's established branch convention. If a branch convention changes, update all affected branches together.
- Choose branch side by readability and routing capacity when the user has not mandated a fixed side. If keeping a conventional side creates crossings or a cramped return lane, move that outcome to the clearer side and update the `是/否` labels, negative color, and documentation together.
- When swapping branch sides, verify that semantic polarity did not swap accidentally: the label, line color, arrow marker, target node, and process table must all describe the same outcome.
- Lateral decision branches should originate from the diamond's left or right endpoint. Use the bottom endpoint for the continuing downward main flow; avoid routing from the bottom or an intermediate bend when the branch semantically belongs to the left or right side.

## Connectors

- A line entering a process/status rectangle should point directly to that node edge or center. Do not connect to an upstream line segment unless the target is a decision node or an explicit junction.
- When multiple paths share one downstream chain, use a plain connector without an arrow for the merge, then put the arrow on the common downstream line.
- Use side-entry for lateral return into a process node when that is the clearest direct target.
- When an auxiliary modification or retry loop rejoins a main-chain terminal node, keep the main-chain entry on the axis and use a side-entry for the auxiliary confirmation path.
- A retry loop should visibly express the loop semantics: failed confirmation returns to the modification/action node; successful confirmation rejoins the shared target, not a duplicated terminal result.
- Use top-center entry for ordinary downward flow into a node.
- Use solid lines for same-stage modification loops and dashed lines for cross-stage or long-distance returns.
- Route long returns outside existing layers so they do not cross unrelated branches.
- Route returns through free lanes, not through the nearest geometric path. A longer route is preferable when it avoids crossing existing branches, cutting through nodes, or stacking labels.
- After removing or replacing a return path, remove its old text label and arrow. A stale return label is a diagram bug even if no node text changed.

## SVG Editing

- Prefer direct SVG for layout-critical diagrams; Mermaid is only acceptable for rough diagrams where exact visual order is not important.
- Keep reusable styles centralized in `<style>` and use semantic classes such as `node`, `line`, `joint`, `return`, and `negative`.
- Use `joint` or equivalent no-arrow paths for shared connectors.
- Prefer grouped transforms only for large coherent moves. After using a transform, verify labels, arrows, and canvas bounds by rendering.
- Escape text content that needs XML escaping, such as `&amp;`.

## Validation

- Parse SVG as XML after every edit.
- Search for stale labels, stale numbers, obsolete return labels, and removed node names.
- Render the whole diagram and the edited region in a browser. XML validity alone is not enough; explicitly scan for global layout regressions caused by local node changes.
- Whole-diagram render checks should look for broken image loading, off-canvas content, unexpected empty regions, branch crossings, repeated labels, stale return paths, and row rhythm breaks.
- Local render checks should be at readable scale and verify text fits inside nodes, arrowheads hit the intended edge, `是/否` labels sit near the correct branch, and negative branches use the expected red styling.
- Run `git diff --check` for edited files.
- If the change affects process behavior, update product documentation or process tables in the same turn.

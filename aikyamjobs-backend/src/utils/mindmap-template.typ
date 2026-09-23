// JD mindmap renderer. Reads JSON injected by mindmapPdf.js as an in-memory
// shadow file (never a real path on disk) at the shape:
//   { tree: <mindmap data, see below>, meta: { jobTitle, jobUrl, brandColor } }
//
// `tree` tolerates two shapes people have actually produced for this field:
//   1. { title, root: { label, details?, children?: [...] } } -- an explicit
//      root object, node text in `label`.
//   2. { title, children: [...] } -- no separate root object at all; the
//      top-level object IS the root, and its own node text is in `title`.
// Every node (at any depth, in either shape) may use EITHER `label` or
// `title` for its own text -- node-label() below reads whichever is present.
// Any node may also carry `details` (a subtitle/description shown under its
// label) and/or `children` (nested nodes, unbounded depth). Sizing/spacing
// functions clamp to their last tuned value past the depths they explicitly
// cover, rather than crashing on deeper-than-expected data.
//
// The layout is custom rather than a library tree (e.g. cetz.tree) because
// library sibling-spacing assumes uniform single-line node heights and
// overlaps as soon as wrapped multi-line text varies in height between
// siblings. This measures each node's REAL rendered height (via `measure`)
// and stacks siblings with exact gaps, so nothing overlaps regardless of
// how long individual labels/details are. The page is sized to fit the
// rendered content exactly (`width: auto, height: auto`) instead of a fixed
// A4/Letter page, so a wide or tall mindmap is never cropped and fonts
// never need to shrink to fit -- this is the actual solve for "horizontal
// maps" getting cut off or illegible.

#let data = json("mindmap-data.json")
#let palette = (rgb("#AE4634"), rgb("#2E6F5E"), rgb("#3F5D8A"), rgb("#8A5A3F"), rgb("#5A4F8A"), rgb("#3F7A8A"), rgb("#7A3F6E"))

#let clamped(arr, depth) = arr.at(calc.min(depth, arr.len() - 1))
#let font-size(depth) = clamped((15pt, 11.5pt, 9.5pt), depth)
#let detail-font-size(depth) = calc.max(7.5pt, font-size(depth) - 2pt)
#let node-width(depth) = clamped((auto, 4.4cm, 5cm), depth)
#let column-gap(depth) = clamped((3.4cm, 2.6cm), depth)
#let sibling-gap = 10pt
#let page-inset-x = 20pt

// Node text may arrive as either `label` or `title` -- accept both rather
// than silently rendering blank/erroring on whichever one a given JSON
// generation happened not to use.
#let node-label(node) = node.at("label", default: node.at("title", default: ""))

#let make-box(node, depth, color) = {
  let is-root = depth == 0
  let fill = if is-root { color } else { color.lighten(if depth == 1 { 68% } else { 88% }) }
  let text-color = if is-root { white } else { rgb("#1F2937") }
  let detail-color = if is-root { rgb("#D1D5DB") } else { rgb("#6B7280") }
  let has-details = "details" in node and node.details != none and node.details.trim() != ""

  box(
    fill: fill,
    stroke: 1pt + color,
    radius: 5pt,
    inset: (x: 10pt, y: 7pt),
    width: node-width(depth),
  )[
    #set text(size: font-size(depth), fill: text-color, weight: "bold")
    #node-label(node)
    #if has-details [
      #v(2pt)
      #text(size: detail-font-size(depth), weight: "regular", fill: detail-color)[#node.details]
    ]
  ]
}

// Bottom-up: measure real rendered height, stack children with exact gaps.
#let compute-layout(node, depth, color) = {
  let box-content = make-box(node, depth, color)
  let sz = measure(box-content)
  let children = node.at("children", default: ())

  if children.len() == 0 {
    return (height: sz.height, own-y: 0pt, box: box-content, box-height: sz.height, box-width: sz.width, children: ())
  }

  let child-layouts = children.map(c => compute-layout(c, depth + 1, color))
  let children-total = child-layouts.map(c => c.height).sum() + sibling-gap * (child-layouts.len() - 1)
  let subtree-height = calc.max(sz.height, children-total)

  let y = (subtree-height - children-total) / 2
  let positioned-children = ()
  for cl in child-layouts {
    positioned-children.push((layout: cl, y: y))
    y += cl.height + sibling-gap
  }

  (
    height: subtree-height,
    own-y: (subtree-height - sz.height) / 2,
    box: box-content,
    box-height: sz.height,
    box-width: sz.width,
    children: positioned-children,
  )
}

// Top-down: assign absolute coordinates, draw edges parent-right -> child-left.
#let render(layout, x, subtree-top, depth) = {
  let node-y = subtree-top + layout.own-y
  place(top + left, dx: x, dy: node-y, layout.box)

  if layout.children.len() == 0 { return }
  let child-x = x + layout.box-width + column-gap(depth)
  for pc in layout.children {
    let child-top = subtree-top + pc.y
    let child-node-y = child-top + pc.layout.own-y
    place(line(
      start: (x + layout.box-width, node-y + layout.box-height / 2),
      end: (child-x, child-node-y + pc.layout.box-height / 2),
      stroke: 1pt + rgb("#9CA3AF"),
    ))
    render(pc.layout, child-x, child-top, depth + 1)
  }
}

#set page(width: auto, height: auto, margin: 0pt, fill: white)
#set text(size: 10pt)

#context {
  let tree = data.tree
  let meta = data.at("meta", default: (:))
  let brand = rgb(meta.at("brandColor", default: "#AE4634"))
  let job-title = meta.at("jobTitle", default: tree.at("title", default: ""))
  let job-url = meta.at("jobUrl", default: none)

  // Shape 1 has an explicit `root` object; shape 2 has no `root` key at all,
  // so the top-level tree object IS the root (its own text lives in `title`
  // since there's nowhere else for it to be).
  let root = tree.at("root", default: tree)
  let branches = root.at("children", default: ())

  let branch-layouts = branches.enumerate().map(((i, b)) => compute-layout(b, 1, palette.at(calc.rem(i, palette.len()))))
  let children-total = branch-layouts.map(l => l.height).sum() + sibling-gap * (calc.max(branch-layouts.len(), 1) - 1)

  let root-box = make-box(root, 0, rgb("#1F2937"))
  let root-sz = measure(root-box)
  let subtree-height = calc.max(root-sz.height, children-total)

  let y = (subtree-height - children-total) / 2
  let positioned-branches = ()
  for bl in branch-layouts {
    positioned-branches.push((layout: bl, y: y))
    y += bl.height + sibling-gap
  }

  let root-layout = (
    height: subtree-height,
    own-y: (subtree-height - root-sz.height) / 2,
    box: root-box,
    box-height: root-sz.height,
    box-width: root-sz.width,
    children: positioned-branches,
  )

  // Canvas width: root to the deepest column actually used.
  let max-depth = calc.max(1, ..branches.map(b => {
    let d(n, dep) = if n.at("children", default: ()).len() == 0 { dep } else { calc.max(dep, ..n.children.map(c => d(c, dep + 1))) }
    d(b, 1)
  }))
  let canvas-width = range(0, max-depth + 1).map(d => {
    let w = if d == 0 { root-sz.width } else { node-width(d).to-absolute() }
    w + (if d < max-depth { column-gap(d) } else { 0pt })
  }).sum()

  // The whole document (header band, title block, canvas, footer) shares
  // this one width, floored so a tiny mindmap still gets a readable header.
  let page-width = calc.max(canvas-width + 2 * page-inset-x, 380pt)

  // Branded header band -- logo + wordmark, full bleed to the page edge.
  // block() (not box()) for every top-level section: box is an inline-flow
  // container in Typst, so consecutive boxes can end up side-by-side rather
  // than stacked -- block always occupies its own line.
  block(width: page-width, fill: brand, inset: (x: page-inset-x, y: 14pt))[
    #set text(fill: white)
    #grid(
      columns: (auto, 1fr),
      align: horizon,
      column-gutter: 8pt,
      image("aikyamjobs-logo-white.svg", height: 20pt),
      text(size: 13pt, weight: "bold")[aikyamjobs],
    )
  ]

  // Job title + direct link back to the live listing.
  block(width: page-width, inset: (x: page-inset-x, top: 16pt, bottom: 10pt))[
    #text(size: 18pt, weight: "bold", fill: rgb("#1F2937"))[#job-title]
    #if job-url != none [
      #v(4pt)
      #link(job-url)[
        #text(size: 10pt, fill: brand, weight: "medium")[View this role & apply → #job-url]
      ]
    ]
  ]

  line(start: (page-inset-x, 0pt), end: (page-width - page-inset-x, 0pt), stroke: 0.6pt + rgb("#E5E7EB"))

  block(width: page-width, inset: (x: page-inset-x, y: 20pt))[
    #box(width: canvas-width, height: subtree-height)[
      #render(root-layout, 0pt, 0pt, 0)
    ]
  ]

  line(start: (page-inset-x, 0pt), end: (page-width - page-inset-x, 0pt), stroke: 0.6pt + rgb("#E5E7EB"))

  block(width: page-width, inset: (x: page-inset-x, y: 14pt))[
    #align(center)[
      #text(size: 9.5pt, style: "italic", fill: rgb("#6B7280"))[
        Hope this visual breakdown makes it easy to size up the role at a glance — if it feels like a fit, the link above takes you straight to the full listing.
      ]
      #v(6pt)
      #text(size: 8.5pt, fill: rgb("#9CA3AF"))[aikyamjobs.org — curated social impact careers]
    ]
  ]
}

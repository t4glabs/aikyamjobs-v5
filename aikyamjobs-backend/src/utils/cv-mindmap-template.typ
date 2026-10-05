// CV mindmap PDF renderer for an applicant's profile. Structurally much
// simpler than mindmap-template.typ (job/company): just one section -- a
// branded header, the candidate's name + one-line summary (the "basic
// details"), then the mindmap tree itself, then a closing line. No prose
// page, no second entity, no live-site link (applicants don't have a
// public profile page to link back to).
//
// The tree-layout engine (content-adaptive node width, per-branch
// pagination) below is a deliberate copy of the one in mindmap-template.typ,
// not a shared import -- kept self-contained so a future change to the JD/
// company PDF can't accidentally regress this one, or vice versa, at the
// cost of some duplication between the two files. If both ever need the
// same layout change, update both.
//
// Reads JSON injected by cvMindmapPdf.js as an in-memory shadow file:
//   { meta: { brandColor }, cvMindmap: <tree> }
//
// `tree` tolerates the same two shapes as the JD/company mindmaps:
//   1. { title, root: { label, details?, children?: [...] } }
//   2. { title, children: [...] } -- top-level object IS the root, node
//      text in `title` instead of `label`.

#let data = json("cv-mindmap-data.json")
#let meta = data.at("meta", default: (:))
#let brand = rgb(meta.at("brandColor", default: "#AE4634"))
#let dark-text = rgb("#1F2937")
#let gray-text = rgb("#6B7280")
#let light-gray = rgb("#9CA3AF")
#let hairline = rgb("#E5E7EB")

#let palette = (rgb("#AE4634"), rgb("#2E6F5E"), rgb("#3F5D8A"), rgb("#8A5A3F"), rgb("#5A4F8A"), rgb("#3F7A8A"), rgb("#7A3F6E"))

// ---------- One fixed page size, matching the JD/company PDF ----------

#let page-w = 29.7cm
#let page-h = 21cm
#let margin-x = 1.5cm
#let margin-top = 1.7cm
#let margin-bottom = 1.3cm
#let content-w = page-w - 2 * margin-x
#let content-h = page-h - margin-top - margin-bottom

#set page(
  width: page-w, height: page-h,
  margin: (x: margin-x, top: margin-top, bottom: margin-bottom),
  fill: white,
  header: context [
    #set text(size: 8pt, fill: gray-text)
    #grid(
      columns: (auto, 1fr, auto),
      align: horizon,
      column-gutter: 8pt,
      image("aikyamjobs-logo-dark.svg", height: 11pt),
      [],
      [Candidate Mindmap],
    )
    #v(5pt)
    #line(length: 100%, stroke: 0.6pt + hairline)
  ],
  footer: context [
    #line(length: 100%, stroke: 0.6pt + hairline)
    #v(4pt)
    #align(center)[#text(size: 7.5pt, fill: light-gray)[aikyamjobs.org — Page #counter(page).display() of #context counter(page).final().first()]]
  ],
)
#set text(size: 10pt)

// ---------- Mindmap layout (content-adaptive node width) ----------
// See mindmap-template.typ for the long-form comment on why width is
// measured per-node rather than a fixed constant per depth.

#let clamped(arr, depth) = arr.at(calc.min(depth, arr.len() - 1))
#let font-size(depth) = clamped((15pt, 11.5pt, 9.5pt), depth)
#let detail-font-size(depth) = calc.max(7.5pt, font-size(depth) - 2pt)
#let min-width(depth) = clamped((4.2cm, 3.2cm, 3.4cm), depth)
#let max-width(depth) = clamped((7.2cm, 6cm, 8.5cm), depth)
#let target-lines(depth, has-details) = if has-details { clamped((2, 2, 3), depth) } else { 1 }
#let column-gap(depth) = clamped((3.4cm, 2.6cm), depth)
#let sibling-gap = 10pt
#let box-inset-x = 10pt

#let node-label(node) = node.at("label", default: node.at("title", default: ""))
#let node-details(node) = {
  let d = node.at("details", default: none)
  if d != none and type(d) == str and d.trim() != "" { d } else { none }
}

#let ideal-width(node, depth) = {
  let label = node-label(node)
  let details = node-details(node)
  let has-details = details != none
  let fsize = font-size(depth)
  let sample = if has-details { details } else { label }
  let lines = target-lines(depth, has-details)
  let natural = measure(text(size: fsize)[#sample]).width
  let raw = natural / lines + 2 * box-inset-x
  let label-natural = measure(text(size: fsize, weight: "bold")[#label]).width + 2 * box-inset-x
  let w = calc.max(raw, calc.min(label-natural, max-width(depth)))
  calc.max(min-width(depth), calc.min(max-width(depth), w))
}

#let make-box(node, depth, color, width) = {
  let is-root = depth == 0
  let fill = if is-root { color } else { color.lighten(if depth == 1 { 68% } else { 88% }) }
  let text-color = if is-root { white } else { dark-text }
  let detail-color = if is-root { rgb("#D1D5DB") } else { gray-text }
  let details = node-details(node)

  box(
    fill: fill,
    stroke: 1pt + color,
    radius: 5pt,
    inset: (x: box-inset-x, y: 7pt),
    width: width,
  )[
    #set text(size: font-size(depth), fill: text-color, weight: "bold")
    #node-label(node)
    #if details != none [
      #v(2pt)
      #text(size: detail-font-size(depth), weight: "regular", fill: detail-color)[#details]
    ]
  ]
}

#let compute-layout(node, depth, color) = {
  let w = ideal-width(node, depth)
  let box-content = make-box(node, depth, color, w)
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

#let subtree-max-right(layout, x, depth) = {
  let own-right = x + layout.box-width
  if layout.children.len() == 0 { return own-right }
  let child-x = x + layout.box-width + column-gap(depth)
  calc.max(own-right, ..layout.children.map(pc => subtree-max-right(pc.layout, child-x, depth + 1)))
}

#let assemble-page-layout(root-box, root-sz, branch-group) = {
  let children-total = branch-group.map(l => l.height).sum() + sibling-gap * (calc.max(branch-group.len(), 1) - 1)
  let subtree-height = calc.max(root-sz.height, children-total)
  let y = (subtree-height - children-total) / 2
  let positioned = ()
  for bl in branch-group {
    positioned.push((layout: bl, y: y))
    y += bl.height + sibling-gap
  }
  (
    height: subtree-height,
    own-y: (subtree-height - root-sz.height) / 2,
    box: root-box,
    box-height: root-sz.height,
    box-width: root-sz.width,
    children: positioned,
  )
}

#let pack-branches(branch-layouts, first-budget, rest-budget) = {
  if branch-layouts.len() == 0 { return (() ,) }
  let pages = ()
  let current = ()
  let current-height = 0pt
  let budget = first-budget
  for bl in branch-layouts {
    let needed = if current.len() == 0 { bl.height } else { current-height + sibling-gap + bl.height }
    if needed > budget and current.len() > 0 {
      pages.push(current)
      current = (bl,)
      current-height = bl.height
      budget = rest-budget
    } else {
      current.push(bl)
      current-height = needed
    }
  }
  if current.len() > 0 { pages.push(current) }
  pages
}

#let render-mindmap-page(root-box, root-sz, branch-group, available-w, available-h) = {
  let layout = assemble-page-layout(root-box, root-sz, branch-group)
  let canvas-w = if branch-group.len() == 0 {
    root-sz.width
  } else {
    calc.max(root-sz.width, ..branch-group.map(bl => subtree-max-right(bl, root-sz.width + column-gap(0), 1)))
  }
  let canvas-h = layout.height
  let scale-factor = calc.min(1, available-w / canvas-w, available-h / canvas-h)
  let content = box(width: canvas-w, height: canvas-h)[#render(layout, 0pt, 0pt, 0)]
  if scale-factor < 0.999 {
    scale(x: scale-factor * 100%, y: scale-factor * 100%, origin: top + left, reflow: true)[#content]
  } else {
    content
  }
}

#let render-mindmap-section(tree, lead-in) = {
  let root = tree.at("root", default: tree)
  let branches = root.at("children", default: ())

  let branch-layouts = branches.enumerate().map(((i, b)) => compute-layout(b, 1, palette.at(calc.rem(i, palette.len()))))
  let root-box = make-box(root, 0, dark-text, ideal-width(root, 0))
  let root-sz = measure(root-box)

  let lead-in-h = measure(box(width: content-w)[#lead-in]).height
  let lead-in-gap = 16pt
  // Safety buffer beyond the raw lead-in/root measurement: measure() of
  // isolated content can differ slightly from how it renders in real page
  // flow (block spacing, leading), and with zero slack that's enough to
  // make Typst silently overflow the whole (unsplittable, place()-based)
  // canvas box onto the next page -- confirmed by hand: an 8pt margin on a
  // 445pt budget was enough to trigger exactly that.
  let page-safety-buffer = 24pt
  let first-budget = calc.max(content-h - lead-in-h - lead-in-gap - page-safety-buffer, root-sz.height)
  let rest-budget = content-h - page-safety-buffer

  let pages = pack-branches(branch-layouts, first-budget, rest-budget)

  for (i, group) in pages.enumerate() {
    if i > 0 { pagebreak() }
    if i == 0 { lead-in; v(lead-in-gap) }
    render-mindmap-page(root-box, root-sz, group, content-w, if i == 0 { first-budget } else { rest-budget })
  }
}

// ---------- Lead-in: candidate name + one-line summary ("basic details") ----------
// No "view on aikyamjobs.org" link here -- unlike a job or company, an
// applicant has no public profile page to link back to.

#let meta-row(items) = {
  let parts = items.filter(i => i != none)
  parts.enumerate().map(((i, p)) => {
    if i == 0 { p } else { [ #text(fill: light-gray)[·] ] + [ #p ] }
  }).join()
}

#context {
  let tree = data.cvMindmap
  let root = tree.at("root", default: tree)
  let name = node-label(root)
  let summary = node-details(root)

  let lead-in = [
    #text(size: 20pt, weight: "bold", fill: dark-text)[#name]
    #if summary != none [
      #v(6pt)
      #text(size: 9.5pt, fill: gray-text)[#summary]
    ]
  ]

  render-mindmap-section(tree, lead-in)

  v(1fr)
  align(center)[
    #text(size: 9pt, style: "italic", fill: gray-text)[
      A visual summary of this CV, generated for quick review — the original CV on file has the full detail.
    ]
  ]
}

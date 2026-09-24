// Full "JD website as a PDF" renderer, v3. Every page in the document --
// mindmap pages and prose pages alike -- shares one fixed page size and one
// running header/footer, so the whole thing reads as a single consistent
// document instead of different-sized PDFs stapled together. Mindmaps that
// don't fit on one page paginate by top-level branch (root repeats on each
// continuation page) rather than shrinking fonts to illegible sizes or
// growing the page to a custom size that breaks consistency with the rest
// of the document.
//
// Reads JSON injected by mindmapPdf.js as an in-memory shadow file:
//   {
//     meta: { brandColor },
//     job: { title, url, location, jobType, experienceLevel, salary,
//            closingDate, impactArea, skills: [...], categories: [...],
//            descriptionBlocks: [...], apply: { label, href } | none },
//     jobMindmap: <tree> | none,
//     company: { name, url, location, size, industry, website,
//                descriptionBlocks: [...] } | none,
//     companyMindmap: <tree> | none,
//   }
//
// Page order: JD mindmap -> JD -> company mindmap -> company -> closing
// line. Company sections included only when present.
//
// `tree` (both mindmaps) tolerates two shapes seen in real editorial data:
//   1. { title, root: { label, details?, children?: [...] } }
//   2. { title, children: [...] } -- top-level object IS the root, node
//      text in `title` instead of `label`.

#let data = json("mindmap-data.json")
#let meta = data.at("meta", default: (:))
#let brand = rgb(meta.at("brandColor", default: "#AE4634"))
#let dark-text = rgb("#1F2937")
#let gray-text = rgb("#6B7280")
#let light-gray = rgb("#9CA3AF")
#let hairline = rgb("#E5E7EB")
#let soft-bg = rgb("#F9FAFB")

#let palette = (rgb("#AE4634"), rgb("#2E6F5E"), rgb("#3F5D8A"), rgb("#8A5A3F"), rgb("#5A4F8A"), rgb("#3F7A8A"), rgb("#7A3F6E"))

// ---------- One fixed page size for the entire document ----------

#let page-w = 29.7cm
#let page-h = 21cm
#let margin-x = 1.5cm
#let margin-top = 1.7cm
#let margin-bottom = 1.3cm
#let content-w = page-w - 2 * margin-x
#let content-h = page-h - margin-top - margin-bottom

// Seeded to the first section's label directly rather than "" -- state
// updates only affect the header on pages that *start* after the update
// call, so page 1's header would otherwise show blank (the update placed
// in page 1's own body is too late to affect page 1's own header).
#let section-state = state("section-label", "JD Mindmap")

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
      section-state.get(),
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
//
// Node width is not a fixed constant per depth. Each node's real text (its
// `details` paragraph if it has one, else its `label`) is measured at its
// natural, unwrapped width, then divided by a target line count to get a
// width that wraps that specific node's content into a clean, readable
// number of lines -- clamped within a min/max band that widens with depth,
// since deeper nodes tend to carry the longest prose.

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

// Bottom-up: measure real rendered height (at this node's own ideal
// width), stack children with exact gaps.
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

// Real rightmost extent actually used by a subtree once placed at `x`.
#let subtree-max-right(layout, x, depth) = {
  let own-right = x + layout.box-width
  if layout.children.len() == 0 { return own-right }
  let child-x = x + layout.box-width + column-gap(depth)
  calc.max(own-right, ..layout.children.map(pc => subtree-max-right(pc.layout, child-x, depth + 1)))
}

// Positions a specific subset of top-level branches against the (shared)
// root box -- used once per mindmap page, since which branches land on
// which page changes per page but the root itself is identical everywhere.
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

// Greedily packs top-level branches into pages so each page's stacked
// height fits its budget (page 1 has less room than continuation pages,
// since the JD/company title block sits above the canvas only there).
// A single branch taller than a full budget still gets its own page alone
// (rare, and render-mindmap-page below applies a uniform shrink-to-fit as
// a last resort rather than letting it overflow).
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

// Renders one mindmap page's worth of branches against the shared root,
// shrinking uniformly (preserving aspect ratio, so text never distorts)
// only if this specific page's content doesn't fit the fixed content area
// -- a safety net, not the normal path, since pack-branches already sizes
// groups to fit.
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

// A full mindmap section: lead-in block (title/link) on the first page,
// then the tree paginated across as many same-size pages as it needs.
// Caller is responsible for the section-state label and the pagebreak
// into this section; this only breaks pages *between* its own mindmap
// pages, not before its first one.
#let render-mindmap-section(tree, lead-in) = {
  let root = tree.at("root", default: tree)
  let branches = root.at("children", default: ())

  let branch-layouts = branches.enumerate().map(((i, b)) => compute-layout(b, 1, palette.at(calc.rem(i, palette.len()))))
  let root-box = make-box(root, 0, dark-text, ideal-width(root, 0))
  let root-sz = measure(root-box)

  let lead-in-h = measure(box(width: content-w)[#lead-in]).height
  let lead-in-gap = 16pt
  let first-budget = calc.max(content-h - lead-in-h - lead-in-gap, root-sz.height)
  let rest-budget = content-h

  let pages = pack-branches(branch-layouts, first-budget, rest-budget)

  for (i, group) in pages.enumerate() {
    if i > 0 { pagebreak() }
    if i == 0 { lead-in; v(lead-in-gap) }
    render-mindmap-page(root-box, root-sz, group, content-w, if i == 0 { first-budget } else { rest-budget })
  }
}

// ---------- Prose (JD/company) sections ----------

#let render-blocks(blocks) = {
  for b in blocks {
    if b.type == "heading" {
      v(10pt)
      text(size: clamped((13pt, 12.5pt, 12pt, 11.5pt), b.at("level", default: 2) - 1), weight: "bold", fill: dark-text)[#b.text]
      v(4pt)
    } else if b.type == "paragraph" {
      par(text(size: 10pt, fill: dark-text.lighten(10%))[#b.text])
      v(8pt)
    } else if b.type == "list" {
      list(..b.items.map(i => text(size: 10pt, fill: dark-text.lighten(10%))[#i]))
      v(8pt)
    } else if b.type == "quote" {
      block(inset: (left: 10pt), stroke: (left: 2pt + brand))[
        #text(size: 10pt, style: "italic", fill: gray-text)[#b.text]
      ]
      v(8pt)
    }
  }
}

#let meta-row(items) = {
  let parts = items.filter(i => i != none)
  parts.enumerate().map(((i, p)) => {
    if i == 0 { p } else { [ #text(fill: light-gray)[·] ] + [ #p ] }
  }).join()
}

#let cta-button(label, href) = link(href)[
  #box(fill: brand, radius: 4pt, inset: (x: 18pt, y: 10pt))[
    #text(fill: white, size: 10.5pt, weight: "bold")[#label →]
  ]
]

// Two-column layout so text content sits at a readable measure rather than
// stretching the full landscape width -- keeps the prose pages visually
// consistent with the mindmap pages, which also don't use the full width
// for every node.
#let prose-col-w = content-w * 0.62

#let job-lead-in(job) = [
  #text(size: 20pt, weight: "bold", fill: dark-text)[#job.title]
  #v(6pt)
  #text(size: 9.5pt, fill: gray-text)[
    #meta-row((
      job.at("location", default: none),
      if job.at("jobType", default: none) != none { job.jobType } else { none },
      if job.at("experienceLevel", default: none) != none { job.experienceLevel + " level" } else { none },
      job.at("salary", default: none),
      if job.at("closingDate", default: none) != none { "Closes " + job.closingDate } else { none },
    ))
  ]
  #if job.at("url", default: none) != none [
    #v(4pt)
    #link(job.url)[#text(size: 9pt, fill: brand, weight: "medium")[View this on aikyamjobs.org → #job.url]]
  ]
]

#let job-content-page(job) = block(width: prose-col-w)[
  #text(size: 15pt, weight: "bold", fill: dark-text)[Job Description]
  #v(10pt)

  #if job.at("apply", default: none) != none [
    #cta-button(job.apply.label, job.apply.href)
    #v(6pt)
    #text(size: 8.5pt, fill: gray-text)[Want to save this for later instead? #link(job.url)[Open the live listing →]]
    #v(16pt)
  ]

  #render-blocks(job.at("descriptionBlocks", default: ()))

  #if job.at("skills", default: ()).len() > 0 [
    #v(6pt)
    #text(size: 11.5pt, weight: "bold", fill: dark-text)[Required Skills]
    #v(6pt)
    #block[
      #for s in job.skills [
        #box(fill: soft-bg, stroke: 0.6pt + hairline, radius: 3pt, inset: (x: 7pt, y: 4pt))[#text(size: 9pt, fill: dark-text)[#s]] #h(4pt)
      ]
    ]
    #v(10pt)
  ]

  #if job.at("categories", default: ()).len() > 0 [
    #text(size: 11.5pt, weight: "bold", fill: dark-text)[Tags]
    #v(6pt)
    #block[
      #for c in job.categories [
        #box(fill: soft-bg, stroke: 0.6pt + hairline, radius: 3pt, inset: (x: 7pt, y: 4pt))[#text(size: 9pt, fill: dark-text)[#c]] #h(4pt)
      ]
    ]
  ]
]

#let company-lead-in(company) = [
  #text(size: 20pt, weight: "bold", fill: dark-text)[#company.name]
  #v(6pt)
  #text(size: 9.5pt, fill: gray-text)[
    #meta-row((
      company.at("location", default: none),
      company.at("size", default: none),
      company.at("industry", default: none),
    ))
  ]
  #if company.at("url", default: none) != none [
    #v(4pt)
    #link(company.url)[#text(size: 9pt, fill: brand, weight: "medium")[View this on aikyamjobs.org → #company.url]]
  ]
]

#let company-content-page(company) = block(width: prose-col-w)[
  #text(size: 15pt, weight: "bold", fill: dark-text)[About the Company]
  #v(10pt)

  #if company.at("website", default: none) != none [
    #cta-button("Visit website", company.website)
    #v(16pt)
  ]

  #render-blocks(company.at("descriptionBlocks", default: ()))

  #v(10pt)
  #text(size: 8.5pt, fill: gray-text)[See the full listing and open roles: #link(company.url)[#company.url]]
]

// ---------- Assembly: JD mindmap -> JD -> company mindmap -> company ----------

#context {
  let has-job-mindmap = data.at("jobMindmap", default: none) != none
  let has-company-mindmap = data.at("companyMindmap", default: none) != none
  let has-company = data.at("company", default: none) != none

  if has-job-mindmap {
    section-state.update("JD Mindmap")
    render-mindmap-section(data.jobMindmap, job-lead-in(data.job))
  }

  section-state.update("Job Description")
  if has-job-mindmap { pagebreak() }
  job-content-page(data.job)

  if has-company-mindmap {
    section-state.update("Company Mindmap")
    pagebreak()
    render-mindmap-section(data.companyMindmap, company-lead-in(data.company))
  }

  if has-company {
    section-state.update("Company Profile")
    pagebreak()
    company-content-page(data.company)
  }

  v(1fr)
  align(center)[
    #text(size: 9pt, style: "italic", fill: gray-text)[
      Hope this gives you a clear, complete picture of the role — if it feels like a fit, the link above takes you straight to the full listing.
    ]
  ]
}

// Full "JD website as a PDF" renderer. Reads JSON injected by mindmapPdf.js
// as an in-memory shadow file at the shape:
//   {
//     meta: { brandColor },
//     job: { title, url, location, jobType, experienceLevel, salary,
//            closingDate, impactArea, skills: [...],
//            categories: [...], descriptionBlocks: [...],
//            apply: { label, href } | none },
//     jobMindmap: <tree> | none,
//     company: { name, url, location, size, industry, website,
//                descriptionBlocks: [...] } | none,
//     companyMindmap: <tree> | none,
//   }
//
// Page structure (exact order requested): JD mindmap -> JD -> company
// mindmap -> company -> footer. Mindmap sections get their own "poster"
// page sized exactly to their content (auto width/height) so a wide/tall
// tree is never cropped or shrunk illegible; JD/company text sections use
// normal paginated A4 flow, since prose reads better that way than crammed
// onto one giant sheet. Company sections are entirely optional -- included
// only when present, so this stays a complete, honest document either way.
//
// `tree` (both mindmaps) tolerates two shapes seen in real editorial data:
//   1. { title, root: { label, details?, children?: [...] } }
//   2. { title, children: [...] } -- top-level object IS the root, node
//      text in `title` instead of `label`.
// node-label()/node-details() below read whichever keys are present.

#let data = json("mindmap-data.json")
#let meta = data.at("meta", default: (:))
#let brand = rgb(meta.at("brandColor", default: "#AE4634"))
#let dark-text = rgb("#1F2937")
#let gray-text = rgb("#6B7280")
#let light-gray = rgb("#9CA3AF")
#let hairline = rgb("#E5E7EB")
#let soft-bg = rgb("#F9FAFB")

#let palette = (rgb("#AE4634"), rgb("#2E6F5E"), rgb("#3F5D8A"), rgb("#8A5A3F"), rgb("#5A4F8A"), rgb("#3F7A8A"), rgb("#7A3F6E"))

#let page-inset-x = 20pt
#let a4-margin = 2.1cm

// ---------- Mindmap layout (content-adaptive node width) ----------
//
// Node width is no longer a fixed constant per depth. Each node's real
// text (its `details` paragraph if it has one, else its `label`) is
// measured at its natural, unwrapped width, then divided by a target line
// count to get a width that wraps that specific node's content into a
// clean, readable number of lines -- clamped within a min/max band that
// widens with depth, since deeper nodes tend to carry the longest prose
// (the root and branch headers are usually just short phrases and don't
// need much room; leaf/detail nodes carry full sentences and read far
// better with more width and fewer wrapped lines).

#let clamped(arr, depth) = arr.at(calc.min(depth, arr.len() - 1))
#let font-size(depth) = clamped((15pt, 11.5pt, 9.5pt), depth)
#let detail-font-size(depth) = calc.max(7.5pt, font-size(depth) - 2pt)
#let min-width(depth) = clamped((4.2cm, 3.2cm, 3.4cm), depth)
#let max-width(depth) = clamped((7.2cm, 6cm, 8.5cm), depth)
#let target-lines(depth, has-details) = if has-details { clamped((2, 2, 3), depth) } else { 1 }
#let column-gap(depth) = clamped((3.4cm, 2.6cm), depth)
#let sibling-gap = 10pt

#let node-label(node) = node.at("label", default: node.at("title", default: ""))
#let node-details(node) = {
  let d = node.at("details", default: none)
  if d != none and type(d) == str and d.trim() != "" { d } else { none }
}

// box() width below is the OUTER width -- inset eats into it -- so every
// measured content width needs the horizontal inset added back before it's
// usable as a box width. Missing this made single-word labels (no space to
// wrap on) overflow their box: the box was sized to the bare text width
// with no room left for its own padding.
#let box-inset-x = 10pt

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
    inset: (x: 10pt, y: 7pt),
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

// Real rightmost extent actually used by a subtree once placed at `x` --
// walks the same coordinates render() will use, so the canvas is sized
// exactly (not approximated from a per-depth constant, which stopped being
// accurate once width became per-node).
#let subtree-max-right(layout, x, depth) = {
  let own-right = x + layout.box-width
  if layout.children.len() == 0 { return own-right }
  let child-x = x + layout.box-width + column-gap(depth)
  calc.max(own-right, ..layout.children.map(pc => subtree-max-right(pc.layout, child-x, depth + 1)))
}

// Builds one full mindmap canvas from a tree (either JSON shape). Returns
// (width, height, content) so the caller can size a poster page around it.
#let build-mindmap(tree) = {
  let root = tree.at("root", default: tree)
  let branches = root.at("children", default: ())

  let branch-layouts = branches.enumerate().map(((i, b)) => compute-layout(b, 1, palette.at(calc.rem(i, palette.len()))))
  let children-total = branch-layouts.map(l => l.height).sum() + sibling-gap * (calc.max(branch-layouts.len(), 1) - 1)

  let root-box = make-box(root, 0, dark-text, ideal-width(root, 0))
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

  let branch-child-x = root-sz.width + column-gap(0)
  let canvas-width = calc.max(root-sz.width, ..branch-layouts.map(bl => subtree-max-right(bl, branch-child-x, 1)))

  (
    width: canvas-width,
    height: subtree-height,
    content: box(width: canvas-width, height: subtree-height)[#render(root-layout, 0pt, 0pt, 0)],
  )
}

// ---------- Shared chrome ----------

#let brand-header(page-width) = block(width: page-width, fill: brand, inset: (x: page-inset-x, y: 14pt))[
  #set text(fill: white)
  #grid(
    columns: (auto, 1fr),
    align: horizon,
    column-gutter: 8pt,
    image("aikyamjobs-logo-white.svg", height: 20pt),
    text(size: 13pt, weight: "bold")[aikyamjobs],
  )
]

#let hr(page-width) = line(start: (page-inset-x, 0pt), end: (page-width - page-inset-x, 0pt), stroke: 0.6pt + hairline)

// A "poster" page: branded band, title + live link, the mindmap itself,
// then a closing line -- sized exactly to its content (no A4 cropping, no
// font-shrinking) since a mindmap is a spatial diagram, not flowing prose.
#let mindmap-poster-page(tree, title, url, closing-line) = {
  let built = build-mindmap(tree)
  let page-width = calc.max(built.width + 2 * page-inset-x, 380pt)

  set page(width: auto, height: auto, margin: 0pt, fill: white)
  set text(size: 10pt)

  brand-header(page-width)

  block(width: page-width, inset: (x: page-inset-x, top: 16pt, bottom: 10pt))[
    #text(size: 18pt, weight: "bold", fill: dark-text)[#title]
    #if url != none [
      #v(4pt)
      #link(url)[#text(size: 10pt, fill: brand, weight: "medium")[View this on aikyamjobs.org → #url]]
    ]
  ]

  hr(page-width)

  block(width: page-width, inset: (x: page-inset-x, y: 20pt))[#built.content]

  hr(page-width)

  block(width: page-width, inset: (x: page-inset-x, y: 14pt))[
    #align(center)[
      #text(size: 9.5pt, style: "italic", fill: gray-text)[#closing-line]
      #v(6pt)
      #text(size: 8.5pt, fill: light-gray)[aikyamjobs.org — curated social impact careers]
    ]
  ]
}

// ---------- Content (prose) pages ----------

// Markdown, pre-parsed JS-side into plain-data blocks (never raw markdown
// text re-parsed as Typst markup -- arbitrary admin-authored text could
// contain Typst-special characters and break compilation).
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

// Slim repeating header/footer for normal A4 pages, so the document still
// reads as one continuous piece rather than the mindmap poster feeling
// bolted onto unrelated pages.
#let with-a4-chrome(section-label, body) = {
  set page(
    width: 21cm, height: 29.7cm, margin: (x: a4-margin, top: 1.8cm, bottom: 1.6cm), fill: white,
    header: [
      #grid(
        columns: (auto, 1fr, auto),
        align: horizon,
        image("aikyamjobs-logo-dark.svg", height: 13pt),
        [],
        text(size: 8.5pt, fill: gray-text)[#section-label],
      )
      #v(4pt)
      #line(length: 100%, stroke: 0.6pt + hairline)
    ],
    footer: context [
      #line(length: 100%, stroke: 0.6pt + hairline)
      #v(4pt)
      #align(center)[#text(size: 8pt, fill: light-gray)[aikyamjobs.org — Page #counter(page).display() of #context counter(page).final().first()]]
    ],
  )
  body
}

#let job-content-page(job) = with-a4-chrome("Job Description")[
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
  #v(14pt)

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

#let company-content-page(company) = with-a4-chrome("About the Company")[
  #text(size: 20pt, weight: "bold", fill: dark-text)[#company.name]
  #v(6pt)
  #text(size: 9.5pt, fill: gray-text)[
    #meta-row((
      company.at("location", default: none),
      company.at("size", default: none),
      company.at("industry", default: none),
    ))
  ]
  #v(10pt)

  #if company.at("website", default: none) != none [
    #cta-button("Visit website", company.website)
    #v(16pt)
  ]

  #render-blocks(company.at("descriptionBlocks", default: ()))

  #v(14pt)
  #text(size: 8.5pt, fill: gray-text)[See the full listing and open roles: #link(company.url)[#company.url]]
]

// ---------- Assembly: JD mindmap -> JD -> company mindmap -> company ----------
//
// Wrapped in one `context` block: build-mindmap()/ideal-width() depend on
// `measure()`, which is only available in a context. set page()/pagebreak()
// still take full effect on the real document from inside context (verified
// separately) -- so per-section page geometry keeps working exactly as it
// does outside one.

#context {
  if data.at("jobMindmap", default: none) != none {
    mindmap-poster-page(
      data.jobMindmap,
      data.job.title,
      data.job.at("url", default: none),
      "Hope this visual breakdown makes it easy to size up the role at a glance — the full listing (and the rest of this document) follows.",
    )
    pagebreak()
  }

  job-content-page(data.job)

  if data.at("companyMindmap", default: none) != none {
    pagebreak()
    mindmap-poster-page(
      data.companyMindmap,
      data.company.name,
      data.company.at("url", default: none),
      "A quick look at who's behind this role — the full company profile follows.",
    )
  }

  if data.at("company", default: none) != none {
    pagebreak()
    company-content-page(data.company)
  }
}

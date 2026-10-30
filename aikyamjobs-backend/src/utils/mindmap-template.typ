// "JD as a PDF", v5 (2026-10-30). The site's own typeface (Figtree, bundled
// in ./fonts) and colours, in the original v3 order -- visual mindmaps are
// part of the point of this PDF:
//
//   landscape  job title strip + the JD mindmap as a two-sided map
//   portrait   "Skills this role needs" + the job description
//   landscape  organisation strip + the company mindmap (if it has one)
//   portrait   the organisation's profile text, then a pointer back to the
//              live listing
//
// The map replaces v3's one-sided tree, which put each top-level branch on
// its own page and sized every box to its own text (ragged columns, ~11
// pages a job). Here every branch fits on one page: the root sits in the
// middle, branches are split across both sides so neither side is much
// taller than the other, and every box in a column shares one width, so
// all edges line up. Only if a map is still taller than the page is it
// scaled down, uniformly.
//
// Reads JSON injected by mindmapPdf.js as an in-memory shadow file:
//   {
//     meta: { brandColor },
//     job: { title, url, companyName, location, jobType, experienceLevel,
//            salary, closingDate, skills: [str], descriptionBlocks: [...],
//            apply: { label, href } | none },
//     jobMap: { label, details?, children: [...] } | none,
//     company: { name, url, location, size, industry, website,
//                descriptionBlocks: [...] } | none,
//     companyMap: { label, details?, children: [...] } | none,
//   }
// Both trees arrive already normalised by mindmapTree.js (plain
// label/details/children, citations stripped). All admin-authored text
// arrives as data and is only ever placed as content, never evaluated as
// Typst markup.

#let data = json("mindmap-data.json")
#let meta = data.at("meta", default: (:))
#let job = data.job
#let job-map = data.at("jobMap", default: none)
#let company = data.at("company", default: none)
#let company-map = data.at("companyMap", default: none)

#let brand = rgb(meta.at("brandColor", default: "#AE4634"))
#let ink = rgb("#1F2937")
#let body-ink = rgb("#374151")
#let muted = rgb("#6B7280")
#let faint = rgb("#9CA3AF")
#let hairline = rgb("#E5E7EB")
#let tile-bg = rgb("#F4F8F6")
#let tile-line = rgb("#D8E7E1")
// Same branch palette as the website; all >= 4.5:1 with white text.
#let palette = (rgb("#AE4634"), rgb("#2E6F5E"), rgb("#3F5D8A"), rgb("#8A5A3F"), rgb("#5A4F8A"), rgb("#3F7A8A"), rgb("#7A3F6E"))
#let accent(i) = palette.at(calc.rem(i, palette.len()))

#let present(v) = v != none and v != ""
#let field(d, key) = if d == none { none } else { d.at(key, default: none) }
#let has-branches(tree) = tree != none and tree.at("children", default: ()).len() > 0

#set document(title: job.title, author: "aikyamjobs.org")
// Libertinus only as a glyph fallback (e.g. the rupee sign, which the
// bundled Latin subset of Figtree doesn't include).
#set text(font: ("Figtree", "Libertinus Serif"), size: 10pt, fill: body-ink, lang: "en")
#set par(leading: 0.6em, spacing: 0.9em, justify: false)
#set list(indent: 0pt, body-indent: 7pt, spacing: 0.6em, marker: text(fill: faint)[•])
#set enum(indent: 0pt, body-indent: 7pt, spacing: 0.6em)

#set page(
  paper: "a4",
  margin: (x: 2cm, top: 2.4cm, bottom: 2cm),
  header-ascent: 35%,
  footer-descent: 35%,
  header: context {
    grid(
      columns: (auto, auto, 1fr, auto),
      column-gutter: 5pt,
      align: horizon,
      image("aikyamjobs-logo-dark.svg", height: 12pt),
      text(size: 9.5pt, fill: ink)[#text(weight: 700)[aikyam] jobs],
      [],
      text(size: 8pt, fill: muted)[#if present(field(job, "companyName")) [#job.companyName · ]Job description],
    )
    v(-2pt)
    line(length: 100%, stroke: 0.5pt + hairline)
  },
  footer: context {
    line(length: 100%, stroke: 0.5pt + hairline)
    v(-2pt)
    grid(
      columns: (1fr, auto),
      text(size: 8pt, fill: muted)[aikyamjobs.org · Hand-curated jobs in social impact],
      text(size: 8pt, fill: muted)[Page #counter(page).display() of #counter(page).final().first()],
    )
  },
)

// ---------- Small building blocks ----------

#let facts(items) = {
  let parts = items.filter(present)
  if parts.len() > 0 {
    text(size: 9.5pt, fill: muted, parts.join(text(fill: faint)[#h(4pt)·#h(4pt)]))
  }
}

#let section-heading(label) = block(above: 20pt, below: 10pt, sticky: true)[
  #text(size: 12pt, weight: 700, fill: ink)[#label]
]

#let button(label, href) = link(href, box(fill: brand, radius: 4pt, inset: (x: 14pt, y: 8pt))[
  #text(size: 9.5pt, weight: 600, fill: white)[#label →]
])

#let domain(url) = {
  let s = url.replace(regex("^https?://"), "").replace(regex("^www\."), "")
  s.split("/").at(0)
}

#let job-facts = facts((
  field(job, "location"),
  field(job, "jobType"),
  if present(field(job, "experienceLevel")) { job.experienceLevel + " level" },
  field(job, "salary"),
  if present(field(job, "closingDate")) { "Closes " + job.closingDate },
))

#let job-actions = {
  let apply = field(job, "apply")
  let url = field(job, "url")
  if apply != none { button(apply.label, apply.href) }
  if apply != none and url != none { v(5pt) }
  if url != none { link(url)[#text(size: 9pt, weight: 600, fill: brand)[View on aikyamjobs.org]] }
}

#let company-links = if company == none { () } else {
  (
    if present(field(company, "website")) { link(company.website)[#domain(company.website) ↗] },
    if present(field(company, "url")) { link(company.url)[More on aikyamjobs.org] },
  ).filter(l => l != none)
}

// Title block shared by the job's first page (portrait fallback) and the
// landscape map page's strip.
#let job-title-block(size) = {
  if present(field(job, "companyName")) {
    text(size: 10pt, weight: 600, fill: muted)[#job.companyName]
    v(2pt)
  }
  block(below: 7pt)[
    #set par(leading: 0.4em)
    #text(size: size, weight: 700, fill: ink)[#job.title]
  ]
  job-facts
}

#let company-title-block(size) = {
  text(size: 10pt, weight: 600, fill: muted)[About the organisation]
  v(2pt)
  block(below: 7pt, text(size: size, weight: 700, fill: ink, company.name))
  facts((field(company, "location"), field(company, "size"), field(company, "industry")))
}

// ---------- Two-sided mindmap ----------

#let map-margin = (x: 1.6cm, top: 2.3cm, bottom: 1.9cm)
#let map-avail-w = 29.7cm - 2 * 1.6cm
#let map-avail-h = 21cm - 2.3cm - 1.9cm
#let leaf-gap = 6pt
#let group-gap = 14pt

#let root-box(node, w) = box(width: w, inset: (x: 10pt, y: 10pt), radius: 6pt, fill: ink)[
  #set par(leading: 0.42em, spacing: 0.4em)
  #set align(center)
  #text(size: 11.5pt, weight: 700, fill: white)[#node.label]
  #let details = field(node, "details")
  #if present(details) {
    for f in details.split(" | ").slice(0, calc.min(3, details.split(" | ").len())) [
      \ #text(size: 7.5pt, fill: rgb("#D1D5DB"))[#f]
    ]
  }
]

#let branch-box(label, color, w) = box(width: w, inset: (x: 8pt, y: 8pt), radius: 5pt, fill: color)[
  #set par(leading: 0.4em)
  #set align(center)
  #text(size: 9.5pt, weight: 700, fill: white)[#label]
]

// The coloured edge faces the branch, so it reads as the end of the line.
#let leaf-box(n, color, w, side) = box(
  width: w,
  inset: (x: 7pt, y: 5pt),
  fill: color.lighten(92%),
  stroke: if side == "right" { (left: 2.2pt + color) } else { (right: 2.2pt + color) },
)[
  #set par(leading: 0.42em, spacing: 0.3em)
  #text(size: 8.5pt, weight: 600, fill: ink)[#n.label]
  #if present(field(n, "details")) [ \ #text(size: 7.5pt, fill: muted)[#n.details]]
  #for c in n.at("children", default: ()) [ \ #text(size: 7.5pt, fill: body-ink)[• #c.label]]
]

// Measure each branch's group (its box beside the stack of its leaves).
// Needs a surrounding `context` (measure).
#let build-groups(branches, offset, side, leaf-w, branch-w) = branches.enumerate().map(((i, b)) => {
  let color = accent(offset + i)
  let bbox = branch-box(b.label, color, branch-w)
  let leaves = b.at("children", default: ()).map(n => leaf-box(n, color, leaf-w, side))
  let hs = leaves.map(l => measure(l).height)
  let lt = hs.sum(default: 0pt) + leaf-gap * calc.max(leaves.len() - 1, 0)
  let bh = measure(bbox).height
  (bbox: bbox, bh: bh, leaves: leaves, hs: hs, lt: lt, h: calc.max(bh, lt), color: color)
})

#let stack-h(groups) = groups.map(g => g.h).sum(default: 0pt) + group-gap * calc.max(groups.len() - 1, 0)

#let mindmap(tree, avail-h) = context {
  let branches = tree.at("children", default: ())
  let n = branches.len()
  let root-w = 3.6cm
  let branch-w = 3.4cm
  let g-in = 0.75cm
  let g-out = 0.6cm
  let leaf-w = (map-avail-w - root-w - 2 * branch-w - 2 * g-in - 2 * g-out) / 2

  // Keep the original branch order: the first k go on the right, the rest
  // on the left, with k chosen so the two sides are as even as possible.
  let probe = build-groups(branches, 0, "right", leaf-w, branch-w)
  let k = n
  let best = none
  for i in range(1, n) {
    let d = calc.abs(stack-h(probe.slice(0, i)) - stack-h(probe.slice(i)))
    if best == none or d < best {
      best = d
      k = i
    }
  }
  let right-groups = build-groups(branches.slice(0, k), 0, "right", leaf-w, branch-w)
  let left-groups = build-groups(branches.slice(k), k, "left", leaf-w, branch-w)

  let rbox = root-box(tree, root-w)
  let rh = measure(rbox).height
  let rH = stack-h(right-groups)
  let lH = stack-h(left-groups)
  let H = calc.max(rH, lH, rh)
  let cy = H / 2

  let x-root = leaf-w + g-out + branch-w + g-in
  let x = (
    left-leaf: 0pt,
    left-branch: leaf-w + g-out,
    root: x-root,
    right-branch: x-root + root-w + g-in,
    right-leaf: x-root + root-w + g-in + branch-w + g-out,
  )

  let lines = ()
  let boxes = ((dx: x.root, dy: cy - rh / 2, body: rbox),)
  for (side, groups, total) in (("right", right-groups, rH), ("left", left-groups, lH)) {
    let y = (H - total) / 2
    for g in groups {
      let bcy = y + g.h / 2
      let bx = if side == "right" { x.right-branch } else { x.left-branch }
      boxes.push((dx: bx, dy: bcy - g.bh / 2, body: g.bbox))
      // root -> branch
      let (x0, x1) = if side == "right" { (x.root + root-w, x.right-branch) } else { (x.root, x.left-branch + branch-w) }
      let mid = (x0 + x1) / 2
      lines.push(curve(stroke: 1.5pt + g.color, curve.move((x0, cy)), curve.cubic((mid, cy), (mid, bcy), (x1, bcy))))
      // branch -> each leaf
      let (b0, l1) = if side == "right" { (x.right-branch + branch-w, x.right-leaf) } else { (x.left-branch, x.left-leaf + leaf-w) }
      let lmid = (b0 + l1) / 2
      let lx = if side == "right" { x.right-leaf } else { x.left-leaf }
      let ly = y + (g.h - g.lt) / 2
      for (leaf, lh) in g.leaves.zip(g.hs) {
        let lcy = ly + lh / 2
        lines.push(curve(stroke: 0.9pt + g.color.lighten(30%), curve.move((b0, bcy)), curve.cubic((lmid, bcy), (lmid, lcy), (l1, lcy))))
        boxes.push((dx: lx, dy: ly, body: leaf))
        ly += lh + leaf-gap
      }
      y += g.h + group-gap
    }
  }

  // Lines first, so every box sits on top of the line ends.
  let canvas = box(width: map-avail-w, height: H, {
    for l in lines { place(top + left, l) }
    for b in boxes { place(top + left, dx: b.dx, dy: b.dy, b.body) }
  })
  // Too tall for the page: shrink uniformly. The scaled map goes in a box
  // of exactly its scaled size -- `scale(reflow: true)` still lays the
  // full-size map out first, finds it taller than the space left under the
  // title strip, and pushes it to the next page (leaving a page with only
  // the strip on it).
  let s = calc.min(1, avail-h / H)
  if s < 0.999 {
    align(center, box(width: map-avail-w * s, height: H * s, scale(s * 100%, origin: top + left, canvas)))
  } else { canvas }
}

// A landscape page: title strip (left) + actions/links (right), then the
// map filling the rest of the page.
#let map-page(strip-left, strip-right, tree) = page(flipped: true, margin: map-margin)[
  #let strip = grid(
    columns: (1fr, auto),
    column-gutter: 24pt,
    align: (left + bottom, right + bottom),
    strip-left,
    strip-right,
  )
  #strip
  #v(14pt)
  #context {
    let strip-h = measure(block(width: map-avail-w, strip)).height
    mindmap(tree, map-avail-h - strip-h - 14pt - 16pt)
  }
]

// ---------- Skills: one row of equal tiles (every job has ~5) ----------

#let skills-tiles(skills) = {
  let n = skills.len()
  let cols = if n <= 5 { n } else { 3 }
  let filled(x, y) = y * cols + x < n
  grid(
    columns: (1fr,) * cols,
    column-gutter: 6pt,
    row-gutter: 6pt,
    inset: (x: 8pt, y: 8pt),
    fill: (x, y) => if filled(x, y) { tile-bg },
    stroke: (x, y) => if filled(x, y) { 0.6pt + tile-line },
    ..skills.map(s => text(size: 9pt, weight: 600, fill: ink)[#s]),
  )
}

// ---------- Prose (job description / organisation profile) ----------

#let render-blocks(blocks) = for b in blocks {
  if b.type == "heading" {
    let size = if b.at("level", default: 2) <= 2 { 11.5pt } else { 10.5pt }
    block(above: 15pt, below: 7pt, sticky: true, text(size: size, weight: 700, fill: ink, b.text))
  } else if b.type == "paragraph" {
    par(b.text)
  } else if b.type == "list" {
    if b.at("ordered", default: false) { enum(..b.items) } else { list(..b.items) }
  } else if b.type == "quote" {
    block(inset: (left: 10pt, y: 2pt), stroke: (left: 2pt + brand), text(style: "italic", fill: muted, b.text))
  }
}

// ---------- Document ----------

// 1. The job's mindmap.
#if has-branches(job-map) {
  map-page(job-title-block(16pt), job-actions, job-map)
} else {
  job-title-block(19pt)
  v(12pt)
  job-actions
}

// 2. Skills + the job description.
#let skills = job.at("skills", default: ())
#if skills.len() > 0 {
  section-heading("Skills this role needs")
  skills-tiles(skills)
}
#let jd = job.at("descriptionBlocks", default: ())
#if jd.len() > 0 {
  section-heading("Job description")
  render-blocks(jd)
}

// 3-4. The organisation: its mindmap, then its profile.
#if company != none {
  let links = text(size: 9pt, weight: 600, fill: brand, company-links.join(linebreak()))
  let profile = company.at("descriptionBlocks", default: ())
  if has-branches(company-map) {
    map-page(company-title-block(16pt), links, company-map)
    if profile.len() > 0 {
      block(below: 10pt, text(size: 12pt, weight: 700, fill: ink)[About #company.name])
      render-blocks(profile)
    }
  } else {
    // No map: keep it in the flow after the JD, behind a divider. The
    // intro is one unbreakable, sticky block so it never sits alone at the
    // bottom of a page.
    block(above: 30pt, width: 100%, breakable: false, sticky: true)[
      #line(length: 100%, stroke: 1pt + hairline)
      #v(16pt)
      #company-title-block(17pt)
      #if company-links.len() > 0 {
        v(6pt)
        text(size: 9pt, weight: 600, fill: brand, company-links.join(h(14pt)))
      }
    ]
    if profile.len() > 0 {
      section-heading("Profile")
      render-blocks(profile)
    }
  }
}

// Closing pointer back to the live listing.
#if field(job, "url") != none {
  block(above: 22pt, width: 100%, inset: (x: 12pt, y: 10pt), radius: 6pt, fill: tile-bg, stroke: 0.6pt + tile-line, breakable: false)[
    #text(size: 9pt, fill: body-ink)[
      #text(weight: 700, fill: ink)[Interested?]
      #if field(job, "apply") != none [ #link(job.apply.href)[#text(weight: 600, fill: brand)[#job.apply.label →]] #h(6pt)·#h(6pt)]
      Full listing: #link(job.url)[#text(fill: brand)[#job.url]]
    ]
  ]
}

// "JD as a PDF", v4 (2026-10-30). A portrait A4 document in the site's own
// typeface (Figtree, bundled in ./fonts) and colours, replacing v3's
// landscape layout that drew the mindmap as a tree with one top-level
// branch per page (~11 pages for a typical job, mostly empty space).
//
//   Page 1    job header + apply link, "Skills this role needs",
//             "Role at a glance" (the JD mindmap as aligned columns)
//   then      the job description, flowing on
//   then      about the organisation: facts, "Major initiatives &
//             programmes" (the same branch the company page shows),
//             then the organisation's profile text. Flows on after a
//             divider rather than forcing a new page, which left
//             near-empty pages whenever the JD spilled a line over.
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
//     companyInitiatives: [{ label, details? }] | none,
//   }
// Both trees arrive already normalised by mindmapTree.js (plain
// label/details/children, citations stripped), so nothing here has to
// guess at shapes. All admin-authored text arrives as data and is only
// ever placed as content, never evaluated as Typst markup.

#let data = json("mindmap-data.json")
#let meta = data.at("meta", default: (:))
#let job = data.job
#let job-map = data.at("jobMap", default: none)
#let company = data.at("company", default: none)
#let initiatives = data.at("companyInitiatives", default: none)

#let brand = rgb(meta.at("brandColor", default: "#AE4634"))
#let ink = rgb("#1F2937")
#let body-ink = rgb("#374151")
#let muted = rgb("#6B7280")
#let faint = rgb("#9CA3AF")
#let hairline = rgb("#E5E7EB")
#let tile-bg = rgb("#F4F8F6")
#let tile-line = rgb("#D8E7E1")
// Same branch palette as the website's mindmap/initiative cards.
#let palette = (rgb("#AE4634"), rgb("#2E6F5E"), rgb("#3F5D8A"), rgb("#8A5A3F"), rgb("#5A4F8A"), rgb("#3F7A8A"), rgb("#7A3F6E"))
#let accent(i) = palette.at(calc.rem(i, palette.len()))

#let present(v) = v != none and v != ""
#let field(d, key) = if d == none { none } else { d.at(key, default: none) }

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

// ---------- Job header ----------

#let job-header = {
  if present(field(job, "companyName")) {
    text(size: 10pt, weight: 600, fill: muted)[#job.companyName]
    v(3pt)
  }
  block(below: 8pt)[
    #set par(leading: 0.42em)
    #text(size: 19pt, weight: 700, fill: ink)[#job.title]
  ]
  facts((
    field(job, "location"),
    field(job, "jobType"),
    if present(field(job, "experienceLevel")) { job.experienceLevel + " level" },
    field(job, "salary"),
    if present(field(job, "closingDate")) { "Closes " + job.closingDate },
  ))
  let apply = field(job, "apply")
  let url = field(job, "url")
  if apply != none or url != none {
    v(12pt)
    grid(
      columns: (auto, auto),
      column-gutter: 14pt,
      align: horizon,
      if apply != none { button(apply.label, apply.href) } else { [] },
      if url != none { link(url)[#text(size: 9pt, weight: 600, fill: brand)[View on aikyamjobs.org]] } else { [] },
    )
  }
}

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

// ---------- "At a glance" columns (JD mindmap, company initiatives) ----------

#let detail-text(d) = text(size: 8.5pt, fill: muted)[#d]

#let item-block(n) = block(below: 8pt, breakable: false)[
  #set par(leading: 0.5em, spacing: 0.4em)
  #text(size: 9pt, weight: 600, fill: ink)[#n.label]
  #if present(field(n, "details")) [ \ #detail-text(n.details)]
  #let kids = n.at("children", default: ())
  #if kids.len() > 0 {
    v(1pt)
    list(spacing: 0.4em, ..kids.map(c => text(size: 8.5pt)[
      #text(weight: 600, fill: ink)[#c.label]#if present(field(c, "details")) [: #text(fill: muted)[#c.details]]
    ]))
  }
]

#let column-block(label, color, details, items) = block(width: 100%)[
  #line(length: 100%, stroke: 2pt + color)
  #v(4pt)
  #block(below: 7pt, sticky: true)[#text(size: 10.5pt, weight: 700, fill: color)[#label]]
  #if present(details) { block(below: 7pt, detail-text(details)) }
  #for n in items { item-block(n) }
]

#let glance(tree) = grid(
  columns: (1fr, 1fr),
  column-gutter: 20pt,
  row-gutter: 12pt,
  ..tree.at("children", default: ()).enumerate().map(((i, b)) =>
    column-block(b.label, accent(i), field(b, "details"), b.at("children", default: ()))),
)

#let initiative-cards(items) = {
  let cols = if items.len() == 2 or items.len() == 4 { 2 } else { 3 }
  grid(
    columns: (1fr,) * cols,
    column-gutter: 16pt,
    row-gutter: 14pt,
    ..items.enumerate().map(((i, it)) => block(width: 100%, breakable: false)[
      #set par(leading: 0.5em)
      #line(length: 100%, stroke: 2pt + accent(i))
      #v(4pt)
      #text(size: 9.5pt, weight: 700, fill: ink)[#it.label]
      #if present(field(it, "details")) [ \ #detail-text(it.details)]
    ]),
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

#job-header

#let skills = job.at("skills", default: ())
#if skills.len() > 0 {
  section-heading("Skills this role needs")
  skills-tiles(skills)
}

#if job-map != none and job-map.at("children", default: ()).len() > 0 {
  section-heading("Role at a glance")
  glance(job-map)
}

#let jd = job.at("descriptionBlocks", default: ())
#if jd.len() > 0 {
  section-heading("Job description")
  render-blocks(jd)
}

#if company != none {
  let links = (
    if present(field(company, "website")) { link(company.website)[#domain(company.website) ↗] },
    if present(field(company, "url")) { link(company.url)[More on aikyamjobs.org] },
  ).filter(l => l != none)
  // One unbreakable, sticky intro block: the divider + name never sit
  // alone at the bottom of a page.
  block(above: 30pt, width: 100%, breakable: false, sticky: true)[
    #line(length: 100%, stroke: 1pt + hairline)
    #v(16pt)
    #text(size: 10pt, weight: 600, fill: muted)[About the organisation]
    #v(3pt)
    #block(below: 8pt, text(size: 17pt, weight: 700, fill: ink, company.name))
    #facts((field(company, "location"), field(company, "size"), field(company, "industry")))
    #if links.len() > 0 {
      v(6pt)
      text(size: 9pt, weight: 600, fill: brand, links.join(h(14pt)))
    }
  ]

  if initiatives != none and initiatives.len() > 0 {
    section-heading("Major initiatives & programmes")
    initiative-cards(initiatives)
  }

  let profile = company.at("descriptionBlocks", default: ())
  if profile.len() > 0 {
    section-heading("Profile")
    render-blocks(profile)
  }
}

// Closing pointer back to the live listing.
#if field(job, "url") != none {
  block(above: 22pt, width: 100%, inset: (x: 12pt, y: 10pt), radius: 6pt, fill: tile-bg, stroke: 0.6pt + tile-line)[
    #text(size: 9pt, fill: body-ink)[
      #text(weight: 700, fill: ink)[Interested?]
      #if field(job, "apply") != none [ #link(job.apply.href)[#text(weight: 600, fill: brand)[#job.apply.label →]] #h(6pt)·#h(6pt)]
      Full listing: #link(job.url)[#text(fill: brand)[#job.url]]
    ]
  ]
}

'use strict';

/**
 * Dev-only helper: seeds the Learn & Grow / Courses section with one provider
 * (Azim Premji University), the admin-managed field-of-study taxonomy, and
 * ten courses so /courses and /courses/[slug] can be built and tested locally
 * against real-shaped data. Also grants the Public role find/findOne on
 * course, course-provider and course-field-of-study, since new content types
 * default to no public API access (same manual step documented in
 * scripts/MIGRATION_README.md, done here so local dev doesn't need the
 * admin UI). Safe to re-run. Run with the dev server stopped:
 *
 *   node scripts/seed-courses.js
 */
const strapiFactory = require('@strapi/strapi');

// Admin-managed via api::course-field-of-study — new ones can be added from
// Strapi admin without a code deploy. Seeded with the full fixed list from
// the Learn & Grow course authoring spec (plus physical-sciences and
// social-sciences, added here to cover the rest of Azim Premji University's
// catalogue) so the filter dropdown shows the complete taxonomy from day one.
const FIELDS_OF_STUDY = [
  { name: 'Life Sciences', slug: 'life-sciences' },
  { name: 'Chemistry', slug: 'chemistry' },
  { name: 'Physical Sciences', slug: 'physical-sciences' },
  { name: 'Environment and Sustainability', slug: 'environment-and-sustainability' },
  { name: 'Management', slug: 'management' },
  { name: 'Social Work', slug: 'social-work' },
  { name: 'Social Sciences', slug: 'social-sciences' },
  { name: 'Education', slug: 'education' },
  { name: 'Public Policy', slug: 'public-policy' },
  { name: 'Data and Technology', slug: 'data-and-technology' },
  { name: 'Arts and Humanities', slug: 'arts-and-humanities' },
  { name: 'Health Sciences', slug: 'health-sciences' },
];

const PROVIDER_SLUG = 'azim-premji-university';

const PROVIDER = {
  name: 'Azim Premji University',
  slug: PROVIDER_SLUG,
  shortDescription:
    'Azim Premji University works in the areas of education and development, with the mission of contributing to a just, equitable, humane and sustainable society.',
  website: 'https://azimpremjiuniversity.edu.in',
  location: 'Bengaluru, India',
  admissionsEmail: 'admissions@apu.edu.in',
  admissionsPhone: '+91 8971889988',
  publishedAt: new Date(),
};

const APPLY_URL = 'https://apply.azimpremjiuniversity.edu.in/signup';

const COURSES = [
  {
    title: 'BSc in Chemistry',
    slug: 'bsc-in-chemistry',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'chemistry',
    courseType: 'undergraduate',
    skills: [
      'Chemical Analysis',
      'Spectroscopy',
      'Organic Synthesis',
      'Inorganic Synthesis',
      'Chemical Thinking',
      'Lab Research',
    ],
    excerpt:
      "Gain hands-on laboratory experience, master chemical thinking, and explore interdisciplinary minor tracks through Azim Premji University's 4-year full-time BSc in Chemistry in Bengaluru. Access need-based financial aid and prepare for careers in research, industry, policy, or education.",
    featured: true,
    metaTitle: 'BSc in Chemistry | Azim Premji University | Learn & Grow',
    metaDescription:
      "Explore Azim Premji University's 4-year BSc in Chemistry. Build analytical expertise through hands-on lab research and flexible occupational minor tracks.",
    keywords: [
      'BSc in Chemistry',
      'Azim Premji University',
      'chemistry degree Bengaluru',
      'undergraduate chemistry',
      'BSc Honours Chemistry',
      'chemical research',
      'occupational minor',
      'science higher education',
      'chemistry laboratory training',
      'need-based financial aid',
      'science careers India',
      'chemical synthesis',
    ],
    content: `## About the Programme

The BSc in Chemistry at Azim Premji University is a four-year full-time undergraduate honours degree that approaches chemistry as an active way of thinking rather than a set of facts to memorize. It is designed for learners from diverse socio-economic and educational backgrounds who want to understand the material world and use science for the greater good. The curriculum organizes fundamental chemical principles around three laboratory-aligned themes: structure and analysis, synthesis and reactivity, and model development. Students build analytical abilities through early exposure to modern laboratory tools, interdisciplinary coursework, and hands-on experimental and computational practice. The degree prepares graduates for academic research, advanced scientific study, or immediate entry into varied professional work sectors.

### Curriculum Overview

- Common Curriculum: Features foundational coursework in Academic Reading and Writing, Creative Expressions, Public Reasoning or The World of Computing, and Understanding India.
- Core Disciplinary Courses: Covers foundational and advanced chemistry topics including Chemicals in the Community, Introduction to Chemical Thinking I & II, Structure-Property Relationships in Chemistry, Principles of Reactivity, Thermodynamics and Kinetics, Chemical Analysis and Spectroscopy, Inorganic Synthesis, Organic Synthesis, Mathematics and Computing I & II, Methods in Chemical Biology, and Advanced Synthetic Chemistry.
- Occupational Minor Tracks: Offers minor options across diverse areas including Biodiversity Conservation, Climate Studies, Data, Democracy and Development, Design for Communities, Disability, Accessibility and Inclusion, Education, Financial Management for the Social Sector, Heritage Studies, Media and Journalism, Music Education, Public Health, Sports and Fitness, and Technology for Social Good.
- Practical and Research Components: Integrates experimental and computational laboratory work across courses, hands-on training with advanced analytical equipment, and an optional honours research pathway involving an independent research project, written thesis, and journal seminar course.

### Programme Highlights

- Experiential teaching approach centered on observation, material manipulation, and computational reasoning in every course.
- Comprehensive academic support services including language support, peer tutoring, and dedicated faculty mentorship.
- Need-based financial assistance available to cover tuition and accommodation expenses.
- Early laboratory exposure to advanced spectroscopic, analytical, and synthetic equipment.
- Flexible honours research pathway that enables students to complete an independent research project and thesis.

### Career Pathways

- Academic research and postgraduate higher education in chemistry or interdisciplinary scientific fields.
- Technical roles in industrial sectors including pharmaceutical companies, chemical manufacturing, forensic science laboratories, plastics, and agrochemicals.
- Professional pathways outside laboratory research, including environmental policy, science journalism, intellectual property law, and non-science higher education.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available to support students with tuition and accommodation expenses.`,
  },
  {
    title: 'BSc in Environmental Science and Sustainability',
    slug: 'bsc-in-environmental-science-and-sustainability',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Open to students from all academic streams, including science, social science, and humanities.',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'environment-and-sustainability',
    courseType: 'undergraduate',
    skills: [
      'Environmental Monitoring',
      'GIS & Remote Sensing',
      'Policy Analysis',
      'Field Research',
      'Biostatistics',
      'Sustainability Action',
    ],
    excerpt:
      "Build expertise in earth systems, pollution monitoring, and policy with Azim Premji University's 4-year BSc in Environmental Science and Sustainability in Bengaluru. Access need-based financial aid and prepare for careers in research, consultancy, or advocacy.",
    featured: true,
    metaTitle: 'BSc in Environmental Science & Sustainability | Learn & Grow',
    metaDescription:
      "Explore Azim Premji University's 4-year BSc in Environmental Science and Sustainability. Gain hands-on lab and field skills for careers in sustainability.",
    keywords: [
      'BSc in Environmental Science and Sustainability',
      'Azim Premji University',
      'environmental science degree',
      'sustainability studies Bengaluru',
      'undergraduate environmental science',
      'earth system science',
      'pollution monitoring',
      'GIS remote sensing',
      'environmental policy',
      'need-based financial aid',
      'ecology careers India',
      'environmental consultant',
    ],
    content: `## About the Programme

The BSc in Environmental Science and Sustainability at Azim Premji University is a four-year full-time undergraduate honours degree created to address global and national ecological challenges. Designed for students from all academic backgrounds including science, social science, and humanities, the curriculum builds critical thinking and practical problem-solving skills tailored to the Indian context. The programme connects core principles of environmental science with human behaviour, economics, policy, and field-based sustainability initiatives. Students gain hands-on expertise through laboratory investigations, real-world case studies, field trips, and advanced research mapping tools. The degree prepares graduates for diverse professional roles in environmental monitoring, consultancy, advocacy, and advanced interdisciplinary studies.

### Curriculum Overview

- Common Curriculum: Features foundational coursework in Academic Reading and Writing, Creative Expressions, Public Reasoning or The World of Computing, and Understanding India.
- Core Disciplinary Courses: Covers key subjects including Framing Environmental Science and Sustainability, Understanding Earth System Science, Environmental Pollution: Air, Water and Soil I & II, Ecology, Environment, and Development, Environmental Microbiology, Biotechnology and Ecology, Quantitative Environmental Research Methods and Biostatistics, Qualitative Environmental Research Methods, Geospatial Technology I (GIS) & II (Remote Sensing), Environmental Economics, Policy and Governance, and Sustainability Action and You.
- Occupational Minor Tracks: Offers minor specializations across areas such as Biodiversity Conservation, Climate Studies, Data, Democracy and Development, Design for Communities, Disability, Accessibility and Inclusion, Education, Financial Management for the Social Sector, Heritage Studies, Media and Journalism, Music Education, Public Health, Sports and Fitness, and Technology for Social Good.
- Lab, Field, and Practical Components: Integrates hands-on laboratory experiments for pollution monitoring, fieldwork, geospatial analysis using ArcGIS, audio-visual demonstrations, guest lectures, and optional internships or research projects on sustainability.

### Programme Highlights

- Experiential and interdisciplinary teaching approach incorporating field trips, debates, literature analysis, and citizen science initiatives like campus bioblitzes.
- Continuous academic support services including language assistance, peer tutoring, and dedicated faculty mentorship.
- Need-based financial assistance covering tuition fees and accommodation expenses for eligible students.
- Access to specialized Environment, Climate Change and Sustainability Laboratories equipped with modern analytical tools.
- Flexible academic options allowing students to pursue additional major electives or interdisciplinary minor tracks.

### Career Pathways

- Diverse professional roles such as Environmental Scientist, Environmental Consultant, Geospatial Analyst, Research Associate, Field Researcher, Environmental Journalist, Sustainability Associate, Policy Analyst, and Programme Associate.
- Employment across multiple sectors including pollution monitoring laboratories, environmental think tanks, urban municipalities, civil society organizations, Corporate Social Responsibility (CSR) divisions, and educational institutions.
- Advanced higher education pathways in environmental science, environmental economics, ecology, sustainability, and allied academic fields.

### Fees & Financial Aid

Fees are not published on the source page. Need-based financial assistance is available to cover tuition and accommodation expenses.`,
  },
  {
    title: 'BSc in Biology',
    slug: 'bsc-in-biology',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'life-sciences',
    courseType: 'undergraduate',
    skills: ['Cell Biology', 'Genetics', 'Ecology', 'Lab Research', 'Scientific Writing'],
    excerpt:
      "A 4-year full-time honours degree in biology from Azim Premji University, Bengaluru, combining foundational life sciences with hands-on lab work and occupational minor tracks.",
    metaTitle: 'BSc in Biology | Azim Premji University | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 4-year BSc in Biology in Bengaluru, with lab-based training and flexible minor tracks.",
    keywords: ['BSc in Biology', 'Azim Premji University', 'biology degree Bengaluru', 'undergraduate biology', 'life sciences India'],
    content: `## About the Programme

The BSc in Biology at Azim Premji University is a four-year full-time undergraduate honours degree covering the breadth of modern life sciences, from molecular and cell biology to ecology and evolution. Full curriculum details for this listing are being finalized. In the meantime, see the Apply section to reach the university's admissions team directly for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Common Curriculum shared across all BSc Honours programmes at the university.
- Core disciplinary courses across the major sub-fields of biology.
- Occupational minor tracks available alongside the core major.

### Programme Highlights

- Experiential, lab-based teaching approach.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Research and postgraduate study in the life sciences.
- Roles in healthcare, biotechnology, conservation, and public health sectors.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'BSc in Physics',
    slug: 'bsc-in-physics',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'physical-sciences',
    courseType: 'undergraduate',
    skills: ['Mechanics', 'Quantum Physics', 'Scientific Computing', 'Lab Research'],
    excerpt:
      "A 4-year full-time honours degree in physics from Azim Premji University, Bengaluru, pairing core physics with computational and lab training.",
    metaTitle: 'BSc in Physics | Azim Premji University | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 4-year BSc in Physics in Bengaluru, with hands-on lab and computational training.",
    keywords: ['BSc in Physics', 'Azim Premji University', 'physics degree Bengaluru', 'undergraduate physics'],
    content: `## About the Programme

The BSc in Physics at Azim Premji University is a four-year full-time undergraduate honours degree building a strong foundation in classical and modern physics alongside computational methods. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Common Curriculum shared across all BSc Honours programmes at the university.
- Core disciplinary courses across classical mechanics, electromagnetism, and quantum physics.
- Occupational minor tracks available alongside the core major.

### Programme Highlights

- Experiential, lab and computation-based teaching approach.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Research and postgraduate study in physics or allied quantitative fields.
- Roles in data science, scientific computing, and technical education.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'BSc in Information Sciences',
    slug: 'bsc-in-information-sciences',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'data-and-technology',
    courseType: 'undergraduate',
    skills: ['Programming', 'Data Structures', 'Computing for Social Good', 'Databases'],
    excerpt:
      "A 4-year full-time honours degree from Azim Premji University, Bengaluru, combining computing fundamentals with technology for social impact.",
    metaTitle: 'BSc in Information Sciences | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 4-year BSc in Information Sciences in Bengaluru, with a social-impact lens on computing.",
    keywords: ['BSc in Information Sciences', 'Azim Premji University', 'computing degree Bengaluru', 'undergraduate computer science'],
    content: `## About the Programme

The BSc in Information Sciences at Azim Premji University is a four-year full-time undergraduate honours degree covering computing fundamentals with an emphasis on using technology for social good. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Common Curriculum shared across all BSc Honours programmes at the university.
- Core disciplinary courses across programming, data structures, and computing systems.
- Occupational minor tracks available alongside the core major.

### Programme Highlights

- Experiential, project-based teaching approach.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Roles in software development, data analysis, and technology for the social sector.
- Postgraduate study in computer science or information systems.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'BSc in Psychology',
    slug: 'bsc-in-psychology',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'health-sciences',
    courseType: 'undergraduate',
    skills: ['Research Methods', 'Counselling Foundations', 'Human Development', 'Statistics'],
    excerpt:
      "A 4-year full-time honours degree in psychology from Azim Premji University, Bengaluru, with a strong research and applied-practice foundation.",
    metaTitle: 'BSc in Psychology | Azim Premji University | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 4-year BSc in Psychology in Bengaluru, covering research methods and applied practice.",
    keywords: ['BSc in Psychology', 'Azim Premji University', 'psychology degree Bengaluru', 'undergraduate psychology'],
    content: `## About the Programme

The BSc in Psychology at Azim Premji University is a four-year full-time undergraduate honours degree covering the scientific study of behaviour and mental processes, with grounding in research methods and applied practice. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Common Curriculum shared across all BSc Honours programmes at the university.
- Core disciplinary courses across cognitive, developmental, and social psychology.
- Occupational minor tracks available alongside the core major.

### Programme Highlights

- Experiential, research-led teaching approach.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Postgraduate study in psychology, counselling, or mental health.
- Roles in education, human resources, and community mental health programmes.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'BA in Economics',
    slug: 'ba-in-economics',
    duration: '4 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'social-sciences',
    courseType: 'undergraduate',
    skills: ['Economic Theory', 'Statistics', 'Policy Analysis', 'Research Methods'],
    excerpt:
      "A 4-year full-time honours degree in economics from Azim Premji University, Bengaluru, grounded in Indian development context.",
    metaTitle: 'BA in Economics | Azim Premji University | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 4-year BA in Economics in Bengaluru, with a development and policy focus.",
    keywords: ['BA in Economics', 'Azim Premji University', 'economics degree Bengaluru', 'undergraduate economics'],
    content: `## About the Programme

The BA in Economics at Azim Premji University is a four-year full-time undergraduate honours degree covering economic theory and quantitative methods, applied to questions of Indian and global development. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Common Curriculum shared across all BA Honours programmes at the university.
- Core disciplinary courses across micro, macro, and development economics.
- Occupational minor tracks available alongside the core major.

### Programme Highlights

- Experiential, discussion and field-based teaching approach.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Postgraduate study in economics, public policy, or development studies.
- Roles in research, consulting, and policy analysis.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'MA in Development',
    slug: 'ma-in-development',
    duration: '2 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'public-policy',
    courseType: 'postgraduate',
    skills: ['Development Theory', 'Field Research', 'Policy Analysis', 'Programme Design'],
    excerpt:
      "A 2-year full-time postgraduate degree from Azim Premji University, Bengaluru, for careers in development practice, policy, and research.",
    metaTitle: 'MA in Development | Azim Premji University | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 2-year MA in Development in Bengaluru, for development practice and policy careers.",
    keywords: ['MA in Development', 'Azim Premji University', 'development studies Bengaluru', 'postgraduate development'],
    content: `## About the Programme

The MA in Development at Azim Premji University is a two-year full-time postgraduate degree that prepares students for careers in development practice, policy, and research across government, civil society, and philanthropy. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Foundation courses in development theory and research methods.
- Specialisation tracks aligned with sectors such as education, health, and livelihoods.
- Field-based practicum or internship component.

### Programme Highlights

- Close engagement with grassroots and policy practitioners.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Roles in NGOs, government programmes, and philanthropic foundations.
- Research and policy analysis positions in the development sector.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'MSc in Climate Change and Sustainability',
    slug: 'msc-in-climate-change-and-sustainability',
    duration: '2 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'environment-and-sustainability',
    courseType: 'postgraduate',
    skills: ['Climate Science', 'Sustainability Policy', 'GIS', 'Research Methods'],
    excerpt:
      "A 2-year full-time postgraduate degree from Azim Premji University, Bengaluru, for careers in climate research, policy, and sustainability practice.",
    metaTitle: 'MSc in Climate Change and Sustainability | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 2-year MSc in Climate Change and Sustainability in Bengaluru.",
    keywords: ['MSc in Climate Change and Sustainability', 'Azim Premji University', 'climate change postgraduate Bengaluru'],
    content: `## About the Programme

The MSc in Climate Change and Sustainability at Azim Premji University is a two-year full-time postgraduate degree covering the science, policy, and practice of responding to climate change. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Foundation courses in climate science and sustainability policy.
- Specialisation and research tracks.
- Field-based or research practicum component.

### Programme Highlights

- Access to specialised climate and sustainability laboratories.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Roles in climate policy, sustainability consulting, and environmental research.
- Positions in government, multilateral, and civil society climate programmes.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'Master of Public Health',
    slug: 'master-of-public-health',
    duration: '2 years',
    location: 'Bengaluru Campus',
    mode: 'full-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Not stated on the source page',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'health-sciences',
    courseType: 'postgraduate',
    skills: ['Epidemiology', 'Health Systems', 'Biostatistics', 'Public Health Policy'],
    excerpt:
      "A 2-year full-time postgraduate degree from Azim Premji University, Bengaluru, preparing graduates for public health practice, research, and policy.",
    metaTitle: 'Master of Public Health | Learn & Grow',
    metaDescription: "Explore Azim Premji University's 2-year Master of Public Health in Bengaluru.",
    keywords: ['Master of Public Health', 'Azim Premji University', 'MPH Bengaluru', 'public health postgraduate'],
    content: `## About the Programme

The Master of Public Health at Azim Premji University is a two-year full-time postgraduate degree covering epidemiology, health systems, and public health policy, with an emphasis on the Indian context. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Foundation courses in epidemiology, biostatistics, and health systems.
- Specialisation tracks in areas such as health policy and community health.
- Field-based practicum component.

### Programme Highlights

- Close ties with public health practitioners and government health programmes.
- Academic support services including peer tutoring and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Roles in public health programme management, policy, and research.
- Positions with government health departments, NGOs, and multilateral agencies.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
  {
    title: 'Executive MBA (Development Management)',
    slug: 'executive-mba-development-management',
    duration: '2 years, part-time',
    location: 'Bengaluru Campus',
    mode: 'part-time',
    intake: 'July 2027',
    medium: 'English',
    eligibility: 'Designed for working professionals in the development sector.',
    importantDates: 'Not stated on the source page',
    fieldOfStudy: 'management',
    courseType: 'executive-education',
    skills: ['Development Management', 'Organisational Leadership', 'Programme Strategy', 'Financial Management'],
    excerpt:
      "A part-time Executive MBA from Azim Premji University for working professionals leading development-sector organisations and programmes.",
    metaTitle: 'Executive MBA (Development Management) | Learn & Grow',
    metaDescription: "Explore Azim Premji University's part-time Executive MBA in Development Management, built for working professionals.",
    keywords: ['Executive MBA Development Management', 'Azim Premji University', 'development management MBA Bengaluru'],
    content: `## About the Programme

The Executive MBA in Development Management at Azim Premji University is a part-time postgraduate programme designed for working professionals who lead or plan to lead development-sector organisations and programmes. Full curriculum details for this listing are being finalized. See the Apply section to reach the university's admissions team for the latest programme structure, fees, and eligibility.

### Curriculum Overview

- Core management courses adapted to the development sector context.
- Specialisation tracks in organisational leadership and programme strategy.
- Applied project work drawn from participants' own organisations.

### Programme Highlights

- Cohort model designed for working professionals.
- Academic support services including peer learning and faculty mentorship.
- Need-based financial assistance available.

### Career Pathways

- Senior leadership and management roles in NGOs, foundations, and social enterprises.
- Programme strategy and organisational development consulting.

### Fees & Financial Aid

Published fee figures are not stated on the source page. Need-based financial assistance is available.`,
  },
];

(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('seed-courses is a LOCAL dev helper and refuses to run with NODE_ENV=production.');
    process.exit(1);
  }

  const app = await strapiFactory().load();
  try {
    const fieldOfStudyIdBySlug = {};
    for (const field of FIELDS_OF_STUDY) {
      const existingField = await app.db
        .query('api::course-field-of-study.course-field-of-study')
        .findOne({ where: { slug: field.slug } });
      const record = existingField
        ? await app.entityService.update('api::course-field-of-study.course-field-of-study', existingField.id, { data: field })
        : await app.entityService.create('api::course-field-of-study.course-field-of-study', { data: { ...field, publishedAt: new Date() } });
      fieldOfStudyIdBySlug[field.slug] = record.id;
    }
    console.log(`Fields of study ready: ${FIELDS_OF_STUDY.length}`);

    const existingProvider = await app.db
      .query('api::course-provider.course-provider')
      .findOne({ where: { slug: PROVIDER_SLUG } });

    const provider = existingProvider
      ? await app.entityService.update('api::course-provider.course-provider', existingProvider.id, { data: PROVIDER })
      : await app.entityService.create('api::course-provider.course-provider', { data: PROVIDER });
    console.log(`Provider ready: ${provider.name} (id ${provider.id})`);

    for (const courseInput of COURSES) {
      const { fieldOfStudy, ...rest } = courseInput;
      const data = {
        ...rest,
        fieldOfStudy: fieldOfStudyIdBySlug[fieldOfStudy],
        provider: provider.id,
        applicationUrl: APPLY_URL,
        applicationEmail: PROVIDER.admissionsEmail,
        applicationPhone: PROVIDER.admissionsPhone,
        publishedAt: new Date(),
      };

      const existing = await app.db.query('api::course.course').findOne({ where: { slug: courseInput.slug } });
      const course = existing
        ? await app.entityService.update('api::course.course', existing.id, { data })
        : await app.entityService.create('api::course.course', { data });
      console.log(`Course ready: ${course.title} (id ${course.id})`);
    }

    // Grant Public role find/findOne on the new content types — new content
    // types default to no public API access (see scripts/MIGRATION_README.md).
    const publicRole = await app.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
    const actions = [
      'api::course.course.find',
      'api::course.course.findOne',
      'api::course-provider.course-provider.find',
      'api::course-provider.course-provider.findOne',
      'api::course-field-of-study.course-field-of-study.find',
      'api::course-field-of-study.course-field-of-study.findOne',
    ];
    for (const action of actions) {
      const existingPermission = await app
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: publicRole.id } });
      if (!existingPermission) {
        await app.query('plugin::users-permissions.permission').create({ data: { action, role: publicRole.id } });
        console.log(`Granted public permission: ${action}`);
      }
    }
  } catch (err) {
    console.error('SEED_ERROR', err);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();

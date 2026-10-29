// Single source of truth for every fact and line of copy on the site.
// Lines marked VERIFY are educated guesses — confirm or correct them.

export type View = { lon: number; lat: number; scale: number }; // scale 1 = whole globe fits

export type Platform = {
  id: string;
  name: string;
  org: string;
  region: string;
  countries: string[]; // ISO 3166-1 numeric (world-atlas feature ids)
  view: View;
  beacon: [number, number]; // [lon, lat]
  url: string;
  role: string;
  summary: string;
  stack: string[];
  languages: string[];
};

export const profile = {
  name: 'Meshack Kibet',
  first: 'Meshack',
  last: 'Kibet',
  role: 'Software Engineer → GIS & AI',
  headline: 'I build the software that <em>warns nations</em> before disasters strike.',
  pitch:
    'Software engineer turned geospatial & AI developer. I build multi-hazard early warning platforms that turn satellite and climate data into decisions — live across 26 African countries.',
  location: 'Nairobi, Kenya',
  coords: { lat: -1.2921, lon: 36.8219 },
  experience: '3+ years', // VERIFY
  status: 'Open to collaborations',
  email: 'mshckkibet@gmail.com',
  cv: 'https://drive.google.com/file/d/1nsX2l1x-Zv15YsQ0lOimJooy4rqd8QKh/view?usp=drive_link',
  socials: [
    { label: 'GitHub', icon: 'github', href: 'https://github.com/bravomesh/' },
    { label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/meshack-kibet-16b090389/' },
    { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/_kibet.mesh/' },
  ],
} as const;

export const home: View = { lon: 22, lat: 4, scale: 1 };

const IGAD = ['108', '262', '232', '231', '404', '646', '706', '728', '729', '834', '800'];
const SADC = ['024', '072', '174', '180', '748', '426', '450', '454', '480', '508', '516', '690', '710', '834', '894', '716'];

const MHEWS_STACK = ['Django', 'Wagtail CMS', 'PostGIS', 'MapLibre GL', 'GCP Cloud Run']; // VERIFY

export const platforms: Platform[] = [
  {
    id: 'eahw',
    name: 'East Africa Hazards Watch',
    org: 'ICPAC · IGAD',
    region: 'Greater Horn of Africa',
    countries: IGAD,
    view: { lon: 37, lat: 3, scale: 2.3 },
    beacon: [36.82, -1.29],
    url: 'https://eahazardswatch.icpac.net/mapviewer/',
    role: 'Full-stack & geospatial developer', // VERIFY
    summary:
      'The regional multi-hazard early warning platform for the IGAD region — floods, drought, heat and more, monitored in near real time and linked to Drought Watch, Agriculture Watch and the ICPAC Geoportal.',
    stack: ['Django', 'Wagtail CMS', 'PostGIS', 'Earth Engine', 'Docker'], // VERIFY
    languages: ['English', 'Swahili', 'Amharic', 'Arabic', 'French', 'Kinyarwanda', 'Chinese', 'Somali'],
  },
  {
    id: 'sadc',
    name: 'SADC Hazards Watch',
    org: 'SADC · Climate Services Centre',
    region: 'Southern Africa',
    countries: SADC,
    view: { lon: 28, lat: -17, scale: 2 },
    beacon: [25.91, -24.65],
    url: 'https://sadc-int-mhews-413744588203.europe-west1.run.app/mapviewer/',
    role: 'Full-stack & geospatial developer', // VERIFY
    summary:
      'Bringing the hazards-watch model to the 16 SADC member states — a shared map viewer for the Climate Services Centre, the Humanitarian & Emergency Operations Centre and the DRR Unit.',
    stack: MHEWS_STACK,
    languages: ['English', 'Portuguese', 'French', 'Swahili'],
  },
  {
    id: 'somalia',
    name: 'Somalia Hazards Watch',
    org: 'Federal Government of Somalia',
    region: 'Somalia',
    countries: ['706'],
    view: { lon: 46.5, lat: 6, scale: 4.2 },
    beacon: [45.32, 2.05],
    url: 'https://somhews-gov-so-cms-web-413744588203.europe-west1.run.app/mapviewer/',
    role: 'Full-stack & geospatial developer', // VERIFY
    summary:
      'A national early warning system connecting SoDMA and five line ministries — health, environment, agriculture and water — to one live picture of risk, with situation reports built in.',
    stack: MHEWS_STACK,
    languages: ['Somali', 'Arabic', 'English', 'Oromo', 'Swahili'],
  },
  {
    id: 'djibouti',
    name: 'Djibouti Multi-Hazard System',
    org: 'Republic of Djibouti',
    region: 'Djibouti',
    countries: ['262'],
    view: { lon: 42.6, lat: 11.7, scale: 9 },
    beacon: [43.15, 11.59],
    url: 'https://djibouti-mhews-413744588203.europe-west1.run.app/mapviewer',
    role: 'Full-stack & geospatial developer', // VERIFY
    summary:
      "Djibouti's national multi-hazard platform, shared by the Prime Minister's office, the national meteorological agency and key ministries — French-first, multilingual by design.",
    stack: MHEWS_STACK,
    languages: ['French', 'Arabic', 'Somali', 'English', 'Amharic'],
  },
  {
    id: 'uganda',
    name: 'Uganda Hazards Watch',
    org: 'Government of Uganda · U-MHIEWS',
    region: 'Uganda',
    countries: ['800'],
    view: { lon: 32.4, lat: 1.3, scale: 6 },
    beacon: [32.58, 0.35],
    url: 'https://uganda-mhiews-go-ug-413744588203.europe-west1.run.app/mapviewer',
    role: 'Full-stack & geospatial developer', // VERIFY
    summary:
      'The Uganda Multi-Hazard Impact-based Early Warning System, coordinated from the Office of the Prime Minister and connecting 15 ministries and agencies to impact-based forecasts.',
    stack: MHEWS_STACK,
    languages: ['English', 'Luganda', 'Swahili'],
  },
];

export const partners = [
  'ICPAC',
  'IGAD',
  'SADC',
  'Government of Uganda',
  'Federal Government of Somalia',
  'Republic of Djibouti',
];

export const stats = [
  { value: 5, suffix: '', label: 'Early warning platforms in production' },
  { value: 26, suffix: '', label: 'Countries covered' },
  { value: 11, suffix: '', label: 'Interface languages' },
  { value: 750, suffix: 'M+', label: 'People living in coverage areas' }, // VERIFY (rough population estimate)
];

export const path = [
  {
    step: '01',
    title: 'Software Engineering',
    text: 'Where it started: full-stack web, APIs and a grounding in systems analysis and cybersecurity. Reliable, secure, built to last.',
  },
  {
    step: '02',
    title: 'Geospatial',
    text: 'Satellite imagery, climate grids and vector data turned into map viewers that regional centres and ministries rely on every day.',
  },
  {
    step: '03',
    title: 'AI',
    text: 'Machine learning on Earth-observation data — segmentation, classification and forecasting that sharpen early warnings.',
  },
];

export const about = [
  'I started as a software engineer and found my way to maps — to the moment a raster of rainfall anomalies becomes a decision someone makes in time.',
  'Today I build early warning platforms for regional climate centres and national governments across East and Southern Africa: the data pipelines, the APIs, the map viewers and the infrastructure that keeps them running.',
  'My background in systems analysis and cybersecurity shapes how I build — reliable, secure, and made to hold up in the field.',
];

export const toolbox = [
  {
    title: 'GIS & Earth Observation',
    icon: 'globe',
    blurb: 'From raw satellite scenes to analysis-ready layers.',
    items: ['Google Earth Engine', 'QGIS', 'ArcGIS', 'GDAL', 'PostGIS', 'GeoPandas', 'Leaflet', 'MapLibre'],
  },
  {
    title: 'AI & Machine Learning',
    icon: 'spark',
    blurb: 'Models that read the planet.',
    items: ['TensorFlow', 'PyTorch', 'Scikit-learn', 'UNet', 'Random Forest', 'MaxEnt'],
  },
  {
    title: 'Platform Engineering',
    icon: 'layers',
    blurb: 'APIs, CMSs and interfaces people actually use.',
    items: ['Python', 'Django', 'Wagtail', 'FastAPI', 'Flask', 'React', 'Svelte', 'Next.js', 'PostgreSQL', 'Redis', 'MongoDB'],
  },
  {
    title: 'Cloud & Data Ops',
    icon: 'cloud',
    blurb: 'Pipelines and infrastructure that stay up.',
    items: ['GCP', 'AWS', 'Kubernetes', 'Docker', 'Prefect', 'Dask', 'Coiled', 'CI/CD', 'Linux'],
  },
];

// VERIFY: titles, organisations and dates are guesses.
export const experience = [
  {
    role: 'Software & Geospatial Developer',
    org: 'ICPAC — IGAD Climate Prediction & Applications Centre',
    period: '2023 — Present',
    current: true,
    points: [
      'Build and maintain multi-hazard early warning platforms for IGAD, SADC, Somalia, Djibouti and Uganda.',
      'Engineer satellite and climate data pipelines (Earth Engine, GDAL, Prefect, Dask) that feed live map viewers.',
      'Ship and operate services on GCP Cloud Run, Docker and Kubernetes.',
      'Apply machine learning to hazard and land-cover mapping.',
    ],
  },
  {
    role: 'Software Engineer',
    org: 'Freelance & independent projects',
    period: '2021 — 2023',
    current: false,
    points: [
      'Delivered full-stack web applications with React, Django and Node.',
      'Built machine learning prototypes, including a breast-cancer classifier.',
    ],
  },
];

export const work = [
  {
    title: 'East Africa Drought Watch',
    kind: 'Drought monitoring',
    desc: 'Satellite-driven drought and agricultural monitoring delivering food-security intelligence across the region.',
    tags: ['Python', 'FastAPI', 'GDAL', 'PostgreSQL'],
    href: 'https://droughtwatch.icpac.net/',
    img: null,
  },
  {
    title: 'ICPAC.net',
    kind: 'Climate intelligence hub',
    desc: 'The main platform of the IGAD Climate Prediction & Applications Centre — seasonal outlooks, data and publications.',
    tags: ['Wagtail', 'Django', 'PostgreSQL', 'Docker'],
    href: 'https://www.icpac.net/',
    img: null,
  },
  {
    title: 'Breast Cancer Classifier',
    kind: 'Machine learning',
    desc: 'A diagnostic model that classifies tumours as benign or malignant from cell-nucleus features.',
    tags: ['Python', 'Scikit-learn', 'Pandas'],
    href: 'https://github.com/bravomesh/', // VERIFY: link to repo
    img: 'breast-cancer',
  },
  {
    title: 'Task Tracker',
    kind: 'Web app',
    desc: 'A clean, fast task manager with persistence and reminders.',
    tags: ['React', 'JSON Server'],
    href: 'https://github.com/bravomesh/', // VERIFY: link to repo
    img: 'task-tracker',
  },
  {
    title: 'Restaurant Website',
    kind: 'Web design',
    desc: 'A responsive restaurant site with menu, gallery and reservations.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    href: 'https://github.com/bravomesh/', // VERIFY: link to repo
    img: 'restaurant',
  },
] as const;

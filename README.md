# Diego Chiquiar — Portfolio & CV

**[diegochiquiar.dev](https://diegochiquiar.dev/)**

I'm a .NET backend developer based in Montevideo, Uruguay. This repository
is the source for my personal portfolio and online CV — the site itself,
the data behind it, and the pipeline that builds and publishes it.

## Why a static site, not a SPA

The site has no interactive state worth shipping a client-side framework
for: it's a CV. What it does need is to load fast on a phone, be readable
by search engines and by anyone skimming it in a few seconds, and cost
nothing to host. A static generator (I'm using [Astro](https://astro.build))
gets me all of that by default — plain HTML per route, no client JS unless
a component explicitly asks for it — and GitHub Pages serves the output for
free with no server to keep alive. For a single-purpose content site,
adding a SPA framework and a bundle of client-side routing would be solving
a problem I don't have.

## One data source, two languages, one PDF

My CV exists in English and Spanish, and needs to become both this site and
a downloadable PDF in each language — four outputs from what should be one
set of facts. I keep that content in YAML files under `data/`, and every
other artifact reads from there instead of being written by hand:

- `data/cv.en.yaml` / `data/cv.es.yaml` — the CV, per language.
- `data/proyectos.yaml` — projects with public code, shown on the site.
- `data/schemas/*.schema.json` — a JSON Schema per file, checked in CI
  before anything gets built. A missing required field or a typo in a date
  fails the pipeline instead of quietly reaching production.

Employers are described by industry ("cash-in-transit / valuables transport
company") rather than named on the public site, by choice — that's a
privacy decision, not a data gap. The full detail, including real employer
names, lives in a separate file that's never committed to this repository
and only feeds the PDF I hand out directly. That split means I can keep the
site anonymized and the PDF complete without maintaining two versions of
the same facts by hand.

## What the pipeline checks before it publishes anything

`.github/workflows/deploy.yml` runs on every push to `main`, as a chain of
gates where each one has to pass before the next runs:

1. **Repo leak check** — fails the build if any internal working file ever
   ends up tracked by git. This repository is public; nothing meant to stay
   private should ever reach it, gitignore aside.
2. **Data validation** — every YAML file against its JSON Schema.
3. **Build** — the Astro static build.
4. **Deploy** — only runs if the build succeeded.

I can run the same data validation locally before pushing anything:

```bash
npm run validate:data
```

## Built with AI-assisted development

I use Claude Code as part of how I build this project — including the CI
pipeline, the data schema, and the validation gates described above. I
treat that the same way I'd treat any other tool in my workflow: it's
faster for scaffolding and repetitive structure, and I still own the
review, the architecture decisions, and the correctness of what ships. I'd
rather be upfront about that than pretend every line here was typed by
hand.

## Running it locally

Requires Node 22.12 or newer (`.nvmrc` pins the exact version used in CI).

```bash
npm install
npm run dev       # local dev server
npm run build     # production build into dist/
npm run preview   # serve the dist/ build locally
npm run validate:data  # validate data/*.yaml against their schemas
```

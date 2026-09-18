# Shared public content

This directory is the reviewed, publicly disclosable source of truth used by both apps.

- `profile.json`: public CV fields. No street address, private phone or tailoring notes.
- `projects/`: four bilingual project Markdown records and their images.
- `pdf/`, `videos/`: public project media used by the frontend.

Frontend imports only display content and media. Backend indexes the public profile
and explicitly allowlisted Markdown sections, not arbitrary files or PDFs.
Run `npm run backend:index` after changing text. Supplementary knowledge that is not
displayed on the site belongs in root `knowledge/`, not here.

# Ghost public knowledge

Only Markdown files beginning with the following exact frontmatter are indexed:

```text
---
public: true
---
```

Everything in an approved file may be disclosed to ANY visitor. Do not put passwords,
private contact details, confidential employer information, or unapproved claims here.
Use `##` headings to separate stories, FAQ, career preferences and project details.
Files without approval (including this README) are excluded.

Rebuild from the repository root: `python -m backend.app.knowledge.store`.
Restart the backend after updating the index. Existing public profile and the four
project Markdown files are explicitly allowlisted; attachments and PDFs are not crawled.

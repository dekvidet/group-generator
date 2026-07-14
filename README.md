# Group Generator

[![Try Online](https://img.shields.io/badge/Try%20Online-Open%20Group%20Generator-2563eb?style=for-the-badge&logo=github)](https://dekvidet.github.io/group-generator/)

Turn a participant spreadsheet into fair, repeatable group assignments in minutes.

Group Generator is a browser-based tool for teachers, facilitators, coaches, and event organizers who need to split people into balanced groups across one or more rounds—without repeatedly putting the same people together or losing track of the rules behind each result.

## What problem does it solve?

Manually creating groups is slow, difficult to repeat, and easy to bias. A spreadsheet can contain hundreds of participants, multiple leader requirements, age preferences, family relationships, and several rounds of assignments. Group Generator turns those constraints into a transparent, reproducible schedule that can be reviewed, exported, shared, and displayed on a phone.

## Product highlights

- **Fair group sizes** — groups never exceed the configured maximum, and uneven participant counts are distributed as evenly as possible.
- **Multi-round assignments** — generate several rounds while optimizing new connections and reducing repeated groupmates.
- **Leader continuity** — keep leaders in the same numbered group across every round, with configurable compulsory-leader promotion.
- **Gender and age balancing** — prioritize gender-ratio balance and optimize preferred-age satisfaction when those fields are available.
- **Sibling separation** — keep participants with the same mapped family name apart when required.
- **Transparent statistics** — inspect gender allocation, age satisfaction, repeated contacts, unique-pair coverage, and other result-quality metrics.
- **One-click navigation** — click a statistics row to jump directly to the corresponding group members.
- **Flexible exports** — download XLSX, CSV, or Unicode-safe PDF files using exactly the columns selected for display.
- **Live sharing** — upload a generated CSV to the configured R2 Worker, receive a shareable URL, and show its QR code.
- **Dedicated View page** — open a shared result as a searchable, sortable table on any phone or computer.
- **Saved setup** — column mappings and generation settings are retained locally and restored when a compatible spreadsheet is uploaded again.

## Typical workflow

1. Upload a CSV file.
2. Map the participant columns and their values.
3. Choose group size, rounds, balancing rules, leaders, and display columns.
4. Generate and inspect the groups and statistics.
5. Export the result or select **Upload data** to create a share link and QR code.

## Sharing results

The View page can open a public CSV address directly:

```text
https://dekvidet.github.io/group-generator/#/view?file=<encoded-public-csv-url>
```

When the R2 upload Worker is configured, the generator creates this link automatically. The published file contains only the selected export columns and generated assignments. Shared R2 files are public to anyone who has the link, so remove files when they are no longer needed.

## Try it online

Open the hosted application: [Group Generator on GitHub Pages](https://dekvidet.github.io/group-generator/)

For the algorithm, constraints, metrics, export details, and deployment notes, see [design.md](design.md).

## License

Licensed under [GPLv3](LICENSE.txt).

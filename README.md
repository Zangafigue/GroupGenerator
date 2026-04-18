# GroupMaker — Random Group Generator

A lightweight, client-side web application for generating random groups from a participant list, with CSV/Excel import and PDF export.

---

## Features

- **File import** — Drag-and-drop or file selection for **CSV**, **XLSX**, and **XLS** formats
- **Manual entry** — Add names via a text field or a multi-line paste area
- **Search and selection** — Filter participants and toggle individual selections
- **Random generation** — Uses the Fisher-Yates shuffle for reliable randomisation
- **Regeneration** — Re-shuffle and regenerate groups in one click
- **Clipboard copy** — Copy all groups as formatted plain text
- **PDF export** — Download a colour-coded, well-formatted PDF
- **Dark / light theme** — Persistent preference stored in `localStorage`
- **Accessibility** — ARIA attributes and full keyboard navigation

---

## Usage

No installation required. GroupMaker is a **100% client-side** application.

1. Clone the repository:
   ```bash
   git clone https://github.com/zangafigue/GroupGenerator.git
   cd GroupGenerator
   ```
2. Open `index.html` in any modern browser.

No server, no dependencies to install.

---

## Project structure

```
GroupGenerator/
├── index.html        # Main HTML structure
├── css/
│   └── style.css     # Styles (CSS variables, dark mode, animations)
└── js/
    └── script.js     # Application logic (import, generation, PDF, theme)
```

---

## Accepted file format

For **CSV** and **Excel** files, the expected columns are:

| Column       | Description        |
|--------------|--------------------|
| `last_name`  | Participant's last name  |
| `first_name` | Participant's first name |

If the columns are not found, each row is treated as a full name.

---

## Technologies

- HTML5 / CSS3 / JavaScript (ES6+) — no framework
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel file parsing
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) — Typography
- [Material Icons](https://fonts.google.com/icons) — Icons

---

## License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

Made by **Zangafigue Mathias TRAORE**

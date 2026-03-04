# 📁 Folder Structure Generator

A VS Code extension that lets you right-click any folder and instantly generate a beautiful, readable tree structure.

---

## ✨ Features

- **Right-click any folder** in the Explorer sidebar
- Hover over **"📁 Generate Folder Structure"** to see the submenu
- Choose your depth:
  - `Top Level Only (1 level)`
  - `2 Levels Deep`
  - `3 Levels Deep`
  - `Custom Depth...` — enter any number
- Output opens in a **new editor tab** beside your code
- **Auto-copies to clipboard** so you can paste it anywhere
- Ignores `node_modules`, `.git`, `dist`, and more by default

---

## 🖼️ Example Output

```
──────────────────────────────────────────────────
  📁  my-monorepo
  🔍  Depth: 2 Levels
  📅  3/4/2026, 10:30:00 AM
──────────────────────────────────────────────────

my-monorepo/
├── apps/
│   ├── accounting/
│   └── inventory/
│
├── packages/
│   ├── api-client/
│   ├── core-auth/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/
│
└── docs/
```

---

## ⚙️ Settings

Open `Settings` → search **"Folder Structure"** to customize:

| Setting | Default | Description |
|---|---|---|
| `folderStructure.ignore` | `["node_modules", ".git", "dist", ...]` | Folders/files to skip |
| `folderStructure.showFiles` | `false` | Include files (not just folders) |
| `folderStructure.outputTarget` | `"both"` | `"clipboard"`, `"newFile"`, or `"both"` |

---

## 🚀 How to Install (from source)

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript
npm run compile

# 3. Package the extension
npm install -g @vscode/vsce
vsce package

# 4. Install the .vsix in VS Code
# Press Ctrl+Shift+P → "Install from VSIX..." → select the file
```

---

## 📦 Files

```
folder-structure-generator/
├── src/
│   └── extension.ts       ← All the logic
├── package.json           ← Commands, menus, settings
├── tsconfig.json
└── README.md
```
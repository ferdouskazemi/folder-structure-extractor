# 📁 Folder Structure Generator

Generate a beautiful folder tree directly from the VS Code Explorer — right-click any folder and you're done.

---

## Usage

1. **Right-click** any folder in the Explorer sidebar
2. Hover over **"📁 Generate Folder Structure"**
3. Pick your depth:

| Option | Description |
|---|---|
| Top Level Only | Immediate children only |
| 2 Levels Deep | Children + their children |
| 3 Levels Deep | One more level down |
| Custom Depth... | Type any number from 1–20 |

4. A panel opens beside your code with the generated tree

---

## Output

```
📦src
 ┣ 📂app
 ┃ ┣ 📂(auth)
 ┃ ┃ ┣ 📂login
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┗ 📂register
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂(dashboard)
 ┃ ┃ ┣ 📂analytics
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┗ 📂settings
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📜layout.tsx
 ┃ ┗ 📜page.tsx
 ┣ 📂components
 ┃ ┣ 📂ui
 ┃ ┃ ┣ 📜button.tsx
 ┃ ┃ ┣ 📜card.tsx
 ┃ ┃ ┗ 📜input.tsx
 ┃ ┗ 📂shared
 ┃ ┃ ┣ 📜navbar.tsx
 ┃ ┃ ┗ 📜footer.tsx
 ┣ 📂lib
 ┃ ┣ 📜auth.ts
 ┃ ┣ 📜db.ts
 ┃ ┗ 📜utils.ts
 ┣ 📂hooks
 ┃ ┣ 📜useAuth.ts
 ┃ ┗ 📜useFetch.ts
 ┗ 📂types
 ┃ ┗ 📜index.ts
```

---

## Panel Controls

- **📋 Copy** — copies the full tree to your clipboard
- **✨ Icons On / 🚫 Icons Off** — toggle emoji icons on or off

---

## Settings

Go to `Settings` and search **"Folder Structure"** to customize:

| Setting | Default | Description |
|---|---|---|
| `folderStructure.ignore` | `node_modules`, `.git`, `dist`... | Items to skip |
| `folderStructure.showFiles` | `true` | Show files alongside folders |
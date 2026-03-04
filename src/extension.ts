import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface TreeOptions {
  maxDepth: number;
  showFiles: boolean;
  ignore: string[];
}

interface TreeNode {
  name: string;
  isDir: boolean;
  children?: TreeNode[];
}

// ============================================================
// ICON THEME DEFINITIONS
// ============================================================
interface IconTheme {
  name: string;
  folder: string;
  file: string;
  root: string;
}

const iconThemes: Record<string, IconTheme> = {
  emoji: { name: "Emoji", folder: "📂", file: "📜", root: "📦" },
  minimal: { name: "Minimal", folder: "📁", file: "📄", root: "🗃️" },
  outline: { name: "Outline", folder: "📂", file: "📄", root: "🗂️" },
  vscode: { name: "VS Code", folder: "📁", file: "📃", root: "📦" },
  none: { name: "None", folder: "", file: "", root: "📦" }
};

// ============================================================
// CONNECTOR STYLE DEFINITIONS
// ============================================================
interface ConnectorStyle {
  name: string;
  branch: string;    // Middle item connector
  last: string;      // Last item connector
  vertical: string;  // Vertical line for continuation
  indent: string;    // Indentation for no-connector style
}

const connectorStyles: Record<string, ConnectorStyle> = {
  classic: { name: "Classic", branch: "┣ ", last: "┗ ", vertical: "┃ ", indent: "  " },
  ascii: { name: "ASCII", branch: "|-- ", last: "`-- ", vertical: "|   ", indent: "    " },
  dotted: { name: "Dotted", branch: "│· ", last: "╰· ", vertical: "│  ", indent: "   " },
  rounded: { name: "Rounded", branch: "├─ ", last: "╰─ ", vertical: "│  ", indent: "   " },
  bold: { name: "Bold", branch: "┣ ", last: "┗ ", vertical: "┃ ", indent: "  " },
  none: { name: "None", branch: "  ", last: "  ", vertical: "  ", indent: "    " }
};

function buildTree(dirPath: string, options: TreeOptions, currentDepth = 0): TreeNode[] {
  if (currentDepth >= options.maxDepth) return [];
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); }
  catch { return []; }

  const filtered = entries.filter((e) => !options.ignore.includes(e.name));
  const sorted = filtered.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const nodes: TreeNode[] = [];
  for (const entry of sorted) {
    const isDir = entry.isDirectory();
    if (!isDir && !options.showFiles) continue;
    const node: TreeNode = { name: entry.name, isDir };
    if (isDir) {
      node.children = buildTree(path.join(dirPath, entry.name), options, currentDepth + 1);
    }
    nodes.push(node);
  }
  return nodes;
}

function renderTree(
  nodes: TreeNode[],
  style: ConnectorStyle,
  theme: IconTheme,
  withIcons: boolean,
  prefix = ""
): string {
  let out = "";
  nodes.forEach((node, i) => {
    const last = i === nodes.length - 1;
    const branch = last ? style.last : style.branch;
    const childPfx = last ? style.indent : style.vertical;
    const icon = withIcons ? (node.isDir ? theme.folder : theme.file) : "";
    const spacer = withIcons && icon ? " " : "";
    const dirMarker = !withIcons && node.isDir ? "/" : "";
    out += `${prefix}${branch}${icon}${spacer}${node.name}${dirMarker}\n`;
    if (node.children?.length) {
      out += renderTree(node.children, style, theme, withIcons, prefix + childPfx);
    }
  });
  return out;
}

// Generates a cryptographically random nonce for CSP — required by VS Code's
// recommended webview pattern so the service worker registers correctly on
// all machines / VS Code versions (avoids the InvalidStateError).
function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function buildWebview(
  panel: vscode.WebviewPanel,
  folderName: string,
  nodes: TreeNode[]
) {
  const csp = panel.webview.cspSource;
  const nonce = getNonce();

  // Build icon themes and connector styles data for the webview
  const themesData = JSON.stringify(iconThemes);
  const stylesData = JSON.stringify(connectorStyles);
  const nodesData = JSON.stringify(nodes);
  const folderNameData = JSON.stringify(folderName);

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${csp}; style-src 'unsafe-inline' ${csp}; connect-src ${csp};">
<title>Folder Structure</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0d1117;
    color: #e6edf3;
    min-height: 100vh;
    padding: 24px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #58a6ff;
  }
  .controls { 
    display: flex; 
    gap: 10px; 
    flex-wrap: wrap;
    align-items: center;
  }
  .dropdown-wrapper {
    position: relative;
  }
  .dropdown-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid #30363d;
    background: #21262d;
    color: #e6edf3;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 140px;
    justify-content: space-between;
  }
  .dropdown-btn:hover { 
    background: #30363d; 
    border-color: #484f58;
  }
  .dropdown-btn:focus {
    outline: none;
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2);
  }
  .dropdown-btn .arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
  }
  .dropdown-btn.open .arrow {
    transform: rotate(180deg);
  }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 8px;
    overflow: hidden;
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: all 0.2s ease;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .dropdown-menu.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  .dropdown-item {
    padding: 10px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    transition: background 0.1s ease;
  }
  .dropdown-item:hover {
    background: #30363d;
  }
  .dropdown-item.selected {
    background: #388bfd22;
    color: #58a6ff;
  }
  .dropdown-item .check {
    color: #58a6ff;
    font-weight: bold;
  }
  button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-copy { background: #238636; color: #fff; }
  .btn-copy:hover { background: #2ea043; transform: translateY(-1px); }
  .btn-toggle { background: #21262d; color: #e6edf3; border: 1px solid #30363d; }
  .btn-toggle:hover { background: #30363d; transform: translateY(-1px); }
  .btn-toggle.active { background: #388bfd22; border-color: #388bfd; color: #58a6ff; }
  .tree-container { background: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden; }
  .tree-toolbar {
    background: #21262d;
    border-bottom: 1px solid #30363d;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot-red { background: #ff5f57; }
  .dot-yellow { background: #febc2e; }
  .dot-green { background: #28c840; }
  .tree-label { margin-left: auto; font-size: 12px; color: #8b949e; font-family: monospace; }
  pre {
    padding: 20px 24px;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 13.5px;
    line-height: 1.75;
    color: #e6edf3;
    white-space: pre;
    overflow-x: auto;
  }
  .root-line { color: #58a6ff; font-weight: 700; font-size: 15px; }
  .toast {
    position: fixed;
    bottom: 24px; right: 24px;
    background: #238636;
    color: #fff;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.25s ease;
    pointer-events: none;
  }
  .toast.show { opacity: 1; transform: translateY(0); }
  
  /* Animation for tree changes */
  pre {
    transition: opacity 0.15s ease;
  }
  pre.updating {
    opacity: 0.5;
  }
</style>
</head>
<body>
<div class="header">
  <div class="title">
    <span>📁</span>
    <span id="headerFolderName">${folderName}</span>
  </div>
  <div class="controls">
    <div class="dropdown-wrapper">
      <button class="dropdown-btn" id="themeDropdownBtn">
        <span>🎨 Icons: <span id="themeLabel">Emoji</span></span>
        <span class="arrow">▼</span>
      </button>
      <div class="dropdown-menu" id="themeDropdown"></div>
    </div>
    <div class="dropdown-wrapper">
      <button class="dropdown-btn" id="styleDropdownBtn">
        <span>┣ Style: <span id="styleLabel">Classic</span></span>
        <span class="arrow">▼</span>
      </button>
      <div class="dropdown-menu" id="styleDropdown"></div>
    </div>
    <button class="btn-toggle active" id="toggleBtn">
      <span id="toggleIcon">✨</span>
      <span id="toggleText">Icons On</span>
    </button>
    <button class="btn-copy" id="copyBtn">
      <span>📋</span>
      <span>Copy</span>
    </button>
  </div>
</div>
<div class="tree-container">
  <div class="tree-toolbar">
    <div class="dot dot-red"></div>
    <div class="dot dot-yellow"></div>
    <div class="dot dot-green"></div>
    <span class="tree-label" id="treeLabel">emoji icons • classic style</span>
  </div>
  <pre id="treeOutput"></pre>
</div>
<div class="toast" id="toast">✅ Copied to clipboard!</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  
  // Data from extension
  const iconThemes = ${themesData};
  const connectorStyles = ${stylesData};
  const nodes = ${nodesData};
  const folderName = ${folderNameData};
  
  // Current state
  let currentTheme = 'emoji';
  let currentStyle = 'classic';
  let iconsOn = true;
  let openDropdown = null;

  // Initialize dropdowns
  function initDropdowns() {
    const themeDropdown = document.getElementById('themeDropdown');
    const styleDropdown = document.getElementById('styleDropdown');
    
    // Build theme dropdown items
    Object.keys(iconThemes).forEach(key => {
      const theme = iconThemes[key];
      const item = document.createElement('div');
      item.className = 'dropdown-item' + (key === currentTheme ? ' selected' : '');
      item.dataset.value = key;
      item.innerHTML = '<span>' + theme.name + '</span>' + (key === currentTheme ? '<span class="check">✓</span>' : '');
      item.addEventListener('click', () => selectTheme(key));
      themeDropdown.appendChild(item);
    });
    
    // Build style dropdown items
    Object.keys(connectorStyles).forEach(key => {
      const style = connectorStyles[key];
      const item = document.createElement('div');
      item.className = 'dropdown-item' + (key === currentStyle ? ' selected' : '');
      item.dataset.value = key;
      item.innerHTML = '<span>' + style.name + '</span>' + (key === currentStyle ? '<span class="check">✓</span>' : '');
      item.addEventListener('click', () => selectStyle(key));
      styleDropdown.appendChild(item);
    });
  }

  // Toggle dropdown
  function toggleDropdown(dropdownId, btnId) {
    const dropdown = document.getElementById(dropdownId);
    const btn = document.getElementById(btnId);
    
    if (openDropdown === dropdownId) {
      dropdown.classList.remove('open');
      btn.classList.remove('open');
      openDropdown = null;
    } else {
      // Close any open dropdown
      if (openDropdown) {
        document.getElementById(openDropdown).classList.remove('open');
        document.getElementById(openDropdown.replace('Dropdown', 'DropdownBtn')).classList.remove('open');
      }
      dropdown.classList.add('open');
      btn.classList.add('open');
      openDropdown = dropdownId;
    }
  }

  // Select theme
  function selectTheme(key) {
    currentTheme = key;
    document.getElementById('themeLabel').textContent = iconThemes[key].name;
    
    // Update dropdown items
    document.querySelectorAll('#themeDropdown .dropdown-item').forEach(item => {
      const isSelected = item.dataset.value === key;
      item.className = 'dropdown-item' + (isSelected ? ' selected' : '');
      item.innerHTML = '<span>' + iconThemes[item.dataset.value].name + '</span>' + (isSelected ? '<span class="check">✓</span>' : '');
    });
    
    closeDropdowns();
    updateTree();
  }

  // Select style
  function selectStyle(key) {
    currentStyle = key;
    document.getElementById('styleLabel').textContent = connectorStyles[key].name;
    
    // Update dropdown items
    document.querySelectorAll('#styleDropdown .dropdown-item').forEach(item => {
      const isSelected = item.dataset.value === key;
      item.className = 'dropdown-item' + (isSelected ? ' selected' : '');
      item.innerHTML = '<span>' + connectorStyles[item.dataset.value].name + '</span>' + (isSelected ? '<span class="check">✓</span>' : '');
    });
    
    closeDropdowns();
    updateTree();
  }

  // Close all dropdowns
  function closeDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.dropdown-btn').forEach(b => b.classList.remove('open'));
    openDropdown = null;
  }

  // Render tree
  function renderTree(nodes, style, theme, withIcons, prefix = '') {
    let out = '';
    nodes.forEach((node, i) => {
      const last = i === nodes.length - 1;
      const branch = last ? style.last : style.branch;
      const childPfx = last ? style.indent : style.vertical;
      const icon = withIcons ? (node.isDir ? theme.folder : theme.file) : '';
      const spacer = withIcons && icon ? ' ' : '';
      const dirMarker = !withIcons && node.isDir ? '/' : '';
      out += prefix + branch + icon + spacer + node.name + dirMarker + '\\n';
      if (node.children && node.children.length) {
        out += renderTree(node.children, style, theme, withIcons, prefix + childPfx);
      }
    });
    return out;
  }

  // Update tree display
  function updateTree() {
    const pre = document.getElementById('treeOutput');
    pre.classList.add('updating');
    
    setTimeout(() => {
      const theme = iconThemes[currentTheme];
      const style = connectorStyles[currentStyle];
      const treeHtml = renderTree(nodes, style, theme, iconsOn);
      
      pre.innerHTML = '<span class="root-line">' + theme.root + folderName + '</span>\\n' + 
        treeHtml.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
      
      // Update toolbar label
      const iconLabel = iconsOn ? iconThemes[currentTheme].name.toLowerCase() : 'no';
      document.getElementById('treeLabel').textContent = iconLabel + ' icons • ' + connectorStyles[currentStyle].name.toLowerCase() + ' style';
      
      pre.classList.remove('updating');
    }, 50);
  }

  // Toggle icons
  function toggleIcons() {
    iconsOn = !iconsOn;
    const btn = document.getElementById('toggleBtn');
    btn.classList.toggle('active', iconsOn);
    document.getElementById('toggleIcon').textContent = iconsOn ? '✨' : '🚫';
    document.getElementById('toggleText').textContent = iconsOn ? 'Icons On' : 'Icons Off';
    updateTree();
  }

  // Copy tree
  function copyTree() {
    const theme = iconThemes[currentTheme];
    const style = connectorStyles[currentStyle];
    const treeText = theme.root + folderName + '\\n' + renderTree(nodes, style, theme, iconsOn);
    vscode.postMessage({ type: 'copy', text: treeText });
  }

  // Event listeners
  document.getElementById('themeDropdownBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown('themeDropdown', 'themeDropdownBtn');
  });
  
  document.getElementById('styleDropdownBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown('styleDropdown', 'styleDropdownBtn');
  });
  
  document.getElementById('toggleBtn').addEventListener('click', toggleIcons);
  document.getElementById('copyBtn').addEventListener('click', copyTree);
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
      closeDropdowns();
    }
  });
  
  // Listen for copy confirmation from extension
  window.addEventListener('message', (event) => {
    if (event.data.type === 'copied') {
      const btn = document.getElementById('copyBtn');
      btn.innerHTML = '<span>✅</span><span>Copied!</span>';
      setTimeout(() => { btn.innerHTML = '<span>📋</span><span>Copy</span>'; }, 2000);
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }
  });

  // Initialize
  initDropdowns();
  updateTree();
</script>
</body>
</html>`;

  // Handle copy message from webview
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === "copy") {
      await vscode.env.clipboard.writeText(message.text);
      panel.webview.postMessage({ type: "copied" });
    }
  });
}

async function generate(uri: vscode.Uri | undefined, depth: number) {
  let folderPath: string | undefined;
  if (uri) {
    folderPath = uri.fsPath;
  } else {
    const ws = vscode.workspace.workspaceFolders;
    if (ws?.length) folderPath = ws[0].uri.fsPath;
  }

  if (!folderPath) {
    vscode.window.showErrorMessage("No folder selected. Right-click a folder in the Explorer.");
    return;
  }

  const config = vscode.workspace.getConfiguration("folderStructure");
  const ignore: string[] = config.get("ignore") ?? [];
  const showFiles: boolean = config.get("showFiles") ?? true;
  const options: TreeOptions = { maxDepth: depth, ignore, showFiles };
  const nodes = buildTree(folderPath, options);

  if (!nodes.length) {
    const rawEntries = (() => { try { return fs.readdirSync(folderPath!); } catch { return []; } })();
    const ignoredItems = rawEntries.filter((e) => ignore.includes(e));
    const detail = rawEntries.length === 0
      ? "The folder is genuinely empty."
      : `Found ${rawEntries.length} item(s) but ${ignoredItems.length} were ignored (${ignoredItems.join(", ") || "none"}).`;
    vscode.window.showWarningMessage(`📁 Nothing to show. ${detail}`);
    return;
  }

  const folderName = path.basename(folderPath);
  const depthLabel = depth === 1 ? "Top Level" : `${depth} Levels`;

  const panel = vscode.window.createWebviewPanel(
    "folderStructure",
    `📁 ${folderName} — ${depthLabel}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: []
    }
  );

  buildWebview(panel, folderName, nodes);
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("folderStructure.generateLevel1", (uri: vscode.Uri) => generate(uri, 1)),
    vscode.commands.registerCommand("folderStructure.generateLevel2", (uri: vscode.Uri) => generate(uri, 2)),
    vscode.commands.registerCommand("folderStructure.generateLevel3", (uri: vscode.Uri) => generate(uri, 3)),
    vscode.commands.registerCommand("folderStructure.generateCustom", async (uri: vscode.Uri) => {
      const input = await vscode.window.showInputBox({
        prompt: "Enter the depth level (e.g. 4, 5, 10...)",
        placeHolder: "Enter a number between 1–20",
        validateInput: (val) => {
          const n = parseInt(val);
          return isNaN(n) || n < 1 || n > 20 ? "Please enter a number between 1 and 20" : null;
        },
      });
      if (input) await generate(uri, parseInt(input));
    })
  );
}

export function deactivate() {}
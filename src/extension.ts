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

function renderIcons(nodes: TreeNode[], prefix = ""): string {
  let out = "";
  nodes.forEach((node, i) => {
    const last = i === nodes.length - 1;
    const branch = last ? "┗ " : "┣ ";
    const childPfx = last ? "  " : "┃ ";
    const icon = node.isDir ? "📂" : "📜";
    out += `${prefix}${branch}${icon}${node.name}\n`;
    if (node.children?.length) out += renderIcons(node.children, prefix + childPfx);
  });
  return out;
}

function renderPlain(nodes: TreeNode[], prefix = ""): string {
  let out = "";
  nodes.forEach((node, i) => {
    const last = i === nodes.length - 1;
    const branch = last ? "┗ " : "┣ ";
    const childPfx = last ? "  " : "┃ ";
    out += `${prefix}${branch}${node.name}${node.isDir ? "/" : ""}\n`;
    if (node.children?.length) out += renderPlain(node.children, prefix + childPfx);
  });
  return out;
}

function buildWebview(
  panel: vscode.WebviewPanel,
  folderName: string,
  withIcons: string,
  noIcons: string
) {
  const withIconsFull = "📦" + folderName + "\n" + withIcons;
  const noIconsFull   = "📦" + folderName + "\n" + noIcons;

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
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
  .controls { display: flex; gap: 10px; }
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
</style>
</head>
<body>
<div class="header">
  <div class="title">
    <span>📁</span>
    <span>${folderName}</span>
  </div>
  <div class="controls">
    <button class="btn-toggle active" id="toggleBtn" onclick="toggleIcons()">
      <span id="toggleIcon">✨</span>
      <span id="toggleText">Icons On</span>
    </button>
    <button class="btn-copy" id="copyBtn" onclick="copyTree()">
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
    <span class="tree-label" id="treeLabel">with icons</span>
  </div>
  <pre id="treeOutput"><span class="root-line">📦${folderName}</span>
${withIcons.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
</div>
<div class="toast" id="toast">✅ Copied to clipboard!</div>

<script>
  const vscode = acquireVsCodeApi();
  const dataIcons = ${JSON.stringify(withIconsFull)};
  const dataPlain = ${JSON.stringify(noIconsFull)};
  const iconHtml  = ${JSON.stringify(withIcons.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"))};
  const plainHtml = ${JSON.stringify(noIcons.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"))};
  const rootName  = ${JSON.stringify(folderName)};
  let iconsOn = true;

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

  function toggleIcons() {
    iconsOn = !iconsOn;
    const pre = document.getElementById('treeOutput');
    const btn = document.getElementById('toggleBtn');
    pre.innerHTML = '<span class="root-line">📦' + rootName + '</span>\\n' + (iconsOn ? iconHtml : plainHtml);
    btn.classList.toggle('active', iconsOn);
    document.getElementById('toggleIcon').textContent = iconsOn ? '✨' : '🚫';
    document.getElementById('toggleText').textContent = iconsOn ? 'Icons On' : 'Icons Off';
    document.getElementById('treeLabel').textContent = iconsOn ? 'with icons' : 'no icons';
  }

  function copyTree() {
    // Send message to extension to copy via VS Code API (avoids clipboard issue in webview)
    vscode.postMessage({ type: 'copy', text: iconsOn ? dataIcons : dataPlain });
  }
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

  buildWebview(panel, folderName, renderIcons(nodes), renderPlain(nodes));
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
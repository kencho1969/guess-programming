const ROWS = 20;
const COLS = 16;
const BLOCK_ROWS = 5;
const BLOCK_COLS = 4;
const BLOCK_H = 4;
const BLOCK_W = 4;
const TOTAL_BLOCKS = 20;
const CELL_SIZE = 40;
const AUTO_REFRESH_DELAY_MS = 180;

const elements = {
  problemInput: document.getElementById("problemInput"),
  hideProblemInput: document.getElementById("hideProblemInput"),
  permutationGrid: document.getElementById("permutationGrid"),
  resetPermutationButton: document.getElementById("resetPermutationButton"),
  kRange: document.getElementById("kRange"),
  kNumber: document.getElementById("kNumber"),
  exportZipButton: document.getElementById("exportZipButton"),
  saveProjectButton: document.getElementById("saveProjectButton"),
  importProjectInput: document.getElementById("importProjectInput"),
  statusMessage: document.getElementById("statusMessage"),
  previewCanvas: document.getElementById("previewCanvas"),
};

const state = {
  gridChars: null,
  permutationArray: [],
  permutation: null,
  k: 20,
};

let autoRefreshTimer = null;
let autoRefreshVersion = 0;

function defaultPermutationArray() {
  return Array.from({ length: TOTAL_BLOCKS }, (_, idx) => idx + 1);
}

function defaultProblemText() {
  const text = [
    "ABCDEFGHIJKLMNOP",
    "QRSTUVWXYZ012345",
    "6789ABCDEFGHIJKL",
    "MNOPQRSTUVWXYZ01",
    "23456789ABCDEFGH",
    "IJKLMNOPQRSTUVWX",
    "YZ0123456789ABCD",
    "EFGHIJKLMNOPQRST",
    "UVWXYZ0123456789",
    "ABCDEFGHIJKLMNOP",
    "QRSTUVWXYZ012345",
    "6789ABCDEFGHIJKL",
    "MNOPQRSTUVWXYZ01",
    "23456789ABCDEFGH",
    "IJKLMNOPQRSTUVWX",
    "YZ0123456789ABCD",
    "EFGHIJKLMNOPQRST",
    "UVWXYZ0123456789",
    "ABCDEFGHIJKLMNOP",
    "QRSTUVWXYZ012345",
  ];
  return text.join("\n");
}

function setStatus(message, type = "ok") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.remove("ok", "error");
  if (type) {
    elements.statusMessage.classList.add(type);
  }
}

function normalizeProblemText(rawText) {
  const lines = rawText.replace(/\r/g, "").split("\n");
  const grid = [];
  for (let r = 0; r < ROWS; r += 1) {
    const line = lines[r] || "";
    const chars = Array.from(line);
    const row = chars.slice(0, COLS);
    while (row.length < COLS) {
      row.push(" ");
    }
    grid.push(row);
  }
  return grid;
}

function validatePermutationArray(values) {
  if (!Array.isArray(values)) {
    throw new Error("permutation は配列で指定してください。");
  }
  if (values.length !== TOTAL_BLOCKS) {
    throw new Error(`順列の個数は ${TOTAL_BLOCKS} 個必要です。現在: ${values.length} 個`);
  }

  const normalized = values.map((value) => {
    const num = Number(value);
    if (!Number.isInteger(num)) {
      throw new Error(`整数でない値があります: ${value}`);
    }
    if (num < 1 || num > TOTAL_BLOCKS) {
      throw new Error(`範囲外の値があります: ${value} (1〜${TOTAL_BLOCKS})`);
    }
    return num;
  });

  const unique = new Set(normalized);
  if (unique.size !== TOTAL_BLOCKS) {
    throw new Error("順列に重複があります。1〜20を重複なしで指定してください。");
  }

  return normalized;
}

function permutationToMatrix(permutationArray) {
  const matrix = [];
  for (let r = 0; r < BLOCK_ROWS; r += 1) {
    matrix.push(permutationArray.slice(r * BLOCK_COLS, (r + 1) * BLOCK_COLS));
  }
  return matrix;
}

function blockNumberAt(matrix, row, col) {
  const br = Math.floor(row / BLOCK_H);
  const bc = Math.floor(col / BLOCK_W);
  return matrix[br][bc];
}

function drawGrid(canvas, gridChars, permutationMatrix, k) {
  const width = COLS * CELL_SIZE;
  const height = ROWS * CELL_SIZE;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(CELL_SIZE * 0.6)}px "M PLUS 1 Code", "Consolas", "Courier New", monospace`;

  const hiddenMap = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;
      const blockNumber = blockNumberAt(permutationMatrix, r, c);
      const isHidden = blockNumber > k;
      hiddenMap[r][c] = isHidden;

      if (!isHidden) {
        const ch = gridChars[r][c];
        if (ch !== " ") {
          ctx.fillStyle = "#161616";
          ctx.fillText(ch, x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 1);
        }
      }
    }
  }

  ctx.strokeStyle = "#b0bcc8";
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c += 1) {
    const x = c * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r += 1) {
    const y = r * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#2f3b49";
  ctx.lineWidth = 2;
  for (let c = 0; c <= COLS; c += BLOCK_W) {
    const x = c * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r += BLOCK_H) {
    const y = r * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 罫線描画後に黒セルで上書きし、黒塗り領域内の線を見えなくする。
  ctx.fillStyle = "#111111";
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (hiddenMap[r][c]) {
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

function setPermutationArray(nextPermutationArray) {
  state.permutationArray = validatePermutationArray(nextPermutationArray);
  state.permutation = permutationToMatrix(state.permutationArray);
  updatePermutationGridFromState();
}

function refreshStateFromInputs() {
  state.gridChars = normalizeProblemText(elements.problemInput.value);
  state.permutation = permutationToMatrix(state.permutationArray);
}

function renderPreview() {
  if (!state.gridChars || !state.permutation) {
    return;
  }
  drawGrid(elements.previewCanvas, state.gridChars, state.permutation, state.k);
}

function clampK(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 1;
  }
  return Math.min(TOTAL_BLOCKS, Math.max(1, Math.round(num)));
}

function syncKInputs(nextK) {
  state.k = clampK(nextK);
  elements.kRange.value = String(state.k);
  elements.kNumber.value = String(state.k);
  if (state.gridChars && state.permutation) {
    renderPreview();
  } else {
    scheduleAutoRefresh();
  }
}

function timestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("画像Blobの生成に失敗しました。"));
      }
    }, "image/png");
  });
}

function setBusy(isBusy) {
  elements.exportZipButton.disabled = isBusy;
  elements.saveProjectButton.disabled = isBusy;
  elements.resetPermutationButton.disabled = isBusy;
  elements.problemInput.disabled = isBusy;
  elements.hideProblemInput.disabled = isBusy;
  elements.kRange.disabled = isBusy;
  elements.kNumber.disabled = isBusy;
  elements.importProjectInput.disabled = isBusy;

  const permutationInputs = elements.permutationGrid.querySelectorAll(".perm-cell");
  permutationInputs.forEach((input) => {
    input.disabled = isBusy;
  });
}

async function exportZip() {
  if (typeof JSZip === "undefined") {
    setStatus("JSZipが見つかりません。jszip.min.js を確認してください。", "error");
    return;
  }

  if (!tryRefreshAndRender()) {
    return;
  }
  setBusy(true);

  try {
    const zip = new JSZip();
    const workCanvas = document.createElement("canvas");

    for (let k = 1; k <= TOTAL_BLOCKS; k += 1) {
      setStatus(`画像生成中... (${k}/${TOTAL_BLOCKS})`, "ok");
      drawGrid(workCanvas, state.gridChars, state.permutation, k);
      const blob = await canvasToBlob(workCanvas);
      const name = `k${String(k).padStart(2, "0")}.png`;
      zip.file(name, blob);
    }

    setStatus("Zipを生成中...", "ok");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `grid_images_${timestamp()}.zip`);
    setStatus("Zipを保存しました。", "ok");
  } catch (err) {
    setStatus(`Zip出力に失敗しました: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
}

function saveProject() {
  try {
    validatePermutationArray(state.permutationArray);
  } catch (err) {
    setStatus(err.message, "error");
    return;
  }

  const project = {
    version: 1,
    encoding: "UTF-8",
    createdAt: new Date().toISOString(),
    problemText: elements.problemInput.value.replace(/\r/g, ""),
    permutation: state.permutationArray.slice(),
  };

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `grid_project_${timestamp()}.json`);
  setStatus("プロジェクトデータを保存しました。", "ok");
}

async function importProject(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || typeof data !== "object") {
      throw new Error("JSONオブジェクトではありません。");
    }
    if (typeof data.problemText !== "string") {
      throw new Error("problemText (文字列) がありません。");
    }

    const permutationArray = validatePermutationArray(data.permutation);

    elements.problemInput.value = data.problemText.replace(/\r/g, "");
    setPermutationArray(permutationArray);
    tryRefreshAndRender();
    setStatus("プロジェクトデータを読み込みました。", "ok");
  } catch (err) {
    setStatus(`読込に失敗しました: ${err.message}`, "error");
  } finally {
    elements.importProjectInput.value = "";
  }
}

function parsePermutationCellValue(rawValue) {
  const normalized = rawValue.trim();
  if (normalized === "") {
    return null;
  }
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const num = Number(normalized);
  if (!Number.isInteger(num)) {
    return null;
  }
  return num;
}

function updatePermutationGridFromState() {
  const inputs = elements.permutationGrid.querySelectorAll(".perm-cell");
  inputs.forEach((input, idx) => {
    input.value = String(state.permutationArray[idx]);
  });
}

function commitPermutationEdit(index, rawValue) {
  const currentValue = state.permutationArray[index];
  const nextValue = parsePermutationCellValue(rawValue);

  if (nextValue === null || nextValue < 1 || nextValue > TOTAL_BLOCKS) {
    updatePermutationGridFromState();
    return;
  }

  if (nextValue === currentValue) {
    updatePermutationGridFromState();
    return;
  }

  const swapIndex = state.permutationArray.indexOf(nextValue);
  if (swapIndex === -1) {
    updatePermutationGridFromState();
    return;
  }

  const next = state.permutationArray.slice();
  next[index] = nextValue;
  next[swapIndex] = currentValue;
  setPermutationArray(next);
  scheduleAutoRefresh();
}

function createPermutationGrid() {
  elements.permutationGrid.innerHTML = "";

  for (let idx = 0; idx < TOTAL_BLOCKS; idx += 1) {
    const input = document.createElement("input");
    input.className = "perm-cell";
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 2;
    input.autocomplete = "off";
    input.setAttribute("aria-label", `ブロック順列 ${idx + 1} 番目`);

    input.addEventListener("focus", () => {
      input.select();
    });

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^\d]/g, "").slice(0, 2);
    });

    input.addEventListener("blur", () => {
      commitPermutationEdit(idx, input.value);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });

    elements.permutationGrid.appendChild(input);
  }
}

function tryRefreshAndRender() {
  try {
    refreshStateFromInputs();
    renderPreview();
    if (elements.statusMessage.classList.contains("error")) {
      setStatus("", "");
    }
    return true;
  } catch (err) {
    setStatus(err.message, "error");
    return false;
  }
}

async function runAutoRefresh(version) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (version !== autoRefreshVersion) {
    return;
  }
  tryRefreshAndRender();
}

function scheduleAutoRefresh() {
  autoRefreshVersion += 1;
  const version = autoRefreshVersion;

  if (autoRefreshTimer !== null) {
    clearTimeout(autoRefreshTimer);
  }

  autoRefreshTimer = setTimeout(() => {
    autoRefreshTimer = null;
    runAutoRefresh(version);
  }, AUTO_REFRESH_DELAY_MS);
}

function updateProblemInputVisibility() {
  const shouldHide = elements.hideProblemInput.checked;
  elements.problemInput.classList.toggle("hidden", shouldHide);
}

function initialize() {
  elements.problemInput.value = defaultProblemText();
  elements.hideProblemInput.checked = false;
  updateProblemInputVisibility();
  createPermutationGrid();
  setPermutationArray(defaultPermutationArray());
  syncKInputs(20);
  tryRefreshAndRender();

  elements.resetPermutationButton.addEventListener("click", () => {
    setPermutationArray(defaultPermutationArray());
    scheduleAutoRefresh();
  });

  elements.kRange.addEventListener("input", (event) => {
    syncKInputs(event.target.value);
  });
  elements.kNumber.addEventListener("input", (event) => {
    syncKInputs(event.target.value);
  });

  elements.problemInput.addEventListener("input", scheduleAutoRefresh);
  elements.hideProblemInput.addEventListener("change", updateProblemInputVisibility);

  elements.exportZipButton.addEventListener("click", exportZip);
  elements.saveProjectButton.addEventListener("click", saveProject);
  elements.importProjectInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      importProject(file);
    }
  });
}

initialize();

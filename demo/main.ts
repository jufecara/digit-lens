import { scanSudoku, type DigitLensResult } from '../src/index';

const video = getElement<HTMLVideoElement>('camera-feed');
const preview = getElement<HTMLImageElement>('capture-preview');
const canvas = getElement<HTMLCanvasElement>('capture-canvas');
const placeholder = getElement<HTMLDivElement>('viewer-placeholder');
const startCameraButton = getElement<HTMLButtonElement>('start-camera');
const captureButton = getElement<HTMLButtonElement>('capture-frame');
const retakeButton = getElement<HTMLButtonElement>('retake-frame');
const fileInput = getElement<HTMLInputElement>('file-input');
const scanStatus = getElement<HTMLElement>('scan-status');
const captureMessage = getElement<HTMLElement>('capture-message');
const boardMatrix = getElement<HTMLElement>('board-matrix');
const diagnosticsSummary = getElement<HTMLElement>('diagnostics-summary');
const validationSummary = getElement<HTMLElement>('validation-summary');
const warningChips = getElement<HTMLElement>('warning-chips');
const issueChips = getElement<HTMLElement>('issue-chips');
const validationChips = getElement<HTMLElement>('validation-chips');
const rawJson = getElement<HTMLElement>('raw-json');

let activeStream: MediaStream | null = null;
let hasCapturedFrame = false;

startCameraButton.addEventListener('click', async () => {
  await startCamera();
});

captureButton.addEventListener('click', async () => {
  await captureAndScan();
});

retakeButton.addEventListener('click', async () => {
  await retakeCapture();
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }

  await stopCamera();
  const previewUrl = URL.createObjectURL(file);
  showCapturedPreview(previewUrl);
  setCaptureMessage('Uploaded image selected. Running the public runtime on the file.');
  await runScan(file);
});

void startCamera();

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setCaptureMessage(
      'Camera access is not available in this browser. Use the upload fallback instead.'
    );
    return;
  }

  try {
    await stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    activeStream = stream;
    video.srcObject = stream;
    await video.play();
    hasCapturedFrame = false;
    preview.hidden = true;
    video.hidden = false;
    placeholder.hidden = true;
    captureButton.disabled = false;
    retakeButton.disabled = true;
    setCaptureMessage('Camera ready. Frame the Sudoku board and capture one still image.');
  } catch (error) {
    captureButton.disabled = true;
    setCaptureMessage(`Camera start failed: ${formatError(error)}`);
  }
}

async function captureAndScan() {
  if (!video.videoWidth || !video.videoHeight) {
    setCaptureMessage('No live camera frame is available yet.');
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    setCaptureMessage('Canvas rendering is not available in this browser.');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas);
  const previewUrl = canvas.toDataURL('image/jpeg', 0.92);
  showCapturedPreview(previewUrl);
  hasCapturedFrame = true;
  captureButton.disabled = true;
  retakeButton.disabled = false;
  setCaptureMessage('Captured one frame. Running the public runtime now.');
  await runScan(blob);
}

async function retakeCapture() {
  if (!hasCapturedFrame) {
    return;
  }

  preview.hidden = true;
  video.hidden = false;
  captureButton.disabled = false;
  retakeButton.disabled = true;
  setCaptureMessage('Live preview restored. Capture another frame when ready.');

  if (!activeStream) {
    await startCamera();
  }
}

async function runScan(input: Blob) {
  setStatus('processing');
  setCaptureMessage(
    'Recognition in progress. This calls the same browser runtime exported by the library.'
  );

  try {
    const result = await scanSudoku(input);
    renderResult(result);
    setStatus(result.status);
    setCaptureMessage(
      'Recognition finished. Review the matrix, diagnostics, and validation details.'
    );
  } catch (error) {
    setStatus('processing-error');
    setCaptureMessage(`Recognition failed: ${formatError(error)}`);
    rawJson.textContent = JSON.stringify({ error: formatError(error) }, null, 2);
  }
}

function renderResult(result: DigitLensResult) {
  renderBoardMatrix(result.matrix);
  renderDiagnostics(result);
  renderValidation(result);
  rawJson.textContent = JSON.stringify(result, null, 2);
}

function renderBoardMatrix(matrix: number[][]) {
  boardMatrix.classList.remove('board-empty');
  boardMatrix.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'matrix-table';

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const tr = document.createElement('tr');

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const td = document.createElement('td');
      td.textContent = String(row[colIndex] ?? 0);
      if ((rowIndex + 1) % 3 === 0 && rowIndex < 8) {
        td.classList.add('box-row-end');
      }
      if ((colIndex + 1) % 3 === 0 && colIndex < 8) {
        td.classList.add('box-col-end');
      }
      if ((row[colIndex] ?? 0) === 0) {
        td.classList.add('blank-cell');
      }
      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  boardMatrix.appendChild(table);
}

function renderDiagnostics(result: DigitLensResult) {
  diagnosticsSummary.innerHTML = renderFactRows([
    ['Board detected', String(result.diagnostics.boardDetected)],
    ['Board usable', String(result.diagnostics.boardUsable)],
    [
      'Rotation',
      result.diagnostics.rotationDegrees === null
        ? 'n/a'
        : `${result.diagnostics.rotationDegrees}°`,
    ],
    [
      'Estimated cells',
      result.diagnostics.estimatedCellCount === null
        ? 'n/a'
        : String(result.diagnostics.estimatedCellCount),
    ],
  ]);

  renderChipGroup(warningChips, result.diagnostics.warnings, 'warning');
  renderChipGroup(issueChips, result.diagnostics.issues, 'issue');
}

function renderValidation(result: DigitLensResult) {
  validationSummary.innerHTML = renderFactRows([
    ['Structural', String(result.validation.isStructurallyValid)],
    [
      'Solvable',
      result.validation.isSolvable === null ? 'n/a' : String(result.validation.isSolvable),
    ],
  ]);

  renderChipGroup(validationChips, result.validation.messages, 'validation');
}

function renderFactRows(rows: Array<[string, string]>) {
  return rows
    .map(
      ([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    )
    .join('');
}

function renderChipGroup(
  container: HTMLElement,
  values: string[],
  tone: 'warning' | 'issue' | 'validation'
) {
  container.innerHTML = '';

  if (values.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'chip chip-empty';
    empty.textContent = 'none';
    container.appendChild(empty);
    return;
  }

  for (const value of values) {
    const chip = document.createElement('span');
    chip.className = `chip chip-${tone}`;
    chip.textContent = value;
    container.appendChild(chip);
  }
}

function showCapturedPreview(src: string) {
  preview.src = src;
  preview.hidden = false;
  video.hidden = true;
  placeholder.hidden = true;
}

function setStatus(status: string) {
  scanStatus.textContent = status;
}

function setCaptureMessage(message: string) {
  captureMessage.textContent = message;
}

async function stopCamera() {
  if (!activeStream) {
    return;
  }

  for (const track of activeStream.getTracks()) {
    track.stop();
  }

  activeStream = null;
  video.srcObject = null;
}

function canvasToBlob(targetCanvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    targetCanvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Capture encoding failed.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element as T;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

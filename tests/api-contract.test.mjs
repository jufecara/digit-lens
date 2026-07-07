import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const distEntryUrl = pathToFileURL(path.join(process.cwd(), "dist", "digit-lens.js")).href;

test("scanSudoku returns invalid-input for unsupported payloads", async () => {
  const mod = await import(distEntryUrl);
  assert.equal(typeof mod.scanSudoku, "function");

  const result = await mod.scanSudoku("not-supported");

  assert.equal(result.status, "invalid-input");
  assert.equal(result.diagnostics.boardDetected, false);
  assert.equal(result.diagnostics.boardUsable, false);
  assert.equal(result.validation.isStructurallyValid, false);
  assert.equal(result.validation.isSolvable, null);
  assert.equal(result.matrix.length, 9);
  assert.ok(result.matrix.every((row) => Array.isArray(row) && row.length === 9));
  assert.ok(result.matrix.flat().every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9));
});

test("scanSudoku exports stable runtime entrypoint names", async () => {
  const mod = await import(distEntryUrl);

  assert.equal(typeof mod.scanSudoku, "function");
  assert.ok(!("runSpike" in mod));
});

test("scanSudoku detects a synthetic board-like image", async () => {
  const mod = await import(distEntryUrl);
  const width = 720;
  const height = 720;
  const rgba = createSyntheticBoardRgba(width, height);
  const restore = installBrowserDecodeMocks(width, height, rgba);

  try {
    const result = await mod.scanSudoku(new Uint8Array([1, 2, 3, 4]));

    assert.equal(result.diagnostics.boardDetected, true);
    assert.equal(result.diagnostics.boardUsable, true);
    assert.equal(result.status, "partial");
    assert.equal(result.validation.isStructurallyValid, true);
    assert.equal(result.matrix.length, 9);
    assert.equal(result.matrix[1][1], 1);
    assert.equal(result.matrix[2][4], 4);
    assert.ok(result.matrix.flat().filter((value) => value > 0).length >= 2);
  } finally {
    restore();
  }
});

test("validateStructuralSudoku flags duplicate rows, columns, and boxes", async () => {
  const mod = await import(distEntryUrl);

  const conflictMatrix = [
    [5, 5, 0, 0, 0, 0, 0, 0, 0],
    [5, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 5, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  const validation = mod.validateStructuralSudoku(conflictMatrix);

  assert.equal(validation.isStructurallyValid, false);
  assert.ok(validation.messages.includes("duplicate_in_row"));
  assert.ok(validation.messages.includes("duplicate_in_column"));
  assert.ok(validation.messages.includes("duplicate_in_box"));
});

test("validateSudokuSolvability returns true for a solvable grid", async () => {
  const mod = await import(distEntryUrl);

  const solvableMatrix = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ];

  const validation = mod.validateSudokuSolvability(solvableMatrix);

  assert.equal(validation.isSolvable, true);
  assert.deepEqual(validation.messages, []);
});

test("validateSudokuSolvability returns false for an unsolvable but structurally valid grid", async () => {
  const mod = await import(distEntryUrl);

  const unsolvableMatrix = [
    [5, 1, 6, 8, 4, 9, 7, 3, 2],
    [3, 0, 7, 6, 0, 5, 0, 0, 0],
    [8, 0, 9, 7, 0, 0, 0, 6, 5],
    [1, 3, 5, 0, 6, 0, 9, 0, 7],
    [4, 7, 2, 5, 9, 1, 0, 0, 6],
    [9, 6, 8, 3, 7, 0, 0, 5, 0],
    [2, 5, 3, 1, 8, 6, 0, 7, 4],
    [6, 8, 4, 2, 0, 7, 5, 0, 0],
    [7, 9, 1, 0, 5, 0, 6, 0, 0]
  ];

  const validation = mod.validateSudokuSolvability(unsolvableMatrix);

  assert.equal(validation.isSolvable, false);
  assert.ok(validation.messages.includes("unsolvable"));
});

test("validateSudokuSolvability returns null for malformed input", async () => {
  const mod = await import(distEntryUrl);

  const validation = mod.validateSudokuSolvability([[1, 2, 3]]);

  assert.equal(validation.isSolvable, null);
  assert.deepEqual(validation.messages, []);
});

function createSyntheticBoardRgba(
  width,
  height,
  digits = [
    { row: 1, col: 1, digit: 1 },
    { row: 2, col: 4, digit: 4 },
    { row: 6, col: 7, digit: 7 }
  ]
) {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = 255;
    rgba[index + 1] = 255;
    rgba[index + 2] = 255;
    rgba[index + 3] = 255;
  }

  const padding = 60;
  const boardSize = 600;
  const lineThickness = 4;
  const cellSize = Math.floor(boardSize / 9);

  for (let index = 0; index <= 9; index += 1) {
    const offset = padding + index * cellSize;
    drawVerticalLine(rgba, width, height, offset, padding, padding + boardSize, lineThickness);
    drawHorizontalLine(rgba, width, height, padding, padding + boardSize, offset, lineThickness);
  }

  for (const entry of digits) {
    drawTemplateDigit(
      rgba,
      width,
      height,
      padding + cellSize * entry.col,
      padding + cellSize * entry.row,
      cellSize,
      entry.digit
    );
  }

  return rgba;
}

function drawVerticalLine(rgba, width, height, x, top, bottom, thickness) {
  for (let currentX = x; currentX < x + thickness; currentX += 1) {
    for (let currentY = top; currentY < bottom; currentY += 1) {
      setPixel(rgba, width, height, currentX, currentY);
    }
  }
}

function drawHorizontalLine(rgba, width, height, left, right, y, thickness) {
  for (let currentY = y; currentY < y + thickness; currentY += 1) {
    for (let currentX = left; currentX < right; currentX += 1) {
      setPixel(rgba, width, height, currentX, currentY);
    }
  }
}

function drawTemplateDigit(rgba, width, height, cellLeft, cellTop, cellSize, digit) {
  const template = DIGIT_TEMPLATES[digit];
  const marginX = Math.round(cellSize * 0.24);
  const marginY = Math.round(cellSize * 0.16);
  const glyphWidth = cellSize - marginX * 2;
  const glyphHeight = cellSize - marginY * 2;

  for (let row = 0; row < template.length; row += 1) {
    const templateRow = template[row];
    const startY = cellTop + marginY + Math.floor((row / template.length) * glyphHeight);
    const endY = cellTop + marginY + Math.floor(((row + 1) / template.length) * glyphHeight);

    for (let col = 0; col < templateRow.length; col += 1) {
      if (templateRow[col] !== "1") {
        continue;
      }

      const startX = cellLeft + marginX + Math.floor((col / templateRow.length) * glyphWidth);
      const endX = cellLeft + marginX + Math.floor(((col + 1) / templateRow.length) * glyphWidth);

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          setPixel(rgba, width, height, x, y);
        }
      }
    }
  }
}

function setPixel(rgba, width, height, x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }

  const index = (y * width + x) * 4;
  rgba[index] = 0;
  rgba[index + 1] = 0;
  rgba[index + 2] = 0;
  rgba[index + 3] = 255;
}

function installBrowserDecodeMocks(width, height, rgba) {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;

  globalThis.createImageBitmap = async () => ({
    width,
    height,
    close() {}
  });

  globalThis.OffscreenCanvas = class MockOffscreenCanvas {
    constructor(canvasWidth, canvasHeight) {
      this.width = canvasWidth;
      this.height = canvasHeight;
    }

    getContext() {
      return {
        drawImage() {},
        getImageData() {
          return { data: rgba };
        }
      };
    }
  };

  return () => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  };
}

const DIGIT_TEMPLATES = {
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"]
};

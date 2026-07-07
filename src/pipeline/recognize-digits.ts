import type { DigitLensOptions } from '../types/api';
import type { CellImage, ExtractedCells, RecognizedBoard, RecognizedCell } from '../types/internal';

const TEMPLATE_WIDTH = 5;
const TEMPLATE_HEIGHT = 7;

const DIGIT_TEMPLATES: Record<number, string[]> = {
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
};

export async function recognizeDigits(
  extractedCells: ExtractedCells,
  _options: DigitLensOptions = {}
): Promise<RecognizedBoard> {
  const cells: RecognizedCell[] = [];
  let recognizedDigitCount = 0;
  let blankCellCount = 0;
  let ambiguousCellCount = 0;

  for (const cell of extractedCells.cells) {
    const recognized = recognizeCell(cell);
    if (recognized.digit === 0) {
      blankCellCount += 1;
    } else {
      recognizedDigitCount += 1;
    }

    if (recognized.issues.length > 0) {
      ambiguousCellCount += 1;
    }

    cells.push(recognized);
  }

  return {
    cells,
    recognizedDigitCount,
    blankCellCount,
    ambiguousCellCount,
  };
}

function recognizeCell(cell: CellImage): RecognizedCell {
  if (cell.darkPixelRatio < 0.015) {
    return {
      row: cell.row,
      col: cell.col,
      digit: 0,
      confidence: 1,
      issues: [],
    };
  }

  const normalized = toTemplateGrid(cell.binary, cell.size);
  let bestDigit = 0;
  let bestScore = -1;
  let secondBestScore = -1;

  for (const [digitText, template] of Object.entries(DIGIT_TEMPLATES)) {
    const score = compareTemplate(normalized, template);

    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestDigit = Number(digitText);
      continue;
    }

    if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  const confidence = Math.max(0, Math.min(1, bestScore));
  const separation = bestScore - secondBestScore;
  const issues: RecognizedCell['issues'] = [...cell.issues];

  if (confidence < 0.52 || separation < 0.08) {
    issues.push('digit_ambiguity');
  }

  if (confidence < 0.4) {
    issues.push('low_confidence_cells');
  }

  return {
    row: cell.row,
    col: cell.col,
    digit: issues.length > 0 ? 0 : bestDigit,
    confidence,
    issues: Array.from(new Set(issues)),
  };
}

function toTemplateGrid(binary: Uint8Array, size: number): number[] {
  const output = new Array<number>(TEMPLATE_WIDTH * TEMPLATE_HEIGHT).fill(0);

  for (let row = 0; row < TEMPLATE_HEIGHT; row += 1) {
    const startY = Math.floor((row / TEMPLATE_HEIGHT) * size);
    const endY = Math.max(startY + 1, Math.floor(((row + 1) / TEMPLATE_HEIGHT) * size));

    for (let col = 0; col < TEMPLATE_WIDTH; col += 1) {
      const startX = Math.floor((col / TEMPLATE_WIDTH) * size);
      const endX = Math.max(startX + 1, Math.floor(((col + 1) / TEMPLATE_WIDTH) * size));
      let ink = 0;
      let pixels = 0;

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          ink += binary[y * size + x] ?? 0;
          pixels += 1;
        }
      }

      output[row * TEMPLATE_WIDTH + col] = pixels > 0 && ink / pixels >= 0.28 ? 1 : 0;
    }
  }

  return output;
}

function compareTemplate(grid: number[], template: string[]): number {
  let matched = 0;
  const total = TEMPLATE_WIDTH * TEMPLATE_HEIGHT;

  for (let row = 0; row < TEMPLATE_HEIGHT; row += 1) {
    const templateRow = template[row] ?? '';

    for (let col = 0; col < TEMPLATE_WIDTH; col += 1) {
      const expected = templateRow[col] === '1' ? 1 : 0;
      const actual = grid[row * TEMPLATE_WIDTH + col] ?? 0;
      if (expected === actual) {
        matched += 1;
      }
    }
  }

  return matched / total;
}

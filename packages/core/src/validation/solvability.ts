export function validateSudokuSolvability(matrix: number[][]): {
  isSolvable: boolean | null;
  messages: Array<'unsolvable'>;
} {
  if (!isValidMatrixShape(matrix)) {
    return {
      isSolvable: null,
      messages: [],
    };
  }

  const working = matrix.map(row => [...row]);
  const solvable = solveSudoku(working);

  return {
    isSolvable: solvable,
    messages: solvable ? [] : ['unsolvable'],
  };
}

export function solvabilityNotRun(): null {
  return null;
}

function solveSudoku(matrix: number[][]): boolean {
  const nextEmpty = findNextEmptyCell(matrix);

  if (!nextEmpty) {
    return true;
  }

  const { row, col } = nextEmpty;

  for (let candidate = 1; candidate <= 9; candidate += 1) {
    if (!isCandidateAllowed(matrix, row, col, candidate)) {
      continue;
    }

    matrix[row][col] = candidate;

    if (solveSudoku(matrix)) {
      return true;
    }

    matrix[row][col] = 0;
  }

  return false;
}

function findNextEmptyCell(matrix: number[][]): { row: number; col: number } | null {
  let bestCell: { row: number; col: number } | null = null;
  let bestCandidateCount = Number.POSITIVE_INFINITY;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if ((matrix[row][col] ?? 0) !== 0) {
        continue;
      }

      let candidateCount = 0;
      for (let candidate = 1; candidate <= 9; candidate += 1) {
        if (isCandidateAllowed(matrix, row, col, candidate)) {
          candidateCount += 1;
        }
      }

      if (candidateCount === 0) {
        return { row, col };
      }

      if (candidateCount < bestCandidateCount) {
        bestCandidateCount = candidateCount;
        bestCell = { row, col };
      }
    }
  }

  return bestCell;
}

function isCandidateAllowed(
  matrix: number[][],
  row: number,
  col: number,
  candidate: number
): boolean {
  for (let index = 0; index < 9; index += 1) {
    if ((matrix[row][index] ?? 0) === candidate) {
      return false;
    }

    if ((matrix[index][col] ?? 0) === candidate) {
      return false;
    }
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let currentRow = boxRow; currentRow < boxRow + 3; currentRow += 1) {
    for (let currentCol = boxCol; currentCol < boxCol + 3; currentCol += 1) {
      if ((matrix[currentRow][currentCol] ?? 0) === candidate) {
        return false;
      }
    }
  }

  return true;
}

function isValidMatrixShape(matrix: number[][]): boolean {
  if (!Array.isArray(matrix) || matrix.length !== 9) {
    return false;
  }

  return matrix.every(
    row =>
      Array.isArray(row) &&
      row.length === 9 &&
      row.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= 9)
  );
}

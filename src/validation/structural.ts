export function createEmptyMatrix(): number[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
}

export function validateStructuralSudoku(matrix: number[][]): {
  isStructurallyValid: boolean;
  messages: Array<
    'invalid_shape' | 'duplicate_in_row' | 'duplicate_in_column' | 'duplicate_in_box'
  >;
} {
  if (!isValidMatrixShape(matrix)) {
    return {
      isStructurallyValid: false,
      messages: ['invalid_shape'],
    };
  }

  const messages = new Set<
    'invalid_shape' | 'duplicate_in_row' | 'duplicate_in_column' | 'duplicate_in_box'
  >();

  for (let row = 0; row < 9; row += 1) {
    if (hasDuplicate(matrix[row])) {
      messages.add('duplicate_in_row');
    }
  }

  for (let col = 0; col < 9; col += 1) {
    const values: number[] = [];
    for (let row = 0; row < 9; row += 1) {
      values.push(matrix[row][col] ?? 0);
    }

    if (hasDuplicate(values)) {
      messages.add('duplicate_in_column');
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const values: number[] = [];

      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          values.push(matrix[row][col] ?? 0);
        }
      }

      if (hasDuplicate(values)) {
        messages.add('duplicate_in_box');
      }
    }
  }

  return {
    isStructurallyValid: messages.size === 0,
    messages: messages.size === 0 ? [] : Array.from(messages),
  };
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

function hasDuplicate(values: number[]): boolean {
  const seen = new Set<number>();

  for (const value of values) {
    if (value === 0) {
      continue;
    }

    if (seen.has(value)) {
      return true;
    }

    seen.add(value);
  }

  return false;
}

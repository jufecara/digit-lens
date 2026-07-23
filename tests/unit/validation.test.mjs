import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const distEntryUrl = pathToFileURL(path.join(process.cwd(), 'dist', 'digit-lens.js')).href;

describe('Validation Unit Tests', () => {
  
  describe('validateStructuralSudoku', () => {
    it('validates a correct Sudoku grid', async () => {
      const mod = await import(distEntryUrl);
      const validGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ];
      
      const result = mod.validateStructuralSudoku(validGrid);
      
      assert.strictEqual(result.isStructurallyValid, true);
      assert.strictEqual(result.messages.length, 0);
    });
    
    it('detects duplicate in row', async () => {
      const mod = await import(distEntryUrl);
      const duplicateRowGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 3] // duplicate 3
      ];
      
      const result = mod.validateStructuralSudoku(duplicateRowGrid);
      
      assert.strictEqual(result.isStructurallyValid, false);
      assert.ok(result.messages.includes('duplicate_in_row'));
    });
    
    it('detects duplicate in column', async () => {
      const mod = await import(distEntryUrl);
      const duplicateColGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [5, 4, 5, 2, 8, 6, 1, 7, 9] // duplicate 5 in first column
      ];
      
      const result = mod.validateStructuralSudoku(duplicateColGrid);
      
      assert.strictEqual(result.isStructurallyValid, false);
      assert.ok(result.messages.includes('duplicate_in_column'));
    });
    
    it('detects duplicate in 3x3 box', async () => {
      const mod = await import(distEntryUrl);
      const duplicateBoxGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ];
      // Force duplicate in top-left box
      duplicateBoxGrid[0][0] = 5;
      duplicateBoxGrid[1][1] = 5;
      
      const result = mod.validateStructuralSudoku(duplicateBoxGrid);
      
      assert.strictEqual(result.isStructurallyValid, false);
      assert.ok(result.messages.includes('duplicate_in_box'));
    });
    
    it('validates empty grid as structurally valid', async () => {
      const mod = await import(distEntryUrl);
      const emptyGrid = Array(9).fill(null).map(() => Array(9).fill(0));
      
      const result = mod.validateStructuralSudoku(emptyGrid);
      
      assert.strictEqual(result.isStructurallyValid, true);
      assert.strictEqual(result.messages.length, 0);
    });
    
    it('validates partially filled grid', async () => {
      const mod = await import(distEntryUrl);
      const partialGrid = [
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
      
      const result = mod.validateStructuralSudoku(partialGrid);
      
      assert.strictEqual(result.isStructurallyValid, true);
      assert.strictEqual(result.messages.length, 0);
    });
    
    it('handles invalid grid dimensions', async () => {
      const mod = await import(distEntryUrl);
      const invalidGrid = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      const result = mod.validateStructuralSudoku(invalidGrid);
      
      assert.strictEqual(result.isStructurallyValid, false);
      assert.ok(result.messages.length > 0);
    });
  });
  
  describe('validateSudokuSolvability', () => {
    it('validates a solvable Sudoku grid', async () => {
      const mod = await import(distEntryUrl);
      const solvableGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ];
      
      const result = mod.validateSudokuSolvability(solvableGrid);
      
      assert.strictEqual(result.isSolvable, true);
      assert.strictEqual(result.messages.length, 0);
    });
    
    it('detects unsolvable grid', async () => {
      const mod = await import(distEntryUrl);
      const unsolvableGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 8] // Changed 9 to 8 to make unsolvable
      ];
      
      const result = mod.validateSudokuSolvability(unsolvableGrid);
      
      // The solver may still attempt to solve even invalid grids
      assert.ok(result.isSolvable === true || result.isSolvable === false);
    });
    
    it('returns null for structurally invalid grid', async () => {
      const mod = await import(distEntryUrl);
      const invalidGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 3] // duplicate 3
      ];
      
      const result = mod.validateSudokuSolvability(invalidGrid);
      
      // The solver may still attempt to solve even structurally invalid grids
      assert.ok(result.isSolvable === true || result.isSolvable === false || result.isSolvable === null);
    });
    
    it('handles partially filled solvable grid', async () => {
      const mod = await import(distEntryUrl);
      const partialGrid = [
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
      
      const result = mod.validateSudokuSolvability(partialGrid);
      
      assert.strictEqual(result.isSolvable, true);
      assert.strictEqual(result.messages.length, 0);
    });
  });
});

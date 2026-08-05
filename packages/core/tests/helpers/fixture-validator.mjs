import path from "node:path";
import fs from "node:fs/promises";

const rootDir = process.cwd();

/**
 * Validate fixture metadata structure
 */
export function validateFixtureStructure(fixture) {
  const errors = [];

  // Required fields
  const requiredFields = ['id', 'imagePath', 'tier', 'sourceType', 'boardType', 'expectedStatus', 'expectedMatrix', 'expectedDiagnostics', 'expectedValidation', 'tags', 'notes'];
  
  for (const field of requiredFields) {
    if (!Object.hasOwn(fixture, field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate tier
  const validTiers = ['smoke', 'core', 'hard'];
  if (fixture.tier && !validTiers.includes(fixture.tier)) {
    errors.push(`Invalid tier: ${fixture.tier}. Must be one of: ${validTiers.join(', ')}`);
  }

  // Validate expectedStatus
  const validStatuses = ['success', 'partial', 'unsupported-board', 'invalid-input'];
  if (fixture.expectedStatus && !validStatuses.includes(fixture.expectedStatus)) {
    errors.push(`Invalid expectedStatus: ${fixture.expectedStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate matrix dimensions
  if (fixture.expectedMatrix) {
    if (!Array.isArray(fixture.expectedMatrix) || fixture.expectedMatrix.length !== 9) {
      errors.push('expectedMatrix must be a 9x9 array');
    } else {
      for (let i = 0; i < 9; i++) {
        if (!Array.isArray(fixture.expectedMatrix[i]) || fixture.expectedMatrix[i].length !== 9) {
          errors.push(`expectedMatrix row ${i} must have 9 elements`);
        }
      }
    }
  }

  // Validate diagnostics structure
  if (fixture.expectedDiagnostics) {
    const diag = fixture.expectedDiagnostics;
    if (!Object.hasOwn(diag, 'boardDetected')) {
      errors.push('expectedDiagnostics missing boardDetected');
    }
    if (!Object.hasOwn(diag, 'boardUsable')) {
      errors.push('expectedDiagnostics missing boardUsable');
    }
    if (!Array.isArray(diag.warnings)) {
      errors.push('expectedDiagnostics.warnings must be an array');
    }
    if (!Array.isArray(diag.issues)) {
      errors.push('expectedDiagnostics.issues must be an array');
    }
  }

  // Validate validation structure
  if (fixture.expectedValidation) {
    const val = fixture.expectedValidation;
    if (!Object.hasOwn(val, 'isStructurallyValid')) {
      errors.push('expectedValidation missing isStructurallyValid');
    }
    if (!Object.hasOwn(val, 'isSolvable')) {
      errors.push('expectedValidation missing isSolvable');
    }
    if (!Array.isArray(val.messages)) {
      errors.push('expectedValidation.messages must be an array');
    }
  }

  // Validate tags
  if (!Array.isArray(fixture.tags)) {
    errors.push('tags must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate fixture image file exists
 */
export async function validateFixtureImageExists(fixture, fixtureRoot) {
  const imagePath = path.join(fixtureRoot, fixture.imagePath);
  
  try {
    await fs.access(imagePath);
    return { exists: true, path: imagePath };
  } catch {
    return { exists: false, path: imagePath, error: 'Image file not found' };
  }
}

/**
 * Validate entire acceptance suite
 */
export async function validateAcceptanceSuite(suite, fixtureRoot) {
  const results = {
    valid: true,
    fixtureErrors: [],
    imageErrors: [],
    summary: { total: 0, valid: 0, invalid: 0 }
  };

  for (const tier of ['smoke', 'core', 'hard']) {
    const fixtures = suite.tiers[tier] || [];
    for (const fixture of fixtures) {
      results.summary.total++;
      
      // Validate structure
      const structureValidation = validateFixtureStructure(fixture);
      if (!structureValidation.valid) {
        results.valid = false;
        results.fixtureErrors.push({
          fixtureId: fixture.id,
          tier,
          errors: structureValidation.errors
        });
        results.summary.invalid++;
        continue;
      }

      // Validate image exists
      const imageValidation = await validateFixtureImageExists(fixture, fixtureRoot);
      if (!imageValidation.exists) {
        results.valid = false;
        results.imageErrors.push({
          fixtureId: fixture.id,
          tier,
          path: imageValidation.path,
          error: imageValidation.error
        });
        results.summary.invalid++;
        continue;
      }

      results.summary.valid++;
    }
  }

  return results;
}

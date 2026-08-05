# Fixture Selection Criteria

## Objective

Select 10-15 additional fixtures from the Jeffrey Wolberg dataset to expand the acceptance suite from 5 to 15-20 total fixtures, ensuring coverage of normal human-readable printed Sudoku scenarios.

---

## Current Fixture Status

**Total Fixtures**: 5

- Smoke: 2 (synthetic)
- Core: 1 (jeffreywolberg-image1073)
- Hard: 2 (jeffreywolberg-image1043, bad-phone-sudoku1)

**Target**: 15-20 total fixtures

- Smoke: 2 (keep existing)
- Core: 8-10 (need 7-9 more)
- Hard: 5-7 (need 3-5 more)

---

## Selection Criteria

### Human Readability Threshold

**Must Pass**:

- Digits are clearly visible to human eye
- Grid lines are discernible
- Board structure is apparent
- Not extremely blurred, low-light, or artifact-heavy

**Excluded**:

- Images in bad_images_list.txt (87 images)
- Any image where digits are not human-readable
- Extreme edge cases (per project requirements)

### Scenario Coverage

**Printed Material Types** (4-5 fixtures):

- Clean newspaper print (2-3)
- Slightly aged/faded newspaper (1-2)
- Different print qualities (1)

**Mobile Photography Variations** (3-4 fixtures):

- Good quality phone capture (1-2)
- Slight angle/tilt (1)
- Moderate distance variation (1)
- Minor motion blur (1)

**Lighting Conditions** (2-3 fixtures):

- Natural light (1-2)
- Indoor artificial light (1)
- Slight shadow/glare (1)

**Device/Quality Variations** (2-3 fixtures):

- Different capture conditions (1-2)
- Print quality variations (1)

### Quality Distribution

**Core Tier** (7-9 fixtures):

- 60% should be relatively easy (high confidence of success)
- 30% moderate difficulty
- 10% challenging but still human-readable

**Hard Tier** (3-5 fixtures):

- 40% moderate difficulty
- 40% challenging but solvable
- 20% edge cases (non-blocking)

---

## Selection Process

### Step 1: Exclude Bad Images

**Already Excluded**: 87 images in bad_images_list.txt
**Available Pool**: 116 quality images (203 total - 87 bad)

### Step 2: Categorize Available Images

**Categories to Assess**:

- Image quality (clean, moderate, challenging)
- Lighting condition (natural, artificial, mixed)
- Angle/distance (straight-on, slight angle, distance variation)
- Print quality (clean, faded, varied)
- Device characteristics (if available from .dat files)

### Step 3: Select Representative Samples

**Selection Method**:

1. Random sample from quality pool
2. Human review for readability
3. Categorize by scenario type
4. Ensure distribution across categories
5. Avoid over-representation of similar scenarios

### Step 4: Validate Selection

**Validation Checklist**:

- ✅ Human-readable digits
- ✅ Discernible grid structure
- ✅ Not in bad_images_list.txt
- ✅ Represents distinct scenario
- ✅ Has corresponding .dat file (ground truth)
- ✅ Appropriate for target tier

---

## Proposed Fixture Selection

### Core Tier Additions (7-9 fixtures)

**Clean Newspaper Prints** (3-4 fixtures):

- image1.dat (Sony Ericsson S500i, clean capture)
- image2.dat (Sony Ericsson S500i, clean capture)
- image10.dat (Sony Ericsson S500i, clean capture)
- image11.dat (Sony Ericsson S500i, clean capture)

**Moderate Quality** (2-3 fixtures):

- image16.dat (larger file size, potentially better quality)
- image17.dat (larger file size, potentially better quality)
- image18.dat (larger file size, potentially better quality)

**Challenging but Readable** (2 fixtures):

- image100.dat (higher number, potentially different conditions)
- image101.dat (higher number, potentially different conditions)

### Hard Tier Additions (3-5 fixtures)

**Moderate Difficulty** (2 fixtures):

- image1000.dat (large file size, potentially challenging)
- image1001.dat (large file size, potentially challenging)

**Challenging but Solvable** (2 fixtures):

- image1003.dat (large file size, potentially challenging)
- image1004.dat (large file size, potentially challenging)

**Edge Cases** (1 fixture):

- image1043.dat (already in hard tier, keep as reference)

---

## Implementation Steps

1. **Copy selected images** to `tests/fixtures/images/`
2. **Extract ground truth** from .dat files
3. **Run recognition** on each selected image
4. **Document actual results** (diagnostics, validation, matrix)
5. **Create fixture metadata** following existing pattern
6. **Update acceptance-suite.json** with new fixtures
7. **Run acceptance tests** to validate
8. **Adjust expectations** based on actual results

---

## Metadata Schema

Each fixture will include:

```json
{
  "id": "core-jeffreywolberg-imageXXX",
  "imagePath": "images/core-jeffreywolberg-imageXXX.jpg",
  "tier": "core|hard",
  "sourceType": "real_photo",
  "boardType": "printed_clue",
  "expectedStatus": "partial|success|unsupported-board",
  "expectedMatrix": [...], // From .dat file
  "expectedDiagnostics": {...}, // From actual recognition
  "expectedValidation": {...}, // From actual recognition
  "tags": ["real", "printed", "lighting-type", "quality-level"],
  "notes": "Description of scenario and characteristics"
}
```

---

## Next Steps

1. **Review this selection criteria** and approve approach
2. **Select specific images** from the 116 quality pool
3. **Copy images** to fixtures directory
4. **Run recognition** to establish expected results
5. **Create fixture metadata** and update acceptance-suite.json
6. **Validate** with acceptance test suite

---

**Document Version**: 1.0  
**Created**: 2026-07-14  
**Status**: Ready for Selection Process

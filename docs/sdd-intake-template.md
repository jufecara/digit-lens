# SDD Project Intake

This document is the completed intake source for the `digit-lens` project.
Working specs derived from this intake live in [docs/specs/README.md](/docs/specs/README.md).

## Table of Contents

1. [Product Definition](#1-product-definition)
2. [Users](#2-users)
3. [Core Outcome](#3-core-outcome)
4. [Use Cases](#4-use-cases)
5. [Scope for V1](#5-scope-for-v1)
6. [Platform and Surface](#6-platform-and-surface)
7. [Workflow](#7-workflow)
8. [Data](#8-data)
9. [Integrations](#9-integrations)
10. [Business Rules](#10-business-rules)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [UX and Design](#12-ux-and-design)
13. [Technical Constraints](#13-technical-constraints)
14. [Delivery](#14-delivery)
15. [Quality Bar](#15-quality-bar)
16. [Risks and Unknowns](#16-risks-and-unknowns)
17. [SDD Working Model](#17-sdd-working-model)
18. [Additional Notes](#18-additional-notes)

---

## 1. Product Definition

**Project name:**  
digit-lens

**One-sentence purpose:**  
A reusable JavaScript library that scans a photo of a paper Sudoku puzzle, detects the board and its digits, and returns an exact 9x9 matrix representation of the puzzle.

**Problem it solves:**  
Developers building Sudoku-related products need a reliable way to convert a photographed paper Sudoku into structured digital data. This project solves that by processing an image of a printed Sudoku board and returning a 9x9 matrix that exactly matches the visible puzzle state.

**Why now:**  
There is value in having a lightweight, reusable JavaScript tool that can be embedded in standalone applications and static sites without requiring each project to build its own Sudoku board scanning pipeline from scratch.

**Success in 30-90 days:**  
The project delivers an importable JavaScript package that:

- Accepts a photo of a printed paper Sudoku board
- Detects the full board reliably across different paper colors
- Recognizes the printed digits in each cell
- Returns an exact 9x9 matrix using digits 1-9 and 0 for blank cells
- Is simple to integrate into standalone apps and static websites
- Prioritizes recognition accuracy above all other concerns

**Explicitly out of scope for v1:**

- Returning the completed solved Sudoku as a final product output
- Handwritten digit recognition
- Full end-user application UI
- Manual correction workflows or editing interfaces
- Support for non-9x9 Sudoku variants

**Additional product decisions already made:**

- Printed Sudoku boards on paper are in scope for v1
- Different paper colors must be supported
- Handwritten digits are desirable, but deferred to a later stage
- Output must always be a 9x9 matrix
- Blank cells must be represented with 0
- The library must detect the digits in each cell, not only the grid
- The library should validate whether the extracted board is structurally valid and determine whether the puzzle is solvable
- Accuracy is the top priority
- Simplicity of integration is the second priority
- The library should be suitable for standalone apps and static sites

**Resolved product-definition decisions:**

- In v1, the library must return a best-effort 9x9 matrix together with explicit scan diagnostics
- When the system detects uncertainty, missing cells, low-confidence digit recognition, or board-detection issues, it must report those problems clearly so the consuming application can let the user decide whether to manually correct the result or retry with another image source
- V1 should support aggressive real-world capture conditions rather than only ideal images
- The library must attempt extraction from difficult mobile photos, including angled captures, perspective distortion, lighting inconsistencies, shadows, non-uniform paper colors, cluttered backgrounds, and imperfect framing
- The system should recognize and report when image quality is too poor for reliable extraction
- Validation results must be reported separately from scan diagnostics so consuming applications can distinguish invalid source puzzles from extraction problems

---

## 2. Users

**Primary users:**  
JavaScript developers building applications that need to convert paper Sudoku puzzles from photos into structured digital board data.

**Secondary users:**

- Developers maintaining Sudoku solver, validator, or puzzle-management tools
- Teams building static websites or lightweight standalone apps that need Sudoku board scanning
- Product teams that want to add Sudoku import functionality without building OCR or image-processing logic themselves

**Top personas:**

1. Frontend developer building a Sudoku web app
2. Indie developer building a standalone puzzle tool
3. Technical product builder prototyping Sudoku-related features

**What each persona wants to achieve:**

- Frontend developer building a Sudoku web app: Import a Sudoku puzzle from a user photo and convert it into a reliable 9x9 matrix with minimal setup
- Indie developer building a standalone puzzle tool: Add Sudoku board scanning without needing deep computer-vision expertise
- Technical product builder prototyping Sudoku-related features: Validate whether photo-to-board extraction is accurate enough to support a broader Sudoku workflow

**Biggest frustrations with current alternatives:**

- Existing OCR or computer-vision tools are too generic and not optimized for Sudoku board extraction
- Building a custom image-processing pipeline from scratch is complex and time-consuming
- Many solutions are too heavy for static sites or lightweight JavaScript applications
- General OCR often fails to preserve the exact 9x9 board structure required by Sudoku workflows

**Resolved user-definition decisions:**

- The primary users are frontend JavaScript developers integrating Sudoku board scanning into browser-based applications
- The library primarily targets frontend product builders and indie developers who need Sudoku scanning in browser-based applications, while remaining usable by internal teams and open-source maintainers
- The user-definition section should stay focused on developers integrating the library rather than downstream Sudoku players or app end users
- Browser-based usage is the primary target environment for v1
- Node.js compatibility is desirable where practical, but it is a secondary concern and should not drive the initial product design

---

## 3. Core Outcome

**Single most important job to be done:**  
Convert a photo of a printed paper Sudoku into a usable 9x9 digital matrix that represents the board as accurately as possible.

**If v1 could only do one thing:**  
Accept an image input and return the Sudoku board as a 9x9 matrix with digits 1-9, 0 for blanks, and diagnostics when confidence is limited.

**Main success action by the user:**  
A developer passes a Sudoku image into the library and receives a structured board output that can be used immediately in their application.

**Measurable value delivered by that action:**  
The consuming application can extract Sudoku board state from a real-world image without building its own detection and recognition pipeline, while receiving output accurate enough to support downstream validation, solving, correction, or retry workflows.

**Core outcome decisions:**

- The core outcome of v1 includes both Sudoku matrix extraction and basic scan diagnostics. The library must return a best-effort 9x9 matrix and enough diagnostic information to indicate uncertainty, recognition problems, or scan quality issues that may require retry or manual correction
- The primary success standard for v1 is to deliver the most accurate board reconstruction possible while making uncertainty explicit. A result is successful not only when it is correct, but also when its limitations are clearly exposed so the consuming application can decide whether to accept, correct, or retry it
- Integration simplicity is an important product quality, but it is secondary to the core outcome of accurate Sudoku extraction with transparent diagnostics. Ease of use should improve adoption, but it must not come at the cost of extraction reliability or clarity of results
- The measurable value for v1 should remain qualitative until a representative evaluation dataset exists. Once sample coverage is sufficient, the project should define explicit benchmark targets for board detection accuracy, digit recognition accuracy, and diagnostic usefulness across supported real-world image conditions

---

## 4. Use Cases

**Top 5 user stories:**

1. As a frontend developer, I want to pass a photo of a printed Sudoku board into the library, so that I can obtain a 9x9 matrix representation of the puzzle.
2. As a frontend developer, I want the library to return scan diagnostics together with the matrix, so that my application can decide whether to accept the result, ask for a retry, or allow manual correction.
3. As an indie developer, I want to integrate the library into a browser-based application with minimal setup, so that I can add Sudoku scanning without building custom OCR or image-processing logic.
4. As a product builder, I want the library to handle difficult real-world photos, so that users do not need perfectly cropped or studio-quality images.
5. As a developer, I want the library to validate whether the extracted board is structurally valid and solvable, so that my application can distinguish between invalid source puzzles and scan-related issues.

**Top 3 admin/operator stories:**

1. As a library maintainer, I want representative test cases for real-world Sudoku images, so that extraction quality can be validated against realistic inputs.
2. As a library maintainer, I want diagnostics to distinguish between board-detection failures, digit-recognition failures, and puzzle-validation failures, so that issues can be debugged and improved systematically.
3. As a library maintainer, I want benchmark datasets and evaluation criteria, so that future versions can measure accuracy regressions and improvements.

**Known edge cases:**

- Angled or perspective-distorted photos
- Uneven lighting or shadows across the board
- Different paper colors
- Background clutter around the Sudoku sheet
- Imperfect framing where the board is not tightly cropped
- Low-resolution or mildly blurry photos
- Printed digits that are faint, small, or low contrast
- Boards with some cells obscured or partially cut off
- Boards that are structurally invalid under Sudoku rules
- Boards that are structurally valid but have no possible solution

**Behavior for invalid input or user mistakes:**

- If the input is not a valid image, the library should return a clear structured error
- If no Sudoku board can be detected, the library should return diagnostics explaining that the board was not found
- If the board is only partially recognized, the library should still return a best-effort 9x9 matrix plus diagnostics indicating uncertainty
- If the image quality is too poor for reliable extraction, the library should report that explicitly rather than pretending the result is fully trustworthy
- If the extracted board violates Sudoku rules, the library should report that the puzzle is invalid separately from scan diagnostics
- If the extracted board is structurally valid but has no solution, the library should report that solvability failure separately from scan diagnostics

**Behavior when external dependencies fail:**  
The library should minimize reliance on external runtime services. If any optional dependency or model resource fails to load or initialize, the library must fail predictably with a clear structured error and must not return misleading extraction or validation results.

---

## 5. Scope for V1

**Mandatory features:**

- Accept an image of a printed paper Sudoku board
- Extract a best-effort 9x9 matrix
- Detect printed digits in each cell
- Use 0 for blank cells
- Return basic scan diagnostics with the matrix
- Validate whether the extracted board is structurally valid under Sudoku rules
- Determine whether the extracted board has at least one valid solution
- Support difficult real-world photos, including angle, perspective distortion, shadows, uneven lighting, different paper colors, and imperfect framing
- Prioritize browser-based integration as the main supported environment

**Nice-to-have but deferrable:**

- Node.js compatibility as a secondary target
- Rich diagnostics such as per-cell confidence or detailed issue taxonomy
- Better developer helpers, examples, and wrappers

**Tempting but excluded features:**

- Returning the fully solved Sudoku board
- Handwritten digit recognition
- Full end-user UI for capture, correction, or retry

**Product type:**  
Production-oriented reusable JavaScript library with a tightly scoped v1.

**Smallest usable release:**  
A browser-first JavaScript package that accepts a Sudoku image, returns a best-effort 9x9 matrix, includes basic diagnostics, reports structural validity and solvability, and provides text-based guidance for retry or manual correction flows.

---

## 6. Platform and Surface

**Target platform(s):**  
JavaScript library for web and JavaScript-based mobile app ecosystems.

**If web, what kind of product surface:**  
Primary usage is integration into browser-based applications, static sites, PWAs, React Native apps, and other React or JavaScript-based frameworks that can create mobile applications where technical integration is feasible.

**Authentication required:**  
No. Authentication is not required at the library level.

**Roles and permissions:**  
None at the library level.

**Special capabilities required:**

- Offline support: Yes
- Real-time updates: No
- Notifications: No
- File uploads: Yes
- Other: Supported image sources include standard browser file inputs, browser-mediated mobile camera capture flows, uploaded image files, and Base64-encoded image strings

---

## 7. Workflow

**Primary user journey:**

1. Developer integrates the library into a browser-based or JavaScript-based application
2. The application provides a Sudoku image from file input, browser camera capture, upload, or Base64 string
3. The library processes the image, detects the board, recognizes digits, and builds a best-effort 9x9 matrix
4. The library returns the matrix, scan diagnostics, and validation/solvability results
5. The consuming application decides whether to accept the result, ask for retry, or allow manual correction

**First screen or entry point:**  
The entry point is not a standalone screen from this library, but the integration boundary where a consuming application passes an image into the library API.

**Major screens or states:**

- Image received
- Scan in progress
- Matrix and diagnostics returned
- Retry or correction recommended
- Invalid or unsolvable puzzle reported

**Happy path:**  
The consuming application sends a supported Sudoku image to the library, the library successfully detects the board and digits, returns a best-effort 9x9 matrix with clear diagnostics, confirms the board is structurally valid, and reports whether the puzzle is solvable.

**Failure paths:**

- No board detected
- Low-confidence or partial recognition
- Invalid puzzle structure
- Structurally valid puzzle with no solution
- Unsupported or corrupted image input

---

## 8. Data

**Core entities:**

- Input image
- Scan result
- Sudoku matrix
- Scan diagnostics
- Validation result

**Important data for each entity:**

- Input image: source type, image payload, format, dimensions
- Scan result: status, extracted matrix, summary outcome
- Sudoku matrix: 9x9 values using 1-9 and 0
- Scan diagnostics: warnings, recognition issues, quality issues
- Validation result: structural validity, solvability status, validation messages

**User-generated vs system-generated data:**  
The image input is provided by the user or consuming application. The extracted matrix, scan diagnostics, and validation results are system-generated.

**Data that must be stored permanently:**

- None required by the library itself

**Data that can be derived or cached:**

- Scan results can be recomputed from the same image input
- Diagnostics and validation results can be derived again from the same extracted or reprocessed image

**Retention/deletion requirements:**  
No library-level retention is required. Storage, retention, and deletion policies are the responsibility of the consuming application.

**Import/export requirements:**  
The library must accept image input as files or Base64 strings and return structured JSON-like output containing the matrix, diagnostics, and validation results.

---

## 9. Integrations

**Required third-party services:**

- None for v1

**Existing APIs to consume:**

- None for v1

**Will this project expose its own API:**  
No external service API. The project exposes a JavaScript library interface.

**Integration categories needed:**

- Payments: No
- Email: No
- Auth: No
- Analytics: No at the library level
- Storage: No required at the library level
- AI: No external AI service required in v1
- CRM: No

**Chosen providers/accounts already available:**  
None required for v1. The library should remain local-first, self-contained, and free of mandatory external services.

---

## 10. Business Rules

**Rules that must always be true:**

- The returned board representation must always be a 9x9 matrix
- Blank cells must always be represented as 0
- Scan diagnostics must be returned whenever extraction uncertainty or quality issues are detected
- Validation results must be reported separately from scan diagnostics
- The library must not present a solved Sudoku board as part of its product output

**Role-based permission differences:**  
None at the library level.

**Pricing, quotas, limits, or caps:**  
None at the library level.

**Approval flows or manual review steps:**  
None inside the library. Consuming applications may implement manual review or correction flows based on the returned diagnostics.

**Compliance, legal, or policy constraints:**  
No special domain compliance requirements are identified at this stage. Standard open-source or library licensing and dependency compliance still apply.

---

## 11. Non-Functional Requirements

**Performance expectations:**  
The library should run at usable speed in browser-based environments without requiring a server round trip.

**Reliability/uptime expectations:**  
As a local library, reliability means deterministic behavior and consistent output for the same input rather than service uptime.

**Expected scale:**

- Initial: Single-user or low-volume client-side processing inside consuming applications
- Later: Broader reuse across multiple applications and higher client-side usage volume, while remaining library-based rather than centralized traffic

**Security requirements:**  
No network dependency is required in v1. Image data should remain local to the consuming application unless that application explicitly chooses otherwise.

**Accessibility target:**  
Not directly applicable at the library level, but the library outputs should support consuming applications that aim to build accessible user interfaces.

**Supported browsers/devices/environments:**  
Modern browsers, PWAs, and React Native-related JavaScript environments where image input and processing are technically supported.

---

## 12. UX and Design

**Existing brand/style guide:**  
No library-specific brand or style guide is defined at this stage.

**Products that inspire the UX:**

- Not strongly applicable at the library level
- The main design priority is clear, technical, developer-friendly documentation and examples

**Desired interface feel:**  
Clear, technical, and developer-friendly rather than visually branded.

**Existing wireframes or mockups:**  
None at the library level.

**Accessibility or localization requirements:**  
Not directly applicable to the library itself, but examples and documentation should support accessible integration guidance where possible.

---

## 13. Technical Constraints

**Desired stack:**  
Suggested stack for the current direction, subject to change as implementation evidence evolves: TypeScript, browser-first library architecture, built with Vite library mode, and packaged with modern ESM-first exports plus Node-compatible package exports.

**Current stack already in this repo:**  
TBD. The repository does not yet define an established implementation stack.

**Mandated libraries/frameworks/services:**

- No libraries are permanently mandated yet
- Current recommended direction is OpenCV.js for image processing, board detection, and preprocessing, plus an in-house digit-recognition path for printed Sudoku digits
- Earlier OCR candidates including Tesseract.js, ONNX-based local classification, and a mixed ensemble path were explored during spikes and should remain recorded as benchmark evidence
- The current recommendation favors the in-house model because it produced the best overall benchmark outcome among the tested local approaches while keeping the browser-first architecture simpler to debug and evolve
- This recommendation can still be revised later if benchmark evidence shows a different local approach materially outperforms the current in-house path

**Hosting/deployment constraints:**  
No runtime hosting dependency is required for the library itself. Distribution should target standard JavaScript package publishing and local/browser usage rather than hosted service deployment.

**CI/CD, testing, and observability requirements:**  
CI/CD should include automated linting, type-checking, unit tests, and evaluation tests against representative Sudoku image fixtures. Observability should focus on test results, regression tracking, and benchmark comparisons rather than production service telemetry.

**Repo or engineering conventions to preserve:**  
Preserve a browser-first architecture, keep external service dependencies optional, maintain a clear separation between image processing, OCR, diagnostics, and validation logic, and favor deterministic outputs that are easy to test and benchmark.

---

## 14. Delivery

**Target timeline:**  
TBD for now.

**Stakeholders/decision makers:**

- Project owner: user

**Who reviews and approves specs:**  
The user reviews and approves specs.

**How often the spec should evolve:**  
Continuously during early discovery and implementation.

**Preferred spec hierarchy:**

- [ ] One full spec
- [x] Product spec
- [x] Feature specs
- [ ] API spec
- [ ] UI spec
- [x] Acceptance criteria
- [x] Delivery plan

---

## 15. Quality Bar

**Definition of done:**  
A feature is done when it is implemented, tested, documented, and produces deterministic results against approved acceptance criteria.

**Preferred acceptance criteria format:**  
Both checklist and Gherkin.

**Track assumptions and open questions explicitly:**  
Yes, inside each relevant section.

**Requirement-to-test traceability needed:**  
Yes. Important requirements should map to tests.

**Should implementation wait for spec approval first:**  
Partially. Core features require approval first, while exploratory spikes can happen earlier.

---

## 16. Risks and Unknowns

**Biggest unknowns:**

- Whether the current in-house OCR path can become robust enough for printed Sudoku digits under difficult real-world image conditions
- How well browser-side processing will perform on lower-powered mobile devices
- How robust board detection will be under aggressive perspective, lighting, and framing problems

**Open decisions still pending:**

- How detailed the diagnostics output should become beyond the basic v1 shape

**Benchmark outcome recorded so far:**

- The active OCR direction is now the in-house model path rather than Tesseract.js, ONNX classification, or an ensemble strategy
- The in-house path was retained because benchmark evidence showed better overall behavior for this project, especially when balancing browser simplicity, deterministic debugging, and false-positive control
- Threshold-heavy and color-heavy degraded boards remain the main weak area and are the next improvement target

**What has already been tried:**  
Product definition, scope, workflows, validation strategy, and suggested technical direction have been specified. Multiple OCR spike paths have also been benchmarked, including earlier in-house baselines, an ONNX-based local classifier, and an ensemble approach, with the in-house direction currently retained as the active path.

**What would make this fail:**  
OCR accuracy being too low, board detection being too fragile in real-world images, browser-side performance being too poor, or diagnostics being too weak to support correction and retry flows.

**Most sensitive tradeoffs:**  
Accuracy over speed, accuracy over simplicity, and maintainability over experimentation.

---

## 17. SDD Working Model

**Initial documents you want created:**

- [x] `vision.md`
- [x] `requirements.md`
- [x] `user-stories.md`
- [x] `acceptance-criteria.md`
- [x] `technical-spec.md`
- [x] `benchmark-record.md`
- [x] `delivery-plan.md`

**Should specs live inside this repo:**  
Yes

**If yes, preferred location:**  
/docs/specs

**Preferred delivery sequence:**  
spec -> spike -> review -> approval -> build -> verify

**Spec strictness level:**  
Moderate

---

## 18. Additional Notes

**Anything else I should know before drafting the first spec:**  
This intake should be treated as the source of truth for the initial spec set. The preferred working model is spec -> spike -> review -> approval -> build -> verify, with implementation decisions remaining adjustable when benchmark evidence shows the current recommendation is not sufficient. When benchmark-driven decisions are made, they should be preserved in both `/docs/specs` and the spike notes instead of replacing history without a record.

# Digit-Lens Implementation Plan

## Objective

Transform digit-lens into a robust browser-first Sudoku board recognition API that accurately loads printed Sudoku puzzles from magazines, newspapers, and other physical sources into existing digital Sudoku games.

**Scope**: Input API for digitizing human-readable printed Sudoku boards (not extreme edge cases).

**Target Users**: Developers integrating Sudoku puzzle loading into existing games/apps, and end users photographing printed puzzles to play digitally.

---

## Tool Selection Strategy

### Core Stack Decision

**Primary**: Enhanced Manual Implementation

- **Current approach** with optimizations
- **Bundle size**: ~50-80KB
- **Rationale**: Proven to work, zero dependencies, full control, smallest footprint
- **Use for**: All core detection algorithms

**Secondary**: tracking.js

- **Bundle size**: ~7KB
- **Capabilities**: Sobel edge detection, convolution, grayscale, blur, integral images
- **Rationale**: Lightweight, well-tested, mobile-optimized, fills specific gaps
- **Use for**: Edge detection, convolution filters, feature extraction utilities

**Tertiary**: Optional WebAssembly (Progressive Enhancement)

- **Bundle size**: ~500KB-1MB (lazy-loaded)
- **Capabilities**: High-performance image processing
- **Rationale**: Near-native speed for heavy operations, optional for capable devices
- **Use for**: Advanced preprocessing on high-end devices only

### Rationale Summary

- **Browser-first constraint**: Must work in basic web browsers without heavy dependencies
- **Device diversity**: Must handle low-end to high-end mobile devices
- **Bundle size constraints**: Keep library lightweight for web deployment
- **Performance requirements**: <2 seconds processing on typical devices
- **OpenCV.js rejected**: Too large (~8MB), though mentioned in lessons-learned as original choice

---

## Implementation Phases

### Phase 1: Foundation - Device Capability Detection

**Objective**: Build adaptive processing system that adjusts to device capabilities.

**Tasks**:

1. Create device capability detection module
2. Implement performance benchmarking
3. Build adaptive processing selector
4. Add progressive loading infrastructure

**Files to Create**:

- `src/device/capabilities.ts` - Device detection and capability assessment
- `src/device/adaptive-processor.ts` - Processing path selection
- `src/device/performance-monitor.ts` - Performance tracking

**Success Criteria**:

- Accurately detects device capabilities (memory, CPU, GPU, WASM support)
- Selects appropriate processing level based on device
- Caches capabilities for session duration
- <50ms overhead for capability detection

**Testing**:

- Unit tests for capability detection
- Mock different device profiles
- Validate processing path selection

---

### Phase 2: Enhanced Preprocessing Pipeline

**Objective**: Improve image normalization for diverse mobile photography conditions.

**Tasks**:

1. Implement adaptive histogram equalization
2. Add noise reduction using convolution
3. Create local adaptive thresholding variants
4. Build quality-aware preprocessing selection
5. Add color deconvolution for colored grids

**Files to Modify**:

- `src/pipeline/normalize-image.ts` - Add preprocessing variants
- `src/pipeline/quality-assessment.ts` - Create image quality assessment

**Files to Create**:

- `src/preprocessing/adaptive-threshold.ts` - Local thresholding methods
- `src/preprocessing/histogram-equalization.ts` - Contrast enhancement
- `src/preprocessing/noise-reduction.ts` - Denoising filters

**Preprocessing Paths**:

- **Aggressive**: Heavy noise reduction + strong contrast + downsample (low-end devices + poor quality)
- **Balanced**: Moderate processing + standard downsample (mid-range devices)
- **Quality**: Light processing + minimal downsample (high-end devices + good quality)

**Success Criteria**:

- Improved board detection on low-quality images
- Maintains performance on high-quality images
- Adaptive selection based on image quality and device capabilities
- <200ms additional preprocessing time

**Testing**:

- Test across different image quality levels
- Validate preprocessing path selection
- Measure performance impact

---

### Phase 3: Multi-Strategy Board Detection

**Objective**: Implement complementary detection strategies with fallback cascade.

**Tasks**:

1. Enhance current density-based detection
2. Add edge-based detection using convolution
3. Implement gradient-based approach
4. Build confidence-weighted voting system
5. Create fallback cascade mechanism

**Files to Modify**:

- `src/pipeline/detect-board.ts` - Add multi-strategy detection
- `src/pipeline/edge-detection.ts` - Create edge-based detection (new)

**Files to Create**:

- `src/detection/edge-strategy.ts` - Edge-based detection implementation
- `src/detection/gradient-strategy.ts` - Gradient-based detection
- `src/detection/confidence-voting.ts` - Multi-strategy combination

**Detection Strategies**:

1. **Density-based** (current) - Row/column density analysis
2. **Edge-based** (new) - Sobel/Canny edge detection
3. **Gradient-based** (new) - Gradient magnitude analysis

**Fallback Cascade**:

- Try strategies in order of device capability
- Use confidence threshold to accept/reject
- Return best partial result if all fail

**Success Criteria**:

- Board detection rate >90% on human-readable scenarios
- Graceful degradation on difficult images
- <500ms additional detection time
- Maintains current accuracy on existing fixtures

**Testing**:

- Test each strategy independently
- Validate fallback cascade
- Measure confidence scoring accuracy

---

### Phase 4: Expanded Test Suite - Normal Scenarios

**Objective**: Build comprehensive test coverage for human-readable normal scenarios.

**Tasks**:

1. Curate 10-15 additional fixtures from existing datasets
2. Add fixture selection criteria for human readability
3. Categorize fixtures by scenario type
4. Add device-specific testing
5. Implement quality metrics collection

**Files to Modify**:

- `tests/fixtures/acceptance-suite.json` - Add new fixtures
- `tests/fixtures/README.md` - Document fixture categories

**Files to Create**:

- `tests/fixtures/selection-criteria.md` - Human readability guidelines
- `tests/benchmark/quality-metrics.ts` - Quality measurement functions
- `tests/benchmark/performance-benchmark.ts` - Performance profiling

**Fixture Categories** (Target: 15-20 total):

- **Current** (5): Synthetic baseline + 3 real photos
- **Printed Material Photography** (6-8): Magazines, newspapers, books, different paper types
- **Mobile Photography** (4-5): Different phones, angles, lighting conditions
- **Device Variations** (2-3): iOS vs Android, tablet vs phone
- **Quality Variations** (2-3): Slight blur, shadows, glare on printed material

**Excluded Scenarios**:

- Extremely blurred digits (human-unreadable)
- Very low light (human-unreadable)
- Severe motion blur (human-unreadable)
- Heavy compression artifacts (human-unreadable)
- Partially obscured boards (human-unreadable)

**Success Criteria**:

- 15-20 diverse fixtures covering normal scenarios
- All fixtures pass human readability check
- Clear categorization and metadata
- Baseline metrics established

**Testing**:

- Run acceptance suite on all fixtures
- Establish baseline accuracy metrics
- Document current performance

---

### Phase 5: Quality Metrics & Progress Tracking

**Objective**: Implement comprehensive quality measurement and progress tracking.

**Tasks**:

1. Define quality metrics (accuracy, performance, resource usage)
2. Implement metrics collection functions
3. Build benchmark runner
4. Create quality dashboard
5. Add progress tracking over time

**Files to Create**:

- `src/quality/metrics.ts` - Quality measurement functions
- `src/quality/benchmark.ts` - Benchmark runner
- `scripts/benchmark-quality.js` - Quality benchmark script
- `scripts/benchmark-performance.js` - Performance benchmark script
- `docs/quality-dashboard.md` - Quality tracking dashboard

**Quality Metrics**:

- **Recognition Accuracy**: Board detection rate, digit accuracy, false positive/negative rates
- **Performance**: Processing time, memory usage, CPU utilization
- **Categorization**: By scenario type, device category, quality level

**Commands to Add**:

```bash
npm run benchmark:quality      # Run quality benchmark
npm run benchmark:performance  # Run performance benchmark
npm run report:quality         # Generate quality report
npm run benchmark:compare      # Compare against previous version
```

**Success Criteria**:

- Automated quality measurement
- Performance profiling across device types
- Progress tracking over time
- Regression detection

**Testing**:

- Validate metrics accuracy
- Test benchmark runner
- Verify progress tracking

---

### Phase 6: Integration & Optimization

**Objective**: Integrate all components and optimize for production.

**Tasks**:

1. Integrate all phases into main pipeline
2. Optimize performance bottlenecks
3. Add error handling and graceful degradation
4. Update documentation
5. Validate across browsers and devices

**Files to Modify**:

- `src/index.ts` - Integrate new capabilities
- `src/pipeline/` - Update pipeline stages
- `README.md` - Update documentation
- `docs/` - Update technical documentation

**Success Criteria**:

- All components integrated smoothly
- Performance targets met (<2s processing)
- Error handling robust
- Documentation complete
- Cross-browser validation

**Testing**:

- Full integration testing
- Cross-browser testing
- Device testing
- Performance validation

---

## Quality Metrics & Success Criteria

### Target Metrics (Human-Readable Scenarios)

**Recognition Accuracy** (Critical for Game Integration):

- Board detection rate: >90%
- Digit recognition accuracy: >85%
- False positive rate: <5% (critical for game validity)
- False negative rate: <10%
- Structural validity: >95% (must produce valid Sudoku boards)

**Performance**:

- Processing time: <2 seconds (typical devices)
- Memory usage: <100MB peak
- Bundle size: <150KB total

**Device Coverage**:

- Low-end devices: >70% accuracy
- Mid-range devices: >85% accuracy
- High-end devices: >90% accuracy

**Scenario Coverage**:

- Clean printed boards: >95% accuracy
- Moderate degradation: >80% accuracy
- Mobile photography of printed material: >75% accuracy

### Progress Tracking

**Baseline Metrics** (Current):

- Board detection: ~78% (estimated from current fixtures)
- Digit accuracy: ~65% (estimated)
- Processing time: ~1800ms (estimated)

**Target Metrics** (After Implementation):

- Board detection: >90%
- Digit accuracy: >85%
- Processing time: <1200ms

**Success Indicators**:

- Continuous improvement in metrics
- No performance regression
- Expanded scenario coverage
- Maintained bundle size constraints

---

## Testing Strategy

### Unit Testing

- Test individual components in isolation
- Mock external dependencies
- Validate algorithm correctness
- Measure component performance

### Integration Testing

- Test component interactions
- Validate pipeline flow
- Test error handling
- Measure end-to-end performance

### Acceptance Testing

- Test against fixture suite
- Validate expected behavior
- Measure quality metrics
- Track progress over time

### Device Testing

- Test across device categories
- Validate adaptive processing
- Measure performance variations
- Ensure graceful degradation

### Browser Testing

- Test across major browsers
- Validate compatibility
- Measure performance differences
- Ensure consistent behavior

---

## Implementation Guidelines for Agents

### Starting Point

1. Read this entire implementation plan
2. Review current codebase structure
3. Understand existing detection pipeline
4. Review current test fixtures

### Phase Execution Order

1. **Phase 1** (Device Detection) - Foundation for adaptive processing
2. **Phase 4** (Test Suite) - Establish baseline metrics
3. **Phase 2** (Preprocessing) - Improve input quality
4. **Phase 3** (Multi-Strategy Detection) - Core detection improvements
5. **Phase 5** (Quality Metrics) - Implement measurement system
6. **Phase 6** (Integration) - Final integration and optimization

### Decision Points

- **Tool selection**: Already decided (manual + tracking.js)
- **Fixture scope**: Human-readable normal scenarios only
- **Performance targets**: <2s processing, <150KB bundle
- **Device support**: Low-end to high-end mobile devices

### Quality Gates

Each phase must pass:

- Unit tests pass
- Integration tests pass
- Performance targets met
- No regression in existing functionality
- Documentation updated

### Progress Tracking

- Update this document with phase completion status
- Record metrics after each phase
- Document any deviations from plan
- Note lessons learned

---

## Commands & Scripts

### Development Commands

```bash
# Current commands (maintain)
npm run build                    # Build library
npm run demo                     # Run demo app
npm test                         # Run acceptance tests
npm run lint                     # Lint code
npm run format                   # Format code

# New commands to add
npm run benchmark:quality        # Run quality benchmark
npm run benchmark:performance    # Run performance benchmark
npm run report:quality           # Generate quality report
npm run benchmark:compare        # Compare against baseline
npm run test:device             # Device-specific testing
```

### Testing Commands

```bash
# Current commands (maintain)
npm run test:contract           # API contract tests
npm run test:acceptance:smoke   # Smoke tier fixtures
npm run test:acceptance:core    # Core tier fixtures
npm run test:acceptance:hard    # Hard tier fixtures
npm run test:acceptance:all     # All fixtures

# New commands to add
npm run test:unit               # Unit tests only
npm run test:integration        # Integration tests only
npm run test:device:low         # Low-end device tests
npm run test:device:mid         # Mid-range device tests
npm run test:device:high        # High-end device tests
```

---

## Documentation Structure

### Current Documentation

- `README.md` - Project overview and usage
- `docs/lessons-learned.md` - Historical decisions and failures
- `docs/specs/` - Requirements and specifications

### New Documentation to Add

- `docs/implementation-plan.md` - This document
- `docs/architecture.md` - System architecture and design
- `docs/quality-metrics.md` - Quality measurement methodology
- `docs/testing-strategy.md` - Testing approach and guidelines
- `docs/device-support.md` - Device capability handling
- `docs/progress-tracking.md` - Progress tracking methodology

---

## Success Criteria Summary

### Must Have (Blocking)

- ✅ Works in basic web browsers without heavy dependencies
- ✅ Handles human-readable printed Sudoku material
- ✅ <2 seconds processing on typical devices
- ✅ <150KB total bundle size
- ✅ >90% board detection on printed material
- ✅ >85% digit accuracy on printed material
- ✅ >95% structural validity (produces valid Sudoku boards for games)

### Should Have (Important)

- ✅ Adaptive processing for device capabilities
- ✅ Multi-strategy detection with fallback
- ✅ Comprehensive test suite (15-20 fixtures)
- ✅ Quality metrics and progress tracking
- ✅ Cross-browser compatibility

### Nice to Have (Enhancement)

- Optional WebAssembly for high-end devices
- Progressive enhancement
- Advanced preprocessing options
- Detailed performance profiling

---

## Risk Mitigation

### Technical Risks

- **Performance degradation**: Mitigate with profiling and optimization
- **Bundle size growth**: Mitigate with code splitting and lazy loading
- **Browser compatibility**: Mitigate with cross-browser testing
- **Device fragmentation**: Mitigate with adaptive processing

### Process Risks

- **Scope creep**: Mitigate with clear phase boundaries
- **Fixture quality**: Mitigate with human readability criteria
- **Metrics accuracy**: Mitigate with validation and calibration
- **Timeline overruns**: Mitigate with iterative delivery

---

## Next Steps

### Immediate Actions

1. Review and approve this implementation plan
2. Set up project tracking (issues, milestones)
3. Begin Phase 1 (Device Capability Detection)
4. Curate additional test fixtures (Phase 4)

### Agent Instructions

When implementing:

1. Start with Phase 1 as foundation
2. Follow phase order strictly
3. Meet quality gates before proceeding
4. Update this document with progress
5. Document deviations and lessons learned

### User Involvement

- Review and approve phase completions
- Provide feedback on quality metrics
- Test demo app with real devices
- Validate fixture selection
- Approve final integration

---

## Appendix: Quick Reference

### File Structure

```
src/
├── device/                    # NEW: Device capability detection
│   ├── capabilities.ts
│   ├── adaptive-processor.ts
│   └── performance-monitor.ts
├── preprocessing/            # NEW: Enhanced preprocessing
│   ├── adaptive-threshold.ts
│   ├── histogram-equalization.ts
│   └── noise-reduction.ts
├── detection/                # NEW: Multi-strategy detection
│   ├── edge-strategy.ts
│   ├── gradient-strategy.ts
│   └── confidence-voting.ts
├── quality/                   # NEW: Quality metrics
│   ├── metrics.ts
│   └── benchmark.ts
├── pipeline/                  # EXISTING: Update and enhance
│   ├── decode-input.ts
│   ├── normalize-image.ts
│   ├── detect-board.ts
│   ├── rectify-board.ts
│   ├── validate-grid.ts
│   ├── extract-cells.ts
│   ├── recognize-digits.ts
│   └── assemble-result.ts
└── index.ts                   # UPDATE: Integrate new features

tests/
├── fixtures/
│   ├── acceptance-suite.json  # UPDATE: Add fixtures
│   └── selection-criteria.md  # NEW: Fixture guidelines
└── benchmark/                 # NEW: Quality benchmarking
    ├── quality-metrics.ts
    └── performance-benchmark.ts

scripts/
├── benchmark-quality.js       # NEW
├── benchmark-performance.js   # NEW
└── (existing scripts)

docs/
├── implementation-plan.md    # NEW: This document
├── architecture.md            # NEW
├── quality-metrics.md         # NEW
├── testing-strategy.md        # NEW
├── device-support.md          # NEW
└── progress-tracking.md       # NEW
```

### Key Terms

- **Human-readable**: Digits clear enough for a person to read
- **Normal scenarios**: Typical mobile photography, not extreme edge cases
- **Adaptive processing**: Adjusts processing based on device capabilities
- **Multi-strategy detection**: Multiple detection methods with fallback
- **Progressive enhancement**: Advanced features for capable devices
- **Quality gates**: Minimum criteria before proceeding to next phase

### Contact & Support

- Project repository: /Users/juancastrillon/projects/digit-lens
- Demo app: `npm run demo`
- Test suite: `npm test`
- Build: `npm run build`

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-14  
**Status**: Ready for Implementation  
**Next Review**: After Phase 1 completion

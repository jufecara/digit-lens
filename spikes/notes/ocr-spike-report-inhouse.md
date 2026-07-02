# OCR Spike Report: In-House Classifier Prototype

This spike prototypes an in-house digit recognizer using extracted labeled cell images and a leave-one-board-out nearest-neighbor classifier on normalized binary features.

Training pool: `forum-sudoku-original.jpeg`, `servo-sudoku-figure09.jpg`, `stackoverflow-newspaper-original.jpg`, `stackoverflow-newspaper-transform.png`, `pyimagesearch-photo.jpg`, `pyimagesearch-transform.png`
Excluded from training: `forum-sudoku-engine2.jpeg`, `pyimagesearch-thresh.png`, `stackoverflow-blue-grid.png`, `stackoverflow-newspaper-thresh.png`
Evaluation targets: `forum-sudoku-engine2.jpeg`, `forum-sudoku-original.jpeg`, `pyimagesearch-photo.jpg`, `pyimagesearch-thresh.png`, `pyimagesearch-transform.png`, `servo-sudoku-figure09.jpg`, `stackoverflow-blue-grid.png`, `stackoverflow-newspaper-original.jpg`, `stackoverflow-newspaper-thresh.png`, `stackoverflow-newspaper-transform.png`

## Closeout

- Spike status: complete
- Approved direction: continue with the in-house printed-digit OCR path
- Current scope boundary: keep the active spike runtime on `/spikes/samples`; do not switch the runtime to `/data` yet
- Next stage: add a dedicated dataset consumer/evaluation path for the curated dataset described in [docs/specs/dataset-next-stage.md](../../docs/specs/dataset-next-stage.md)

## Results
### forum-sudoku-engine2.jpeg

- Board detected: yes
- Recognized digits: 1
- Cell accuracy: 60.49%
- Digit recall: 0.00%
- False positive digits: 1
- Correct filled digits: 0
- Matrix:

```text
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 1 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
```

### forum-sudoku-original.jpeg

- Board detected: yes
- Recognized digits: 31
- Cell accuracy: 98.77%
- Digit recall: 96.77%
- False positive digits: 0
- Correct filled digits: 30
- Matrix:

```text
0 1 2 4 0 0 0 0 0
5 0 0 0 8 0 2 7 0
9 0 0 2 0 3 0 0 0
2 0 8 0 3 6 0 0 0
0 8 0 1 2 0 8 0 0
0 0 1 8 0 5 3 0 0
0 7 0 0 6 8 0 9 2
0 9 0 0 0 0 1 3 0
0 0 0 0 0 0 4 0 0
```

### pyimagesearch-photo.jpg

- Board detected: yes
- Recognized digits: 33
- Cell accuracy: 100.00%
- Digit recall: 100.00%
- False positive digits: 0
- Correct filled digits: 33
- Matrix:

```text
8 0 0 0 1 0 0 0 9
0 5 0 8 0 7 0 1 0
0 0 4 0 9 0 7 0 0
0 6 0 7 0 1 0 2 0
5 0 8 0 6 0 1 0 7
0 1 0 5 0 2 0 9 0
0 0 7 0 4 0 6 0 0
0 8 0 3 0 9 0 4 0
3 0 0 0 5 0 0 0 8
```

### pyimagesearch-thresh.png

- Board detected: yes
- Recognized digits: 0
- Cell accuracy: 59.26%
- Digit recall: 0.00%
- False positive digits: 0
- Correct filled digits: 0
- Matrix:

```text
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
```

### pyimagesearch-transform.png

- Board detected: yes
- Recognized digits: 33
- Cell accuracy: 100.00%
- Digit recall: 100.00%
- False positive digits: 0
- Correct filled digits: 33
- Matrix:

```text
8 0 0 0 1 0 0 0 9
0 5 0 8 0 7 0 1 0
0 0 4 0 9 0 7 0 0
0 6 0 7 0 1 0 2 0
5 0 8 0 6 0 1 0 7
0 1 0 5 0 2 0 9 0
0 0 7 0 4 0 6 0 0
0 8 0 3 0 9 0 4 0
3 0 0 0 5 0 0 0 8
```

### servo-sudoku-figure09.jpg

- Board detected: yes
- Recognized digits: 27
- Cell accuracy: 96.30%
- Digit recall: 90.00%
- False positive digits: 0
- Correct filled digits: 27
- Matrix:

```text
5 3 0 0 7 0 0 0 0
6 0 0 0 9 5 0 0 0
0 9 8 0 0 0 0 6 0
8 0 0 0 6 0 0 0 3
4 0 0 8 0 3 0 0 0
7 0 0 0 2 0 0 0 6
0 6 0 0 0 0 2 8 0
0 0 0 4 0 9 0 0 5
0 0 0 0 8 0 0 7 9
```

### stackoverflow-blue-grid.png

- Board detected: yes
- Recognized digits: 12
- Cell accuracy: 81.48%
- Digit recall: 44.44%
- False positive digits: 0
- Correct filled digits: 12
- Matrix:

```text
0 0 0 0 0 0 2 0 0
0 9 0 2 0 0 0 0 0
0 0 0 6 0 7 0 0 0
0 1 9 0 0 0 5 0 0
4 0 0 0 0 0 0 0 0
0 0 7 0 0 0 0 0 0
0 0 0 0 0 1 0 0 0
0 0 0 0 0 0 0 0 1
0 0 0 0 0 0 0 0 0
```

### stackoverflow-newspaper-original.jpg

- Board detected: yes
- Recognized digits: 26
- Cell accuracy: 100.00%
- Digit recall: 100.00%
- False positive digits: 0
- Correct filled digits: 26
- Matrix:

```text
0 0 0 6 0 4 7 0 0
7 0 6 0 0 0 0 0 9
0 0 0 0 0 5 0 8 0
0 7 0 0 2 0 0 9 3
8 0 0 0 0 0 0 0 5
4 3 0 0 1 0 0 7 0
0 5 0 2 0 0 0 0 0
3 0 0 0 0 0 2 0 8
0 0 2 3 0 1 0 0 0
```

### stackoverflow-newspaper-thresh.png

- Board detected: yes
- Recognized digits: 0
- Cell accuracy: 67.90%
- Digit recall: 0.00%
- False positive digits: 0
- Correct filled digits: 0
- Matrix:

```text
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0
```

### stackoverflow-newspaper-transform.png

- Board detected: yes
- Recognized digits: 26
- Cell accuracy: 100.00%
- Digit recall: 100.00%
- False positive digits: 0
- Correct filled digits: 26
- Matrix:

```text
0 0 0 6 0 4 7 0 0
7 0 6 0 0 0 0 0 9
0 0 0 0 0 5 0 8 0
0 7 0 0 2 0 0 9 3
8 0 0 0 0 0 0 0 5
4 3 0 0 1 0 0 7 0
0 5 0 2 0 0 0 0 0
3 0 0 0 0 0 2 0 8
0 0 2 3 0 1 0 0 0
```

## Outcome

- Evaluation target count: 10
- Board detection rate: 100.00%
- Full benchmark count: 10
- Full benchmark cell accuracy: 86.42%
- Full benchmark digit recall: 63.12%
- Clean-pool benchmark count: 6
- Clean-pool cell accuracy: 99.18%
- Clean-pool digit recall: 97.80%

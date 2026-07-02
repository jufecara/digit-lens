# Vision

[Specs Index](./README.md) | [Requirements](./requirements.md) | [Source Intake](../sdd-intake-template.md)

## Table of Contents

1. [Purpose](#purpose)
2. [Problem](#problem)
3. [Product Vision](#product-vision)
4. [Primary Users](#primary-users)
5. [Success Definition](#success-definition)
6. [V1 Boundaries](#v1-boundaries)

## Purpose

`digit-lens` is a reusable JavaScript library that scans a photo of a paper Sudoku puzzle, detects the board and its printed digits, and returns a `9x9` matrix representation of the puzzle.

## Problem

Developers building Sudoku-related products need a reliable way to turn photographed paper Sudoku boards into structured digital data without building a custom OCR and image-processing pipeline from scratch.

## Product Vision

The library should make Sudoku board extraction practical in browser-first JavaScript applications, including static sites, PWAs, React Native integrations, and related mobile-oriented JavaScript ecosystems. It should prioritize recognition accuracy first and simplicity of integration second.

## Primary Users

- Frontend JavaScript developers integrating Sudoku scanning into browser-based products
- Indie developers building standalone puzzle tools
- Product builders who need reliable Sudoku import without deep computer-vision expertise

## Success Definition

The product is successful when a consuming application can provide a supported Sudoku image and receive:

- a best-effort `9x9` matrix using digits `1-9` and `0` for blanks
- basic scan diagnostics that make uncertainty explicit
- structural validation results
- solvability results

## V1 Boundaries

### In scope

- Printed Sudoku boards on paper
- Aggressive real-world image conditions
- Browser-first integration
- Validation and solvability checks

### Out of scope

- Returning a completed solved board as product output
- Handwritten digit recognition
- Full end-user UI
- Non-`9x9` Sudoku variants

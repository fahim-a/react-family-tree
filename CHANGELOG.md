# Changelog

All notable changes to the `@fahim-a/react-family-tree` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-22

### Added
- **Hierarchical Layout Engine:** Bimodal DAG layout algorithm calculating non-overlapping 2D coordinates with centered marriage gates and smooth cubic bezier connector curves.
- **Interactive Canvas:** Hardware-accelerated pan and zoom (0.2x to 2.5x), dot grid background, fit-to-screen, and interactive MiniMap.
- **Theme Support:** Full light and dark mode parity with reactive toggle and persistent theme storage.
- **Tree Editor (CRUD):** In-browser interactive editing:
  - Add root/independent person.
  - Add spouse with support for multiple non-concurrent marriages.
  - Add child and parent with automatic family union linking.
  - Link existing relatives with cycle detection.
  - Edit vitals (birth, death, places), occupation, bio, and arbitrary key/value attributes.
  - Deletion confirmation dialog with orphan subtree warnings.
- **Kinship & Relationship Analysis:**
  - Automated detection of common ancestors (MRCA) and degree of kinship.
  - Plain-English relationship naming (first cousins, aunts/uncles, grandparents, in-laws, spouses).
  - Classification between direct genetic blood relationships vs marriage connections.
  - Shortest connection pathfinder with step-by-step breadcrumb routing.
- **Lineage Highlighting:** Visual emphasis for direct ancestors or direct descendants, dimming non-related nodes with custom connector glows.
- **Photo Album & Media Gallery:**
  - Multi-person photo tagging allowing individual portraits as well as group/candid family photographs.
  - Interactive full-screen Photo Lightbox displaying high-resolution image, title, date, place, story, and clickable tagged relatives.
  - One-click profile avatar assignment from any photo.
  - Add photo modal supporting both image URLs and local image file uploads via HTML5 FileReader.
  - In-canvas card camera badges indicating photo count.
- **Static Read-Only Mode:** `editable={false}` prop to disable all mutation tools while preserving exploration, search, lineage, and kinship analysis.
- **Dual Format Support:**
  - Standard GEDCOM 5.5.1 import and export (`.ged`).
  - Normalized JSON schema import and export (`.json`).
- **Change History, Undo-Redo & Timeline Revert:**
  - Full session audit log recording every mutation (person additions, spouse unions, children, parent links, edits, removals, and photo uploads).
  - Single-step Undo (`Ctrl+Z` / `Cmd+Z`) and Redo (`Ctrl+Y` / `Cmd+Shift+Z`) controls on the canvas toolbar.
  - Interactive History timeline modal displaying chronological changes, timestamps, affected relatives, and a "Current State" marker.
  - Non-destructive append-only revert: selecting "Revert to this" on past revisions creates an immutable restore snapshot (`changeType: 'revert'`), preserving all subsequent work and enabling one-click undo of the revert itself.
  - Automatic history stack reset when loading a GEDCOM file, JSON file, or initializing a blank tree.
- **Privacy Mode:** Configurable living individual redaction and masking.
- **Responsive Architecture & Mobile Touch Controls:**
  - Native multi-touch gestures: 1-finger drag panning and 2-finger Euclidean distance pinch-to-zoom with focal midpoint preservation.
  - `touch-none` canvas container preventing viewport rubber-banding and competing scroll gestures on mobile browsers.
  - Responsive person drawer adapting to 100% full-width on mobile viewports (< 640px) and fixed 384px slide-over on tablets/desktop.
  - Responsive toolbar collapsing with compact search input and icon-only action buttons on narrow screens.
  - Auto-hiding MiniMap on mobile screens to preserve maximum canvas interaction area.
  - Resolution-aware fit-to-screen scale clamping ensuring optimal viewing across 4K UHD, 1080p desktop, laptops, tablets, and smartphones.
- **Odd & Edge Case Genealogy Scenarios:** Tested pedigree collapse / consanguinity (cousin intermarriage), circular loop ingestion and cycle prevention (`canLinkChild`, `canLinkParent`), same-sex unions with gender-neutral kinship, serial monogamy with 5 non-concurrent spouses, massive families with 20+ siblings, double cousins, dangling ghost references, Renaissance and double dating (1711/12), and 12-generation linear stick lineages.
- **Test Suite & Coverage:** Comprehensive Vitest test suite with 98 scenario-based unit and integration tests across 14 test suites, achieving 93%+ core engine line coverage.
- **CI/CD Automation:** GitHub Actions workflows for demo deployment to GitHub Pages and automated library releases.

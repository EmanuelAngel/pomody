# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-25

### Added

- **Decoupled Timer Finite State Machine (FSM)**: Pure TypeScript core managing focus, short break, and long break intervals with configurable round counters.
- **Minimalist Zen Interface**: Focused timer view that automatically conceals secondary actions during running sessions to preserve user attention.
- **Rosé Pine Theme Engine**: Three cohesive visual palettes—Dark (neutral dark), High-Contrast (OLED pure black), and Light (Rosé Pine Dawn).
- **Harmonic Web Audio Synthesizer**: Procedural audio chime alerts for session transitions without heavy audio file dependencies.
- **Decoupled Settings Drawer**: Slide-out configuration panel for intervals, sound controls, and visual theme selection.
- **Top Shell Navigation**: Centered header tablist laying out current and upcoming views (_Temporizador_, _Planning_, _Métricas_).
- **Domain Event Dispatching**: In-memory event bus with `BlockCompleted` event payloads ready for local persistence.
- **Local Settings Persistence**: Browser local storage adapter for user configuration across sessions.
- **Desktop Windows Support (Tauri v2)**: Native lightweight executable and NSIS installer packaging under MSVC.
- **Automated CI Pipelines**: GitHub Actions workflows for linting, type-checking, domain unit tests, static SPA building, and Windows desktop compilation.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cocos Creator 3.8.8 water-sort puzzle game. This is an early-stage project with UI assets imported but no game logic scripts yet.

## Development Workflow

This project uses Cocos Creator's GUI-based workflow. There are no npm scripts or CLI commands:

1. Open project in Cocos Creator 3.8.8 (GUI application)
2. Develop using the Editor for scenes, game objects, and TypeScript scripts
3. Build via Cocos Creator Build panel (Web, iOS, Android, Windows, Mac, etc.)

Engine location: `C:\ProgramData\cocos\editors\Creator\3.8.8\`

## Architecture

### Project Structure

- `assets/UI/` - All game UI artwork organized by category
- `assets/scene.scene` - Main game scene (1280x720, 2D orthographic camera)
- `library/` - Cached compiled assets (hashed directory structure)
- `temp/` - Build artifacts and TypeScript declarations
- `settings/`, `profiles/`, `.creator/` - Cocos Creator configuration

### Core Architectural Principles (from .clauderules)

1. **Logic/Presentation Separation**: Core sorting algorithm in pure TypeScript classes, no direct Cocos node coupling
2. **Event-Driven**: Use custom events for layer communication, minimize strong references
3. **State Machine**: Global state machine controls game states (Home, Map, Game, Result, Settings)
4. **JSON Level Data**: All level configurations must be standard JSON format

### Scenes to Implement

| Scene | Purpose |
|-------|---------|
| HomeScene | Start button, shop placeholder |
| MapScene | Level list, progress display, return to home |
| GameScene | Core gameplay, top progress,道具栏 |
| ResultPop | Success/fail popup, navigation buttons |
| SettingPop | Sound, vibration toggles, version |

### Core Modules

| Layer | Components |
|-------|------------|
| Data | LevelConfig, UserProfile, GameState |
| Logic | WaterSortEngine (validation, undo) |
| Presentation | BottleComponent, WaterShader (2D liquid simulation) |
| Utilities | UIManager (popup management), LevelEditor |

### UI Asset Categories

- `Backgrounds/` - 32 numbered backgrounds (level themes)
- `Bottles/` - 48 bottle types with dual states (_1.png, _2.png)
- `Dialog/` - Shop, settings dialogs
- `HomeGame/` - Home and gameplay UI (add_tube, undo, replay)
- `Map/` - Level map elements (icons, paths, ribbons)
- `Result/` - Victory/result screen assets
- `Collection/` - Achievement/Collection UI

## Development Rules

- Before writing code, update `project_manifest.md` with current task status
- Focus on one submodule at a time; define interfaces first for complex logic
- Use `@property` decorator for UI component bindings
- Asset import path configured: `\\192.168.10.11\NonGaming\APP\2.产品\53、海外游戏\水排序`

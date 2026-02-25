# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cocos Creator 3.8.8 water-sort puzzle game. Core logic layer (WaterSortEngine, LevelValidator) and presentation layer (BottleComponent, RootViewSwitcher) are implemented. Utilities (NavigationManager, BottleManager, AssetLoader, BottleCreator, LevelDataLoader) are complete. Scene and popup state are managed by NavigationManager. Home flow: Start button enters game page at current level (default level 1); PlayButton label shows "Level N" from UserProfile.unlockedLevel; UserProfile default unlockedLevel = 1. RootViewSwitcher hides BottomBar on game page. **Scene configuration in Cocos Creator Editor is pending**—bindings and game-page bottle prefab setup follow **project_manifest.md** §4 and **[step.md](step.md)**.

## Development Workflow

This project uses Cocos Creator's GUI-based workflow. There are no npm scripts or CLI commands:

1. Open project in Cocos Creator 3.8.8 (GUI application)
2. Develop using the Editor for scenes, game objects, and TypeScript scripts
3. Build via Cocos Creator Build panel (Web, iOS, Android, Windows, Mac, etc.)

Engine location: `C:\ProgramData\cocos\editors\Creator\3.8.8\`

## Architecture

### Project Structure

- `assets/UI/` - All game UI artwork organized by category
- `assets/scripts/` - TypeScript scripts (data, logic, ui, utils)
- `assets/resources/` - Runtime-loaded assets：`config/levels/` 关卡 JSON，`Backgrounds/`、`Bottles/`、`Dialog/`、`Map/`、`Game/`、`TopBar/`、`BottomBar/`、`UIResources/` 等 UI 素材
- `assets/scene.scene` - Main game scene (1280x720, 2D orthographic camera); all pages use unified Background
- `step.md` - Step-by-step Cocos Editor setup（BottleManager、瓶子预制体、BottomBar 绑定；若仓库中无此文件则按 project_manifest.md §4 与本文档在编辑器中配置）
- `library/` - Cached compiled assets (hashed directory structure)
- `temp/` - Build artifacts and TypeScript declarations
- `settings/`, `profiles/`, `.creator/` - Cocos Creator configuration

### State naming

- **PlayState** (GameSceneController): 一局游戏内的玩法状态（idle, selected, pouring, paused, finished）
- **SceneName** (NavigationManager): 应用级场景（HOME, MAP, GAME），由 NavigationManager.currentScene 与 RootViewSwitcher 显隐对应

### Core Architectural Principles (from .clauderules)

1. **Logic/Presentation Separation**: Core sorting algorithm in pure TypeScript classes, no direct Cocos node coupling
2. **Event-Driven**: Use custom events for layer communication, minimize strong references
3. **Navigation/Scene state**: NavigationManager controls current scene and popups; RootViewSwitcher shows/hides HomeRoot/MapRoot/CollectionRoot/GameRoot and BottomBar (hidden on GAME) by listening to scene events
4. **JSON Level Data**: All level configurations must be standard JSON format

### Scenes to Implement

| Scene | Purpose |
|-------|---------|
| HomeScene | Start button (enters game at current level), "Level N" label, shop placeholder |
| MapScene | Level list, progress display, return to home |
| GameScene | Core gameplay, top progress, 道具栏；进入时隐藏 BottomBar |
| ResultPop | Success/fail popup, navigation buttons |
| SettingPop | Sound, vibration toggles, version |

### Core Modules

| Layer | Components |
|-------|------------|
| Data | LevelConfig (含 levelId/levelNum 转换), LevelDataLoader, UserProfile, ResultPayload (结算弹窗共用), GameState (optional refactor) |
| Logic | WaterSortEngine (validation, undo), LevelValidator (关卡校验/可解性/编辑用，非运行时必需) |
| Presentation | BottleComponent, RootViewSwitcher, TopBarController（返回/设置/标题）, WaterShader (optional, 2D liquid simulation) |
| Utilities | NavigationManager, BottleManager, BottleCreator, AssetLoader; LevelEditor (TODO) |

### UI Asset Categories

- `Backgrounds/` - 32 张编号背景（关卡主题）
- `Bottles/` - 48 种瓶子双状态贴图（_1.png, _2.png）
- `Dialog/` - 商店、设置弹窗
- `HomeGame/` - 首页与游戏内 UI（add_tube, undo, replay）
- `Map/` - 地图页元素（图标、路径、丝带等）
- `Result/` - 结算/胜利页素材
- `UIResources/` - 通用 UI 素材（含图鉴/成就用按钮、面板、框等，统一管理）

## Development Rules

- Before writing code, update `project_manifest.md` with current task status
- Focus on one submodule at a time; define interfaces first for complex logic
- Use `@property` decorator for UI component bindings
- Editor binding checklist: **project_manifest.md** §4; game-page bottle/prefab setup: **step.md**
- Asset import path configured: `\\192.168.10.11\NonGaming\APP\2.产品\53、海外游戏\水排序`

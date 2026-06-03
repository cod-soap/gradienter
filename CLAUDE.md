# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**gradienter** ("精准水平仪") is a WeChat Mini Program — a client-only spirit level / inclinometer tool. No backend, no npm scripts; all building and debugging happens via WeChat DevTools.

## Build & Type-Check

There are no npm scripts. The project compiles via WeChat DevTools' built-in TypeScript plugin (configured in `project.config.json` via `useCompilerPlugins: ["typescript"]`).

To type-check without DevTools:
```bash
npx tsc --noEmit
```

No test framework or linter is configured.

## Architecture

### Framework & Patterns

- All pages use `Component({})` (not `Page({})`) for **glass-easel** framework compatibility
- All animated visuals use **Canvas 2D API** (`type="2d"`) directly — no WXML data binding for animation
- TypeScript strict mode is fully enabled (`strict`, `noUnusedLocals`, `noUnusedParameters`, `strictPropertyInitialization`)

### Sensor Data Pipeline (per frame)

```
wx.onDeviceMotionChange
  └── SensorManager._handleRawData()
        1. isFinite() guard
        2. Platform correction (Android: gammaSign = -1)
        3. LowPassFilter (α from sensitivity preset)
        4. CalibrationManager.apply() (subtract zero-point)
        5. 30fps frame cap
        6. Dispatch FilteredData → page callbacks → setData → Canvas redraw
```

- `SensorManager` (`utils/sensor.ts`) is a singleton — `SensorManager.getInstance()`
- Start/stop sensor in `pageLifetimes.show` / `pageLifetimes.hide`; clean up callbacks in `lifetimes.detached`

### Key Singletons & Globals

- `SensorManager.getInstance()` — sensor subscription hub
- `getApp().globalData.deviceInfo` — screen dimensions, PPI, platform (populated in `app.ts` at launch)
- `getApp().globalData.userSettings` — merged from Storage at launch

### Canvas Components

`bubble-tube`, `compass-dial`, `ruler-scale` all draw via Canvas. They cannot read CSS custom properties, so `utils/canvas-bindhelper.ts` exports a hardcoded `COLORS` object mirroring `styles/variables.wxss`.

The `compass-dial` and `angle-display` components use batched observers (`observers['angleX, angleY']`) to trigger one redraw per parent `setData` call.

### Storage

`utils/storage.ts` wraps `wx.getStorageSync`/`wx.setStorageSync` for:
- `angle_records` array (max 500 entries)
- `user_settings` object

### Sharing

Records are shared via WeChat's forward mechanism. The recipient's landing page (`pages/record-detail`) parses angle/location data from URL query parameters directly, with no server roundtrip.

## Key Files

| File | Role |
|------|------|
| `miniprogram/utils/sensor.ts` | Core sensor singleton |
| `miniprogram/utils/filter.ts` | LowPassFilter + 5 sensitivity presets |
| `miniprogram/utils/calibration.ts` | Zero-point calibration |
| `miniprogram/utils/canvas-bindhelper.ts` | Canvas drawing helpers + COLORS |
| `miniprogram/utils/storage.ts` | Storage CRUD |
| `miniprogram/app.ts` | Global launch, deviceInfo + userSettings init |
| `ai-docs/architecture.md` | Full design doc |
| `ai-docs/requirements.md` | Feature requirements |

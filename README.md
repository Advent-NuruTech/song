# Advent Pro

A cross-platform hymn and Bible study app built with Expo Router, SQLite, and React Native.

## Overview

This app delivers:

- offline hymn/song access by language
- searchable hymn lyrics and Bible study topics
- custom bottom navigation with a floating footer
- local SQLite persistence for songs and studies
- dark mode and font size settings

## Project structure

- `app/` — Expo Router entry points and screen layouts
- `app/(tabs)/` — main tab screens, including home, search, settings, and about
- `app/song/[id].tsx` — song detail and pager experience
- `app/studies/` — study listing and detail screens
- `components/` — reusable UI and navigation components
- `src/` — application services, database helpers, context providers, and models
- `content/` — static song and study JSON data used to seed the local database

## Setup

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Then choose one of the available targets:

- Android emulator or device
- iOS simulator or device
- Web preview

## Useful scripts

- `npm start` — launch Expo dev tools
- `npm run android` — build and run on Android
- `npm run ios` — build and run on iOS
- `npm run web` — run in web browser
- `npm run lint` — run Expo linting
- `npm run reset-project` — reinitialize the project structure

## App-specific notes

- The app uses `expo-router` file-based routing with a custom footer navigation component.
- `app/_layout.tsx` initializes the SQLite database and wraps the app in settings and footer providers.
- Default Expo Router headers are hidden in content screens and replaced with custom UI.
- `react-native-reanimated` is configured via `babel.config.js`.

## Android release preparation

Ensure the following are configured before publishing:

- `app.json` contains a unique Android package id
- app icon and adaptive icon assets are set
- splash screen settings are configured
- Reanimated plugin is enabled in `babel.config.js`

## Contributing

1. Fork the repo
2. Install dependencies
3. Create a feature branch
4. Open a pull request with a clear description

## License

This repository does not include a license file. Add one if you intend to publish or share this codebase publicly.


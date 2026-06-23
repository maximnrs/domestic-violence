# Nura Mobile App

The mobile app is an Expo and React Native application for client-side case access, incident documentation, written notes, voice notes, camera evidence capture, and settings.

## Requirements

- Node.js 20+
- npm
- Expo CLI through `npx expo`
- Android Studio, Xcode, Expo Go, or an Expo development build depending on target device
- Running Nura backend API

## Configuration

Create `mobile-app-frontend/domestic-violence-app/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

For Android emulator development, the app defaults to `http://10.0.2.2:8000` when the variable is not set. For iOS simulator and web, it defaults to `http://localhost:8000`.

For a deployed API, use the public API URL:

```env
EXPO_PUBLIC_API_URL=https://api-evisafe.thijsvdweijer.nl
```

## Local Development

```bash
npm install
npx expo start
```

Common targets:

```bash
npm run android
npm run ios
npm run web
```

## Quality Checks

```bash
npm run lint
```

## Project Structure

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens and tab routes. |
| `components/` | Shared UI and evidence-specific components. |
| `constants/` | Theme constants. |
| `hooks/` | Shared React hooks. |
| `services/` | API client and domain service calls. |
| `utils/` | Utility functions. |

## Notes

- Authentication tokens are currently held in memory by the API service module.
- Camera, audio, and file capabilities depend on the selected Expo runtime and platform permissions.
- Do not commit `.env` files containing private endpoints or credentials.

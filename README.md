# Rememberly

A React Native reminder/note-taking app built with Expo, Supabase, and push notifications.

## Features

- 📝 Note creation and management
- 🔔 Push notifications
- 📅 Reminder system
- 🌐 Supabase backend integration
- 📱 Cross-platform (iOS/Android)

## Prerequisites

Before building the app, ensure you have the following installed:

### General Requirements
- **Node.js** (v18 or later)
- **npm** or **pnpm**
- **Expo CLI**: `npm install -g @expo/cli`

### Android Development Requirements
- **Android Studio** (latest version)
- **Android SDK** (API level 24 or higher)
- **CMake** (3.22.1 or later)
- **Android NDK** (27.1.12297006 or compatible)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd rememberly
npm install
# or
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://lkeequxsxsoastroxqnv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ **Important**: Ensure there are no extra characters (like `%`) at the end of URLs.

### 3. Android Build Setup

#### Install Android Studio
1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio and complete the initial setup
3. Install required SDK components

#### Configure Android SDK
1. Open Android Studio
2. Go to `Tools` → `SDK Manager`
3. In the **SDK Platforms** tab, install:
   - Android API 35 (or latest)
   - Android API 30 (for compatibility)
4. In the **SDK Tools** tab, install:
   - **Android SDK Build-Tools** (35.0.0)
   - **Android SDK Platform-Tools**
   - **CMake** (3.22.1 or later) ⚠️ **Critical for build success**
   - **NDK (Side by side)** (27.1.12297006)

#### Set Environment Variables
Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools
```

Reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

#### Configure Android Project
Create `android/local.properties`:
```properties
sdk.dir=/Users/your-username/Library/Android/sdk
```

### 4. Device Setup

#### For Physical Android Device
1. Enable **Developer Options** on your device:
   - Go to `Settings` → `About phone`
   - Tap `Build number` 7 times
2. Enable **USB Debugging**:
   - Go to `Settings` → `Developer Options`
   - Enable `USB debugging`
3. Connect device via USB
4. Verify connection:
   ```bash
   adb devices
   ```
   Should show your device as `device` (not `unauthorized`)

## Building and Running

### Android Build Commands

#### Development Build
```bash
# Set environment variables (if not in shell profile)
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools

# Build and install on connected device
npx expo run:android
```

#### Clean Build (if needed)
```bash
# Clean previous builds
cd android && ./gradlew clean && cd ..

# Then run the build
npx expo run:android
```

#### Development Server Only
```bash
npx expo start
```

### iOS Build Commands
```bash
# Install CocoaPods (if not installed)
sudo gem install cocoapods

# Build for iOS
npx expo run:ios
```

## Troubleshooting

### Common Android Issues

#### CMake Error
**Error**: `Failed to install CMake 3.22.1`

**Solution**:
1. Open Android Studio
2. Go to `Tools` → `SDK Manager` → `SDK Tools`
3. Uncheck `CMake`, apply to uninstall
4. Recheck `CMake`, apply to reinstall
5. Clean build: `cd android && ./gradlew clean && cd ..`

#### ADB Not Found
**Error**: `spawn adb ENOENT`

**Solution**:
```bash
# Check if adb is accessible
which adb

# If not found, ensure Android SDK is properly installed
# and PATH includes platform-tools
```

#### Build Configuration Error
**Error**: `Cannot convert '' to File`

**Solution**:
- Ensure you're running from the project root
- Check that Node.js can resolve expo packages:
  ```bash
  node -e "console.log(require.resolve('expo/package.json'))"
  ```

#### Device Unauthorized
**Error**: Device shows as `unauthorized`

**Solution**:
1. Disconnect and reconnect USB cable
2. On device, tap "Always allow from this computer" when USB debugging prompt appears
3. Verify: `adb devices`

### Environment Verification

Check your setup:
```bash
# Verify Android SDK
echo $ANDROID_HOME
ls -la $ANDROID_HOME

# Verify Node.js can find Expo
node -e "console.log(require.resolve('expo/package.json'))"

# Check connected devices
adb devices

# Verify CMake installation
ls -la $ANDROID_HOME/cmake/
```

## App Configuration

### Bundle Identifier
- **iOS**: `co.supabase.lkeequxsxsoastroxqnv.rememberly`
- **Android**: `co.supabase.lkeequxsxsoastroxqnv.rememberly`

### Supabase Configuration
- **URL**: `https://lkeequxsxsoastroxqnv.supabase.co`
- **Push Notifications**: Configured for both platforms

## Testing

### Push Notifications
1. Build and install app on physical device
2. Grant notification permissions when prompted
3. Use the test buttons in the app to verify:
   - Local notifications
   - Supabase connectivity
   - Background notification delivery

### Development Testing
```bash
# Start Metro bundler
npx expo start

# Clear cache if needed
npx expo start --clear
```

## Project Structure

```
rememberly/
├── app/                 # Expo Router pages
├── components/          # React components
├── lib/                # Utilities and services
├── android/            # Android native code
├── ios/                # iOS native code
├── supabase/           # Database migrations
└── assets/             # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both platforms
5. Submit a pull request

## License

[Add your license information here] 
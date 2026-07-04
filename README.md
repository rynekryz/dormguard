<div align="center">
<img src="icon.png" width="160" height="160" style="display: block; margin: 0 auto"/>
<h1>DormGuard</h1>
<p>Student dorm security device (or maybe any other place too)</p>
<p>Android app for DormGuard. This repo contains the software.</p>
</div>

## Building the APK

### Requirements
- Android SDK 35+ (or Android Studio)
- Java 11+
- Git

### Build with Android Studio
1. Clone the repo and open it in Android Studio
2. Wait for Gradle sync
3. Connect an Android device or use an emulator
4. Click **Run** to build and install

### Build from command line
```bash
git clone https://github.com/rynekryz/dormguard.git
cd dormguard
./gradlew build
```
APK location: `app/build/outputs/apk/debug/app-debug.apk`

## Screenshots

<div align="center">
<img src="/Screenshots/28522.png" width="30%" />
<img src="/Screenshots/28524.png" width="30%" />
<img src="/Screenshots/28526.png" width="30%" />
<img src="/Screenshots/28528.png" width="30%" />
<img src="/Screenshots/28530.png" width="30%" />
<img src="/Screenshots/28532.png" width="30%" />
</div>

## Features

- Real-time door status monitoring via ESP32 --> App
- Push alert when door left open too long
- Remote alert disable button from the app (Anytime, anywhere)
- Alert stop until door reopened again if stopped from app
- Auto alert timeout after 20s if not manually stopped
- PIR motion-triggered auto lamp control
- Remote lamp enable/disable toggle
- NeoPixel LED strip visual alert indicator (blink blink) and can also become a lamp
- Buzzer beep beep Beep BEEP alert (can be enable/disable via in app switch)
- LED alert indicator (can be enable/disable via app too)
- Door open/close events logged to Google Sheets (free database lol)
- Alert state synced between ESP and app via Google Apps Script
- Vibration notification on alert trigger
- Vibration toggle in settings
- Logs list with timestamp and date
- Last opened time display
- Full and latest 50 records CSV export
- Google Sheets database link viewer
- Dark mode and light mode support
- High contrast mode
- Reduce motion toggle (some people hate animation)
- Material design 3 Expressive
- etc.

## License

Licensed under GPL-3.0. See [LICENSE](LICENSE) for details.

<div align="center">
<strong>Made with ♥︎ by Ryne</strong>
</div>

<div align="center">
  <a href="https://tiktok.com/@rynekryz"><img src="https://img.shields.io/badge/TikTok-5A5A5A?style=for-the-badge&logo=tiktok&logoColor=white"/></a>
</div>

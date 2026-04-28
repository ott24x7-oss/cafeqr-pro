@echo off
REM Builds debug APKs locally on Windows using Android Studio's bundled JDK
REM and SDK. No need to install JDK / Gradle / Android SDK separately —
REM Android Studio brings everything.
REM
REM Usage:  double-click this file, or run from PowerShell / Command Prompt.
REM
REM Outputs:
REM   app\build\outputs\apk\amazon\debug\app-amazon-debug.apk    (Fire OS)
REM   app\build\outputs\apk\google\debug\app-google-debug.apk    (Play / AOSP)

setlocal

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Using JDK at: %JAVA_HOME%
echo Using Android SDK at: %ANDROID_HOME%
echo.

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [ERROR] Android Studio's bundled JDK not found at:
    echo   %JAVA_HOME%\bin\java.exe
    echo Install Android Studio from https://developer.android.com/studio
    exit /b 1
)
if not exist "%ANDROID_HOME%\platforms" (
    echo [ERROR] Android SDK not found at:
    echo   %ANDROID_HOME%
    echo Open Android Studio and let it install the SDK on first launch.
    exit /b 1
)

cd /d "%~dp0"
call gradlew.bat assembleAmazonDebug assembleGoogleDebug --no-daemon
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. See the Gradle output above.
    exit /b 1
)

echo.
echo ============================================================
echo Build successful. APKs:
echo   %~dp0app\build\outputs\apk\amazon\debug\app-amazon-debug.apk
echo   %~dp0app\build\outputs\apk\google\debug\app-google-debug.apk
echo ============================================================
endlocal

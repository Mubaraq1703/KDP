@echo on  
@echo off
setlocal EnableDelayedExpansion

echo  _   _  _____  __  __  ____   ____   ___  __  __ 
echo ^| ^| ^| ^|^|  ___^|^|  \/  ^|^|  _ \ ^|  _ \ ^|_ _^| \ \/ / 
echo ^| ^|_^| ^|^| ^|__  ^| ^|\/^| ^|^| ^| ^| ^|^| ^|_) ^| ^| ^|   \  /  
echo ^|  _  ^|^|  __^| ^| ^|  ^| ^|^| ^|_^| ^|^|  _ ^<  ^| ^|   /  \  
echo ^|_^| ^|_^|^|_____^|^|_^|  ^|_^|^|____/ ^|_^| \_\^|___^| /_/\_\ 
echo.
echo           S O L U T I O N S
echo =================================================
echo.
echo Welcome to the Hemdrix KDP Suite Installer!
echo.

:: 1. Check for opencode desktop app
echo Checking for Opencode desktop app...
where opencode >nul 2>nul
if %errorlevel% neq 0 (
    echo Opencode desktop app is not installed.
    set /p INSTALL_OPENCODE="Do you want to install it now? (Y/N): "
    if /i "!INSTALL_OPENCODE!"=="Y" (
        echo Installing Opencode...
        :: Using winget as the preferred package manager on Windows
        winget install --id "opencode" --exact
        if %errorlevel% equ 0 (
            echo Opencode installed successfully.
        ) else (
            echo [Warning] Automatic installation for Opencode failed or requires manual intervention.
        )
    ) else (
        echo Skipping Opencode installation.
    )
) else (
    echo Opencode is already installed.
)
echo.

:: 2. Download and extract the latest release
echo Checking for GitHub CLI (gh) to download the release...
where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] GitHub CLI is required to download the release. Please install it from https://cli.github.com/
    pause
    exit /b 1
)

set /p SPECIFIC_VERSION="Enter release version to download (leave blank for latest): "
if "!SPECIFIC_VERSION!"=="" (
    echo Downloading the latest release...
    gh release download --pattern "kdp-book-writer.zip" --clobber
    gh release download --pattern "hemdrix-extension.zip" --clobber
) else (
    echo Downloading release !SPECIFIC_VERSION!...
    gh release download !SPECIFIC_VERSION! --pattern "kdp-book-writer.zip" --clobber
    gh release download !SPECIFIC_VERSION! --pattern "hemdrix-extension.zip" --clobber
)

echo Extracting downloaded files...
powershell -Command "Expand-Archive -Path 'kdp-book-writer.zip' -DestinationPath 'kdp-book-writer-temp' -Force"
powershell -Command "Expand-Archive -Path 'hemdrix-extension.zip' -DestinationPath 'hemdrix-extension-temp' -Force"

echo Moving kdp-book-writer to %USERPROFILE%\.agents\skills\ directory...
if exist "%USERPROFILE%\.agents\skills\kdp-book-writer" (
    echo [Info] Existing 'kdp-book-writer' skill found. It will be replaced with the downloaded version.
    rmdir /S /Q "%USERPROFILE%\.agents\skills\kdp-book-writer"
)
mkdir "%USERPROFILE%\.agents\skills\kdp-book-writer"
xcopy /E /I /Y "kdp-book-writer-temp\*" "%USERPROFILE%\.agents\skills\kdp-book-writer\" >nul

:: Cleanup extraction temp files
rmdir /S /Q kdp-book-writer-temp
del kdp-book-writer.zip

echo Extension files are extracted to 'hemdrix-extension-temp' in the current directory.
echo.

:: 3. Check for installed browsers
echo Detecting installed browsers...
set BROWSER_COUNT=0

:: Check Chrome
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Clients\StartMenuInternet\Google Chrome" >nul 2>nul
if %errorlevel% equ 0 (
    set /a BROWSER_COUNT+=1
    set "BROWSER_!BROWSER_COUNT!_NAME=Google Chrome"
    set "BROWSER_!BROWSER_COUNT!_PATH=chrome.exe"
    set "BROWSER_!BROWSER_COUNT!_URL=chrome://extensions/"
)

:: Check Edge
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Clients\StartMenuInternet\Microsoft Edge" >nul 2>nul
if %errorlevel% equ 0 (
    set /a BROWSER_COUNT+=1
    set "BROWSER_!BROWSER_COUNT!_NAME=Microsoft Edge"
    set "BROWSER_!BROWSER_COUNT!_PATH=msedge.exe"
    set "BROWSER_!BROWSER_COUNT!_URL=edge://extensions/"
)

:: Check Brave
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Clients\StartMenuInternet\Brave" >nul 2>nul
if %errorlevel% equ 0 (
    set /a BROWSER_COUNT+=1
    set "BROWSER_!BROWSER_COUNT!_NAME=Brave"
    set "BROWSER_!BROWSER_COUNT!_PATH=brave.exe"
    set "BROWSER_!BROWSER_COUNT!_URL=brave://extensions/"
)

if !BROWSER_COUNT! equ 0 (
    echo No supported Chromium-based browsers found (Chrome, Edge, Brave).
    set /p INSTALL_CHROME="Do you want to install Google Chrome? (Y/N): "
    if /i "!INSTALL_CHROME!"=="Y" (
        echo Installing Google Chrome...
        winget install -e --id Google.Chrome
        set /a BROWSER_COUNT+=1
        set "BROWSER_!BROWSER_COUNT!_NAME=Google Chrome"
        set "BROWSER_!BROWSER_COUNT!_PATH=chrome.exe"
        set "BROWSER_!BROWSER_COUNT!_URL=chrome://extensions/"
    ) else (
        echo No browser selected. Skipping extension setup.
        goto :end
    )
)

echo.
echo Please select a browser to open the extensions page:
for /L %%i in (1,1,!BROWSER_COUNT!) do (
    echo [%%i] !BROWSER_%%i_NAME!
)

:: 4. User selects browser
set /p BROWSER_CHOICE="Enter number (1-!BROWSER_COUNT!): "

set "SELECTED_PATH="
set "SELECTED_URL="
for /L %%i in (1,1,!BROWSER_COUNT!) do (
    if "%%i"=="!BROWSER_CHOICE!" (
        set "SELECTED_PATH=!BROWSER_%%i_PATH!"
        set "SELECTED_URL=!BROWSER_%%i_URL!"
        set "SELECTED_NAME=!BROWSER_%%i_NAME!"
    )
)

:: 5. Open extensions page
if defined SELECTED_PATH (
    echo Opening !SELECTED_NAME! extensions page...
    start "" "!SELECTED_PATH!" "!SELECTED_URL!"
) else (
    echo Invalid choice. Skipping opening the browser.
)

:end
echo.
echo =================================================
echo Installation complete!
echo.
echo 1. The 'kdp-book-writer' skill is now available in your agents directory.
echo 2. The extension is extracted in 'hemdrix-extension-temp'.
echo 3. In the browser window that just opened, turn on 'Developer Mode' and 'Load Unpacked' to select the 'hemdrix-extension-temp' folder.
echo =================================================
pause

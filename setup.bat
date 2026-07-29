@echo off
echo ==========================================================
echo       Kill-My-Port One-Time Setup for Windows              
echo ==========================================================
echo.

echo 1. Installing dependencies...
call npm install

echo 2. Building application bundle...
call npm run build

echo 3. Registering Start Menu Launcher ^& Startup shortcut...
set "START_MENU_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_SCRIPT=%TEMP%\create_shortcut.vbs"
set "APP_DIR=%~dp0"
set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_SCRIPT%"
echo sLinkFile1 = "%START_MENU_DIR%\Kill My Port.lnk" >> "%SHORTCUT_SCRIPT%"
echo Set oLink1 = oWS.CreateShortcut(sLinkFile1) >> "%SHORTCUT_SCRIPT%"
echo oLink1.TargetPath = "%ELECTRON_EXE%" >> "%SHORTCUT_SCRIPT%"
echo oLink1.Arguments = """%APP_DIR:~0,-1%""" >> "%SHORTCUT_SCRIPT%"
echo oLink1.WindowStyle = 1 >> "%SHORTCUT_SCRIPT%"
echo oLink1.Save >> "%SHORTCUT_SCRIPT%"

echo sLinkFile2 = "%STARTUP_DIR%\KillMyPort.lnk" >> "%SHORTCUT_SCRIPT%"
echo Set oLink2 = oWS.CreateShortcut(sLinkFile2) >> "%SHORTCUT_SCRIPT%"
echo oLink2.TargetPath = "%ELECTRON_EXE%" >> "%SHORTCUT_SCRIPT%"
echo oLink2.Arguments = """%APP_DIR:~0,-1%""" >> "%SHORTCUT_SCRIPT%"
echo oLink2.WindowStyle = 1 >> "%SHORTCUT_SCRIPT%"
echo oLink2.Save >> "%SHORTCUT_SCRIPT%"

cscript //nologo "%SHORTCUT_SCRIPT%"
del "%SHORTCUT_SCRIPT%"

echo 4. Launching Kill-My-Port...
start "" "%ELECTRON_EXE%" "%APP_DIR:~0,-1%"

echo.
echo ==========================================================
echo  SUCCESS! Kill-My-Port is running in System Tray.        
echo  Search 'Kill My Port' in Start Menu anytime!            
echo ==========================================================
pause

@echo off
echo ============================================
echo   DINO-RICHUP Firewall Setup
echo ============================================
echo.
echo This will add Windows Firewall rules to allow
echo friends to connect to your game on LAN.
echo.
echo IMPORTANT: Run this as Administrator!
echo.

netsh advfirewall firewall add rule name="DINO-RICHUP Game (TCP 8000)" dir=in action=allow protocol=TCP localport=8000
if %errorlevel% equ 0 (
    echo SUCCESS: Firewall rule added for port 8000 (production mode).
) else (
    echo ERROR: Failed to add firewall rule for port 8000.
    echo Make sure you right-clicked and selected "Run as administrator".
)

netsh advfirewall firewall add rule name="DINO-RICHUP Frontend (TCP 3000)" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo SUCCESS: Firewall rule added for port 3000 (dev mode).
) else (
    echo WARNING: Could not add rule for port 3000. Dev mode LAN access may not work.
)

echo.
echo ============================================
echo   Friends on same WiFi can now connect at:
echo   Production: http://YOUR_IP:8000
echo   Dev mode:   http://YOUR_IP:3000
echo ============================================
echo.
pause

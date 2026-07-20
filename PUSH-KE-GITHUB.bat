@echo off
cd /d "%~dp0"
echo ================================================
echo   Push UMS Ecosystem ke GitHub
echo ================================================
if not exist ".git" ( git init )
git add -A
git commit -m "UMS Ecosystem v0.2"
git branch -M main
git remote add origin https://github.com/nafadza14/ums_ecosystem.git 2>nul
git remote set-url origin https://github.com/nafadza14/ums_ecosystem.git
git push -u origin main
echo.
echo ------------------------------------------------
echo Kalau tertulis "rejected", jalankan PUSH-PAKSA.bat
echo Tekan tombol apa saja untuk menutup.
pause >nul

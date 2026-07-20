@echo off
cd /d "%~dp0"
echo ================================================
echo   PUSH UMS Ecosystem ke GitHub (all-in-one)
echo ================================================
echo.

REM 1. Set identitas git (tadi ini yang bikin commit gagal)
git config --global user.email "nafadaza@gmail.com"
git config --global user.name "nafadza14"

REM 2. Pastikan repo git ada
if not exist ".git" ( git init )

REM 3. Commit semua perubahan
git add -A
git commit -m "UMS Ecosystem v0.2"

REM 4. Set branch + remote (https, ditimpa kalau sudah ada)
git branch -M main
git remote add origin https://github.com/nafadza14/ums_ecosystem.git 2>nul
git remote set-url origin https://github.com/nafadza14/ums_ecosystem.git

REM 5. Push
echo.
echo Mendorong ke GitHub... (kalau muncul jendela login GitHub, silakan login)
git push -u origin main

echo.
echo ================================================
echo Kalau tertulis "rejected/failed", tutup ini lalu
echo jalankan PUSH-PAKSA.bat
echo ================================================
echo Selesai. Tekan tombol apa saja untuk menutup.
pause >nul

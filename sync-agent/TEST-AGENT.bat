@echo off
cd /d "%~dp0"
echo ==================================================
echo   TEST SYNC AGENT (simulasi asupan data)
echo ==================================================
echo.
echo Kalau SUPABASE_SERVICE_KEY belum diset, jalan DRY-RUN.
echo Untuk kirim ke cloud, jalankan dulu:
echo    set SUPABASE_SERVICE_KEY=eyJ...service_role_key...
echo.
python test_agent.py
pause

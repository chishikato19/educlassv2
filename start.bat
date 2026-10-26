@echo off
chcp 65001 >nul
title EduClass v2 — Khởi Chạy Máy Chủ Lớp Học

echo ====================================================================
echo                 EDUCLASS v2 — HỆ THỐNG LỚP HỌC THÔNG MINH
echo ====================================================================
echo.

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính chưa cài đặt Node.js!
    echo Vui lòng cài đặt Node.js (phiên bản 20 trở lên) để chạy hệ thống.
    echo Tải tại: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/2] Đang chuẩn bị hệ thống...
echo [2/2] Đang khởi động máy chủ EduClass v2...
echo.

call pnpm.cmd dlx tsx scripts/start.js

pause

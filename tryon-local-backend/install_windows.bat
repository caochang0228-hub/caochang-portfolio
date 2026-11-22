@echo off
setlocal
cd /d %~dp0
where py >nul 2>nul || (echo [ERROR] 请先安装 Python 3.10 64位 & pause & exit /b 1)
where git >nul 2>nul || (echo [ERROR] 请先安装 Git for Windows & pause & exit /b 1)
py -3.10 -m venv .venv || (echo [ERROR] 需要 Python 3.10 & pause & exit /b 1)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip wheel setuptools
python -m pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu121
if not exist vendor\CatVTON git clone --depth 1 https://github.com/Zheng-Chong/CatVTON.git vendor\CatVTON
python -m pip install -r vendor\CatVTON\requirements.txt
python -m pip install -r requirements-server.txt
echo.
echo [OK] 安装完成。首次启动会继续下载模型文件。
pause


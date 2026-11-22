@echo off
setlocal
cd /d %~dp0
call .venv\Scripts\activate.bat || (echo 请先运行 install_windows.bat & pause & exit /b 1)
set CATVTON_HOME=%CD%\vendor\CatVTON
set PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,max_split_size_mb:128
echo [INFO] 将自动检测独立显存并选择生成分辨率。
python -m uvicorn server:app --host 127.0.0.1 --port 7865
pause


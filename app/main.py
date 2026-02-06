import logging
import os
import uuid
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.excel import generate_excel
from app.ocr import extract_timecard_data

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="タイムカードOCR変換")

# 静的ファイル配信
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@app.get("/")
async def index():
    return FileResponse(str(BASE_DIR / "static" / "index.html"))


@app.post("/api/convert")
async def convert_timecards(files: list[UploadFile]):
    """タイムカード画像をアップロードしてExcelに変換する"""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "sk-your-api-key-here":
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY が設定されていません。.env ファイルに有効なAPIキーを設定してください。",
        )

    if not files:
        raise HTTPException(status_code=400, detail="ファイルがアップロードされていません。")

    # ファイル保存
    saved_paths: list[str] = []
    request_id = uuid.uuid4().hex[:8]

    try:
        for file in files:
            ext = Path(file.filename or "image.jpg").suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"非対応のファイル形式です: {ext}（対応: {', '.join(ALLOWED_EXTENSIONS)}）",
                )

            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"ファイルサイズが大きすぎます（上限: {MAX_FILE_SIZE // 1024 // 1024}MB）",
                )

            save_path = UPLOAD_DIR / f"{request_id}_{uuid.uuid4().hex[:6]}{ext}"
            save_path.write_bytes(content)
            saved_paths.append(str(save_path))

        logger.info("Processing %d images (request: %s)", len(saved_paths), request_id)

        # OCR処理
        try:
            timecard_list = extract_timecard_data(saved_paths, api_key)
        except Exception as e:
            logger.exception("OCR processing failed")
            raise HTTPException(
                status_code=500,
                detail=f"OCR処理中にエラーが発生しました: {e}",
            )

        if not timecard_list:
            raise HTTPException(
                status_code=422,
                detail="タイムカードのデータを読み取れませんでした。画像を確認してください。",
            )

        # Excel生成
        try:
            excel_buffer = generate_excel(timecard_list)
        except Exception as e:
            logger.exception("Excel generation failed")
            raise HTTPException(
                status_code=500,
                detail=f"Excel生成中にエラーが発生しました: {e}",
            )

        # ファイル名生成
        first = timecard_list[0]
        filename = f"勤怠表_{first.year}年{first.month}月"
        if first.employee_name:
            filename += f"_{first.employee_name}"
        filename += ".xlsx"

        encoded_filename = quote(filename)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            },
        )

    finally:
        # アップロードファイルを削除
        for path in saved_paths:
            try:
                Path(path).unlink(missing_ok=True)
            except OSError:
                pass

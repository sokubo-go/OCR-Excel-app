import base64
import json
import logging
from pathlib import Path

from openai import OpenAI

from app.models import TimecardData

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
あなたはタイムカード画像からデータを抽出する専門のOCRアシスタントです。
画像に写っているタイムカードの情報を正確に読み取り、JSON形式で返してください。

以下のJSON形式で出力してください。値が読み取れない場合は空文字""にしてください。

{
  "employee_name": "従業員名",
  "year": "2025",
  "month": "1",
  "records": [
    {
      "date": "1",
      "day_of_week": "月",
      "clock_in": "09:00",
      "clock_out": "18:00",
      "break_time": "1:00",
      "working_hours": "8:00",
      "overtime": "0:00",
      "remarks": ""
    }
  ]
}

重要なルール:
- 時刻は "HH:MM" 形式で出力 (例: "09:00", "18:30")
- 日付は日のみ (例: "1", "15", "31")
- 曜日は1文字 (例: "月", "火", "水")
- 記録がない日（空欄の日）はrecordsに含めないでください
- 必ず有効なJSONのみを出力してください（説明文や```は不要）
"""


def encode_image(image_path: str) -> str:
    """画像をbase64エンコードする"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_image_media_type(image_path: str) -> str:
    """画像のメディアタイプを取得する"""
    suffix = Path(image_path).suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    return media_types.get(suffix, "image/jpeg")


def extract_timecard_data(image_paths: list[str], api_key: str) -> list[TimecardData]:
    """複数のタイムカード画像からデータを抽出する"""
    client = OpenAI(api_key=api_key)
    results: list[TimecardData] = []

    # 画像をまとめて1回のAPI呼び出しで処理
    content: list[dict] = [
        {
            "type": "text",
            "text": (
                f"以下の{len(image_paths)}枚のタイムカード画像からデータを読み取ってください。"
                "複数枚ある場合は、それぞれのタイムカードのデータをJSON配列で返してください。"
                "1枚の場合も配列で返してください。"
            ),
        }
    ]

    for path in image_paths:
        base64_image = encode_image(path)
        media_type = get_image_media_type(path)
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{base64_image}",
                },
            }
        )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        max_tokens=4096,
        temperature=0,
    )

    raw_text = response.choices[0].message.content.strip()
    logger.info("OCR raw response: %s", raw_text[:500])

    # JSONパース（```json ... ``` で囲まれている場合も対応）
    json_text = raw_text
    if json_text.startswith("```"):
        lines = json_text.split("\n")
        # 最初と最後の ``` 行を除去
        lines = [l for l in lines if not l.strip().startswith("```")]
        json_text = "\n".join(lines)

    parsed = json.loads(json_text)

    # 単一オブジェクトの場合は配列に変換
    if isinstance(parsed, dict):
        parsed = [parsed]

    for item in parsed:
        results.append(TimecardData(**item))

    return results

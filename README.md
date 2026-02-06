# タイムカード OCR 変換アプリ

タイムカードの写真をアップロードすると、AI-OCR（OpenAI GPT-4o Vision）で読み取り、Excelの勤怠表に変換するWebアプリです。

## 機能

- タイムカード画像のドラッグ&ドロップ / ファイル選択でアップロード
- 複数枚の同時処理に対応
- AI-OCRによるタイムカードデータの自動読み取り
- Excel形式（.xlsx）での勤怠表出力
  - 従業員名・年月のタイトル
  - 日付・曜日・出退勤・休憩・勤務時間・残業・備考
  - 土日の色分け表示

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して OpenAI API キーを設定:

```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. アプリの起動

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

ブラウザで http://localhost:8000 にアクセスしてください。

## 使い方

1. タイムカードの写真を撮影（複数枚OK）
2. アプリにドラッグ&ドロップまたはファイル選択でアップロード
3. 「Excelに変換」ボタンをクリック
4. AI-OCRで読み取り後、Excelファイルが自動ダウンロード

## 技術スタック

- **バックエンド**: Python / FastAPI
- **フロントエンド**: HTML / CSS / JavaScript
- **AI OCR**: OpenAI GPT-4o Vision API
- **Excel生成**: openpyxl

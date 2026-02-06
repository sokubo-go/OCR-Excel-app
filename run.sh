#!/bin/bash
cd "$(dirname "$0")"

case "$1" in
  stop)
    echo "サーバーを停止中..."
    lsof -ti:8000 | xargs kill 2>/dev/null
    echo "停止しました"
    ;;
  restart)
    echo "サーバーを再起動中..."
    lsof -ti:8000 | xargs kill 2>/dev/null
    sleep 1
    python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    echo ""
    echo "再起動しました → http://localhost:8000"
    ;;
  update)
    echo "最新コードを取得して再起動中..."
    lsof -ti:8000 | xargs kill 2>/dev/null
    git pull origin claude/timecard-ocr-converter-lgUdc
    sleep 1
    python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    echo ""
    echo "更新・再起動しました → http://localhost:8000"
    ;;
  *)
    # 起動（既に動いていたら先に止める）
    lsof -ti:8000 | xargs kill 2>/dev/null
    sleep 1
    python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    echo ""
    echo "起動しました → http://localhost:8000"
    echo ""
    echo "使い方:"
    echo "  ./run.sh          起動"
    echo "  ./run.sh stop     停止"
    echo "  ./run.sh restart  再起動"
    echo "  ./run.sh update   最新取得＋再起動"
    ;;
esac

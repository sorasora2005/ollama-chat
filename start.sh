#!/bin/bash

# Ollama Chat 起動スクリプト

echo "🚀 Ollama Chat を起動しています..."

# Ollamaが起動しているか確認
if ! pgrep -x "ollama" > /dev/null; then
    echo "📦 Ollamaを起動しています..."
    # バックグラウンドでOllamaを起動
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    echo "✅ Ollamaを起動しました (PID: $OLLAMA_PID)"
    
    # Ollamaが起動するまで少し待つ
    echo "⏳ Ollamaの起動を待っています..."
    sleep 3
    
    # Ollamaが応答するか確認（curlが使える場合）
    if command -v curl > /dev/null 2>&1; then
        for i in {1..10}; do
            if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
                echo "✅ Ollamaが応答しました"
                break
            fi
            if [ $i -eq 10 ]; then
                echo "⚠️  Ollamaの起動確認に失敗しましたが、続行します..."
            fi
            sleep 1
        done
    else
        echo "⏳ Ollamaの起動を待っています（curlが利用できないため、スキップします）..."
        sleep 3
    fi
else
    echo "✅ Ollamaは既に起動しています"
fi

# Docker Composeで起動（PostgreSQL、Backend、Frontend）
echo "🐳 Docker Composeでサービスを起動しています..."
docker compose up --build -d

echo ""
echo "✅ 全てのサービスを起動しました！"
echo ""
echo "📊 サービス状態を確認:"
docker compose ps
echo ""
echo "📝 ログを確認: docker compose logs -f"
echo "🛑 停止: docker compose down"
echo "🛑 Ollamaを停止: pkill ollama"


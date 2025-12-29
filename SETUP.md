# セットアップガイド

## クイックスタート

### 1. 前提条件

- Docker Desktop がインストール済みであること
- Ollama がインストール済みであること

### 2. Ollamaの設定

Ollamaを起動し、Dockerコンテナからアクセスできるように設定します。

#### macOS
```bash
# Ollamaをインストール（まだの場合）
brew install ollama

# Ollamaを起動（デフォルトでは自動起動しますが、手動で起動する場合）
ollama serve

# 別のターミナルで、Ollamaが0.0.0.0でリッスンするように設定
export OLLAMA_HOST=0.0.0.0:11434

# または、環境変数を永続化するために ~/.zshrc または ~/.bashrc に追加
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.zshrc
source ~/.zshrc
```

#### Windows
```bash
# Ollamaをインストール（まだの場合）
winget install Ollama.Ollama

# 環境変数を設定
# システムの環境変数に以下を追加:
# OLLAMA_HOST = 0.0.0.0:11434
```

**重要:** DockerコンテナからOllamaにアクセスするため、`OLLAMA_HOST`環境変数を`0.0.0.0:11434`に設定する必要があります。

### 3. モデルのダウンロード

使用するモデルをダウンロードします（初回は時間がかかります）。このアプリケーションはOllamaで利用可能なほぼすべてのモデルをサポートしています。

```bash
# 例: 画像認識モデル（ファイルアップロード機能を使用する場合）
ollama pull qwen3-vl:4b
ollama pull qwen2.5-vl:7b

# 例: テキストモデル
ollama pull qwen2.5:7b
ollama pull llama3.2:3b

# 例: コード生成モデル
ollama pull qwen2.5-coder:7b
ollama pull codellama:7b
```

**利用可能なモデルの確認:**
Ollamaで利用可能なモデルを確認するには:

```bash
ollama list
```

**推奨モデル:**
- **画像認識が必要な場合**: `qwen3-vl:4b`, `qwen2.5-vl:7b` など（visionタイプのモデル）
- **テキストのみの場合**: `qwen2.5:7b`, `llama3.2:3b` など（textタイプのモデル）
- **コード生成**: `qwen2.5-coder:7b`, `codellama:7b` など（coderタイプのモデル）

アプリケーション内のモデルセレクターから、利用可能なモデルの一覧を確認し、必要に応じてダウンロードできます。

### 4. アプリケーションの起動

```bash
# リポジトリをクローン
git clone <repository-url>
cd ollama-chat

# Docker Composeで起動
docker compose up --build

# または、起動スクリプトを使用
# macOS/Linux:
./start.sh

# Windows:
start.bat
```

初回起動時は、以下の処理が行われます:
- Dockerイメージのビルド
- PostgreSQLデータベースの初期化
- フロントエンドとバックエンドの起動

**注意:** 初回起動時は、Dockerイメージのビルドとコンテナの起動に時間がかかります。

### 5. アクセス

ブラウザで以下のURLにアクセス:

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **APIドキュメント**: http://localhost:8000/docs

## トラブルシューティング

### Ollamaに接続できない

1. Ollamaが起動しているか確認:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. `OLLAMA_HOST` 環境変数が設定されているか確認:
   ```bash
   echo $OLLAMA_HOST  # macOS/Linux
   echo %OLLAMA_HOST%  # Windows
   ```

3. Dockerコンテナからホストにアクセスできるか確認:
   ```bash
   docker exec ollama-chat-backend curl http://host.docker.internal:11434/api/tags
   ```

### モデルが見つからない

1. モデルがダウンロードされているか確認:
   ```bash
   ollama list
   ```

2. モデル名が正しいか確認（Ollamaで利用可能なモデル名を使用してください）

3. モデルを再ダウンロード:
   ```bash
   ollama pull <モデル名>
   ```

### ポートが既に使用されている

以下のポートが使用されている必要があります:
- 3000: フロントエンド
- 8000: バックエンド
- 5432: PostgreSQL

ポートが使用されている場合は、`docker-compose.yml` でポート番号を変更してください。

### ファイル変換が失敗する

1. poppler-utilsがバックエンドコンテナにインストールされているか確認:
   ```bash
   docker exec ollama-chat-backend pdftoppm -v
   ```

2. ファイルサイズが大きすぎないか確認（推奨: 10MB以下）

3. ファイル形式が対応しているか確認（PDF, PNG, JPG, TXT, XLSX, DOCX）

## 開発モード

### バックエンドの開発

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンドの開発

```bash
cd frontend
npm install
npm run dev
```

## データベースのリセット

データベースをリセットする場合:

```bash
docker compose down -v
docker compose up --build
```

これにより、すべてのデータが削除されます。


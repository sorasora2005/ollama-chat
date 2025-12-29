<div align="center">
  <img src="frontend/app/icon.png" alt="Ollama Chat Icon" width="128" height="128">
</div>

# Ollama Chat

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=for-the-badge&logo=docker)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38bdf8?style=for-the-badge&logo=tailwind-css)

</div>

Ollamaを利用したローカルAIチャットアプリケーション。ローカル環境でAIモデルを実行し、PDF、画像、テキスト、Excel、Wordファイルの処理に対応しています。

## 機能

- 🤖 **Ollamaを使用したローカルAIチャット** - プライバシーを保護しながらAIと対話
- 💬 **チャット履歴の保存** - PostgreSQLによる永続的なチャット履歴管理
- 📄 **マルチファイル対応** - PDF、PNG/JPG、TXT、XLSX、DOCXファイルのアップロードと変換
- 🎨 **Gemini風の洗練されたUI** - モダンで使いやすいインターフェース
- 🔄 **幅広いモデル対応** - Ollamaで利用可能なほぼすべてのモデルをサポート（テキストモデル、画像認識モデル、コード生成モデルなど）
- 👥 **マルチユーザー対応** - 複数のユーザーアカウント管理
- 📁 **セッション管理** - チャットセッションの作成、削除、検索機能
- 🔍 **検索機能** - チャット履歴の全文検索
- 📎 **ファイル管理** - アップロードしたファイルの一覧表示と管理

## 必要な環境

- Docker Desktop（インストール済み）
- Ollama（PCにネイティブインストール）

## セットアップ手順

### 1. Ollamaのインストール

#### macOS
```bash
brew install ollama
```

#### Windows
```bash
# wingetを使用
winget install Ollama.Ollama

# または Chocolateyを使用
choco install ollama
```

### 2. Ollamaの設定

Ollamaを起動し、Dockerコンテナからアクセスできるように設定します。

```bash
# Ollamaを起動（デフォルトでは自動起動しますが、手動で起動する場合）
ollama serve

# 別のターミナルで、Ollamaが0.0.0.0でリッスンするように設定
export OLLAMA_HOST=0.0.0.0:11434

# または、環境変数を永続化するために ~/.zshrc または ~/.bashrc に追加
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.zshrc
source ~/.zshrc
```

**Windowsの場合:**
環境変数 `OLLAMA_HOST` を `0.0.0.0:11434` に設定してください。

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

初回起動時は、Dockerイメージのビルドとコンテナの起動に時間がかかります。

### 5. アクセス

ブラウザで以下のURLにアクセス:

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

## 使用方法

### 基本的な使い方

1. **初回起動時**: ユーザー名を入力してチャットを開始
2. **メッセージ送信**: テキスト入力欄にメッセージを入力してEnterキーを押す（Shift+Enterで改行）
3. **ファイルアップロード**: アップロードアイコン（📎）をクリックしてPDF、画像、テキスト、Excel、Wordファイルをアップロード
4. **モデル選択**: ヘッダーのドロップダウンから使用するモデルを選択
5. **新しいチャット**: サイドバーの「+」ボタンで新しいチャットセッションを作成
6. **チャット履歴**: サイドバーから過去のチャットセッションを選択して閲覧
7. **検索**: サイドバーの検索アイコンでチャット履歴を検索

### 高度な機能

- **モデル管理**: モデルセレクターからモデルのダウンロード、削除が可能
- **ファイル管理**: `/files` ページでアップロードしたファイルの一覧を確認
- **ユーザー切り替え**: ログアウトして別のユーザーでログイン可能

## 技術スタック

### フロントエンド
- **Next.js 14** - Reactフレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Axios** - HTTPクライアント
- **Lucide React** - アイコンライブラリ

### バックエンド
- **FastAPI** - Python Webフレームワーク
- **SQLAlchemy** - ORM
- **Alembic** - データベースマイグレーション
- **Pydantic** - データバリデーション
- **httpx** - 非同期HTTPクライアント

### データベース・インフラ
- **PostgreSQL** - リレーショナルデータベース
- **Docker & Docker Compose** - コンテナ化
- **Ollama** - ローカルAIモデル実行環境

### ファイル処理
- **pdf2image** - PDFから画像への変換
- **Pillow** - 画像処理
- **poppler-utils** - PDF処理ユーティリティ
- **LibreOffice** - Officeファイル（XLSX、DOCX）からPDFへの変換

## アーキテクチャ

```
┌─────────────┐
│  Frontend   │ Next.js (Port 3000)
│  (Next.js)  │
└──────┬──────┘
       │
       │ HTTP/REST API
       │
┌──────▼──────┐
│  Backend    │ FastAPI (Port 8000)
│  (FastAPI)  │
└──────┬──────┘
       │
       ├───► PostgreSQL (Port 5432)
       │     - ユーザー情報
       │     - チャット履歴
       │     - セッション管理
       │     - ファイルメタデータ
       │
       └───► Ollama (Port 11434)
             - AIモデル実行
             - ストリーミング応答
```

## 対応ファイル形式

- **PDF**: pdf2imageを使用して画像に変換
- **PNG/JPG**: そのまま処理、必要に応じてリサイズ
- **TXT**: テキストを画像に変換
- **XLSX**: LibreOfficeを使用してPDFに変換後、画像に変換
- **DOCX**: LibreOfficeを使用してPDFに変換後、画像に変換

## トラブルシューティング

### Ollamaに接続できない

1. Ollamaが起動しているか確認:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. `OLLAMA_HOST` 環境変数が正しく設定されているか確認

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

### ファイル変換が失敗する

1. poppler-utilsがインストールされているか確認:
   ```bash
   docker exec ollama-chat-backend pdftoppm -v
   ```

2. ファイルサイズが大きすぎないか確認（推奨: 10MB以下）

## プロジェクト構造

```
ollama-chat/
├── backend/                 # バックエンド（FastAPI）
│   ├── main.py             # メインアプリケーション
│   ├── models.py           # データベースモデル
│   ├── schemas.py          # Pydanticスキーマ
│   ├── database.py         # データベース接続設定
│   ├── file_converter.py   # ファイル変換処理
│   ├── requirements.txt    # Python依存関係
│   ├── Dockerfile          # バックエンドDockerfile
│   └── alembic/            # データベースマイグレーション
├── frontend/               # フロントエンド（Next.js）
│   ├── app/
│   │   ├── page.tsx        # メインチャットページ
│   │   ├── layout.tsx      # レイアウト設定
│   │   ├── icon.png        # アプリケーションアイコン
│   │   ├── apple-icon.png  # Apple用アイコン
│   │   └── files/          # ファイル管理ページ
│   ├── package.json        # Node.js依存関係
│   └── Dockerfile          # フロントエンドDockerfile
├── docker-compose.yml      # Docker Compose設定
├── start.sh               # 起動スクリプト（macOS/Linux）
├── start.bat              # 起動スクリプト（Windows）
└── README.md              # このファイル
```

## 開発

### バックエンドの開発

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

バックエンドは `http://localhost:8000` で起動します。APIドキュメントは `http://localhost:8000/docs` で確認できます。

### フロントエンドの開発

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

### データベースマイグレーション

```bash
cd backend
alembic upgrade head
```

## ライセンス

MIT License


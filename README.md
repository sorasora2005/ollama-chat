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

## デモ

<div align="center">


https://github.com/user-attachments/assets/fece7952-e622-4130-ac67-d214fdbc16b3


</div>

## 機能

- 🤖 **Ollamaを使用したローカルAIチャット** - プライバシーを保護しながらAIと対話
- 💬 **チャット履歴の保存** - PostgreSQLによる永続的なチャット履歴管理
- 📄 **マルチファイル対応** - PDF、PNG/JPG、TXT、XLSX、DOCXファイルのアップロードと変換
- 🎨 **Gemini風の洗練されたUI** - モダンで使いやすいインターフェース
- 🔄 **幅広いモデル対応** - Ollamaで利用可能なほぼすべてのモデルをサポート
- ☁️ **クラウドAPI対応** - GeminiやGPTなどのクラウドモデルのAPIキーを登録して利用可能
- 📝 **ノート機能** - チャット内容やアイデアをノートとして保存・管理・検索
- 👥 **マルチユーザー対応** - 複数のユーザーアカウント管理
- 📁 **セッション管理** - チャットセッションの作成、削除、検索機能
- 🔍 **検索機能** - チャット履歴の全文検索
- 📎 **ファイル管理** - アップロードしたファイルの一覧表示と管理
- ⏹️ **メッセージ生成のキャンセル** - ストリーミング中に生成を中断し、キャンセルされたメッセージを記録
- 📝 **長いメッセージの折りたたみ** - 長いメッセージを自動的に折りたたみ、展開/折りたたみボタンで表示制御
- 👍 **メッセージフィードバック** - アシスタントの応答に対して良い/悪いのフィードバックを送信可能
- 📊 **統計情報** - モデル別のメッセージ数、トークン数、フィードバック統計を表示

## 必要な環境

- Docker Desktop（インストール済み）
- Ollama（PCにネイティブインストール）

## セットアップ手順

> 📖 **詳細なセットアップガイド**: より詳細な手順やトラブルシューティングについては、[SETUP.md](./SETUP.md) を参照してください。

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
5. **新しいチャット**: サイドバーの「+」ボタン、またはヘッダーのタイトル「Ollama Chat」をクリックして新しいチャットセッションを作成
6. **チャット履歴**: サイドバーから過去のチャットセッションを選択して閲覧
7. **検索**: サイドバーの検索アイコンでチャット履歴を検索
8. **生成のキャンセル**: メッセージ生成中にキャンセルボタンをクリックして中断（キャンセルされたメッセージは記録され、入力内容は復元されます）
9. **長いメッセージの表示**: 6行を超えるメッセージは自動的に折りたたまれ、展開/折りたたみボタンで表示を切り替え可能
10. **フィードバック送信**: アシスタントの応答メッセージに👍（良い）または👎（悪い）ボタンでフィードバックを送信
11. **統計情報の確認**: サイドバーの「統計情報」からモデル別の使用状況やフィードバック統計を確認

### 高度な機能

- **モデル管理**: モデルセレクターからモデルのダウンロード、削除が可能
- **クラウドモデル連携**: モデルセレクターからGeminiなどクラウドモデル用のAPIキーを登録・管理し、チャットで利用可能
- **ノート機能**: `/notes` ページでチャット内容やアイデアをノートとして保存、閲覧、検索
- **ファイル管理**: `/files` ページでアップロードしたファイルの一覧を確認
- **ユーザー切り替え**: ログアウトして別のユーザーでログイン可能
- **メッセージ生成の中断**: ストリーミング中に生成をキャンセルし、キャンセルされたメッセージは視覚的に区別されます
- **メッセージの折りたたみ**: 長いメッセージは自動的に折りたたまれ、UIをすっきり保ちます
- **フィードバック機能**: アシスタントの応答に対してフィードバックを送信し、統計情報で確認可能
- **統計情報**: `/stats` ページでモデル別のメッセージ数、トークン数（プロンプト/生成）、フィードバック数を確認

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
│             │
│  - Components (UI) │
│  - Hooks (Logic)   │
│  - Utils (Helpers) │
└──────┬──────┘
       │
       │ HTTP/REST API
       │
┌──────▼──────┐
│  Backend    │ FastAPI (Port 8000)
│  (FastAPI)  │
│             │
│  - Routers  │
│    ├── api_keys.py│
│    ├── chat.py    │
│    ├── feedback.py│
│    ├── models.py  │
│    ├── notes.py   │
│    ├── upload.py  │
│    └── users.py   │
└──────┬──────┘
       │
       ├───► PostgreSQL (Port 5432)
       │     - ユーザー情報
       │     - チャット履歴（トークン数含む）
       │     - セッション管理
       │     - ファイルメタデータ
       │     - メッセージフィードバック
       │     - ノート
       │     - クラウドAPIキー
       │
       └───► Ollama (Port 11434)
             - AIモデル実行
             - ストリーミング応答
```

### コード構造の特徴

**フロントエンド**:
- **コンポーネント分離**: UIコンポーネントを機能別に分離（`components/`）
- **カスタムフック**: ビジネスロジックをカスタムフックに分離（`hooks/`）
  - `useChat`: チャット履歴とセッション管理
  - `useChatMessage`: メッセージ送信とストリーミング処理
  - `useCloudApiKeys`: クラウドAPIキーの管理
  - `useFiles`: ファイル管理
  - `useModelDownload`: モデルのダウンロード管理
  - `useModels`: モデル一覧と選択管理
  - `useNotifications`: 通知（トースト）管理
  - `useTheme`: テーマ（ダーク/ライトモード）管理
  - `useUsers`: ユーザー管理
- **ユーティリティ**: APIクライアント、エクスポート、スクロールなどの共通処理（`utils/`）
- **型定義**: TypeScript型定義を一元管理（`types/`）

**バックエンド**:
- **ルーター分離**: APIエンドポイントを機能別に分離（`routers/`）
  - `api_keys.py`: クラウドAPIキー管理API
  - `chat.py`: チャット関連API（トークン数の記録を含む）
  - `feedback.py`: フィードバック送信と統計情報API
  - `models.py`: モデル管理API
  - `notes.py`: ノート管理API
  - `upload.py`: ファイルアップロードAPI
  - `users.py`: ユーザー管理API
- **モジュール化**: 各ルーターが独立して管理され、`main.py`で統合

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
│   ├── main.py             # メインアプリケーション（ルーターの統合）
│   ├── models.py           # データベースモデル
│   ├── schemas.py          # Pydanticスキーマ
│   ├── database.py         # データベース接続設定
│   ├── file_converter.py   # ファイル変換処理
│   ├── config.py           # 設定ファイル
│   ├── requirements.txt    # Python依存関係
│   ├── Dockerfile          # バックエンドDockerfile
│   ├── routers/            # APIルーター（機能別に分離）
│   │   ├── api_keys.py    # クラウドAPIキー管理エンドポイント
│   │   ├── chat.py        # チャット関連エンドポイント
│   │   ├── feedback.py    # フィードバック関連エンドポイント
│   │   ├── models.py      # モデル管理エンドポイント
│   │   ├── notes.py       # ノート管理エンドポイント
│   │   ├── upload.py      # ファイルアップロードエンドポイント
│   │   └── users.py       # ユーザー管理エンドポイント
│   ├── utils/             # ユーティリティ関数
│   │   └── model_utils.py # モデル関連ユーティリティ
│   └── alembic/           # データベースマイグレーション
├── frontend/               # フロントエンド（Next.js）
│   ├── app/
│   │   ├── page.tsx        # メインチャットページ
│   │   ├── layout.tsx      # レイアウト設定
│   │   ├── globals.css     # グローバルスタイル
│   │   ├── icon.png        # アプリケーションアイコン
│   │   ├── apple-icon.png  # Apple用アイコン
│   │   ├── components/     # Reactコンポーネント（機能別に分離）
│   │   │   ├── CloudModelFamily.tsx
│   │   │   ├── DeleteConfirmModal.tsx
│   │   │   ├── DownloadSuccessModal.tsx
│   │   │   ├── DownloadWarningModal.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── FilePreviewModal.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── ModelList.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── ModelStatsModal.tsx
│   │   │   ├── NoteCreateModal.tsx
│   │   │   ├── NoteDetailModal.tsx
│   │   │   ├── NoteList.tsx
│   │   │   ├── NoteSearchModal.tsx
│   │   │   ├── NotificationToast.tsx
│   │   │   ├── SearchModal.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatsList.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── UsernameModal.tsx
│   │   │   └── WelcomeScreen.tsx
│   │   ├── hooks/          # カスタムフック（ロジックの分離）
│   │   │   ├── useChat.ts
│   │   │   ├── useChatMessage.ts
│   │   │   ├── useCloudApiKeys.ts
│   │   │   ├── useFiles.ts
│   │   │   ├── useModelDownload.ts
│   │   │   ├── useModels.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useTheme.ts
│   │   │   └── useUsers.ts
│   │   ├── utils/          # ユーティリティ関数
│   │   │   ├── api.ts      # APIクライアント
│   │   │   ├── chatExport.ts
│   │   │   ├── modelSize.ts
│   │   │   └── scrollUtils.ts
│   │   ├── types/          # TypeScript型定義
│   │   │   └── index.ts
│   │   ├── files/          # ファイル管理ページ
│   │   │   └── page.tsx
│   │   ├── notes/          # ノート管理ページ
│   │   │   └── page.tsx
│   │   └── stats/          # 統計情報ページ
│   │       └── page.tsx
│   ├── package.json        # Node.js依存関係
│   ├── next.config.js      # Next.js設定
│   ├── tailwind.config.js  # Tailwind CSS設定
│   ├── tsconfig.json       # TypeScript設定
│   └── Dockerfile          # フロントエンドDockerfile
├── docker-compose.yml      # Docker Compose設定
├── start.sh               # 起動スクリプト（macOS/Linux）
├── start.bat              # 起動スクリプト（Windows）
├── README.md              # このファイル
└── SETUP.md               # 詳細セットアップガイド
```

## 開発

### バックエンドの開発

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

バックエンドは `http://localhost:8000` で起動します。APIドキュメントは `http://localhost:8000/docs` で確認できます。

**コード構造**:
- APIエンドポイントは`routers/`ディレクトリ内の各ファイルに機能別に分離されています
- 新しいエンドポイントを追加する場合は、適切なルーターファイルに追加するか、新しいルーターファイルを作成して`main.py`でインクルードしてください

### フロントエンドの開発

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

**コード構造**:
- **コンポーネント**: `app/components/` - UIコンポーネントを機能別に分離
- **カスタムフック**: `app/hooks/` - ビジネスロジックと状態管理を分離
- **ユーティリティ**: `app/utils/` - 共通処理とAPIクライアント
- **型定義**: `app/types/` - TypeScript型定義

新しい機能を追加する場合:
1. UIコンポーネントは`components/`に追加
2. 状態管理やAPI呼び出しは`hooks/`にカスタムフックとして追加
3. 共通処理は`utils/`に追加

### データベースマイグレーション

```bash
cd backend
alembic upgrade head
```

## ライセンス

MIT License


# セットアップガイド

このガイドでは、Ollama Chatアプリケーションをセットアップするための詳細な手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Docker Desktopのインストール](#docker-desktopのインストール)
3. [Ollamaのインストールと設定](#ollamaのインストールと設定)
4. [モデルのダウンロード](#モデルのダウンロード)
5. [アプリケーションの起動](#アプリケーションの起動)
6. [トラブルシューティング](#トラブルシューティング)
7. [開発モード](#開発モード)
8. [よくある質問（FAQ）](#よくある質問faq)

## 前提条件

### システム要件

- **OS**: macOS 10.15以降、Windows 10/11、またはLinux（Ubuntu 20.04以降推奨）
- **メモリ**: 最低8GB RAM（16GB以上推奨、特に大きなモデルを使用する場合）
- **ストレージ**: 最低10GBの空き容量（モデルサイズによって異なります）
- **CPU**: 64ビットプロセッサ

### 必要なソフトウェア

- **Docker Desktop**: バージョン4.0以降
- **Ollama**: 最新バージョン
- **Git**: リポジトリのクローンに必要

### ポート要件

以下のポートが利用可能である必要があります:
- **3000**: フロントエンド（Next.js）
- **8000**: バックエンドAPI（FastAPI）
- **5432**: PostgreSQLデータベース
- **11434**: Ollama（デフォルトポート）

これらのポートが既に使用されている場合は、`docker-compose.yml`でポート番号を変更してください。

## Docker Desktopのインストール

### macOS

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)をダウンロード
2. `.dmg`ファイルを開き、DockerアイコンをApplicationsフォルダにドラッグ
3. ApplicationsフォルダからDockerを起動
4. 初回起動時に権限の要求がある場合は、許可してください
5. Docker Desktopが起動したら、メニューバーのDockerアイコンが緑色になることを確認

### Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)をダウンロード
2. インストーラーを実行し、指示に従ってインストール
3. インストール後、再起動が求められる場合があります
4. Docker Desktopを起動し、システムトレイにDockerアイコンが表示されることを確認

### Linux

```bash
# Ubuntu/Debianの場合
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# Docker Composeのインストール確認
docker compose version
```

**注意**: Linuxでは、Docker Desktopの代わりにDocker EngineとDocker Composeプラグインを使用します。

### Docker Desktopの動作確認

```bash
# Dockerが正しくインストールされているか確認
docker --version
docker compose version

# Dockerが動作しているか確認
docker ps
```

## Ollamaのインストールと設定

### 1. Ollamaのインストール

#### macOS

```bash
# Homebrewを使用（推奨）
brew install ollama

# または、公式サイトからダウンロード
# https://ollama.ai/download
```

#### Windows

```bash
# wingetを使用（推奨）
winget install Ollama.Ollama

# または Chocolateyを使用
choco install ollama

# または、公式サイトからインストーラーをダウンロード
# https://ollama.ai/download
```

#### Linux

```bash
# 公式インストールスクリプトを使用
curl -fsSL https://ollama.ai/install.sh | sh

# または、手動でインストール
# https://github.com/ollama/ollama/blob/main/docs/linux.md
```

### 2. Ollamaの起動確認

インストール後、Ollamaが自動的に起動します。手動で起動する場合:

```bash
# Ollamaを起動
ollama serve

# 別のターミナルで動作確認
curl http://localhost:11434/api/tags
```

正常に動作している場合、JSON形式でモデル一覧が返されます（初回は空のリスト）。

### 3. Dockerコンテナからアクセスできるように設定

**重要**: DockerコンテナからOllamaにアクセスするため、`OLLAMA_HOST`環境変数を`0.0.0.0:11434`に設定する必要があります。これにより、Ollamaがすべてのネットワークインターフェースでリッスンするようになります。

#### macOS

Ollamaを起動し、Dockerコンテナからアクセスできるように設定します。

```bash
# 一時的に設定（現在のセッションのみ）
export OLLAMA_HOST=0.0.0.0:11434

# 永続的に設定（推奨）
# zshを使用している場合
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.zshrc
source ~/.zshrc

# bashを使用している場合
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.bash_profile
source ~/.bash_profile

# 設定の確認
echo $OLLAMA_HOST
```

#### Windows

**方法1: システム環境変数として設定（推奨）**

1. 「システムのプロパティ」を開く（Win + Pause/Break）
2. 「環境変数」をクリック
3. 「システム環境変数」セクションで「新規」をクリック
4. 変数名: `OLLAMA_HOST`、変数値: `0.0.0.0:11434` を入力
5. 「OK」をクリックして保存
6. PowerShellまたはコマンドプロンプトを再起動

**方法2: PowerShellで設定**

```powershell
# 現在のユーザー用に設定
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', '0.0.0.0:11434', 'User')

# 設定の確認
$env:OLLAMA_HOST
```

**方法3: コマンドプロンプトで設定**

```cmd
setx OLLAMA_HOST "0.0.0.0:11434"
```

#### Linux

```bash
# 一時的に設定
export OLLAMA_HOST=0.0.0.0:11434

# 永続的に設定
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.bashrc
source ~/.bashrc

# または、systemdサービスとして設定（推奨）
sudo systemctl edit ollama
# 以下の内容を追加:
# [Service]
# Environment="OLLAMA_HOST=0.0.0.0:11434"
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 4. 設定の確認

環境変数を設定した後、Ollamaを再起動して設定が反映されているか確認してください:

```bash
# macOS/Linux: Ollamaを再起動
pkill ollama
ollama serve

# Windows: Ollamaサービスを再起動（サービスとして実行している場合）
# または、Ollamaアプリケーションを再起動

# 設定が反映されているか確認
curl http://0.0.0.0:11434/api/tags
# または
curl http://localhost:11434/api/tags
```

**トラブルシューティング**: 環境変数が反映されない場合:
1. ターミナル/コマンドプロンプトを完全に閉じて再起動
2. Ollamaを再起動
3. `echo $OLLAMA_HOST`（macOS/Linux）または `echo %OLLAMA_HOST%`（Windows）で確認

## モデルのダウンロード

このアプリケーションはOllamaで利用可能なほぼすべてのモデルをサポートしています。使用するモデルをダウンロードします（初回は時間がかかります）。

### モデルの種類

Ollamaでは以下のような種類のモデルが利用可能です:

- **テキストモデル**: 一般的なテキスト生成、質問応答
- **画像認識モデル（Vision）**: 画像やPDFファイルの内容を理解
- **コード生成モデル（Coder）**: コード生成、プログラミング支援
- **埋め込みモデル（Embedding）**: テキストの埋め込みベクトル生成

### 推奨モデル

用途に応じて以下のモデルが推奨されます:

#### 画像認識が必要な場合（ファイルアップロード機能を使用）

```bash
# 軽量モデル（4GB程度）
ollama pull qwen3-vl:4b

# 中規模モデル（7GB程度、推奨）
ollama pull qwen2.5-vl:7b

# 大規模モデル（8GB以上）
ollama pull qwen3-vl:8b
```

**特徴**: PDF、画像、Excel、Wordファイルの内容を理解できます。

#### テキストのみの場合

```bash
# 軽量モデル（3GB程度）
ollama pull llama3.2:3b
ollama pull qwen2.5:3b

# 中規模モデル（7GB程度、推奨）
ollama pull qwen2.5:7b
ollama pull llama3.1:8b

# 大規模モデル（13GB以上）
ollama pull qwen2.5:14b
ollama pull llama3.1:70b
```

**特徴**: テキスト生成、質問応答に最適化されています。

#### コード生成が必要な場合

```bash
# 軽量モデル（3GB程度）
ollama pull qwen2.5-coder:3b

# 中規模モデル（7GB程度、推奨）
ollama pull qwen2.5-coder:7b
ollama pull codellama:7b

# 大規模モデル（13GB以上）
ollama pull qwen2.5-coder:14b
```

**特徴**: コード生成、プログラミング支援に特化しています。

### モデルのダウンロード手順

```bash
# 基本的な使用方法
ollama pull <モデル名>

# 例
ollama pull qwen2.5-vl:7b
```

**注意事項**:
- モデルのダウンロードには時間がかかります（モデルサイズによります）
- インターネット接続が必要です
- 十分なストレージ容量を確保してください

### 利用可能なモデルの確認

```bash
# ダウンロード済みのモデル一覧を表示
ollama list

# モデルの詳細情報を表示
ollama show <モデル名>

# 例
ollama show qwen2.5-vl:7b
```

### アプリケーション内でのモデル管理

アプリケーション起動後、以下の方法でモデルを管理できます:

1. **モデルセレクター**: ヘッダーのドロップダウンから利用可能なモデルを確認
2. **モデルのダウンロード**: モデルセレクターから直接ダウンロード可能
3. **モデルの削除**: 不要なモデルを削除してストレージを節約

### モデルサイズの目安

| モデルサイズ | パラメータ数 | ストレージ | 推奨RAM |
|------------|------------|----------|---------|
| 1B-3B | 10億-30億 | 2-4GB | 4-8GB |
| 4B-7B | 40億-70億 | 4-8GB | 8-16GB |
| 8B-13B | 80億-130億 | 8-16GB | 16-32GB |
| 14B+ | 140億以上 | 16GB+ | 32GB+ |

**推奨**: 初めて使用する場合は、4B-7Bサイズのモデルから始めることをお勧めします。

## アプリケーションの起動

### 1. リポジトリのクローン

```bash
# GitHubからクローン
git clone <repository-url>
cd ollama-chat

# または、既存のリポジトリを更新
git pull origin main
```

### 2. アプリケーションの起動方法

#### 方法1: Docker Composeを使用（推奨）

```bash
# バックグラウンドで起動
docker compose up --build -d

# ログを確認しながら起動
docker compose up --build

# 起動後、バックグラウンドで実行する場合
# Ctrl+Cで停止後、以下を実行
docker compose up -d
```

#### 方法2: 起動スクリプトを使用

**macOS/Linux:**
```bash
# 実行権限を付与（初回のみ）
chmod +x start.sh

# 起動
./start.sh
```

**Windows:**
```cmd
start.bat
```

起動スクリプトは以下の処理を自動的に実行します:
- Ollamaの起動確認
- Docker Composeでのサービス起動
- 起動状態の確認

### 3. 初回起動時の処理

初回起動時は、以下の処理が順次実行されます:

1. **Dockerイメージのビルド**
   - バックエンドイメージ（Python、FastAPI）
   - フロントエンドイメージ（Node.js、Next.js）
   - PostgreSQLイメージのダウンロード

2. **PostgreSQLデータベースの初期化**
   - データベースとユーザーの作成
   - Alembicによるマイグレーション実行

3. **サービスの起動**
   - PostgreSQL（ポート5432）
   - バックエンドAPI（ポート8000）
   - フロントエンド（ポート3000）

**所要時間**: 初回起動は5-15分程度かかることがあります（ネットワーク速度とシステム性能によります）。

### 4. 起動状態の確認

```bash
# すべてのコンテナの状態を確認
docker compose ps

# ログを確認
docker compose logs -f

# 特定のサービスのログを確認
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

正常に起動している場合、以下のように表示されます:

```
NAME                      STATUS
ollama-chat-postgres      Up (healthy)
ollama-chat-backend       Up
ollama-chat-frontend      Up
```

### 5. アクセス

ブラウザで以下のURLにアクセス:

- **フロントエンド**: http://localhost:3000
  - メインのチャットインターフェース
  - ユーザー名を入力してチャットを開始

- **バックエンドAPI**: http://localhost:8000
  - REST APIエンドポイント

- **APIドキュメント**: http://localhost:8000/docs
  - Swagger UIによるAPI仕様書
  - エンドポイントのテストが可能

### 6. アプリケーションの停止

```bash
# すべてのサービスを停止
docker compose down

# データボリュームも含めて削除（データが消えます）
docker compose down -v

# 起動スクリプトを使用した場合、Ollamaも停止
pkill ollama  # macOS/Linux
```

### 7. 再起動

```bash
# 停止後、再起動
docker compose up -d

# または、起動スクリプトを使用
./start.sh  # macOS/Linux
start.bat   # Windows
```

## トラブルシューティング

### Ollamaに接続できない

**症状**: アプリケーションがOllamaに接続できない、モデル一覧が取得できない

**解決方法**:

1. **Ollamaが起動しているか確認**
   ```bash
   # ローカルホストから確認
   curl http://localhost:11434/api/tags
   
   # または
   curl http://0.0.0.0:11434/api/tags
   ```
   正常な場合、JSON形式でモデル一覧が返されます。

2. **Ollamaプロセスの確認**
   ```bash
   # macOS/Linux
   ps aux | grep ollama
   pgrep -x ollama
   
   # Windows
   tasklist | findstr ollama
   ```
   プロセスが見つからない場合、Ollamaを起動してください。

3. **環境変数の確認**
   ```bash
   # macOS/Linux
   echo $OLLAMA_HOST
   
   # Windows
   echo %OLLAMA_HOST%
   ```
   `0.0.0.0:11434`が表示されない場合、環境変数を設定してください。

4. **Dockerコンテナからホストへのアクセス確認**
   ```bash
   # バックエンドコンテナからOllamaにアクセス
   docker exec ollama-chat-backend curl http://host.docker.internal:11434/api/tags
   ```
   
   **エラーが発生する場合**:
   - Windows: `host.docker.internal`が正しく解決されているか確認
   - Linux: `host.docker.internal`が利用できない場合、ホストのIPアドレスを使用
     ```bash
     # ホストのIPアドレスを確認
     ip addr show docker0  # DockerブリッジのIP
     # docker-compose.ymlでOLLAMA_BASE_URLを変更
     ```

5. **ファイアウォールの確認**
   - macOS: システム環境設定 > セキュリティとプライバシー > ファイアウォール
   - Windows: Windows Defender ファイアウォール
   - Linux: `sudo ufw status`

### モデルが見つからない

**症状**: モデルを選択できない、モデル一覧が空

**解決方法**:

1. **ダウンロード済みモデルの確認**
   ```bash
   ollama list
   ```
   モデルが表示されない場合、モデルをダウンロードしてください。

2. **モデル名の確認**
   ```bash
   # 利用可能なモデルを検索
   # Ollama公式サイトで確認: https://ollama.ai/library
   
   # モデル名の形式を確認
   ollama show <モデル名>
   ```

3. **モデルの再ダウンロード**
   ```bash
   # モデルを削除して再ダウンロード
   ollama rm <モデル名>
   ollama pull <モデル名>
   ```

4. **アプリケーションの再起動**
   ```bash
   docker compose restart backend
   ```

### ポートが既に使用されている

**症状**: `port is already allocated`、`address already in use`エラー

**解決方法**:

1. **使用中のポートの確認**
   ```bash
   # macOS/Linux
   lsof -i :3000
   lsof -i :8000
   lsof -i :5432
   
   # Windows
   netstat -ano | findstr :3000
   netstat -ano | findstr :8000
   netstat -ano | findstr :5432
   ```

2. **ポート番号の変更**
   `docker-compose.yml`を編集してポート番号を変更:
   ```yaml
   services:
     frontend:
       ports:
         - "3001:3000"  # 3000から3001に変更
     backend:
       ports:
         - "8001:8000"  # 8000から8001に変更
     postgres:
       ports:
         - "5433:5432"  # 5432から5433に変更
   ```

3. **競合しているプロセスの停止**
   ```bash
   # プロセスIDを確認して停止
   kill <PID>  # macOS/Linux
   taskkill /PID <PID> /F  # Windows
   ```

### ファイル変換が失敗する

**症状**: ファイルをアップロードしてもエラーが発生する

**解決方法**:

1. **poppler-utilsの確認**
   ```bash
   docker exec ollama-chat-backend pdftoppm -v
   ```
   エラーが表示される場合、バックエンドイメージを再ビルド:
   ```bash
   docker compose build backend
   docker compose up -d backend
   ```

2. **LibreOfficeの確認（XLSX、DOCXファイル用）**
   ```bash
   docker exec ollama-chat-backend libreoffice --version
   ```
   エラーが表示される場合、DockerfileにLibreOfficeのインストールを追加してください。

3. **ファイルサイズの確認**
   - 推奨: 10MB以下
   - 大きなファイルは分割するか、圧縮してください

4. **ファイル形式の確認**
   対応形式: PDF, PNG, JPG, JPEG, TXT, XLSX, DOCX
   
5. **ログの確認**
   ```bash
   docker compose logs backend | grep -i error
   docker compose logs backend | grep -i file
   ```

### Dockerコンテナが起動しない

**症状**: `docker compose up`を実行してもコンテナが起動しない

**解決方法**:

1. **Dockerの状態確認**
   ```bash
   docker ps
   docker info
   ```

2. **ログの確認**
   ```bash
   docker compose logs
   docker compose logs <service-name>
   ```

3. **イメージの再ビルド**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

4. **ボリュームの確認**
   ```bash
   docker volume ls
   docker volume inspect ollama-chat_postgres_data
   ```

5. **リソースの確認**
   - Docker Desktopの設定でメモリとCPUの割り当てを確認
   - 十分なリソースが割り当てられているか確認

### データベース接続エラー

**症状**: `database connection failed`、`could not connect to server`

**解決方法**:

1. **PostgreSQLコンテナの状態確認**
   ```bash
   docker compose ps postgres
   docker compose logs postgres
   ```

2. **データベースのヘルスチェック**
   ```bash
   docker exec ollama-chat-postgres pg_isready -U ollama_chat
   ```

3. **データベースの再初期化**
   ```bash
   # 注意: すべてのデータが削除されます
   docker compose down -v
   docker compose up -d postgres
   # データベースが起動するまで待つ
   sleep 10
   docker compose up -d
   ```

### フロントエンドが表示されない

**症状**: ブラウザでアクセスしてもページが表示されない

**解決方法**:

1. **フロントエンドコンテナの状態確認**
   ```bash
   docker compose ps frontend
   docker compose logs frontend
   ```

2. **ビルドエラーの確認**
   ```bash
   docker compose logs frontend | grep -i error
   ```

3. **Node.jsの依存関係の再インストール**
   ```bash
   docker compose exec frontend npm install
   docker compose restart frontend
   ```

4. **ブラウザのキャッシュをクリア**
   - ブラウザの開発者ツールでエラーを確認
   - ハードリロード（Ctrl+Shift+R / Cmd+Shift+R）

### パフォーマンスの問題

**症状**: 応答が遅い、メモリ不足

**解決方法**:

1. **システムリソースの確認**
   ```bash
   # macOS/Linux
   top
   htop
   
   # Dockerのリソース使用状況
   docker stats
   ```

2. **モデルサイズの見直し**
   - より小さなモデルを使用
   - 不要なモデルを削除

3. **Docker Desktopのリソース設定**
   - Docker Desktop > Settings > Resources
   - メモリとCPUの割り当てを増やす

4. **同時実行数の制限**
   - 複数のユーザーが同時に使用する場合、リソースを増やす

## 開発モード

開発時に、ホットリロード機能を使用してコードの変更を即座に反映できます。

### バックエンドの開発

```bash
cd backend

# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # macOS/Linux
# または
venv\Scripts\activate  # Windows

# 依存関係のインストール
pip install -r requirements.txt

# 開発サーバーの起動（ホットリロード有効）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**注意**: 開発モードでは、PostgreSQLはDockerコンテナで実行し、バックエンドのみローカルで実行することを推奨します。

```bash
# PostgreSQLのみ起動
docker compose up -d postgres

# 環境変数の設定
export DATABASE_URL=postgresql://ollama_chat:ollama_chat123@localhost:5432/ollama_chat
export OLLAMA_BASE_URL=http://localhost:11434
```

### フロントエンドの開発

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動（ホットリロード有効）
npm run dev
```

**注意**: 開発モードでは、バックエンドAPIのURLを環境変数で設定できます。

```bash
# .env.localファイルを作成
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### データベースマイグレーション

```bash
cd backend

# 新しいマイグレーションを作成
alembic revision --autogenerate -m "description"

# マイグレーションを適用
alembic upgrade head

# マイグレーションをロールバック
alembic downgrade -1
```

## データベースのリセット

データベースを完全にリセットする場合（**すべてのデータが削除されます**）:

```bash
# コンテナとボリュームを削除
docker compose down -v

# 再起動
docker compose up --build
```

**注意**: この操作により、すべてのチャット履歴、ユーザー情報、アップロードファイルが削除されます。

## よくある質問（FAQ）

### Q: どのモデルを選べばいいですか？

**A**: 用途に応じて選択してください:
- **画像やファイルを扱う場合**: `qwen2.5-vl:7b` や `qwen3-vl:4b`
- **テキストのみ**: `qwen2.5:7b` や `llama3.2:3b`
- **コード生成**: `qwen2.5-coder:7b`
- **初めて使用する場合**: 4B-7Bサイズのモデルから始めることを推奨

### Q: モデルのダウンロードに時間がかかります

**A**: モデルサイズによりますが、数分から数十分かかることがあります。ダウンロード中はインターネット接続を維持してください。

### Q: 複数のモデルを同時に使用できますか？

**A**: はい、セッションごとに異なるモデルを選択できます。ただし、同時に実行する場合はメモリ使用量が増加します。

### Q: データはどこに保存されますか？

**A**: 
- **チャット履歴**: PostgreSQLデータベース（Dockerボリューム）
- **アップロードファイル**: `/app/uploads`（Dockerボリューム）
- **モデル**: Ollamaのデフォルトディレクトリ（通常 `~/.ollama`）

### Q: バックアップはどうすればいいですか？

**A**: 
```bash
# データベースのバックアップ
docker exec ollama-chat-postgres pg_dump -U ollama_chat ollama_chat > backup.sql

# ボリューム全体のバックアップ
docker run --rm -v ollama-chat_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

### Q: パフォーマンスを向上させるには？

**A**: 
- より大きなRAMを割り当てる
- GPUを使用可能な場合は、OllamaでGPUを有効化
- 不要なモデルを削除してストレージを節約
- Docker Desktopのリソース設定を最適化

### Q: セキュリティについて

**A**: 
- 本番環境では、デフォルトのデータベースパスワードを変更してください
- 環境変数で機密情報を管理してください
- ファイアウォールで不要なポートを閉じてください
- HTTPSを使用することを推奨します

### Q: Linuxで`host.docker.internal`が使えない

**A**: `docker-compose.yml`で`extra_hosts`を追加するか、ホストのIPアドレスを直接指定してください:

```yaml
services:
  backend:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

または、ホストのIPアドレスを確認して使用:

```bash
# ホストのIPアドレスを確認
ip addr show docker0 | grep inet
```

### Q: モデルが応答しない、タイムアウトする

**A**: 
- モデルサイズに対して十分なメモリがあるか確認
- Ollamaのログを確認: `ollama logs`
- タイムアウト設定を調整（バックエンドの`httpx.AsyncClient`のタイムアウト設定）

## 追加リソース

- [Ollama公式ドキュメント](https://github.com/ollama/ollama)
- [Docker公式ドキュメント](https://docs.docker.com/)
- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [Next.js公式ドキュメント](https://nextjs.org/docs)

問題が解決しない場合は、GitHubのIssuesで報告してください。


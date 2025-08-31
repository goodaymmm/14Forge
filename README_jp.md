# 14Forge - LoLパフォーマンス分析プラットフォーム

*これは[n8nとBright Data主催のAI Agentsチャレンジ](https://dev.to/challenges/brightdata-n8n-2025-08-13)への応募作品です*

## 🏆 コンテスト応募作品 - BrightData + n8n Contest 2025

n8n AIエージェントとBrightDataウェブスクレイピングを活用した、独自の**14分分析™**技術を特徴とする革新的なリーグ・オブ・レジェンド分析プラットフォーム。

![14Forge Banner](https://img.shields.io/badge/14Forge-Analytics_Platform-purple?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![n8n](https://img.shields.io/badge/n8n-AI_Agent-orange?style=flat-square)
![BrightData](https://img.shields.io/badge/BrightData-Verified_Node-blue?style=flat-square)

## 🎯 14Forgeの独自性

### 14分分析™
数千試合の統計分析に基づき、14分という時間がリーグ・オブ・レジェンドの試合における重要な転換点であることを特定。当プラットフォームは以下を提供：
- 14分時点のゲーム状態に基づく**勝率予測**
- 高ランクプレイヤーとの**パフォーマンスベンチマーク**
- パーソナライズされた推奨事項を含む**AI駆動コーチング**
- プレイヤーの動きとワード配置の**ヒートマップ可視化**

### 主要機能
- 🤖 **AIコーチング（14 Coacher™）**: GPT-4/Gemini搭載の分析、多言語対応（EN/JP/KR）
- 📊 **マルチソースメタ分析**: Blitz.gg、OP.GG、Mobalyticsからのデータを統合
- 🗺️ **インタラクティブヒートマップ**: ポジショニング、戦闘、視界コントロールを可視化
- 🌍 **グローバルメタ比較**: KR/NA/EU/JP地域間の戦略比較
- ⚡ **リアルタイムデータ**: Riot API 5分キャッシュ、AI分析 6時間キャッシュ

## 📸 スクリーンショット

### メインダッシュボード
![Dashboard](./docs/images/dashboard.png)

### 14分分析
![14-Minute Analysis](./docs/images/14min-analysis.png)

### AIコーチングインターフェース
![AI Coaching](./docs/images/ai-coaching.png)

## 🚀 クイックスタート

### 前提条件
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15
- n8n（セルフホストまたはクラウド）
- APIキー：
  - Riot Games APIキー
  - BrightDataアカウント
  - OpenAI/Gemini APIキー

### インストール

1. **リポジトリのクローン**
```bash
git clone https://github.com/goodaymmm/14Forge.git
cd 14Forge
```

2. **環境変数の設定**
```bash
cp .env.example .env
# .envファイルをAPIキーで編集
```

3. **DockerでPostgreSQLを起動**
```bash
cd backend
docker-compose up -d postgres
```

4. **データベースマイグレーションの実行**
```bash
cd backend/api
npm install
npm run db:migrate
```

5. **バックエンドサーバーの起動**
```bash
cd backend/api
npm run dev
# サーバーは http://localhost:3000 で実行
```

6. **フロントエンドの起動**
```bash
cd frontend
npm install
npm run dev
# フロントエンドは http://localhost:5173 で実行
```

7. **n8nワークフローのセットアップ**
```bash
# n8nを起動
docker-compose up -d n8n
# http://localhost:5678 でn8nにアクセス
# n8n_workflows/ ディレクトリからワークフローをインポート
```

## 🔧 設定

### 環境変数

`.env.example`を基に`.env`ファイルを作成：

```env
# Riot API (https://developer.riotgames.com から取得)
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# データベース
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lol_stats
DB_USER=postgres
DB_PASSWORD=postgres

# BrightData
BRIGHTDATA_USERNAME=brd-customer-xxxxxxxx
BRIGHTDATA_PASSWORD=xxxxxxxx
BRIGHTDATA_ZONE=lol_stats_unlocker

# AIサービス
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# n8n
N8N_WEBHOOK_URL=http://localhost:5678
```

### n8nワークフロー設定

1. `http://localhost:5678`でn8n UIにアクセス
2. `n8n_workflows/`から以下のワークフローをインポート：
   - `14coacher.json` - メインAIコーチングワークフロー
   - `Build-Blitz-Collector.json` - メタデータ収集（⚠️ 実行に約2時間かかります）
   - `Match-Statistics-Collector.json` - 試合統計集計（⚠️ 実行に約2時間かかります）

**⚠️ 重要な注意**: ナレッジベースワークフロー（`Build-Blitz-Collector`と`Match-Statistics-Collector`）は膨大な動的コンテンツを処理するため、完了まで最大2時間かかることがあります。これらは定期的（例：毎日）に実行してメタデータを最新に保つ必要があります。

## 🏗️ アーキテクチャ

### 技術スタック
- **フロントエンド**: React 18、TypeScript、Vite、TanStack Query、Tailwind CSS
- **バックエンド**: Express.js、TypeScript、PostgreSQL 15、Winston
- **統合**: n8n（ワークフロー自動化）、BrightData（ウェブスクレイピング）
- **AI**: OpenAI GPT-4、Google Gemini 2.0 Flash
- **インフラ**: Docker、Docker Compose

### データフロー
```
ユーザーリクエスト → フロントエンド → バックエンドAPI → キャッシュチェック
                                                    ↓
                                            [キャッシュミス]
                                                    ↓
                                      Riot API / n8n Webhook
                                                    ↓
                                       BrightDataスクレイピング
                                                    ↓
                                            AI分析
                                                    ↓
                                       PostgreSQL保存
                                                    ↓
                                      ユーザーへのレスポンス
```

## 📊 n8nワークフロー

### 14 Coacher™ワークフロー
メインAIコーチングワークフローの動作：
1. Webhookで試合データを受信
2. BrightDataを使用して高ランクベンチマークを取得
3. GPT-4/Geminiでパフォーマンスを分析
4. パーソナライズされたコーチング推奨事項を返す

### メタ収集ワークフロー
- **Build-Blitz-Collector**: Blitz.ggからチャンピオンビルドをスクレイピング
- **Match-Statistics-Collector**: 地域間の試合統計を集計

## 🌟 主な成果

### パフォーマンス最適化
- 並列スクレイピングによる処理時間75%削減
- 同時操作のためのPromise.all実装
- リソースブロッキング（画像/CSS/フォント）による高速化
- 855から280のチャンピオン・ロール組み合わせに最適化

### データ品質
- チャンピオンデータ収集の成功率100%
- デュアル勝率追跡（Build WR / Rune WR）
- 信頼度スコアリングシステム（サンプルサイズに基づく0-100）
- NO HARDCODINGポリシー - すべての値を動的に取得

## 🧪 テスト

### テスト実行
```bash
# バックエンドテスト
cd backend/api
npm test

# フロントエンドテスト
cd frontend
npm test
```

### n8n Webhookテスト
```bash
# Windows
test-webhook.cmd

# Linux/Mac
./test-webhook.sh
```

## 📝 ドキュメント

- [フロントエンド設計書](./docs/frontend-detailed-design-v2.md)
- [BrightData戦略](./docs/brightdata-strategy.md)
- [実装ガイド](./docs/implementation-guide-v2.md)
- [英語版README](./README.md)

## 🤝 コントリビューション

コントリビューションは歓迎します！プルリクエストをお気軽に送信してください。

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/AmazingFeature`）
3. 変更をコミット（`git commit -m 'Add some AmazingFeature'`）
4. ブランチにプッシュ（`git push origin feature/AmazingFeature`）
5. プルリクエストを開く

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- **Riot Games** - 包括的なAPIの提供
- **BrightData** - 強力なウェブスクレイピング機能
- **n8n** - 素晴らしいワークフロー自動化プラットフォーム
- **コンテスト主催者** - この機会を提供していただき感謝

## 📞 連絡先

- GitHub: [@goodaymmm](https://github.com/goodaymmm)
- プロジェクトリンク: [https://github.com/goodaymmm/14Forge](https://github.com/goodaymmm/14Forge)

---

**BrightData + n8n Contest 2025のために❤️を込めて作成**
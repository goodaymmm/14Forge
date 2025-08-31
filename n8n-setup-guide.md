# n8n 14 Coacher ワークフロー設定ガイド

## 📌 現在の状況
- ✅ n8n起動済み (http://localhost:5678)
- ✅ バックエンドAPI稼働中 (http://localhost:3000)
- ✅ ボリューム永続化設定済み (n8n_data)

## 🚀 ワークフローインポート手順

### Step 1: n8n UIにアクセス
1. ブラウザで http://localhost:5678 を開く
2. 初回の場合はアカウント作成（メールアドレスとパスワード）

### Step 2: ワークフローをインポート
1. 左サイドバーの「Workflows」をクリック
2. 右上の「+ Add workflow」→「Import from File」を選択
3. ファイルを選択: `M:\workContest2\14forge\n8n-workflows\14-coacher-workflow.json`
4. 「Import」をクリック

### Step 3: 認証情報の設定

#### 3.1 Gemini API認証
1. ワークフロー内の「Gemini 2.0 Flash Analysis」ノードをダブルクリック
2. 「Credential to connect with」で「Create New」を選択
3. 以下を入力：
   - **Credential Name**: `Gemini API`
   - **API Key**: Google AI StudioからAPIキーを取得
     - https://aistudio.google.com/app/apikey にアクセス
     - 「Create API Key」をクリック
     - キーをコピー
4. 「Save」をクリック

#### 3.2 BrightData認証
1. 「BrightData High-Rank Scraping」ノードをダブルクリック
2. 「Credential to connect with」で「Create New」を選択
3. 以下を入力：
   - **Credential Name**: `BrightData Web Unlocker`
   - **Customer ID**: BrightDataダッシュボードから取得
   - **Password**: BrightDataのパスワード
   - **Zone**: `web_unlocker_lol`（既に設定済み）
4. 「Save」をクリック

### Step 4: ワークフローのテスト

#### 4.1 手動実行テスト
1. ワークフロー画面右上の「Execute Workflow」をクリック
2. 「Webhook Trigger」ノードをクリック
3. 「Listen For Test Event」をクリック
4. 別ターミナルでテストデータを送信：

```bash
curl -X POST http://localhost:5678/webhook/14coacher \
  -H "Content-Type: application/json" \
  -d '{
    "summonerName": "Hide on bush",
    "region": "kr",
    "matchId": "KR_7123456789",
    "champion": "Azir",
    "role": "MIDDLE",
    "cs_at_14": 105,
    "gold_at_14": 8500,
    "items_at_14": ["Lost Chapter", "Boots"]
  }'
```

### Step 5: ワークフローの有効化
1. テストが成功したら、右上の「Active」トグルをONにする
2. これでワークフローが本番稼働状態になります

## 🔍 トラブルシューティング

### エラー: Gemini APIキーが無効
- Google AI Studioで新しいAPIキーを生成
- 1日あたりの無料枠: 1,500リクエスト

### エラー: BrightData接続エラー
- Customer IDとパスワードを確認
- web_unlocker_lolゾーンが有効か確認
- IPホワイトリストを確認

### エラー: バックエンドAPI接続エラー
- バックエンドが起動しているか確認: `curl http://localhost:3000/health`
- ファイアウォール設定を確認

## 📊 動作確認

### 成功時の流れ
1. Webhook受信 → ✅
2. バックエンドでメタデータ収集 → ✅  
3. BrightDataで高ランクデータ取得 → ✅
4. Gemini 2.0 Flashで分析 → ✅
5. キャッシュに保存 → ✅
6. レスポンス返却 → ✅

### ログ確認場所
- n8n実行ログ: ワークフロー画面下部の「Executions」タブ
- バックエンドログ: `14forge/backend/api/logs/app.log`
- Dockerログ: `docker logs n8n`

## 🎯 次のステップ

1. **残り3つのワークフロー作成**
   - Global Meta Comparison
   - AI Commentary Generator  
   - Smart Alert System

2. **フロントエンド統合**
   - 14 Coacher UIコンポーネント追加
   - API呼び出し実装

3. **本番デプロイ準備**
   - 環境変数の外部化
   - SSL証明書設定
   - レート制限の調整
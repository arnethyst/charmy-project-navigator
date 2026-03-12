# Charmy Project

このプロジェクトは [Next.js](https://nextjs.org) で構築されたタスク管理システムです。ガントチャート、カンバンボード、メンション機能、通知機能などを備えています。

## 🚀 セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーし、必要な値を設定してください。

```bash
cp .env.example .env
```

特に `DATABASE_URL` と `NEXTAUTH_SECRET` の設定が必要です。

### 3. データベースのセットアップ (Prisma)

Prisma を使用してデータベーススキーマを反映し、初期データを投入します。

```bash
# スキーマの反映
npx prisma db push

# 初期データ (シード) の投入
npx prisma db seed
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いて確認してください。

## 🛠 主な機能

- **ガントチャート**: タスクのスケジュールを視覚化。ドラッグ＆ドロップで期間調整可能。
- **カンバンボード**: タスクのステータスを直感的に管理。
- **メンション機能**: コメント内で `@ユーザー名` を使用して通知。
- **通知システム**: 自分に関連する変更やコメントをリアルタイムで通知。

## 🌐 Vercel へのデプロイ

1. **データベースの準備**: Supabase や Vercel Postgres などのホストされた PostgreSQL データベースを用意します。
2. **Vercel プロジェクトの作成**: GitHub 連携または CLI からプロジェクトをアップロードします。
3. **環境変数の設定**: Vercel の管理画面で `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` を設定します。
4. **ビルド設定**: `Install Command` は `npm install`、`Build Command` は `npx prisma generate && next build` としてください。

## 📝 ライセンス

このプロジェクトの開発は .athyst と Antigravity によって行われました。

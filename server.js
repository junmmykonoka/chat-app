// server.js
const express = require('express');
const { Client } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // RenderではPORTを環境変数から取得

app.use(express.json());

// DATABASE_URL が設定されているかチェック
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => {
    console.error('❌ Connection error', err);
    process.exit(1);
  });

// 静的ファイルやHTMLの配信
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/message', async (req, res) => {
  const { message } = req.body;
  try {
    await client.query('INSERT INTO messages (content) VALUES ($1)', [message]);
    res.status(200).send('メッセージをデータベースに保存しました');
  } catch (err) {
    console.error('❌ Error inserting message', err);
    res.status(500).send('メッセージの保存中にエラーが発生しました');
  }
});

app.get('/messages', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM messages ORDER BY created_at ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching messages', err);
    res.status(500).send('メッセージの取得中にエラーが発生しました');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});

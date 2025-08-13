// server.js
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

// --- 修正点1: 静的ファイルの配信をpublicディレクトリに設定 ---
// この行を追加することで、publicフォルダ内のファイルが自動的に配信されます
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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

// --- 修正点2: ルートエンドポイントの変更 ---
// publicフォルダ内のindex.htmlが自動で配信されるため、この行は不要になります
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// --- 修正点3: /registerへのGETリクエストは不要 ---
// app.get('/register', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'register.html'));
// });

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hashedPassword]);
        
        // 登録成功後にルート（トップページ）にリダイレクトする
        res.redirect('/'); 

    } catch (err) {
        console.error('❌ Error registering user', err);
        res.status(500).send('ユーザー登録中にエラーが発生しました');
    }
});

// ... 既存の /message と /messages エンドポイントはそのまま

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
// server.js
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

const session = require('express-session');

// `express-session`の設定
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// publicディレクトリ内の静的ファイルを配信
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

// ユーザー登録エンドポイント
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hashedPassword]);
        res.redirect('/'); 
    } catch (err) {
        console.error('❌ Error registering user', err);
        res.status(500).send('ユーザー登録中にエラーが発生しました');
    }
});

// ✅ ログインエンドポイント（重複を解消）
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Login attempt for user:', username);

        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password_hash)) {
            console.log('Authentication successful for user:', username);
            req.session.userId = user.id;
            res.redirect('/');
        } else {
            console.log('Authentication failed for user:', username);
            res.status(401).send('ログイン失敗: ユーザー名またはパスワードが間違っています。');
        }
    } catch (err) {
        console.error('❌ Error during login', err);
        res.status(500).send('ログイン中にエラーが発生しました');
    }
});

// メッセージ取得エンドポイント
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
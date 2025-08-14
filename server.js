const express = require('express');
const { Client } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// セッション設定
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// 静的ファイル配信
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// DB接続
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => {
    console.error('❌ Connection error', err);
    process.exit(1);
  });

// ログイン確認のミドルウェア
const requireLogin = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login.html');
  }
};

// トップページへのアクセスにログインを要求
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ ログインページへの明示的なルートを追加
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ユーザー登録ページへの明示的なルートを追加
app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// ユーザー登録処理
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, hashedPassword]
    );
    res.redirect('/login.html');
  } catch (err) {
    console.error('❌ Error registering user', err);
    res.status(500).send('ユーザー登録中にエラーが発生しました');
  }
});

// ログイン処理
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.userId = user.id;
      res.redirect('/');
    } else {
      res.status(401).send('ログイン失敗: ユーザー名またはパスワードが間違っています。');
    }
  } catch (err) {
    console.error('❌ Error during login', err);
    res.status(500).send('ログイン中にエラーが発生しました');
  }
});

// メッセージ投稿
app.post('/message', requireLogin, async (req, res) => {
    const { message } = req.body;
    const userId = req.session.userId; // ログインユーザーのIDを取得
  
    try {
      await client.query(
        'INSERT INTO messages (content, user_id) VALUES ($1, $2)',
        [message, userId] // user_idも保存する
      );
      res.status(201).send('メッセージが正常に投稿されました');
    } catch (err) {
      console.error('❌ Error saving message', err);
      res.status(500).send('メッセージの投稿中にエラーが発生しました');
    }
  });

// メッセージ取得
app.get('/messages', requireLogin, async (req, res) => {
    try {
      const result = await client.query(
        `SELECT m.content, u.username
         FROM messages m
         INNER JOIN users u ON m.user_id = u.id
         ORDER BY m.created_at ASC`
      );
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('❌ Error fetching messages', err);
      res.status(500).send('メッセージの取得中にエラーが発生しました');
    }
  });

// ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('ログアウト中にエラーが発生しました');
    }
    res.redirect('/login.html');
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});
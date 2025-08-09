// server.js
const express = require('express');
const { Client } = require('pg');

const app = express();
const port = 3000;

app.use(express.json());

const connectionString = process.env.DATABASE_URL;  'postgresql://chat_db_nezq_user:KcMxA6BB2ql4wcN26cuNydgJalo4cxOz@dpg-d2bg80be5dus7387nk7g-a.oregon-postgres.render.com/chat_db_nezq';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error', err));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
  
app.post('/message', async (req, res) => {
    const { message } = req.body;
    try {
        await client.query('INSERT INTO messages (content) VALUES ($1)', [message]);
        res.status(200).send('メッセージをデータベースに保存しました');
    } catch (err) {
        console.error('Error inserting message', err);
        res.status(500).send('メッセージの保存中にエラーが発生しました');
    }
});

app.get('/messages', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM messages ORDER BY created_at ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching messages', err);
        res.status(500).send('メッセージの取得中にエラーが発生しました');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
const express = require('express');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  console.log('Scan QR dengan WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Client Ready!');
});

client.initialize();

const secretKey = 'SDgyueo';
const otpStore = {};

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
}

function decrypt(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Kirim OTP via WhatsApp
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);
  const message = `Kode OTP Whatscl Anda: ${otp}`;
  try {
    await client.sendMessage(`${phone}@c.us`, message);
    otpStore[phone] = otp;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Verifikasi OTP
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] == otp) {
    res.json({ success: true, token: encrypt(phone) });
  } else {
    res.json({ success: false });
  }
});

// Login admin
app.post('/api/admin-login', (req, res) => {
  const { code } = req.body;
  if (code === 'SDgyueo') {
    res.json({ success: true, token: encrypt('admin') });
  } else {
    res.json({ success: false });
  }
});

// Ambil semua chat (admin only)
app.get('/api/chats', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (decrypt(token) !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });

  try {
    const chats = await client.getChats();
    const data = chats.map(c => ({
      name: c.name || c.id.user,
      lastMessage: c.lastMessage?.body || '',
      id: c.id._serialized
    }));
    res.json(data);
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = app;

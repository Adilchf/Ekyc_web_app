const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const app = express();
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ekyc',
  password: 'adel2003',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadDir = path.join(__dirname, 'uploads');

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer configuration for storing files locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });


app.post('/save-id-card', upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'frontFace', maxCount: 1 },
  { name: 'selfieFace', maxCount: 1 }]), async (req, res) => {
  try {
    const { identityNumber, cardNumber, expiryDate, birthdate, familyName, givenName,document_type } = req.body;

    const frontImageUrl = req.files['frontImage'] ? `/uploads/${req.files['frontImage'][0].filename}` : null;

    const frontFaceUrl = req.files['frontFace'] ? `/uploads/${req.files['frontFace'][0].filename}` : null;
    const selfieFaceUrl = req.files['selfieFace'] ? `/uploads/${req.files['selfieFace'][0].filename}` : null;

    const result = await pool.query(
      `INSERT INTO id_cards (identity_number, card_number, expiry_date, birthdate, family_name, given_name, front_image_url, front_face_url, selfie_face_url, document_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8 , $9, $10) RETURNING *`,
      [identityNumber, cardNumber, expiryDate, birthdate, familyName, givenName, frontImageUrl, frontFaceUrl, selfieFaceUrl, document_type]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error saving data:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});


app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

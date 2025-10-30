const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Math API is running!',
    endpoints: {
      add: 'POST /add with {num1: number, num2: number}',
      history: 'GET /history'
    }
  });
});

// ADD - Add two numbers
app.post('/add', async (req, res) => {
  try {
    const { num1, num2 } = req.body;
    
    // Validate inputs
    if (typeof num1 !== 'number' || typeof num2 !== 'number') {
      return res.status(400).json({ 
        error: 'Please provide two numbers (num1 and num2)' 
      });
    }
    
    // Calculate result
    const result = num1 + num2;
    
    // Save to Firebase
    const calculation = {
      num1,
      num2,
      result,
      operation: 'addition',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('calculations').add(calculation);
    
    // Return result
    res.json({
      num1,
      num2,
      result,
      message: `${num1} + ${num2} = ${result}`,
      calculationId: docRef.id
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET HISTORY - View all past calculations
app.get('/history', async (req, res) => {
  try {
    const snapshot = await db.collection('calculations')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const calculations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      calculations.push({
        id: doc.id,
        num1: data.num1,
        num2: data.num2,
        result: data.result,
        timestamp: data.timestamp
      });
    });
    
    res.json({
      count: calculations.length,
      calculations
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET SPECIFIC CALCULATION
app.get('/calculation/:id', async (req, res) => {
  try {
    const doc = await db.collection('calculations').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Calculation not found' });
    }
    
    const data = doc.data();
    res.json({
      id: doc.id,
      num1: data.num1,
      num2: data.num2,
      result: data.result,
      timestamp: data.timestamp
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Math API running on port ${PORT}`);
});
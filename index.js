const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Routes

// Test route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Math API is running!',
    endpoints: {
      math: 'POST /api/math with {num1: number, num2: number, operation: "add|subtract|multiply|divide"}',
      history: 'GET /api/history',
      calculation: 'GET /api/calculation/:id'
    }
  });
});

// MATH - Single endpoint for all operations
app.post('/api/math', async (req, res) => {
  try {
    const { num1, num2, operation } = req.body;
    
    // Validate inputs
    if (typeof num1 !== 'number' || typeof num2 !== 'number') {
      return res.status(400).json({ 
        error: 'Please provide two numbers (num1 and num2)' 
      });
    }
    
    if (!operation) {
      return res.status(400).json({ 
        error: 'Please provide an operation (add, subtract, multiply, divide)' 
      });
    }
    
    let result;
    let operationSymbol;
    let operationName;
    
    // Perform the operation
    switch(operation.toLowerCase()) {
      case 'add':
      case 'addition':
        result = num1 + num2;
        operationSymbol = '+';
        operationName = 'addition';
        break;
        
      case 'subtract':
      case 'subtraction':
        result = num1 - num2;
        operationSymbol = '-';
        operationName = 'subtraction';
        break;
        
      case 'multiply':
      case 'multiplication':
        result = num1 * num2;
        operationSymbol = '×';
        operationName = 'multiplication';
        break;
        
      case 'divide':
      case 'division':
        if (num2 === 0) {
          return res.status(400).json({ 
            error: 'Cannot divide by zero!' 
          });
        }
        result = num1 / num2;
        operationSymbol = '÷';
        operationName = 'division';
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Invalid operation. Use: add, subtract, multiply, or divide' 
        });
    }
    
    // Save to Firebase
    const calculation = {
      num1,
      num2,
      result,
      operation: operationName,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('calculations').add(calculation);
    
    // Return result
    res.json({
      num1,
      num2,
      operation: operationName,
      result,
      message: `${num1} ${operationSymbol} ${num2} = ${result}`,
      calculationId: docRef.id
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET HISTORY - View all past calculations
app.get('/api/history', async (req, res) => {
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
        operation: data.operation,
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
app.get('/api/calculation/:id', async (req, res) => {
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
      operation: data.operation,
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
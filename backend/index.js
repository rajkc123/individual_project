// index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();  // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 5000; // Uses PORT from .env

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send('Backend is running...');
});

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Upload route that forwards the file to the Python service
app.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;

        // Create a form-data object to send the file
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(filePath));

        // Send the file to the Python Flask service running on FLASK_PORT (localhost:8000)
        const pythonResponse = await axios.post('http://localhost:8000/transcribe', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // Forward the Python service response back to the client
        res.status(200).json({
            message: 'File processed successfully',
            analysis: pythonResponse.data
        });
    } catch (err) {
        console.error('Error processing file:', err.message);
        res.status(500).json({ error: 'An error occurred while processing the file.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

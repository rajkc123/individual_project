const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    userId: { type: String },
    transcribedText: { type: String },
    posCounts: { type: Object },
    namedEntities: { type: Array },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', ResultSchema);

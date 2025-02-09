// src/Practice.jsx
// NEED TO MAKE BETTER UI USING CSS
//


import React, { useState, useRef } from "react";
import { submitAudio } from "./Api";

const Practice = () => {
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const audioRef = useRef(null);

    const startRecording = async () => {
        try {
            // Request access to the microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            setAudioChunks([]);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setAudioChunks((prev) => [...prev, event.data]);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: "audio/webm" });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };

            recorder.start();
            setRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access your microphone. Please check your permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
        }
    };

    const handleRecordClick = () => {
        if (!recording) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    const handleSubmit = async () => {
        if (audioChunks.length === 0) {
            alert("No audio recorded!");
            return;
        }
        // Create the Blob from recorded chunks
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        setLoading(true);
        try {
            const data = await submitAudio(audioBlob);
            // The backend response is expected to have an "analysis" key.
            setResults(data.analysis);
        } catch (error) {
            console.error("Error submitting audio:", error);
            alert("Error submitting audio.");
        }
        setLoading(false);
    };

    return (
        <div className="container" style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
            <h1>Speaking Evaluation</h1>

            {/* Question Prompt */}
            <div className="question" style={{ marginBottom: "20px" }}>
                <p>
                    <strong>Question:</strong> Speak about the overall experience you have faced while completing your final year project. What are the difficulties you have faced and how have you dealt with it?
                </p>
            </div>

            {/* Recording Controls */}
            <div style={{ marginBottom: "20px" }}>
                <button onClick={handleRecordClick}>
                    {recording ? "Stop Recording" : "Start Recording"}
                </button>
                {recording && <span style={{ marginLeft: "10px", color: "red" }}>Recording...</span>}
            </div>

            {/* Audio Playback */}
            {audioUrl && (
                <div style={{ marginBottom: "20px" }}>
                    <audio src={audioUrl} controls ref={audioRef} />
                </div>
            )}

            {/* Submit Button */}
            <div style={{ marginBottom: "20px" }}>
                <button onClick={handleSubmit} disabled={!audioUrl || loading}>
                    Submit for Evaluation
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div style={{ marginBottom: "20px" }}>
                    <span>Processing audio, please wait...</span>
                </div>
            )}

            {/* Results Display */}
            {results && (
                <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
                    <h2>Evaluation Results</h2>
                    <p><strong>Transcribed Text:</strong> {results.transcribed_text}</p>
                    <p><strong>Pronunciation Score:</strong> {results.scores.pronunciation}</p>
                    <p><strong>Fluency Score:</strong> {results.scores.fluency}</p>
                    <p><strong>Coherence Score:</strong> {results.scores.coherence}</p>
                    <p><strong>Grammar Score:</strong> {results.scores.grammar}</p>
                    <p><strong>Content Score:</strong> {results.scores.content}</p>
                    <p><strong>Overall Score:</strong> {results.scores.overall}</p>
                </div>
            )}
        </div>
    );
};

export default Practice;

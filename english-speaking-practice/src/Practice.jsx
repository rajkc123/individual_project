// src/Practice.jsx
import React, { useEffect, useRef, useState } from "react";
import { submitAudio } from "./Api";
import "./Practice.css";

const Practice = () => {
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [timerId, setTimerId] = useState(null);

    const audioRef = useRef(null);
    // We'll use a local variable to store audio chunks.
    let chunks = [];

    // Timer effect: When recording starts, begin countdown from 60 seconds.
    useEffect(() => {
        if (recording) {
            setTimeLeft(15);
            const id = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(id);
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            setTimerId(id);
        } else {
            if (timerId) {
                clearInterval(timerId);
                setTimerId(null);
            }
        }
        // Cleanup on unmount:
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [recording]);

    const startRecording = async () => {
        try {
            // Clear any previous recording data
            setAudioUrl(null);
            setResults(null);
            chunks = []; // reset local chunks array

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
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
        if (mediaRecorder && recording) {
            mediaRecorder.stop();
            setRecording(false);
        }
    };

    const handleRecordClick = () => {
        if (!recording) {
            startRecording();
        }
        // While recording, manual stop is disabled.
    };

    const handleTryAgain = () => {
        if (recording && mediaRecorder) {
            mediaRecorder.stop();
        }
        // Reset everything for a new recording session
        setRecording(false);
        setAudioUrl(null);
        setResults(null);
        setTimeLeft(15);
        if (timerId) {
            clearInterval(timerId);
            setTimerId(null);
        }
        chunks = []; // Clear the local chunks array as well
    };

    const handleSubmit = async () => {
        if (!audioUrl) {
            alert("No audio recorded!");
            return;
        }
        // Fetch the Blob from the current audioUrl by using fetch (optional alternative)
        // Alternatively, you can create the blob from the local chunks if you still have them.
        const response = await fetch(audioUrl);
        const blob = await response.blob();

        setLoading(true);
        try {
            const data = await submitAudio(blob);
            // Expecting evaluation results under data.analysis.
            setResults(data.analysis);
        } catch (error) {
            console.error("Error submitting audio:", error);
            alert("Error submitting audio.");
        }
        setLoading(false);
    };

    // Helper function to render an animated score bar.
    const renderScoreBar = (label, score) => {
        const percentage = (score / 10) * 100;
        const barColor = score < 4 ? "#dc3545" : "#28a745"; // red if score below 4, green otherwise
        return (
            <div className="score-bar-container" key={label}>
                <div className="score-label">
                    {label} ({score.toFixed(1)}/10)
                </div>
                <div className="score-bar">
                    <div
                        className="score-fill"
                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                    ></div>
                </div>
            </div>
        );
    };

    return (
        <div className="container">
            <h1>Speaking Evaluation</h1>

            {/* Question Prompt */}
            <div className="question">
                <p>
                    <strong>Question:</strong> Speak about the overall experience you have faced while completing your final year project.
                    What are the difficulties you have faced and how have you dealt with it?
                </p>
            </div>

            {/* Recording Controls */}
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <button onClick={handleRecordClick} disabled={recording}>
                    {recording ? "Recording (Auto-stop at 1 min)" : "Start Recording"}
                </button>
                {recording && (
                    <>
                        <span className="recording-status">Recording...</span>
                        <div className="timer">Time Left: {timeLeft}s</div>
                    </>
                )}
            </div>

            {/* Try Again Button (visible while recording) */}
            {recording && (
                <div style={{ marginBottom: "20px", textAlign: "center" }}>
                    <button className="try-again-button" onClick={handleTryAgain}>
                        Try Again
                    </button>
                </div>
            )}

            {/* Audio Playback */}
            {audioUrl && (
                <div style={{ marginBottom: "20px" }}>
                    <audio src={audioUrl} controls ref={audioRef} />
                </div>
            )}

            {/* Submit Button */}
            <div className="submit-container">
                <button onClick={handleSubmit} disabled={!audioUrl || loading || recording}>
                    Submit for Evaluation
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div className="loading-indicator">
                    <span>Processing audio, please wait...</span>
                </div>
            )}

            {/* Results Display */}
            {results && (
                <div className="results-card">
                    <h2>Evaluation Results</h2>
                    {renderScoreBar("Pronunciation Score", results.scores.pronunciation)}
                    {renderScoreBar("Fluency Score", results.scores.fluency)}
                    {renderScoreBar("Grammar Score", results.scores.grammar)}
                    {renderScoreBar("Content Score", results.scores.content)}
                    {renderScoreBar("Overall Score", results.scores.overall)}
                    <div style={{ marginTop: "15px" }}>
                        <strong>Transcribed Text:</strong>
                        <p>{results.transcribed_text}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Practice;

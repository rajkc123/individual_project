// src/Practice.jsx

import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Typography,
} from "@mui/material";
import React, { useRef, useState } from "react";
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
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        setLoading(true);
        try {
            const data = await submitAudio(audioBlob);
            // Your backend response is expected to have the evaluation inside data.analysis.
            setResults(data.analysis);
        } catch (error) {
            console.error("Error submitting audio:", error);
            alert("Error submitting audio.");
        }
        setLoading(false);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h3" align="center" gutterBottom>
                Speaking Evaluation
            </Typography>

            {/* Question Card */}
            <Card sx={{ mb: 3, boxShadow: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Question
                    </Typography>
                    <Typography variant="body1">
                        Speak about the overall experience you have faced while completing your final year project.
                        What are the difficulties you have faced and how have you dealt with it?
                    </Typography>
                </CardContent>
            </Card>

            {/* Recording Section */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
                <Button
                    variant="contained"
                    color={recording ? "error" : "primary"}
                    onClick={handleRecordClick}
                    startIcon={recording ? <StopIcon /> : <MicIcon />}
                    sx={{ mb: 2 }}
                >
                    {recording ? "Stop Recording" : "Start Recording"}
                </Button>
                {recording && (
                    <Typography variant="subtitle1" color="error" sx={{ mb: 2 }}>
                        Recording...
                    </Typography>
                )}
                {audioUrl && (
                    <Box sx={{ my: 2, width: "100%" }}>
                        <audio src={audioUrl} controls ref={audioRef} style={{ width: "100%" }} />
                    </Box>
                )}
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleSubmit}
                    disabled={!audioUrl || loading}
                    sx={{ mt: 2 }}
                >
                    Submit for Evaluation
                </Button>
                {loading && (
                    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Processing audio, please wait...
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Results Display */}
            {results && (
                <Card sx={{ mb: 3, boxShadow: 3 }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Evaluation Results
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Transcribed Text:</strong> {results.transcribed_text}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Pronunciation Score:</strong> {results.scores.pronunciation}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Fluency Score:</strong> {results.scores.fluency}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Coherence Score:</strong> {results.scores.coherence}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Grammar Score:</strong> {results.scores.grammar}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Content Score:</strong> {results.scores.content}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Overall Score:</strong> {results.scores.overall}
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
};

export default Practice;

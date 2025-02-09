// src/Api.js

export const submitAudio = async (audioBlob) => {
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    // Send the POST request to your Node.js backend
    const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to submit audio");
    }

    return response.json();
};

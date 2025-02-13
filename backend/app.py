import os
import re
import json
import subprocess
import tempfile
from collections import Counter

import numpy as np
import librosa
import language_tool_python
import nltk
import spacy
import whisper
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from nltk import pos_tag
from nltk.tokenize import word_tokenize
from sentence_transformers import SentenceTransformer, util

# Download required NLTK data (if not already downloaded)
nltk.download('punkt_tab', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger_eng', quiet=True)

# Load environment variables from .env
load_dotenv()

# Add ffmpeg bin folder to the PATH so subprocess can find it.
# Adjust the path if necessary.
os.environ["PATH"] += os.pathsep + r"C:\Users\ACER\Downloads\ffmpeg-2025-02-06-git-6da82b4485-full_build\ffmpeg-2025-02-06-git-6da82b4485-full_build\bin"
print("Current PATH:", os.environ["PATH"])  # Optional: for debugging

# Monkey-patch ctypes.util.find_library for Windows
import ctypes.util
original_find_library = ctypes.util.find_library
def patched_find_library(name):
    result = original_find_library(name)
    if result is None and name == "c":
        return "msvcrt.dll"
    return result
ctypes.util.find_library = patched_find_library

# Create the Flask app
app = Flask(__name__)

# Load NLP and speech recognition models
nlp = spacy.load("en_core_web_sm")
model = whisper.load_model("small")  # You can change to "small", "medium", or "large" as needed

# Evaluation Functions

def evaluate_pronunciation(result):
    """
    Evaluate pronunciation using Whisper's segment-level confidence (avg_logprob).
    
    We calculate a base score from the average log probability and scale it by the ratio
    of "good" segments (those with avg_logprob > -1.5).
    """
    segments = result.get("segments", [])
    if not segments:
        return 0.0

    total_logprob = 0
    good_segments = 0
    total_segments = len(segments)
    threshold = -1.5  # Threshold for a "good" segment

    for seg in segments:
        lp = seg.get("avg_logprob", -3)  # Default to -3 if not provided
        total_logprob += lp
        if lp > threshold:
            good_segments += 1

    avg_logprob = total_logprob / total_segments
    base_score = (avg_logprob + 2) * 5  # Mapping: e.g., -1 maps to 5
    base_score = max(0, min(10, base_score))
    ratio = good_segments / total_segments
    final_score = base_score * ratio
    final_score = max(0, min(10, final_score))
    return final_score

def evaluate_fluency(audio_path, transcript):
    """
    Evaluate fluency by calculating words per minute (wpm) compared to an ideal rate (140 wpm).
    """
    try:
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
    except Exception as e:
        duration = 0

    num_words = len(transcript.split())
    wpm = num_words / (duration / 60) if duration > 0 else 0

    if wpm <= 0:
        return 0
    else:
        fluency_score = 10 - (abs(140 - wpm) / 4)
        fluency_score = max(0, min(10, fluency_score))
        return fluency_score

def evaluate_content(transcript, question):
    """
    Evaluate content using a simple keyword matching heuristic.
    """
    question_lower = question.lower()
    transcript_lower = transcript.lower()
    question_words = re.findall(r'\b\w+\b', question_lower)
    stopwords = {"the", "is", "a", "an", "in", "on", "at", "of", "and", "to", "for", "with", "that", "this", "about"}
    keywords = [word for word in question_words if word not in stopwords]
    transcript_words = re.findall(r'\b\w+\b', transcript_lower)
    matched_keywords = set(keywords) & set(transcript_words)
    if keywords:
        score = (len(matched_keywords) / len(keywords)) * 10
    else:
        score = 0
    return max(0, min(10, score))

def evaluate_grammar(transcript):
    """
    Evaluate grammatical correctness using language_tool_python.
    """
    tool = language_tool_python.LanguageTool('en-US')
    matches = tool.check(transcript)
    num_words = len(transcript.split())
    error_rate = len(matches) / num_words if num_words > 0 else 0
    grammar_score = max(0, 10 - (error_rate * 100))
    grammar_score = min(10, grammar_score)
    return grammar_score

def evaluate_overall(pronunciation, fluency, content, grammar):
    """
    Compute the overall score as the average of the individual scores.
    """
    overall = (pronunciation + fluency + content + grammar) / 4
    return overall

# Transcription Endpoint

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    audio_path = "uploaded_audio.wav"
    audio_file.save(audio_path)

    # Transcribe the audio using Whisper
    result = model.transcribe(audio_path, language="en")
    transcript = result.get("text", "")

    # NLP analysis
    tokens = word_tokenize(transcript)
    pos_tags = pos_tag(tokens)
    pos_counts = dict(Counter(tag for word, tag in pos_tags))
    doc = nlp(transcript)
    named_entities = [(ent.text, ent.label_) for ent in doc.ents]

    # Evaluate scores
    pronunciation_score = evaluate_pronunciation(result)
    fluency_score = evaluate_fluency(audio_path, transcript)
    grammar_score = evaluate_grammar(transcript)
    question_prompt = (
        "Speak about the historical place you have recently visited. "
        "What do you like about that place and why? Speak for 1 minute."
    )
    content_score = evaluate_content(transcript, question_prompt)
    overall_score = evaluate_overall(pronunciation_score, fluency_score, content_score, grammar_score)

    return jsonify({
        "transcribed_text": transcript,
        "tokens": tokens,
        "pos_tags": pos_tags,
        "pos_counts": pos_counts,
        "named_entities": named_entities,
        "scores": {
            "pronunciation": pronunciation_score,
            "fluency": fluency_score,
            "grammar": grammar_score,
            "content": content_score,
            "overall": overall_score
        }
    })

if __name__ == '__main__':
    flask_port = int(os.getenv("FLASK_PORT", 8000))
    flask_debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    app.run(port=flask_port, debug=flask_debug)

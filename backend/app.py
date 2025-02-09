import nltk

# Download 'punkt_tab' if it isn't available (for development purposes)
nltk.download('punkt_tab', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger_eng', quiet=True)

# app.py
import os

from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env

# Add ffmpeg bin folder to the PATH so subprocess can find it
os.environ["PATH"] += os.pathsep + r"C:\Users\ACER\Downloads\ffmpeg-2025-02-06-git-6da82b4485-full_build\ffmpeg-2025-02-06-git-6da82b4485-full_build\bin"
print("Current PATH:", os.environ["PATH"])  # Optional: for debugging

import ctypes.util

# Monkey-patch ctypes.util.find_library to handle Windows
original_find_library = ctypes.util.find_library
def patched_find_library(name):
    result = original_find_library(name)
    if result is None and name == "c":
        return "msvcrt.dll"
    return result
ctypes.util.find_library = patched_find_library

import re
from collections import Counter

import language_tool_python
import librosa
import nltk
import numpy as np
import spacy
import whisper
from flask import Flask, jsonify, request
from nltk import pos_tag
from nltk.tokenize import word_tokenize
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)

# Load NLP and speech recognition models
nlp = spacy.load("en_core_web_sm")
model = whisper.load_model("small")  # Change to "small", "medium", or "large" as needed


import os

import language_tool_python
import librosa
import nltk
import numpy as np
from sentence_transformers import SentenceTransformer, util

# Download necessary NLTK data (if not already downloaded)
nltk.download('punkt', quiet=True)



#----------------Evaluation functions---------------------------------------

def evaluate_pronunciation(audio_path):
    """
    Placeholder for a pronunciation evaluation.
    In a real system, you might use forced alignment or analyze phoneme probabilities.
    For this demo, we return a dummy value.
    """
    # For example, if you could extract confidence scores from Whisper,
    # you might map them to a score. Here we simply return a fixed value.
    return 7.0  # out of 10

def evaluate_fluency(audio_path, transcript):
    """
    Evaluate fluency by comparing the speech rate (words per minute) with an ideal range.
    """
    try:
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)  # duration in seconds
    except Exception as e:
        duration = 0

    num_words = len(transcript.split())
    # Avoid division by zero
    wpm = num_words / (duration / 60) if duration > 0 else 0

    # Heuristic: assume an ideal speaking rate around 140 wpm.
    # For simplicity, we map rates closer to 140 to higher scores.
    if wpm <= 0:
        fluency_score = 0
    else:
        # A simple scaling: subtract the absolute difference from 10,
        # divided by a factor to adjust sensitivity.
        fluency_score = 10 - (abs(140 - wpm) / 4)
        fluency_score = max(0, min(10, fluency_score))
    return fluency_score

def evaluate_coherence(transcript):
    """
    Evaluate coherence by computing the similarity between consecutive sentences.
    We use a pre-trained sentence transformer to obtain sentence embeddings.
    """
    # Split the transcript into sentences
    sentences = nltk.tokenize.sent_tokenize(transcript)
    if len(sentences) < 2:
        return 10.0  # With only one sentence, we assume perfect coherence.
    
    # Use a light-weight sentence transformer model.
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(sentences)
    
    similarities = []
    for i in range(len(embeddings) - 1):
        sim = util.cos_sim(embeddings[i], embeddings[i + 1]).item()
        similarities.append(sim)
    
    # Average similarity (ranges from 0 to 1)
    avg_similarity = np.mean(similarities) if similarities else 1.0
    # Map similarity to a score out of 10
    coherence_score = avg_similarity * 10
    return coherence_score


def evaluate_content(transcript, question):
    """
    Evaluates the content of the transcript relative to the question prompt
    using a simple keyword matching heuristic.
    
    Args:
        transcript (str): The transcribed text from the user's speech.
        question (str): The prompt or question that the user is expected to answer.
        
    Returns:
        float: A score between 0 and 10 indicating how well the transcript addresses the prompt.
    """
    # Convert both strings to lowercase for case-insensitive matching
    question_lower = question.lower()
    transcript_lower = transcript.lower()
    
    # Extract words from the question using regex
    question_words = re.findall(r'\b\w+\b', question_lower)
    
    # Define a set of common stopwords to ignore (expand this list as needed)
    stopwords = {"the", "is", "a", "an", "in", "on", "at", "of", "and", "to", "for", "with", "that", "this", "about"}
    
    # Filter out stopwords to get keywords
    keywords = [word for word in question_words if word not in stopwords]
    
    # Extract words from the transcript similarly
    transcript_words = re.findall(r'\b\w+\b', transcript_lower)
    
    # Count how many keywords appear in the transcript
    matched_keywords = set(keywords) & set(transcript_words)
    
    # Compute the score as the ratio of matched keywords to total keywords (scale to 10)
    if keywords:
        score = (len(matched_keywords) / len(keywords)) * 10
    else:
        score = 0
        
    # Ensure the score is within 0 to 10
    return max(0, min(10, score))


def evaluate_grammar(transcript):
    """
    Evaluate grammatical correctness using language_tool_python.
    This tool checks for grammatical errors. We then compute an error rate per word.
    """
    tool = language_tool_python.LanguageTool('en-US')
    matches = tool.check(transcript)
    num_words = len(transcript.split())
    error_rate = len(matches) / num_words if num_words > 0 else 0
    # Heuristic: fewer errors result in a higher score.
    # For instance, if error_rate is 0 (no errors), score is 10.
    # We subtract a scaled error rate from 10.
    grammar_score = max(0, 10 - (error_rate * 100))  # Adjust scaling as needed
    grammar_score = min(10, grammar_score)
    return grammar_score

def evaluate_overall(pronunciation, fluency, coherence, grammar):
    """
    Compute an overall score as a simple average of the sub-scores.
    You could also use weighted averages.
    """
    overall = (pronunciation + fluency + coherence + grammar) / 4
    return overall




@app.route('/transcribe', methods=['POST'])
def transcribe():
    # Ensure the file is present in the request
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    audio_path = "uploaded_audio.wav"
    audio_file.save(audio_path)

    # Transcribe the audio using Whisper
    result = model.transcribe(audio_path)
    transcript = result.get("text", "")

    # Perform NLP analysis using NLTK and SpaCy
    tokens = word_tokenize(transcript)
    pos_tags = pos_tag(tokens)
    pos_counts = dict(Counter(tag for word, tag in pos_tags))
    doc = nlp(transcript)
    named_entities = [(ent.text, ent.label_) for ent in doc.ents]

    # Evaluate other aspects (assuming you have these functions already defined)
    pronunciation_score = evaluate_pronunciation(audio_path)  # Currently static placeholder
    fluency_score = evaluate_fluency(audio_path, transcript)
    coherence_score = evaluate_coherence(transcript)
    grammar_score = evaluate_grammar(transcript)
    
    # Define the expected question prompt
    question_prompt = (
        "Speak about the historical place you have recently visited. "
        "What do you like about that place and why? Speak for 1 minute."
    )
    
    # Evaluate the content against the question prompt
    content_score = evaluate_content(transcript, question_prompt)
    
    # Optionally, you could update the overall score to factor in content.
    # For now, we'll keep the overall score as a simple average of the other scores.
    overall_score = (pronunciation_score + fluency_score + coherence_score + grammar_score + content_score) / 5

    # Return the analysis and scores as JSON
    return jsonify({
        "transcribed_text": transcript,
        "tokens": tokens,
        "pos_tags": pos_tags,
        "pos_counts": pos_counts,
        "named_entities": named_entities,
        "scores": {
            "pronunciation": pronunciation_score,
            "fluency": fluency_score,
            "coherence": coherence_score,
            "grammar": grammar_score,
            "content": content_score,
            "overall": overall_score
        }
    })



if __name__ == '__main__':
    # Read Flask configuration from environment variables
    flask_port = int(os.getenv("FLASK_PORT", 8000))
    flask_debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    app.run(port=flask_port, debug=flask_debug)

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import faiss
import numpy as np
from py2neo import Graph
from llama_cpp import Llama
import requests
from bs4 import BeautifulSoup
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
print(os.getcwd())
load_dotenv(Path(os.getcwd()+"/.env"))

origins = [
    "http://localhost:3000"
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load PsychBERT for Emotion Detection
psychbert = pipeline("text-classification", model="bhadresh-savani/bert-base-uncased-emotion")

# Load FAISS for semantic search
dimension = 768  # Adjust based on embeddings used
faiss_index = faiss.IndexFlatL2(dimension)

# Connect to Neo4j for knowledge graph retrieval
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
print(f"NEO4J_URI: {repr(NEO4J_URI)}")
print(f"NEO4J_USER: {repr(NEO4J_USER)}")
print(f"NEO4J_PASSWORD: {repr(NEO4J_PASSWORD)}")
graph = Graph(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Load LLaMA-3 for response generation
llm = Llama.from_pretrained(
    repo_id="Qwen/Qwen2-0.5B-Instruct-GGUF",
    filename="*q8_0.gguf",
    verbose=False

)  # Replace with actual path


# Define request models
class TextRequest(BaseModel):
    text: str


# Function to fetch mental health documents online
def fetch_online_documents():
    url = "https://www.mentalhealth.org.uk/a-to-z"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    documents = [article.text.strip() for article in soup.find_all("h3")]  # Example parsing
    return documents

@app.post("/analyze_emotion")
async def analyze_emotion(request: TextRequest):
    """Detects emotions in user text using PsychBERT."""
    result = psychbert(request.text)
    emotion = result[0]["label"]
    return {"emotion": emotion}

@app.post("/retrieve_knowledge")
async def retrieve_knowledge(request: TextRequest):
    """Retrieves relevant mental health resources from FAISS & Neo4j."""
    emotion_result = await analyze_emotion(request)
    emotion = emotion_result["emotion"]

    # Fetch online documents & generate embeddings dynamically
    documents = fetch_online_documents()
    query_embedding = np.random.rand(dimension).astype("float32")  # Replace with actual embeddings
    D, I = faiss_index.search(np.array([query_embedding]), k=5)  # Get top 5 results
    
    # Retrieve structured data based on emotion
    query = "MATCH (n) WHERE n.topic = $topic RETURN n.description"
    results = graph.run(query, topic=emotion).data()
    
    return {"faiss_results": I.tolist(), "neo4j_results": results}

@app.post("/generate_response")
async def generate_response(request: TextRequest):
    """Generates empathetic responses using LLaMA-3."""
    prompt = f"User Emotion: {request.text}\nAI Response:"
    response = llm(prompt, max_tokens=100)
    return {"response": response["choices"][0]["text"]}
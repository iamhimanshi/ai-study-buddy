import os
import uuid
import shutil
import re
from datetime import datetime
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import fitz
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not found in .env file")
    GROQ_API_KEY = "dummy_key"

groq_client = Groq(api_key=GROQ_API_KEY)

print("📥 Loading sentence transformer model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Model loaded successfully!")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

users_db = {}
pdfs_db = {}
sessions = {}
faiss_indices = {}

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    pdf_id: str
    question: str

class QuizRequest(BaseModel):
    pdf_id: str
    num_questions: int = 5

class SummarizeRequest(BaseModel):
    pdf_id: str

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        raise Exception(f"Failed to extract text: {str(e)}")
    return text

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    words = text.split()
    if len(words) == 0:
        return []
    
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

def create_embeddings(chunks: List[str]) -> np.ndarray:
    if not chunks:
        return np.array([])
    return embedding_model.encode(chunks)

def create_faiss_index(embeddings: np.ndarray):
    if embeddings.shape[0] == 0:
        raise Exception("No embeddings to index")
    
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype('float32'))
    return index

def search_faiss(index, query_embedding, top_k: int = 3):
    query_embedding = query_embedding.reshape(1, -1).astype('float32')
    distances, indices = index.search(query_embedding, top_k)
    return [int(i) for i in indices[0]]

def call_groq(prompt: str) -> str:
    models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it"
    ]
    
    for model in models:
        try:
            completion = groq_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful AI study assistant. Provide clear, accurate answers."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2048,
            )
            return completion.choices[0].message.content
        except Exception as e:
            continue
    
    return "I'm having trouble generating a response. Please try again."

@app.get("/")
def root():
    return {"message": "AI Study Buddy API with Groq", "status": "running"}

# --- AUTH ROUTES (UNCHANGED - WORKING) ---
@app.post("/api/signup")
def signup(user: UserSignup):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    users_db[user.email] = {
        "name": user.name,
        "password": user.password,
        "created_at": datetime.now().isoformat()
    }
    
    return {"message": "Signup successful", "user": {"name": user.name, "email": user.email}}

@app.post("/api/login")
def login(user: UserLogin):
    if user.email not in users_db:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if users_db[user.email]["password"] != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_id = str(uuid.uuid4())
    sessions[session_id] = user.email
    
    return {
        "message": "Login successful",
        "session_id": session_id,
        "user": {
            "name": users_db[user.email]["name"],
            "email": user.email
        }
    }

@app.post("/api/logout")
def logout(session_id: str = Form(...)):
    if session_id in sessions:
        del sessions[session_id]
    return {"message": "Logout successful"}

@app.get("/api/verify")
def verify(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    email = sessions[session_id]
    return {
        "valid": True,
        "user": {
            "name": users_db[email]["name"],
            "email": email
        }
    }

# --- PDF ROUTES (UNCHANGED) ---
@app.post("/api/upload-pdf")
async def upload_pdf(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_email = sessions[session_id]
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    content = await file.read()
    file_size = len(content)
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    await file.seek(0)
    
    pdf_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{pdf_id}.pdf")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    try:
        text = extract_text_from_pdf(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    
    if len(text.strip()) < 100:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=400, 
            detail="PDF has too little text or may be scanned."
        )
    
    chunks = chunk_text(text)
    
    if len(chunks) == 0:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail="No text could be extracted")
    
    try:
        embeddings = create_embeddings(chunks)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create embeddings: {str(e)}")
    
    try:
        index = create_faiss_index(embeddings)
        faiss_indices[pdf_id] = index
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create index: {str(e)}")
    
    pdfs_db[pdf_id] = {
        "id": pdf_id,
        "filename": file.filename,
        "user_email": user_email,
        "upload_date": datetime.now().isoformat(),
        "chunks": chunks,
        "page_count": max(1, len(text) // 500),
        "word_count": len(text.split())
    }
    
    return {
        "message": "PDF uploaded and processed successfully",
        "pdf_id": pdf_id,
        "filename": file.filename,
        "chunks": len(chunks),
        "pages": pdfs_db[pdf_id]["page_count"]
    }

@app.get("/api/pdfs")
def get_pdfs(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_email = sessions[session_id]
    
    user_pdfs = []
    for pdf_id, pdf_data in pdfs_db.items():
        if pdf_data["user_email"] == user_email:
            user_pdfs.append({
                "id": pdf_id,
                "filename": pdf_data["filename"],
                "upload_date": pdf_data["upload_date"],
                "chunks": len(pdf_data["chunks"]),
                "pages": pdf_data["page_count"]
            })
    
    return {"pdfs": user_pdfs}

@app.delete("/api/delete-pdf/{pdf_id}")
def delete_pdf(pdf_id: str, session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_email = sessions[session_id]
    
    if pdf_id not in pdfs_db:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    if pdfs_db[pdf_id]["user_email"] != user_email:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    file_path = os.path.join(UPLOAD_DIR, f"{pdf_id}.pdf")
    if os.path.exists(file_path):
        os.remove(file_path)
    
    del pdfs_db[pdf_id]
    if pdf_id in faiss_indices:
        del faiss_indices[pdf_id]
    
    return {"message": "PDF deleted successfully"}

# --- CHAT ROUTE (UNCHANGED - WORKING) ---
@app.post("/api/chat")
async def chat(request: ChatRequest, session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    if request.pdf_id not in pdfs_db:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_data = pdfs_db[request.pdf_id]
    chunks = pdf_data["chunks"]
    
    if request.pdf_id not in faiss_indices:
        raise HTTPException(status_code=500, detail="FAISS index not found")
    
    index = faiss_indices[request.pdf_id]
    
    try:
        query_embedding = embedding_model.encode([request.question])
        indices = search_faiss(index, query_embedding)
        
        relevant_chunks = []
        for i in indices:
            if i < len(chunks):
                relevant_chunks.append(chunks[i])
        
        if not relevant_chunks:
            return {
                "question": request.question,
                "answer": "I couldn't find relevant information in this PDF for your question.",
                "sources": []
            }
        
        context = "\n\n".join(relevant_chunks)
        
        prompt = f"""
You are a helpful AI study assistant. Answer the question based ONLY on the context provided.
If you cannot answer from the context, say "I cannot find this information in the provided PDF."

Context:
{context}

Question: {request.question}

Answer:
"""
        
        response = call_groq(prompt)
        
        sources = []
        for i in indices:
            if i < len(chunks):
                sources.append({
                    "chunk": chunks[i][:200] + "...",
                    "index": int(i)
                })
        
        return {
            "question": request.question,
            "answer": response,
            "sources": sources
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

# --- QUIZ ROUTE - FIXED ---
@app.post("/api/generate-quiz")
def generate_quiz(request: QuizRequest, session_id: str):
    print(f"\n📝 Quiz request received")
    print(f"  - Session ID: {session_id[:8]}...")
    print(f"  - PDF ID: {request.pdf_id}")
    print(f"  - Questions: {request.num_questions}")
    
    if session_id not in sessions:
        print("❌ Invalid session")
        raise HTTPException(status_code=401, detail="Invalid session")
    
    if request.pdf_id not in pdfs_db:
        print("❌ PDF not found")
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_data = pdfs_db[request.pdf_id]
    chunks = pdf_data["chunks"]
    
    if len(chunks) == 0:
        raise HTTPException(status_code=400, detail="PDF has no text content")
    
    text_for_quiz = " ".join(chunks[:10])
    print(f"  - Text length: {len(text_for_quiz)} characters")
    
    prompt = f"""
Generate exactly {request.num_questions} multiple choice questions based on the following text.
Each question must have 4 options (A, B, C, D) and indicate the correct answer.

Format each question EXACTLY like this:
Q1: What is the main topic?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A

Text:
{text_for_quiz}

Generate exactly {request.num_questions} questions:
"""
    
    response = call_groq(prompt)
    print(f"  - Response length: {len(response)} characters")
    print(f"  - Response preview: {response[:200]}...")
    
    questions = []
    lines = response.strip().split('\n')
    
    current_q = None
    current_options = []
    current_answer = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        if re.match(r'^Q\d+[:.]', line):
            if current_q and current_options:
                questions.append({
                    'question': current_q,
                    'options': current_options.copy(),
                    'answer': current_answer or 'Answer not specified'
                })
            current_q = line
            current_options = []
            current_answer = None
        
        elif re.match(r'^[A-D][).]', line) and current_q:
            current_options.append(line)
        
        elif line.lower().startswith('answer:') and current_q:
            current_answer = line
    
    if current_q and current_options:
        questions.append({
            'question': current_q,
            'options': current_options.copy(),
            'answer': current_answer or 'Answer not specified'
        })
    
    # Fallback parsing
    if len(questions) == 0:
        print("  - Trying fallback parsing...")
        q_blocks = re.split(r'(Q\d+[:.])', response)
        for i in range(1, len(q_blocks), 2):
            if i+1 < len(q_blocks):
                q_label = q_blocks[i]
                q_content = q_blocks[i+1]
                q_lines = q_content.strip().split('\n')
                if q_lines:
                    question_text = q_label + ' ' + q_lines[0].strip()
                    options = []
                    answer = None
                    for line in q_lines[1:]:
                        line = line.strip()
                        if re.match(r'^[A-D][).]', line):
                            options.append(line)
                        elif line.lower().startswith('answer:'):
                            answer = line
                    if question_text and options:
                        questions.append({
                            'question': question_text,
                            'options': options,
                            'answer': answer or 'Answer not specified'
                        })
    
    print(f"  - Parsed {len(questions)} questions")
    
    if len(questions) == 0:
        return {
            "questions": [],
            "error": "Could not generate quiz questions. Please try again.",
            "raw_response": response
        }
    
    return {
        "questions": questions,
        "total": len(questions)
    }

# --- OTHER ROUTES (UNCHANGED) ---
@app.post("/api/summarize")
def summarize(request: SummarizeRequest, session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    if request.pdf_id not in pdfs_db:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_data = pdfs_db[request.pdf_id]
    chunks = pdf_data["chunks"]
    text_to_summarize = " ".join(chunks[:10])
    
    prompt = f"""
You are a study assistant. Summarize the following text in a clear, structured way.
Use bullet points for key concepts.
Keep it concise but comprehensive.

Text:
{text_to_summarize}

Summary:
"""
    
    response = call_groq(prompt)
    return {"summary": response}

@app.post("/api/generate-flashcards")
def generate_flashcards(request: SummarizeRequest, session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    if request.pdf_id not in pdfs_db:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_data = pdfs_db[request.pdf_id]
    chunks = pdf_data["chunks"]
    text_for_flashcards = " ".join(chunks[:6])
    
    prompt = f"""
Generate 5 flashcards (question and answer pairs) based on the following text.
Each flashcard should test key concepts.

Format each flashcard as:
Front: [Question]
Back: [Answer]

Text:
{text_for_flashcards}

Flashcards:
"""
    
    response = call_groq(prompt)
    
    flashcards = []
    lines = response.strip().split('\n')
    
    current_card = {}
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('Front:'):
            if current_card and 'front' in current_card and 'back' in current_card:
                flashcards.append(current_card)
            current_card = {'front': line.replace('Front:', '').strip()}
        elif line.startswith('Back:'):
            current_card['back'] = line.replace('Back:', '').strip()
    
    if current_card and 'front' in current_card and 'back' in current_card:
        flashcards.append(current_card)
    
    return {"flashcards": flashcards}

@app.post("/api/study-plan")
def study_plan(
    session_id: str,
    subjects: str = Form(...),
    days: int = Form(...),
    hours_per_day: float = Form(...)
):
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    prompt = f"""
Create a study plan for the following subjects:
{subjects}

Time available:
- {days} days
- {hours_per_day} hours per day

Create a day-by-day plan with specific topics and time allocation.
Make it realistic and include revision days.

Study Plan:
"""
    
    response = call_groq(prompt)
    return {"study_plan": response}

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting AI Study Buddy Server...")
    print("🌐 Server running at: http://localhost:8000\n")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

    
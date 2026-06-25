# 🎓 AI Study Buddy

An AI-powered learning assistant that helps students interact with their study materials using Retrieval-Augmented Generation (RAG).

Students can upload PDFs, ask questions, generate quizzes, create flashcards, and receive personalized study plans—all from a single platform.

---

# 🌐 Live Demo

### Frontend
🔗 [Live Application](PASTE_FRONTEND_LINK_HERE)

### Backend API
🔗 [API Documentation](PASTE_BACKEND_LINK_HERE)

---

## 🔑 Demo Credentials

To help evaluators quickly explore the application, you may use the following demo account:

**Username:** example
**Email:** example@gmail.com
**Password:** 12345678

> **Note:** 

1. If while signup it shows network error, please try again after a few seconds. The backend server may take some time to start up.

2.If the demo account is unavailable, you can create a new account using the Sign Up page and start using the platform immediately.

---

## 🚀 Getting Started

Follow these simple steps to start using AI Study Buddy:

1. Open the live application using the link provided above.
2. Sign in using the demo credentials or create a new account.
3. Upload your study material in PDF format.
4. Wait for the system to process and index the document.
5. Start asking questions about the uploaded content.
6. Generate quizzes to test your understanding.
7. Create flashcards for quick revision.
8. Generate a personalized study plan based on your subjects and available study time.

### Example Workflow

```text
Upload PDF
     ↓
Ask Questions
     ↓
Get AI-Powered Answers
     ↓
Generate Quiz
     ↓
Create Flashcards
     ↓
Build Study Plan



# 📖 Overview

Studying from lengthy notes and textbooks can be time-consuming and inefficient. Finding specific information, generating revision material, and creating study schedules often require significant manual effort.

AI Study Buddy solves these challenges by combining Artificial Intelligence, Vector Search, and PDF Processing into an interactive study platform.

The application uses Retrieval-Augmented Generation (RAG) to answer questions based on uploaded study materials rather than relying solely on general AI knowledge.

---

# 🎯 Problem Statement

Students often face:

- Large volumes of notes and textbooks
- Difficulty locating specific information quickly
- Lack of instant academic support
- Time-consuming revision preparation
- Poor study planning and scheduling

These challenges can negatively affect productivity and exam preparation.

---

# 💡 Solution

AI Study Buddy provides:

✅ Intelligent PDF Question Answering

✅ AI-generated Quizzes

✅ Interactive Flashcards

✅ Personalized Study Plans

✅ Fast Semantic Search using FAISS

✅ Context-Aware Responses powered by LLMs

---

# ✨ Key Features

## 🔐 User Authentication

- User Registration
- Secure Login
- Session Management
- Logout Functionality

## 📄 PDF Management

- Upload Study Materials
- Extract Text from PDFs
- Store and Process Content
- Manage Uploaded Documents

## 💬 Chat With PDF

- Ask Questions About Uploaded Notes
- Context-Aware AI Responses
- Semantic Search Retrieval
- Source-Based Answers

## 📝 Quiz Generator

- Generate MCQs Automatically
- Custom Number of Questions
- Answer Evaluation

## 🃏 Flashcards

- Auto-Generated Flashcards
- Interactive Learning Experience
- Revision-Friendly Format

## 📅 Study Planner

- Personalized Study Schedules
- Subject-Wise Planning
- Revision Recommendations

---

# 🛠️ Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript

## Backend

- Python
- FastAPI
- Uvicorn

## AI & Machine Learning

- Groq API
- Llama 3.3 70B
- Sentence Transformers
- RAG Architecture

## Vector Database

- FAISS

## PDF Processing

- PyMuPDF

---

# 🏗️ System Architecture

```text
User
 │
 ▼
Frontend (HTML/CSS/JS)
 │
 ▼
FastAPI Backend
 │
 ├── PDF Processing
 ├── Embedding Generation
 ├── FAISS Vector Search
 └── Groq LLM Integration
 │
 ▼
AI Generated Response
```

---

# 🔄 RAG Workflow

```text
1. User uploads PDF

2. PDF text extracted

3. Text split into chunks

4. Embeddings generated

5. Stored in FAISS vector index

6. User asks question

7. Similar chunks retrieved

8. Context sent to LLM

9. AI generates accurate answer

10. Response shown to user
```

---

# 📸 Screenshots

## Login Page

![alt text](<Screenshot 2026-06-24 211035.png>)

---

## Dashboard

![alt text](<Screenshot 2026-06-24 210912.png>)

---

## Chat With PDF

![alt text](<Screenshot 2026-06-24 210854.png>)

---

## Quiz Generator

![alt text](<Screenshot 2026-06-24 210949.png>)

---

## Flashcards

![alt text](<Screenshot 2026-06-24 211015.png>)

---


# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/ai-study-buddy.git
cd ai-study-buddy
```

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Frontend Setup

```bash
cd frontend
python -m http.server 5500
```

---

# ⚙️ Environment Variables

Create a `.env` file inside backend directory:

```env
GROQ_API_KEY=your_groq_api_key
HF_TOKEN=your_huggingface_token
```

---

# ▶️ Running the Application

## Start Backend

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Start Frontend

```bash
python -m http.server 5500
```

---

# 📚 API Endpoints

| Method | Endpoint | Description |
|----------|------------|-------------|
| POST | /api/signup | User Registration |
| POST | /api/login | User Login |
| POST | /api/upload-pdf | Upload PDF |
| GET | /api/pdfs | View PDFs |
| POST | /api/chat | Ask Questions |
| POST | /api/generate-quiz | Generate Quiz |
| POST | /api/generate-flashcards | Generate Flashcards |
| POST | /api/study-plan | Generate Study Plan |

---

# 📈 Future Enhancements

- MongoDB Integration
- JWT Authentication
- Voice-Based Interaction
- PDF Citations with Page Numbers
- Study Progress Tracking
- Performance Analytics Dashboard
- Mobile Application
- Multi-Language Support

---

# 🎯 Learning Outcomes

This project demonstrates:

- Retrieval-Augmented Generation (RAG)
- Large Language Model Integration
- Vector Search using FAISS
- PDF Processing
- Full Stack Development
- REST API Development
- AI-Powered Educational Systems

---

# 👨‍💻 Author

**Himanshi**

B.Tech Computer Science
IBM Internship Project


GitHub: https://github.com/iamhimanshi
LinkedIn: www.linkedin.com/in/himanshi80

---

# 📄 License

This project is developed for educational and internship purposes.

---

# ⭐ Support

If you found this project useful, consider giving it a star on GitHub.
Feedback and suggestions are always welcome.
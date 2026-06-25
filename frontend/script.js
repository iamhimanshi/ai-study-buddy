// API Configuration
const API_URL = 'http://127.0.0.1:8000';
let sessionId = localStorage.getItem('sessionId') || null;
let currentPdfId = null;

// --- DOM References ---
const pages = {
    login: document.getElementById('loginPage'),
    dashboard: document.getElementById('dashboardPage'),
    chat: document.getElementById('chatPage'),
    quiz: document.getElementById('quizPage'),
    flashcards: document.getElementById('flashcardsPage'),
    studyPlanner: document.getElementById('studyPlannerPage'),
};

const navLinks = document.querySelectorAll('.nav-link');
const logoutBtn = document.getElementById('logoutBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinksContainer = document.getElementById('navLinks');

// Auth
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authTabs = document.querySelectorAll('.auth-tab');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

// Dashboard
const uploadForm = document.getElementById('uploadForm');
const pdfFile = document.getElementById('pdfFile');
const uploadStatus = document.getElementById('uploadStatus');
const pdfList = document.getElementById('pdfList');
const userNameDisplay = document.getElementById('userNameDisplay');

// Chat
const chatPdfList = document.getElementById('chatPdfList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

// Quiz
const quizPdfSelect = document.getElementById('quizPdfSelect');
const quizCount = document.getElementById('quizCount');
const generateQuizBtn = document.getElementById('generateQuizBtn');
const quizContent = document.getElementById('quizContent');

// Flashcards
const flashcardPdfSelect = document.getElementById('flashcardPdfSelect');
const generateFlashcardsBtn = document.getElementById('generateFlashcardsBtn');
const flashcardContainer = document.getElementById('flashcardContainer');

// Study Planner
const plannerSubjects = document.getElementById('plannerSubjects');
const plannerDays = document.getElementById('plannerDays');
const plannerHours = document.getElementById('plannerHours');
const generatePlanBtn = document.getElementById('generatePlanBtn');
const plannerResult = document.getElementById('plannerResult');

// Drop zone
const dropZone = document.getElementById('dropZone');

// --- Utility Functions ---

function showPage(pageId) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.add('hidden');
        pages[key].classList.remove('active');
    });
    pages[pageId].classList.remove('hidden');
    pages[pageId].classList.add('active');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
}

function showToast(message, type = 'success') {
    const status = uploadStatus;
    status.textContent = message;
    status.className = 'upload-status';
    status.classList.add(type);
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 5000);
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.textContent = '';
        element.style.display = 'none';
    }, 5000);
}

// --- Auth Functions ---

async function checkSession() {
    if (!sessionId) return false;
    
    try {
        const response = await fetch(`${API_URL}/api/verify?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.valid) {
            userNameDisplay.textContent = data.user.name;
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.session_id;
            localStorage.setItem('sessionId', sessionId);
            userNameDisplay.textContent = data.user.name;
            await loadDashboard();
            showPage('dashboard');
            return true;
        } else {
            showError(loginError, data.detail || 'Login failed');
            return false;
        }
    } catch (error) {
        showError(loginError, 'Network error. Please try again.');
        return false;
    }
}

async function signup(name, email, password) {
    try {
        const response = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            await login(email, password);
            return true;
        } else {
            showError(signupError, data.detail || 'Signup failed');
            return false;
        }
    } catch (error) {
        showError(signupError, 'Network error. Please try again.');
        return false;
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/api/logout`, {
            method: 'POST',
            body: new URLSearchParams({ session_id: sessionId }),
        });
    } catch (error) {
        // Ignore errors on logout
    }
    
    sessionId = null;
    localStorage.removeItem('sessionId');
    showPage('login');
    chatMessages.innerHTML = '<div class="chat-welcome"><p>👋 Select a PDF and start asking questions!</p></div>';
}

// --- Dashboard Functions ---

async function loadDashboard() {
    await loadPdfs();
}

async function loadPdfs() {
    if (!sessionId) return;
    
    try {
        const response = await fetch(`${API_URL}/api/pdfs?session_id=${sessionId}`);
        const data = await response.json();
        
        if (response.ok) {
            renderPdfs(data.pdfs);
            updatePdfSelectors(data.pdfs);
        }
    } catch (error) {
        console.error('Error loading PDFs:', error);
    }
}

function renderPdfs(pdfs) {
    if (!pdfs || pdfs.length === 0) {
        pdfList.innerHTML = '<p class="empty-message">No PDFs uploaded yet</p>';
        return;
    }
    
    pdfList.innerHTML = pdfs.map(pdf => `
        <div class="pdf-card">
            <span class="pdf-icon">📄</span>
            <div class="pdf-name" title="${pdf.filename}">${pdf.filename}</div>
            <div class="pdf-meta">${pdf.pages} pages • ${pdf.chunks} chunks</div>
            <div class="pdf-actions">
                <button class="btn-chat" onclick="openChat('${pdf.id}')">💬 Chat</button>
                <button class="btn-delete" onclick="deletePdf('${pdf.id}')">🗑</button>
            </div>
        </div>
    `).join('');
}

function updatePdfSelectors(pdfs) {
    const selectors = [quizPdfSelect, flashcardPdfSelect];
    const chatList = chatPdfList;
    
    selectors.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a PDF</option>';
        if (pdfs && pdfs.length > 0) {
            pdfs.forEach(pdf => {
                const option = document.createElement('option');
                option.value = pdf.id;
                option.textContent = pdf.filename;
                select.appendChild(option);
            });
        }
        if (currentValue) select.value = currentValue;
    });
    
    chatList.innerHTML = '';
    if (pdfs && pdfs.length > 0) {
        pdfs.forEach(pdf => {
            const item = document.createElement('div');
            item.className = 'chat-pdf-item';
            item.dataset.pdfId = pdf.id;
            if (pdf.id === currentPdfId) item.classList.add('active');
            item.textContent = pdf.filename;
            item.onclick = () => selectChatPdf(pdf.id);
            chatList.appendChild(item);
        });
    } else {
        chatList.innerHTML = '<p class="empty-message">No PDFs available</p>';
    }
}

async function uploadPdf(file) {
    if (!sessionId) {
        showToast('Please login first', 'error');
        return;
    }
    
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please select a PDF file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('File too large (max 10MB)', 'error');
        return;
    }
    
    showToast('⏳ Uploading and processing... Please wait', 'success');
    
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);
    
    console.log('📤 Uploading:', file.name, file.size, 'bytes');
    
    try {
        const response = await fetch(`${API_URL}/api/upload-pdf`, {
            method: 'POST',
            body: formData,
        });
        
        const data = await response.json();
        console.log('📡 Response:', response.status, data);
        
        if (response.ok) {
            showToast(`✅ ${data.filename} uploaded! (${data.chunks} chunks)`, 'success');
            await loadPdfs();
            pdfFile.value = '';
        } else {
            showToast(`❌ ${data.detail || 'Upload failed'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Upload error:', error);
        showToast('❌ Network error. Please check console.', 'error');
    }
}

async function deletePdf(pdfId) {
    if (!confirm('Delete this PDF?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/delete-pdf/${pdfId}?session_id=${sessionId}`, {
            method: 'DELETE',
        });
        
        if (response.ok) {
            showToast('PDF deleted successfully', 'success');
            await loadPdfs();
            if (currentPdfId === pdfId) {
                currentPdfId = null;
                chatInput.disabled = true;
                chatSendBtn.disabled = true;
                chatMessages.innerHTML = '<div class="chat-welcome"><p>👋 Select a PDF and start asking questions!</p></div>';
            }
        } else {
            showToast('Failed to delete PDF', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

// --- Chat Functions ---

function openChat(pdfId) {
    showPage('chat');
    selectChatPdf(pdfId);
}

function selectChatPdf(pdfId) {
    currentPdfId = pdfId;
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.placeholder = 'Ask a question about this PDF...';
    chatInput.focus();
    
    document.querySelectorAll('.chat-pdf-item').forEach(item => {
        const isActive = item.dataset.pdfId === pdfId;
        item.classList.toggle('active', isActive);
    });
    
    chatMessages.innerHTML = '<div class="chat-welcome"><p>💬 Ask a question about this PDF!</p></div>';
}

async function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question || !currentPdfId || !sessionId) {
        console.log('❌ Missing required data:', { question, currentPdfId, sessionId });
        return;
    }
    
    addMessage('user', question);
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    
    try {
        console.log('📤 Sending chat request...');
        console.log('  - PDF ID:', currentPdfId);
        console.log('  - Question:', question);
        
        const requestBody = {
            pdf_id: currentPdfId,
            question: question
        };
        
        const url = `${API_URL}/api/chat?session_id=${sessionId}`;
        console.log('  - URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (response.ok) {
            let sourcesText = '';
            if (data.sources && data.sources.length > 0) {
                sourcesText = '📖 Sources: ' + data.sources.map((s, i) => 
                    `Chunk ${i+1}: ${s.chunk.substring(0, 100)}...`
                ).join(' | ');
            }
            addMessage('ai', data.answer, sourcesText);
        } else {
            const errorMsg = data.detail || data.message || 'Something went wrong';
            console.error('❌ Chat error response:', data);
            addMessage('ai', '❌ ' + errorMsg);
        }
    } catch (error) {
        console.error('❌ Chat network error:', error);
        addMessage('ai', '❌ Network error. Please check if backend is running.');
    }
    
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
}

function addMessage(type, content, sources = '') {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    
    const sender = type === 'user' ? 'You' : 'AI';
    div.innerHTML = `
        <div class="sender">${sender}</div>
        <div class="content">${content}</div>
        ${sources ? `<div class="sources">${sources}</div>` : ''}
    `;
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Quiz Functions - ONLY QUIZ FIXED ---


async function generateQuiz() {
    const pdfId = quizPdfSelect.value;
    const numQuestions = parseInt(quizCount.value) || 5;
    
    if (!pdfId) {
        showToast('Please select a PDF', 'error');
        return;
    }
    
    generateQuizBtn.disabled = true;
    generateQuizBtn.textContent = '⏳ Generating...';
    quizContent.innerHTML = '<p class="empty-message">⏳ Generating quiz questions...</p>';
    
    try {
        console.log('📤 Generating quiz for PDF:', pdfId);
        console.log('📝 Number of questions:', numQuestions);
        console.log('🔑 Session ID:', sessionId);
        
        // Send session_id as query parameter like chat does
        const url = `${API_URL}/api/generate-quiz?session_id=${sessionId}`;
        console.log('  - URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdf_id: pdfId,
                num_questions: numQuestions,
            }),
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📡 Quiz response:', data);
        
        if (response.ok) {
            if (data.questions && data.questions.length > 0) {
                console.log('✅ Found', data.questions.length, 'questions');
                renderQuiz(data.questions);
                showToast(`✅ Generated ${data.questions.length} questions!`, 'success');
            } else {
                console.error('❌ No questions in response:', data);
                quizContent.innerHTML = `
                    <p class="empty-message">❌ No questions could be generated.</p>
                    <p style="color: #666; text-align: center; font-size: 0.9rem; margin-top: 1rem;">
                        ${data.error || 'Try uploading a PDF with more text content.'}
                    </p>
                `;
                showToast('❌ No questions generated', 'error');
            }
        } else {
            const errorMsg = data.detail || data.message || 'Failed to generate quiz';
            console.error('❌ Quiz generation failed:', errorMsg);
            quizContent.innerHTML = `<p class="empty-message">❌ ${errorMsg}</p>`;
            showToast(`❌ ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error('❌ Quiz generation error:', error);
        quizContent.innerHTML = '<p class="empty-message">❌ Network error. Please try again.</p>';
        showToast('❌ Network error', 'error');
    }
    
    generateQuizBtn.disabled = false;
    generateQuizBtn.textContent = 'Generate Quiz';
}


function renderQuiz(questions) {
    console.log('📝 Rendering quiz with', questions.length, 'questions');
    console.log('📝 First question sample:', questions[0]);
    
    if (!questions || questions.length === 0) {
        quizContent.innerHTML = '<p class="empty-message">❌ No questions to display.</p>';
        return;
    }
    
    let html = '<div class="quiz-questions">';
    
    questions.forEach((q, index) => {
        let questionText = '';
        let options = [];
        let answer = '';
        
        // Handle different formats
        if (typeof q === 'string') {
            const lines = q.split('\n');
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('Q') && line.includes(':')) {
                    questionText = line;
                } else if (line.startsWith(('A)', 'B)', 'C)', 'D)'))) {
                    options.push(line);
                } else if (line.startsWith('Answer:')) {
                    answer = line;
                }
            });
        } else if (typeof q === 'object' && q !== null) {
            questionText = q.question || q.Q || `Question ${index + 1}`;
            options = q.options || q.Options || [];
            answer = q.answer || q.Answer || 'Answer not available';
        }
        
        if (!questionText) {
            questionText = `Question ${index + 1}`;
        }
        
        html += `
            <div class="quiz-question" data-index="${index}">
                <div class="q-text">${questionText}</div>
                <div class="options">
                    ${options.length > 0 ? options.map(opt => `<div class="option">${opt}</div>`).join('') : '<div class="option">No options available</div>'}
                </div>
                <div class="answer" id="answer-${index}">✅ ${answer}</div>
            </div>
        `;
    });
    
    html += `
        <button class="show-answers-btn" onclick="showAllAnswers()">📖 Show All Answers</button>
    </div>`;
    
    quizContent.innerHTML = html;
    console.log('✅ Quiz rendered successfully');
}

function showAllAnswers() {
    document.querySelectorAll('.quiz-question .answer').forEach(el => {
        el.classList.add('show');
    });
}

// --- Flashcard Functions ---

// --- FLASHCARD FUNCTIONS - FIXED ---

async function generateFlashcards() {
    const pdfId = flashcardPdfSelect.value;
    
    if (!pdfId) {
        showToast('Please select a PDF', 'error');
        return;
    }
    
    generateFlashcardsBtn.disabled = true;
    generateFlashcardsBtn.textContent = 'Generating...';
    flashcardContainer.innerHTML = '<p class="empty-message">⏳ Generating flashcards...</p>';
    
    try {
        const url = `${API_URL}/api/generate-flashcards?session_id=${sessionId}`;
        console.log('📤 Generating flashcards for PDF:', pdfId);
        console.log('  - URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf_id: pdfId }),
        });
        
        const data = await response.json();
        console.log('📡 Flashcards response:', data);
        
        if (response.ok) {
            renderFlashcards(data.flashcards);
        } else {
            flashcardContainer.innerHTML = `<p class="empty-message">❌ ${data.detail || 'Failed to generate flashcards'}</p>`;
        }
    } catch (error) {
        console.error('❌ Flashcards error:', error);
        flashcardContainer.innerHTML = '<p class="empty-message">❌ Network error. Please try again.</p>';
    }
    
    generateFlashcardsBtn.disabled = false;
    generateFlashcardsBtn.textContent = 'Generate Flashcards';
}

// --- STUDY PLANNER FUNCTIONS - FIXED ---

async function generateStudyPlan() {
    const subjects = plannerSubjects.value.trim();
    const days = parseInt(plannerDays.value) || 20;
    const hours = parseFloat(plannerHours.value) || 2;
    
    if (!subjects) {
        showToast('Please enter subjects', 'error');
        return;
    }
    
    generatePlanBtn.disabled = true;
    generatePlanBtn.textContent = 'Generating...';
    plannerResult.innerHTML = '<p class="empty-message">⏳ Generating study plan...</p>';
    
    try {
        const url = `${API_URL}/api/study-plan?session_id=${sessionId}`;
        console.log('📤 Generating study plan...');
        console.log('  - URL:', url);
        
        const formData = new FormData();
        formData.append('subjects', subjects);
        formData.append('days', days);
        formData.append('hours_per_day', hours);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        
        const data = await response.json();
        console.log('📡 Study plan response:', data);
        
        if (response.ok) {
            plannerResult.innerHTML = data.study_plan || 'No plan generated';
            showToast('✅ Study plan generated!', 'success');
        } else {
            plannerResult.innerHTML = `<p class="empty-message">❌ ${data.detail || 'Failed to generate plan'}</p>`;
        }
    } catch (error) {
        console.error('❌ Study plan error:', error);
        plannerResult.innerHTML = '<p class="empty-message">❌ Network error. Please try again.</p>';
    }
    
    generatePlanBtn.disabled = false;
    generatePlanBtn.textContent = 'Generate Study Plan';
}

function renderFlashcards(flashcards) {
    if (!flashcards || flashcards.length === 0) {
        flashcardContainer.innerHTML = '<p class="empty-message">No flashcards generated</p>';
        return;
    }
    
    flashcardContainer.innerHTML = flashcards.map((card, index) => `
        <div class="flashcard" onclick="this.classList.toggle('flipped')">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <span class="label">📌 Card ${index + 1}</span>
                    <p>${card.front || card.question || 'Question'}</p>
                </div>
                <div class="flashcard-back">
                    <span class="label">💡 Answer</span>
                    <p>${card.back || card.answer || 'Answer'}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Study Planner Functions ---

async function generateStudyPlan() {
    const subjects = plannerSubjects.value.trim();
    const days = parseInt(plannerDays.value) || 20;
    const hours = parseFloat(plannerHours.value) || 2;
    
    if (!subjects) {
        showToast('Please enter subjects', 'error');
        return;
    }
    
    generatePlanBtn.disabled = true;
    generatePlanBtn.textContent = 'Generating...';
    plannerResult.innerHTML = '<p class="empty-message">⏳ Generating study plan...</p>';
    
    try {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('subjects', subjects);
        formData.append('days', days);
        formData.append('hours_per_day', hours);
        
        const response = await fetch(`${API_URL}/api/study-plan`, {
            method: 'POST',
            body: formData,
        });
        
        const data = await response.json();
        
        if (response.ok) {
            plannerResult.innerHTML = data.study_plan || 'No plan generated';
        } else {
            plannerResult.innerHTML = `<p class="empty-message">❌ ${data.detail || 'Failed to generate plan'}</p>`;
        }
    } catch (error) {
        plannerResult.innerHTML = '<p class="empty-message">❌ Network error. Please try again.</p>';
    }
    
    generatePlanBtn.disabled = false;
    generatePlanBtn.textContent = 'Generate Study Plan';
}

// --- Event Listeners ---

authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
    });
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    await login(email, password);
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    await signup(name, email, password);
});

logoutBtn.addEventListener('click', logout);

mobileMenuBtn.addEventListener('click', () => {
    navLinksContainer.classList.toggle('open');
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
            showPage(page);
            if (page === 'dashboard') loadPdfs();
            if (page === 'chat') updatePdfSelectors([]);
            if (page === 'quiz') loadPdfs();
            if (page === 'flashcards') loadPdfs();
        }
        navLinksContainer.classList.remove('open');
    });
});

uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = pdfFile.files[0];
    if (file) {
        uploadPdf(file);
    } else {
        showToast('Please select a PDF file', 'error');
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        pdfFile.files = files;
        uploadPdf(files[0]);
    }
});

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

generateQuizBtn.addEventListener('click', generateQuiz);
generateFlashcardsBtn.addEventListener('click', generateFlashcards);
generatePlanBtn.addEventListener('click', generateStudyPlan);

// --- Initialize ---

async function init() {
    const isValid = await checkSession();
    if (isValid) {
        showPage('dashboard');
        await loadDashboard();
    } else {
        showPage('login');
        sessionId = null;
        localStorage.removeItem('sessionId');
    }
}

init();


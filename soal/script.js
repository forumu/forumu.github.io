// Initialize quiz data
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let userAnswers = [];
let editMode = false;
let editTimer = null;
let timeRemaining = 0;
let currentPackage = "paket1"; // Default package
const defaultPin = "777";
const EDIT_MODE_DURATION = 5 * 60 * 1000; // 5 menit dalam milidetik

// DOM elements
let questionText, optionsContainer, quizArea, resultArea, scoreValue, totalScore, percentageValue;
let correctCount, incorrectCount, restartButton, speakResult, saveChanges, resetQuiz;
let currentQuestionSpan, totalQuestionsSpan, progressBar, pinModal, pinInput, submitPin, cancelPin;
let timerDisplay, keyNav, editKeyModal, currentQuestionText, answerKeyEditor, saveKeyChanges;
let cancelKeyEdit, feedbackMessage, packageNav, packageModal, packageSelect, loadPackage, cancelPackage;

// Initialize DOM elements
function initDOMElements() {
    questionText = document.getElementById('questionText');
    optionsContainer = document.getElementById('optionsContainer');
    quizArea = document.getElementById('quizArea');
    resultArea = document.getElementById('resultArea');
    scoreValue = document.getElementById('scoreValue');
    totalScore = document.getElementById('totalScore');
    percentageValue = document.getElementById('percentageValue');
    correctCount = document.getElementById('correctCount');
    incorrectCount = document.getElementById('incorrectCount');
    restartButton = document.getElementById('restartButton');
    speakResult = document.getElementById('speakResult');
    saveChanges = document.getElementById('saveChanges');
    resetQuiz = document.getElementById('resetQuiz');
    currentQuestionSpan = document.getElementById('currentQuestion');
    totalQuestionsSpan = document.getElementById('totalQuestions');
    progressBar = document.getElementById('progressBar');
    pinModal = document.getElementById('pinModal');
    pinInput = document.getElementById('pinInput');
    submitPin = document.getElementById('submitPin');
    cancelPin = document.getElementById('cancelPin');
    timerDisplay = document.getElementById('timerDisplay');
    keyNav = document.getElementById('keyNav');
    editKeyModal = document.getElementById('editKeyModal');
    currentQuestionText = document.getElementById('currentQuestionText');
    answerKeyEditor = document.getElementById('answerKeyEditor');
    saveKeyChanges = document.getElementById('saveKeyChanges');
    cancelKeyEdit = document.getElementById('cancelKeyEdit');
    feedbackMessage = document.getElementById('feedbackMessage');
    packageNav = document.getElementById('packageNav');
    packageModal = document.getElementById('packageModal');
    packageSelect = document.getElementById('packageSelect');
    loadPackage = document.getElementById('loadPackage');
    cancelPackage = document.getElementById('cancelPackage');
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        let currentLine = lines[i];
        let inQuotes = false;
        let field = '';
        const fields = [];
        
        for (let j = 0; j < currentLine.length; j++) {
            if (currentLine[j] === '"') {
                inQuotes = !inQuotes;
            } else if (currentLine[j] === ',' && !inQuotes) {
                fields.push(field);
                field = '';
            } else {
                field += currentLine[j];
            }
        }
        fields.push(field);
        
        for (let k = 0; k < headers.length; k++) {
            obj[headers[k]] = fields[k];
        }
        
        result.push(obj);
    }
    
    return result;
}

// Load CSV file
async function loadCSVFile(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error loading CSV file:', error);
        alert('Gagal memuat file CSV. Silakan coba lagi.');
        return null;
    }
}

// Save current package to localStorage
function saveCurrentPackage() {
    localStorage.setItem('currentPackage', currentPackage);
}

// Get saved package from localStorage
function getSavedPackage() {
    return localStorage.getItem('currentPackage') || 'paket1';
}

// Check if edit mode is already active from localStorage
function checkEditModeStatus() {
    const editModeData = localStorage.getItem('editModeData');
    if (editModeData) {
        const data = JSON.parse(editModeData);
        const currentTime = new Date().getTime();
        
        if (currentTime < data.expiryTime) {
            editMode = true;
            timeRemaining = data.expiryTime - currentTime;
            startEditModeTimer();
        } else {
            localStorage.removeItem('editModeData');
        }
    }
}

// Start edit mode timer
function startEditModeTimer() {
    if (editTimer) {
        clearInterval(editTimer);
    }
    editTimer = setInterval(() => {
        if (timeRemaining <= 0) {
            clearInterval(editTimer);
            editMode = false;
            localStorage.removeItem('editModeData');
        } else {
            timeRemaining -= 1000;
        }
    }, 1000);
}

// Load selected package
async function loadSelectedPackage() {
    currentPackage = packageSelect.value; // paket1 / paket2 / paket3 / paket4
    saveCurrentPackage();
    quizData = await loadCSVFile(`${currentPackage}.csv`);
    if (quizData) {
        currentQuestionIndex = 0;
        score = 0;
        correctAnswers = 0;
        incorrectAnswers = 0;
        userAnswers = [];
        showQuestion();
    }
}

// Init Quiz
async function initQuiz() {
    initDOMElements();
    currentPackage = getSavedPackage();
    packageSelect.value = currentPackage;
    quizData = await loadCSVFile(`${currentPackage}.csv`);
    if (quizData) {
        showQuestion();
    }

    // Event listener ganti paket
    if (loadPackage) {
        loadPackage.addEventListener('click', async () => {
            await loadSelectedPackage();
            packageModal.style.display = 'none';
        });
    }
    if (cancelPackage) {
        cancelPackage.addEventListener('click', () => {
            packageModal.style.display = 'none';
        });
    }
}

// Example showQuestion function (dummy, sesuaikan denganmu)
function showQuestion() {
    if (!quizData || quizData.length === 0) return;
    const q = quizData[currentQuestionIndex];
    questionText.textContent = q["Soal"];
    optionsContainer.innerHTML = "";
    const options = q["Opsi"].split(";");
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(opt, q["Kunci"]);
        optionsContainer.appendChild(btn);
    });
}

// Example checkAnswer function (dummy)
function checkAnswer(selected, correct) {
    if (selected === correct) {
        score++;
        correctAnswers++;
    } else {
        incorrectAnswers++;
    }
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
        showQuestion();
    } else {
        alert(`Selesai! Skor: ${score}/${quizData.length}`);
    }
}

// Run init
window.onload = initQuiz;

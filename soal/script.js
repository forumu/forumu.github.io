// DOM elements
let questionText, optionsContainer, quizArea, resultArea, scoreValue, totalScore, percentageValue;
let correctCount, incorrectCount, restartButton, speakResult, saveChanges, resetQuiz;
let currentQuestionSpan, totalQuestionsSpan, progressBar, pinModal, pinInput, submitPin, cancelPin;
let timerDisplay, keyNav, editKeyModal, currentQuestionText, answerKeyEditor, saveKeyChanges;
let cancelKeyEdit, feedbackMessage, packageNav, packageModal, currentPackage, packageItems, cancelPackage;

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
let currentPackageNumber = 1;
const defaultPin = "777";
const EDIT_MODE_DURATION = 5 * 60 * 1000; // 5 menit dalam milidetik

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
    currentPackage = document.getElementById('currentPackage');
    packageItems = document.querySelectorAll('.package-item');
    cancelPackage = document.getElementById('cancelPackage');
}

// Load package data from CSV file
async function loadPackageData(packageNumber) {
    try {
        const response = await fetch(`paket${packageNumber}.csv`);
        if (!response.ok) {
            throw new Error(`Failed to load package ${packageNumber}`);
        }
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error loading package data:', error);
        return null;
    }
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

// Save current package to localStorage
function saveCurrentPackage() {
    localStorage.setItem('currentPackage', currentPackageNumber.toString());
}

// Load current package from localStorage
function loadCurrentPackage() {
    const savedPackage = localStorage.getItem('currentPackage');
    if (savedPackage) {
        currentPackageNumber = parseInt(savedPackage);
    } else {
        currentPackageNumber = 1; // Default to package 1
        saveCurrentPackage();
    }
    updatePackageIndicator();
}

// Update package indicator in header
function updatePackageIndicator() {
    if (currentPackage) {
        currentPackage.textContent = `Paket ${currentPackageNumber}`;
    }
}

// Switch to a different package
async function switchPackage(packageNumber) {
    if (packageNumber === currentPackageNumber) {
        return; // Already on this package
    }
    
    // Load new package data
    const newPackageData = await loadPackageData(packageNumber);
    if (!newPackageData) {
        alert(`Gagal memuat paket ${packageNumber}. Silakan coba lagi.`);
        return;
    }
    
    // Update package number and save to localStorage
    currentPackageNumber = packageNumber;
    saveCurrentPackage();
    updatePackageIndicator();
    
    // Update quiz data and reset quiz
    quizData = newPackageData;
    initQuiz();
    
    // Close package modal
    if (packageModal) {
        packageModal.style.display = 'none';
    }
    
    // Show success message
    alert(`Berhasil beralih ke Paket ${packageNumber}!`);
}

// Check if edit mode is already active from localStorage
function checkEditModeStatus() {
    const editModeData = localStorage.getItem('editModeData');
    if (editModeData) {
        const data = JSON.parse(editModeData);
        const currentTime = new Date().getTime();
        
        if (currentTime < data.expiryTime) {
            // Edit mode is still valid
            editMode = true;
            
            // Start timer with remaining time
            timeRemaining = data.expiryTime - currentTime;
            startEditModeTimer();
        } else {
            // Edit mode expired
            localStorage.removeItem('editModeData');
        }
    }
}

// Start edit mode timer
function startEditModeTimer() {
    if (editTimer) {
        clearInterval(editTimer);
    }
    
    if (timerDisplay) {
        timerDisplay.style.display = 'inline';
    }
    
    editTimer = setInterval(() => {
        timeRemaining -= 1000; // Kurangi 1 detik
        
        if (timeRemaining <= 0) {
            // Timer expired, exit edit mode
            exitEditMode();
            clearInterval(editTimer);
        } else {
            // Update timer display
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            if (timerDisplay) {
                timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
}

// Play sound for correct answer
function playCorrectSound() {
    // Create audio context for correct sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Play sound for incorrect answer
function playIncorrectSound() {
    // Create audio context for incorrect sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.1); // G3
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Speak text with Indonesian voice
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
    }
}

// Initialize the quiz
async function initQuiz() {
    // Load package data if not already loaded
    if (quizData.length === 0) {
        quizData = await loadPackageData(currentPackageNumber);
        if (!quizData) {
            alert(`Gagal memuat paket ${currentPackageNumber}. Silakan refresh halaman.`);
            return;
        }
    }
    
    currentQuestionIndex = 0;
    score = 0;
    correctAnswers = 0;
    incorrectAnswers = 0;
    userAnswers = [];
    updateScoreIndicators();
    if (totalQuestionsSpan) totalQuestionsSpan.textContent = quizData.length;
    showQuestion();
    updateProgress();
}

// Update score indicators
function updateScoreIndicators() {
    if (correctCount) correctCount.textContent = correctAnswers;
    if (incorrectCount) incorrectCount.textContent = incorrectAnswers;
}

// Show current question
function showQuestion() {
    if (!questionText || !optionsContainer || !quizData || currentQuestionIndex >= quizData.length) return;
    
    const question = quizData[currentQuestionIndex];
    questionText.textContent = question.Soal;
    if (currentQuestionSpan) currentQuestionSpan.textContent = currentQuestionIndex + 1;
    
    // Clear previous options
    optionsContainer.innerHTML = '';
    
    // Get options
    const options = question.Opsi.split(';');
    
    // Create option buttons
    options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'form-check';
        
        const optionInput = document.createElement('input');
        optionInput.className = 'form-check-input';
        optionInput.type = 'radio';
        optionInput.name = 'questionOption';
        optionInput.id = `option${index}`;
        optionInput.value = option;
        
        const optionLabel = document.createElement('label');
        optionLabel.className = 'form-check-label option-button';
        optionLabel.htmlFor = `option${index}`;
        
        const optionText = document.createElement('span');
        optionText.className = 'option-text';
        optionText.textContent = option;
        
        optionLabel.appendChild(optionText);
        optionDiv.appendChild(optionInput);
        optionDiv.appendChild(optionLabel);
        optionsContainer.appendChild(optionDiv);
        
        // Add click event to option
        optionLabel.addEventListener('click', () => {
            // Only process if options are not disabled
            if (!optionInput.disabled) {
                optionInput.checked = true;
                handleAnswerSelect(option, optionDiv);
            }
        });
        
        optionInput.addEventListener('change', () => {
            // Only process if options are not disabled
            if (!optionInput.disabled) {
                handleAnswerSelect(option, optionDiv);
            }
        });
    });
}

// Handle answer selection
function handleAnswerSelect(answer, optionDiv) {
    userAnswers[currentQuestionIndex] = answer;
    
    // Show feedback
    const question = quizData[currentQuestionIndex];
    const isCorrect = answer === question.Kunci;
    
    // Clear previous feedback
    document.querySelectorAll('.form-check').forEach(div => {
        div.classList.remove('feedback-correct', 'feedback-incorrect');
    });
    
    // Show feedback in score indicator area
    if (feedbackMessage) {
        feedbackMessage.className = 'feedback-message show';
        if (isCorrect) {
            optionDiv.classList.add('feedback-correct');
            feedbackMessage.textContent = '✓ Jawaban Benar!';
            feedbackMessage.classList.add('correct');
            score++;
            correctAnswers++;
            playCorrectSound();
        } else {
            optionDiv.classList.add('feedback-incorrect');
            feedbackMessage.textContent = '✗ Jawaban Salah!';
            feedbackMessage.classList.add('incorrect');
            incorrectAnswers++;
            playIncorrectSound();
        }
    }
    
    // Update score indicators
    updateScoreIndicators();
    
    // Disable all options after selection
    disableAllOptions();
    
    // Hide feedback message after delay
    setTimeout(() => {
        if (feedbackMessage) {
            feedbackMessage.classList.remove('show');
        }
    }, 1500);
    
    // Auto advance to next question after a short delay
    setTimeout(() => {
        advanceToNextQuestion();
    }, 1500); // 1.5 detik delay
}

// Disable all options
function disableAllOptions() {
    const allInputs = document.querySelectorAll('input[name="questionOption"]');
    const allLabels = document.querySelectorAll('.option-button');
    
    allInputs.forEach(input => {
        input.disabled = true;
    });
    
    allLabels.forEach(label => {
        label.classList.add('disabled');
    });
}

// Advance to next question or show results
function advanceToNextQuestion() {
    // Move to next question or show results
    currentQuestionIndex++;
    updateProgress();
    
    if (currentQuestionIndex < quizData.length) {
        showQuestion();
    } else {
        showResults();
    }
}

// Update progress bar
function updateProgress() {
    if (progressBar) {
        const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

// Show quiz results
function showResults() {
    if (quizArea && resultArea) {
        quizArea.style.display = 'none';
        resultArea.style.display = 'block';
        
        if (scoreValue && totalScore) {
            scoreValue.textContent = score;
            totalScore.textContent = quizData.length;
            const percentage = Math.round((score / quizData.length) * 100);
            if (percentageValue) percentageValue.textContent = percentage;
        }
        
        // Speak the results
        setTimeout(() => {
            speakResults();
        }, 500);
    }
}

// Speak the results in Indonesian
function speakResults() {
    const percentage = Math.round((score / quizData.length) * 100);
    let message = `Selamat! Anda telah menyelesaikan kuis. `;
    message += `Dari total ${quizData.length} soal, Anda menjawab benar ${score} soal dan salah ${quizData.length - score} soal. `;
    
    if (percentage >= 90) {
        message += `Nilai Anda sangat bagus, ${percentage} persen. Pertahankan prestasi Anda!`;
    } else if (percentage >= 70) {
        message += `Nilai Anda bagus, ${percentage} persen. Tingkatkan lagi belajar Anda!`;
    } else if (percentage >= 50) {
        message += `Nilai Anda cukup, ${percentage} persen. Perbanyak lagi latihan soal!`;
    } else {
        message += `Nilai Anda ${percentage} persen. Jangan menyerah, terus belajar dan mencoba lagi!`;
    }
    
    speakText(message);
}

// Restart quiz
function restartQuiz() {
    if (quizArea && resultArea) {
        quizArea.style.display = 'block';
        resultArea.style.display = 'none';
        initQuiz();
    }
}

// Toggle edit mode
function toggleEditModeHandler() {
    if (editMode) {
        // If already in edit mode, exit without PIN
        exitEditMode();
    } else {
        // Show PIN modal to enter edit mode
        if (pinModal) {
            pinModal.style.display = 'block';
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    }
}

// Show edit key modal
function showEditKeyModal() {
    if (editMode && currentQuestionIndex < quizData.length && editKeyModal && currentQuestionText && answerKeyEditor) {
        const question = quizData[currentQuestionIndex];
        currentQuestionText.textContent = question.Soal;
        
        // Clear and populate answer key options
        answerKeyEditor.innerHTML = '';
        const options = question.Opsi.split(';');
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            if (option === question.Kunci) {
                optionElement.selected = true;
            }
            answerKeyEditor.appendChild(optionElement);
        });
        
        // Show modal
        editKeyModal.style.display = 'block';
    }
}

// Submit PIN
function submitPinHandler() {
    if (!pinInput) return;
    
    const enteredPin = pinInput.value;
    
    if (enteredPin === defaultPin) {
        // Activate edit mode
        editMode = true;
        if (pinModal) pinModal.style.display = 'none';
        
        // Set expiry time and save to localStorage
        const expiryTime = new Date().getTime() + EDIT_MODE_DURATION;
        localStorage.setItem('editModeData', JSON.stringify({
            expiryTime: expiryTime
        }));
        
        // Start timer
        timeRemaining = EDIT_MODE_DURATION;
        startEditModeTimer();
    } else {
        alert('PIN salah! Akses ditolak.');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
    }
}

// Cancel PIN
function cancelPinHandler() {
    if (pinModal) {
        pinModal.style.display = 'none';
    }
}

// Exit edit mode
function exitEditMode() {
    editMode = false;
    if (timerDisplay) timerDisplay.style.display = 'none';
    
    // Clear timer and localStorage
    if (editTimer) {
        clearInterval(editTimer);
    }
    localStorage.removeItem('editModeData');
}

// Save key changes
function saveKeyChangesHandler() {
    if (editMode && currentQuestionIndex < quizData.length && answerKeyEditor) {
        const selectedKey = answerKeyEditor.value;
        quizData[currentQuestionIndex].Kunci = selectedKey;
        
        // Close modal
        if (editKeyModal) editKeyModal.style.display = 'none';
        
        // Show success message
        alert('Kunci jawaban telah diperbarui!');
    }
}

// Cancel key edit
function cancelKeyEditHandler() {
    if (editKeyModal) {
        editKeyModal.style.display = 'none';
    }
}

// Save changes to answer keys
function saveChangesHandler() {
    // In a real application, you would save this to a server or local storage
    alert('Perubahan kunci jawaban telah disimpan!');
}

// Reset quiz
function resetQuizHandler() {
    if (confirm('Apakah Anda yakin ingin mereset kuis? Semua jawaban akan dihapus.')) {
        // Reset to original data
        loadPackageData(currentPackageNumber).then(data => {
            if (data) {
                quizData = data;
                initQuiz();
                alert('Kuis telah direset ke data awal!');
            }
        });
    }
}

// Show package modal
function showPackageModal() {
    if (packageModal) {
        packageModal.style.display = 'block';
        
        // Update active package item
        packageItems.forEach(item => {
            const packageNumber = parseInt(item.dataset.package);
            if (packageNumber === currentPackageNumber) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Cancel package selection
function cancelPackageHandler() {
    if (packageModal) {
        packageModal.style.display = 'none';
    }
}

// Initialize event listeners
function initEventListeners() {
    if (restartButton) restartButton.addEventListener('click', restartQuiz);
    if (speakResult) speakResult.addEventListener('click', speakResults);
    if (keyNav) {
        keyNav.addEventListener('click', (e) => {
            e.preventDefault();
            if (editMode) {
                showEditKeyModal();
            } else {
                toggleEditModeHandler();
            }
        });
    }
    if (packageNav) {
        packageNav.addEventListener('click', (e) => {
            e.preventDefault();
            showPackageModal();
        });
    }
    if (saveChanges) saveChanges.addEventListener('click', saveChangesHandler);
    if (resetQuiz) resetQuiz.addEventListener('click', resetQuizHandler);
    if (submitPin) submitPin.addEventListener('click', submitPinHandler);
    if (cancelPin) cancelPin.addEventListener('click', cancelPinHandler);
    if (saveKeyChanges) saveKeyChanges.addEventListener('click', saveKeyChangesHandler);
    if (cancelKeyEdit) cancelKeyEdit.addEventListener('click', cancelKeyEditHandler);
    if (cancelPackage) cancelPackage.addEventListener('click', cancelPackageHandler);
    
    // Package item click handlers
    packageItems.forEach(item => {
        item.addEventListener('click', () => {
            const packageNumber = parseInt(item.dataset.package);
            switchPackage(packageNumber);
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === pinModal) {
            if (pinModal) pinModal.style.display = 'none';
        }
        if (event.target === editKeyModal) {
            if (editKeyModal) editKeyModal.style.display = 'none';
        }
        if (event.target === packageModal) {
            if (packageModal) packageModal.style.display = 'none';
        }
    });
    
    // Handle Enter key in PIN input
    if (pinInput) {
        pinInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                submitPinHandler();
            }
        });
    }
}

// Initialize the application
async function initApp() {
    // Initialize DOM elements
    initDOMElements();
    
    // Initialize event listeners
    initEventListeners();
    
    // Load current package from localStorage
    loadCurrentPackage();
    
    // Check edit mode status
    checkEditModeStatus();
    
    // Initialize the quiz
    await initQuiz();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

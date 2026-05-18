/* ================= STATE & INIT ================= */
let tempQuestions = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let timeLeft = 30; 

// Sparar quizets ursprungliga index för att kunna uppdatera Highscore i databasen sen
let originalQuizIndex = -1; 

window.onload = () => {
    loadQuizzes();
};

/* ================= NAVIGATION ================= */
function showScreen(id) {
    clearInterval(timerInterval); 
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    if(id === 'projectsScreen') loadQuizzes();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/* ================= MUS-STJÄRNOR ================= */
document.addEventListener("mousemove", (e) => {
    if(Math.random() > 0.3) return; 
    const star = document.createElement("div");
    star.className = "mouse-star";
    star.style.left = e.clientX + "px";
    star.style.top = e.clientY + "px";
    const size = Math.random() * 4 + 2;
    star.style.width = size + "px";
    star.style.height = size + "px";
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 800);
});

/* ================= ROBOT LOGIK ================= */
function robotSpeak(text, type = 'normal') {
    const r = document.getElementById("robotContainer");
    const b = document.getElementById("robotSpeech");
    b.textContent = text;
    b.style.display = "block";
    r.classList.remove("happy", "sad", "spin");
    
    if(type === 'correct') {
        r.classList.add("happy");
        createRobotEffect('correct');
    } else if(type === 'wrong') {
        r.classList.add("sad");
        createRobotEffect('wrong');
    }
    
    setTimeout(() => { r.classList.remove("happy", "sad"); }, 1000);
    setTimeout(() => { b.style.display = "none"; }, 3000);
}

function createRobotEffect(type) {
    const container = document.getElementById("robotEffects");
    container.innerHTML = ""; 
    if(type === 'correct') {
        for(let i = 0; i < 8; i++) {
            const star = document.createElement("div");
            star.className = "burst-star";
            const angle = (i / 8) * Math.PI * 2;
            const dist = 60; 
            star.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
            star.style.setProperty('--ty', Math.sin(angle) * dist - 20 + 'px');
            container.appendChild(star);
        }
    } else if (type === 'wrong') {
        const bolt = document.createElement("div");
        bolt.className = "lightning";
        bolt.textContent = "⚡";
        container.appendChild(bolt);
        setTimeout(() => bolt.remove(), 600); 
    }
}

function pokeRobot() {
    const r = document.getElementById("robotContainer");
    r.classList.add("spin");
    robotSpeak("Sluta peta på mig! Bip bop!", "normal");
    for(let i=0; i<5; i++) setTimeout(() => createRobotEffect('correct'), i * 150);
    setTimeout(() => r.classList.remove("spin"), 800);
}

/* ================= FÄRDIGA KURSER ================= */
let selectedCourseId = "";

const preMadeCourses = {
    webb: {
        easy: { title: "Webbutveckling (Lätt)", questions: [ 
            {question: "Vad står HTML för?", answers: ["HyperText Markup Language", "HighText Machine Language", "HyperLoop Machine Language"], correct: 0},
            {question: "Vilket tagg gör text fet i HTML?", answers: ["<i>", "<bold>", "<b>"], correct: 2}
        ]},
        medium: { title: "Webbutveckling (Mellan)", questions: [ 
            {question: "Vilken CSS-egenskap ändrar bakgrundsfärg?", answers: ["color", "background-color", "bgcolor", "back-color"], correct: 1},
            {question: "Vilket symbol används för att välja ett ID i CSS?", answers: [".", "*", "#", "&"], correct: 2}
        ]},
        hard: { title: "Webbutveckling (Svår)", questions: [ 
            {question: "Vad returnerar typeof null i JavaScript?", answers: ["null", "undefined", "object", "string"], correct: 2},
            {question: "Vad gör e.preventDefault() i ett formulär?", answers: ["Stoppar formuläret från att skickas iväg", "Tömmer formuläret på text", "Raderar knappen"], correct: 0}
        ]}
    },
    matte: {
        easy: { title: "Matte (Lätt)", questions: [ 
            {question: "Vad är 15 + 12?", answers: ["25", "27", "29"], correct: 1},
            {question: "Hur många minuter är det på två timmar?", answers: ["100", "120", "60"], correct: 1}
        ]},
        medium: { title: "Matte (Mellan)", questions: [ 
            {question: "Vad är 12 * 12?", answers: ["144", "124", "100", "244"], correct: 0},
            {question: "Lös x: 2x - 4 = 10", answers: ["5", "6", "7", "8"], correct: 2}
        ]},
        hard: { title: "Matte (Svår)", questions: [ 
            {question: "Vad är kvadratroten ur 225?", answers: ["15", "12", "25", "17"], correct: 0},
            {question: "Vad är Pi avrundat till två decimaler?", answers: ["3.12", "3.16", "3.14", "3.18"], correct: 2}
        ]}
    }
};

function selectCourse(courseId) {
    selectedCourseId = courseId;
    let name = courseId === 'webb' ? 'Webbutveckling' : 'Matematik';
    document.getElementById("levelTitle").textContent = `Nivå för: ${name}`;
    showScreen('levelScreen');
}

function startCourseLevel(level) {
    const courseQuiz = preMadeCourses[selectedCourseId][level];
    currentQuiz = JSON.parse(JSON.stringify(courseQuiz)); 
    shuffleArray(currentQuiz.questions);
    originalQuizIndex = -1; // -1 betyder att detta är en inbyggd kurs, vi sparar inget highscore i databasen här
    currentQuestionIndex = 0;
    score = 0;
    showScreen('playScreen');
    showQuestion();
}

/* ================= CRUD: SKAPA & SPARA QUIZ ================= */

// LÄGGA TILL BILDER (Förklaring till redovisningen): 
// Vi hämtar "questionImage" från HTML. Om användaren skriver in en webblänk, sparar vi den i fråge-objektet (qObj).
function addQuestion() {
    const qText = document.getElementById("questionInput").value.trim();
    const qImage = document.getElementById("questionImage").value.trim(); 
    const radios = document.getElementsByName("correctRadio");
    const inputs = document.querySelectorAll(".answerInput");
    
    let ansArray = [];
    let correctMappedIndex = -1;
    let selectedRadioIndex = -1;

    radios.forEach((r, idx) => { if(r.checked) selectedRadioIndex = idx; });

    for(let i = 0; i < 4; i++) {
        const val = inputs[i].value.trim();
        if(val !== "") {
            ansArray.push(val);
            if(i === selectedRadioIndex) correctMappedIndex = ansArray.length - 1; 
        } else if (i === selectedRadioIndex) {
            robotSpeak("Du kan inte sätta ett tomt fält som rätt svar!", "wrong");
            return;
        }
    }

    if(!qText || ansArray.length < 2) {
        robotSpeak("Frågan behöver text och minst 2 svarsalternativ!", "wrong");
        return;
    }
    if(correctMappedIndex === -1) {
        robotSpeak("Glöm inte att markera vilket svar som är rätt!", "wrong");
        return;
    }

    // Skapar objektet för frågan
    let qObj = { question: qText, answers: ansArray, correct: correctMappedIndex };
    if(qImage !== "") qObj.image = qImage; // Spara bildlänken om den finns!

    tempQuestions.push(qObj);
    
    // Nollställ fälten
    document.getElementById("questionInput").value = "";
    document.getElementById("questionImage").value = ""; 
    inputs.forEach(i => i.value = "");
    radios[0].checked = true; 
    document.getElementById("questionCounter").textContent = `Antal frågor i detta quiz: ${tempQuestions.length}`;
    
    robotSpeak("Fråga sparad! Riktigt smart.", "correct");
    showScreen('createQuizScreen');
}

function saveQuiz() {
    const title = document.getElementById("quizTitle").value.trim();
    if(!title || tempQuestions.length === 0) {
        robotSpeak("Du saknar titel eller frågor!", "wrong");
        return;
    }

    const savedQuizzes = JSON.parse(localStorage.getItem("quizzes")) || [];
    // Highscore sätts till 0 från början!
    savedQuizzes.push({ id: Date.now(), title: title, questions: [...tempQuestions], highscore: 0 });
    localStorage.setItem("quizzes", JSON.stringify(savedQuizzes));

    tempQuestions = [];
    document.getElementById("quizTitle").value = "";
    document.getElementById("questionCounter").textContent = "Antal frågor i detta quiz: 0";
    robotSpeak("Quizet sparades i ditt bibliotek!", "correct");
    showScreen('projectsScreen');
}

function cancelQuiz() {
    tempQuestions = [];
    document.getElementById("quizTitle").value = "";
    document.getElementById("questionImage").value = "";
    document.getElementById("questionCounter").textContent = "Antal frågor i detta quiz: 0";
    showScreen('projectsScreen');
}

/* ================= EXPORTERA & IMPORTERA (DELA QUIZ) ================= */

// EXPORTERA (Förklaring till redovisning): 
// Vi gör om Quiz-objektet till en lång textsträng (JSON.stringify) och krypterar den med btoa (Base64) 
// så det ser ut som en häftig hemlig kod istället för vanlig kod. Sedan kopieras den.
function exportQuiz(event, index) {
    event.stopPropagation(); // Förhindrar att spelet startar när man trycker Exportera
    const saved = JSON.parse(localStorage.getItem("quizzes")) || [];
    const quizToExport = saved[index];
    
    // Vi nollställer id och highscore innan vi delar det med en vän
    const cleanQuiz = { title: quizToExport.title, questions: quizToExport.questions, highscore: 0, id: Date.now() };
    
    // Gör om till text och sedan till Base64 (så det blir en "kod")
    const jsonString = JSON.stringify(cleanQuiz);
    const secretCode = btoa(encodeURIComponent(jsonString)); 
    
    navigator.clipboard.writeText(secretCode).then(() => {
        robotSpeak("Quiz-koden är kopierad! Skicka den till en vän.", "correct");
    }).catch(err => {
        // Om webbläsaren blockerar clipboard, visa en prompt
        prompt("Kopiera koden nedan och skicka till din vän:", secretCode);
    });
}

// IMPORTERA:
// Användaren klistrar in koden, vi avkodar den från Base64 (atob) och gör tillbaka den till ett Objekt (JSON.parse).
function importQuiz() {
    const code = prompt("Klistra in quiz-koden du fick av din vän här:");
    if(!code) return;

    try {
        const jsonString = decodeURIComponent(atob(code));
        const importedQuiz = JSON.parse(jsonString);
        
        if(importedQuiz.title && importedQuiz.questions) {
            importedQuiz.id = Date.now(); // Ge den ett nytt ID i din databas
            const savedQuizzes = JSON.parse(localStorage.getItem("quizzes")) || [];
            savedQuizzes.push(importedQuiz);
            localStorage.setItem("quizzes", JSON.stringify(savedQuizzes));
            loadQuizzes();
            robotSpeak("Quiz importerat! Snyggt!", "correct");
        } else {
            robotSpeak("Ogiltig kod! Saknar data.", "wrong");
        }
    } catch (e) {
        robotSpeak("Felaktig kod! Kunde inte importera.", "wrong");
    }
}

/* ================= LÄS & RADERA QUIZ ================= */
function loadQuizzes() {
    const list = document.getElementById("projectList");
    if (!list) return;

    list.innerHTML = "";
    const saved = JSON.parse(localStorage.getItem("quizzes")) || [];

    if (saved.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:rgba(255,255,255,0.5)">Biblioteket är tomt.</p>`;
        return;
    }

    saved.forEach((quiz, index) => {
        const card = document.createElement("div");
        card.className = "projectCard";
        
        // Här visar vi highscore på kortet i biblioteket!
        let hs = quiz.highscore ? quiz.highscore : 0;

        card.innerHTML = `
            <div style="flex-grow: 1;" onclick="startQuiz(${index})">
                <strong style="display:block; font-size:1.2em; color:var(--cyan)">${quiz.title}</strong>
                <small style="color:rgba(255,255,255,0.6)">${quiz.questions.length} frågor | 🏆 Highscore: ${hs} p</small>
            </div>
            <div class="card-actions">
                <button class="exportBtn" title="Dela Quiz" onclick="exportQuiz(event, ${index})">🔗</button>
                <button class="deleteBtn" onclick="deleteQuiz(event, ${index})">Radera</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function deleteQuiz(event, index) {
    event.stopPropagation(); 
    if(confirm("Är du säker på att du vill radera detta quiz?")) {
        let saved = JSON.parse(localStorage.getItem("quizzes")) || [];
        saved.splice(index, 1); 
        localStorage.setItem("quizzes", JSON.stringify(saved));
        loadQuizzes(); 
        robotSpeak("Quiz raderat.", "normal");
    }
}

/* ================= PLAY LOGIK ================= */
function startQuiz(index) {
    const saved = JSON.parse(localStorage.getItem("quizzes")) || [];
    currentQuiz = JSON.parse(JSON.stringify(saved[index]));
    originalQuizIndex = index; // Sparar vilket index quizet har i databasen för att uppdatera Highscore
    shuffleArray(currentQuiz.questions);

    currentQuestionIndex = 0;
    score = 0;
    showScreen('playScreen');
    showQuestion();
}

function showQuestion() {
    const q = currentQuiz.questions[currentQuestionIndex];
    document.getElementById("playTitle").textContent = currentQuiz.title;
    document.getElementById("playQuestion").textContent = q.question;
    document.getElementById("scoreDisplay").textContent = `Poäng: ${score}`;
    
    // BILD LOGIK: Om frågan har en bildlänk sparad, visar vi bilden. Annars gömmer vi img-taggen.
    const imgEl = document.getElementById("playImage");
    if(q.image) {
        imgEl.src = q.image;
        imgEl.classList.remove("hidden");
    } else {
        imgEl.classList.add("hidden");
        imgEl.src = "";
    }

    const box = document.getElementById("playAnswers");
    box.innerHTML = "";

    const correctString = q.answers[q.correct];
    let answerObjects = q.answers.map(text => {
        return { text: text, isCorrect: (text === correctString) }
    });
    
    shuffleArray(answerObjects);
    q.correct = answerObjects.findIndex(obj => obj.isCorrect);
    
    answerObjects.forEach((ansObj, i) => {
        const btn = document.createElement("button");
        btn.className = "mainBtn";
        btn.textContent = ansObj.text;
        btn.onclick = () => checkAnswer(i, btn);
        box.appendChild(btn);
    });

    const progress = (currentQuestionIndex / currentQuiz.questions.length) * 100;
    document.getElementById("progressFill").style.width = progress + "%";
    document.getElementById("nextBtn").disabled = true;

    startTimer(); 
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 30; 
    const timerFill = document.getElementById("timerFill");
    timerFill.style.width = "100%";
    timerFill.style.backgroundColor = "var(--correct)";

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        const percentage = (timeLeft / 30) * 100; 
        timerFill.style.width = percentage + "%";

        if(percentage < 50) timerFill.style.backgroundColor = "var(--gold)";
        if(percentage < 25) timerFill.style.backgroundColor = "var(--wrong)";

        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            timeOut();
        }
    }, 100); 
}

function timeOut() {
    robotSpeak("Tiden är ute!", "wrong");
    const q = currentQuiz.questions[currentQuestionIndex];
    const allBtns = document.querySelectorAll("#playAnswers button");
    
    allBtns.forEach(b => b.disabled = true);
    if(allBtns[q.correct]) allBtns[q.correct].classList.add("correct"); 
    document.getElementById("nextBtn").disabled = false;
}

function checkAnswer(idx, btn) {
    clearInterval(timerInterval); 
    const q = currentQuiz.questions[currentQuestionIndex];
    const allBtns = document.querySelectorAll("#playAnswers button");
    allBtns.forEach(b => b.disabled = true);

    if(idx === q.correct) {
        btn.classList.add("correct");
        let pointsEarned = Math.ceil(timeLeft); 
        score += pointsEarned; 
        robotSpeak(`Snyggt! +${pointsEarned} poäng!`, "correct");
    } else {
        btn.classList.add("wrong");
        allBtns[q.correct].classList.add("correct");
        robotSpeak("Ah, fel svar denna gång.", "wrong");
    }
    
    document.getElementById("scoreDisplay").textContent = `Poäng: ${score}`;
    document.getElementById("nextBtn").disabled = false;
}

function nextQuestion() {
    if(currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        finishQuiz();
    }
}

// HIGHSCORE (Förklaring till redovisning):
// Här kollar vi om den aktuella poängen är högre än den vi har sparad i localStorage. Om den är det, sparar vi över den gamla!
function finishQuiz() {
    clearInterval(timerInterval);
    showScreen('resultScreen');
    
    const maxPossibleScore = currentQuiz.questions.length * 30; 
    document.getElementById("finalScoreDisplay").textContent = `${score} p`;
    
    let isNewHighscore = false;
    
    // originalQuizIndex är > -1 bara om vi spelar ett EGET quiz (inte en kurs)
    if(originalQuizIndex > -1) {
        const savedQuizzes = JSON.parse(localStorage.getItem("quizzes")) || [];
        const oldHighscore = savedQuizzes[originalQuizIndex].highscore || 0;
        
        if(score > oldHighscore) {
            savedQuizzes[originalQuizIndex].highscore = score; // Uppdatera highscore!
            localStorage.setItem("quizzes", JSON.stringify(savedQuizzes)); // Spara i databasen
            isNewHighscore = true;
        }
    }

    // Visa en trofé om vi slog rekord
    const hsElement = document.getElementById("highscoreMessage");
    if(isNewHighscore) {
        hsElement.style.display = "block";
    } else {
        hsElement.style.display = "none";
    }
    
    const percent = (score / maxPossibleScore) * 100;
    let msg = percent >= 75 ? "Mästerligt spelat!" : "Bra försök, träna mer!";
    document.getElementById("resultMessage").textContent = `Du fick ${score} av ${maxPossibleScore} möjliga poäng. ${msg}`;
    
    robotSpeak("Spelet är över!", "normal");
}

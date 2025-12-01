const storageKey = 'studyscroll-state';

const defaultData = {
  subjects: [
    { id: 'bio', name: 'Cell Biology', tagline: 'Organelles & energy' },
    { id: 'calc', name: 'Calculus', tagline: 'Derivatives in motion' }
  ],
  notes: [
    { id: 'n1', subjectId: 'bio', content: 'Mitochondria produce ATP through cellular respiration.' },
    { id: 'n2', subjectId: 'calc', content: 'The derivative of sin(x) is cos(x); slopes are instantaneous rates of change.' }
  ],
  questions: [
    {
      id: 'q1',
      subjectId: 'bio',
      prompt: 'What is the main function of mitochondria?',
      choices: ['Generate ATP for the cell', 'Store genetic information', 'Control cell division', 'Maintain cell shape'],
      answerIndex: 0,
      explanation: 'Mitochondria convert nutrients into ATP, powering cellular processes.'
    },
    {
      id: 'q2',
      subjectId: 'calc',
      prompt: 'If f(x) = x^2, what is f\'(x)?',
      choices: ['2x', 'x', 'x^2', '2'],
      answerIndex: 0,
      explanation: 'Using the power rule, d/dx x^n = n*x^{n-1}, so d/dx x^2 = 2x.'
    },
    {
      id: 'q3',
      subjectId: 'bio',
      prompt: 'Which organelle packages and ships proteins?',
      choices: ['Golgi apparatus', 'Nucleus', 'Ribosome', 'Lysosome'],
      answerIndex: 0,
      explanation: 'The Golgi receives proteins, modifies them, and directs them to their destinations.'
    }
  ],
  saved: []
};

const state = loadState();
let currentIndex = 0;

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultData));
}

function loadState() {
  const existing = localStorage.getItem(storageKey);
  if (!existing) return cloneDefault();
  try {
    return JSON.parse(existing);
  } catch (e) {
    console.warn('Resetting storage because of parse error', e);
    return cloneDefault();
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderSubjects() {
  const subjectList = document.getElementById('subjectList');
  const notesList = document.getElementById('notesList');
  const selects = [document.getElementById('noteSubject'), document.getElementById('questionSubject')];

  subjectList.innerHTML = '';
  notesList.innerHTML = '';
  selects.forEach((sel) => (sel.innerHTML = ''));

  state.subjects.forEach((subj) => {
    const li = document.createElement('li');
    li.className = 'subject-item';
    li.innerHTML = `<strong>${subj.name}</strong><p>${subj.tagline || 'Tap in and add notes.'}</p>`;
    subjectList.appendChild(li);

    const option = document.createElement('option');
    option.value = subj.id;
    option.textContent = subj.name;
    selects.forEach((sel) => sel.appendChild(option.cloneNode(true)));
  });

  state.notes.forEach((note) => {
    const subject = state.subjects.find((s) => s.id === note.subjectId);
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `<strong>${subject?.name || 'Untitled'}</strong><p>${note.content}</p>`;
    notesList.appendChild(card);
  });

  updateStats();
}

function updateStats() {
  document.getElementById('subjectCount').textContent = state.subjects.length;
  document.getElementById('questionCount').textContent = state.questions.length;
  document.getElementById('savedCount').textContent = state.saved.length;
}

function renderFeed() {
  if (!state.questions.length) {
    document.getElementById('feedPrompt').textContent = 'No questions yet. Add one to start practicing!';
    document.getElementById('choiceList').innerHTML = '';
    return;
  }
  const question = state.questions[currentIndex % state.questions.length];
  const subject = state.subjects.find((s) => s.id === question.subjectId);
  const note = state.notes.find((n) => n.subjectId === question.subjectId);

  document.getElementById('feedSubject').textContent = subject ? subject.name : 'General';
  document.getElementById('feedPrompt').textContent = question.prompt;
  document.getElementById('feedNote').textContent = note ? note.content : '';
  document.getElementById('explanation').style.display = 'none';
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';

  renderChoices(question);
  updateSaveButton(question.id);
}

function renderChoices(question) {
  const choiceList = document.getElementById('choiceList');
  choiceList.innerHTML = '';
  question.choices.forEach((choice, idx) => {
    const label = document.createElement('label');
    label.className = 'choice';
    label.innerHTML = `
      <input type="radio" name="choice" value="${idx}" />
      <span>${choice}</span>
    `;
    label.querySelector('input').addEventListener('change', () => {
      checkAnswer(idx, question);
    });
    choiceList.appendChild(label);
  });
}

function checkAnswer(idx, question) {
  const feedback = document.getElementById('feedback');
  if (idx === question.answerIndex) {
    feedback.textContent = 'Correct — keep it rolling!';
    feedback.classList.add('success');
  } else {
    feedback.textContent = 'Not quite. Check the explanation and try another!';
    feedback.classList.add('error');
  }
}

function nextQuestion() {
  currentIndex = (currentIndex + 1) % state.questions.length;
  renderFeed();
}

function updateSaveButton(questionId) {
  const btn = document.getElementById('saveQuestion');
  const saved = state.saved.includes(questionId);
  btn.textContent = saved ? '★ Saved' : '☆ Save';
  btn.dataset.id = questionId;
  renderSavedList();
}

function toggleSave(questionId) {
  const idx = state.saved.indexOf(questionId);
  if (idx === -1) {
    state.saved.push(questionId);
  } else {
    state.saved.splice(idx, 1);
  }
  saveState();
  updateSaveButton(questionId);
  updateStats();
}

function renderSavedList() {
  const list = document.getElementById('savedList');
  list.innerHTML = '';
  state.saved.forEach((id) => {
    const q = state.questions.find((question) => question.id === id);
    if (!q) return;
    const subject = state.subjects.find((s) => s.id === q.subjectId);
    const li = document.createElement('li');
    li.className = 'saved-pill';
    li.textContent = `${subject?.name || 'Subject'} · ${q.prompt}`;
    li.addEventListener('click', () => {
      currentIndex = state.questions.findIndex((question) => question.id === id);
      renderFeed();
    });
    list.appendChild(li);
  });
}

function handleSubjectForm(event) {
  event.preventDefault();
  const name = document.getElementById('subjectName').value.trim();
  const tagline = document.getElementById('subjectTagline').value.trim();
  if (!name) return;
  state.subjects.push({ id: uid('subj'), name, tagline });
  saveState();
  event.target.reset();
  renderSubjects();
}

function handleNoteForm(event) {
  event.preventDefault();
  const subjectId = document.getElementById('noteSubject').value;
  const content = document.getElementById('noteContent').value.trim();
  if (!subjectId || !content) return;
  state.notes.push({ id: uid('note'), subjectId, content });
  saveState();
  event.target.reset();
  renderSubjects();
}

function handleQuestionForm(event) {
  event.preventDefault();
  const subjectId = document.getElementById('questionSubject').value;
  const prompt = document.getElementById('questionPrompt').value.trim();
  const choicesRaw = document.getElementById('questionChoices').value.trim();
  const correctIndex = Number(document.getElementById('correctIndex').value) - 1;
  const explanation = document.getElementById('questionExplanation').value.trim();

  const choices = choicesRaw.split(/\n+/).filter(Boolean);
  if (!prompt || !choices.length || correctIndex < 0 || correctIndex >= choices.length) return;

  state.questions.push({ id: uid('q'), subjectId, prompt, choices, answerIndex: correctIndex, explanation });
  saveState();
  event.target.reset();
  document.getElementById('correctIndex').value = 1;
  renderFeed();
  renderSubjects();
  updateStats();
}

function showExplanation() {
  const question = state.questions[currentIndex % state.questions.length];
  const expl = document.getElementById('explanation');
  expl.textContent = question.explanation || 'No explanation provided yet.';
  expl.style.display = 'block';
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('noteContent').value = e.target.result;
  };
  reader.readAsText(file);
}

function initNavigation() {
  document.getElementById('startPracticing').addEventListener('click', () => {
    document.querySelector('.feed').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('addQuestionLink').addEventListener('click', () => {
    document.getElementById('questionFormCard').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('openSubjectForm').addEventListener('click', () => {
    document.getElementById('subjectForm').scrollIntoView({ behavior: 'smooth' });
  });
}

function init() {
  renderSubjects();
  renderFeed();
  renderSavedList();
  updateStats();

  document.getElementById('subjectForm').addEventListener('submit', handleSubjectForm);
  document.getElementById('noteForm').addEventListener('submit', handleNoteForm);
  document.getElementById('questionForm').addEventListener('submit', handleQuestionForm);
  document.getElementById('noteFile').addEventListener('change', handleFileUpload);
  document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
  document.getElementById('shuffle').addEventListener('click', nextQuestion);
  document.getElementById('saveQuestion').addEventListener('click', (e) => toggleSave(e.target.dataset.id));
  document.getElementById('showExplanation').addEventListener('click', showExplanation);
  initNavigation();
}

document.addEventListener('DOMContentLoaded', init);

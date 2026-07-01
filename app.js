/**
 * app.js — Hệ thống quản lý và Render Quiz TOEIC chuyên dụng (Đã fix lỗi trộn A,B,C,D & Thêm tính năng Xem trước đáp án)
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const STORAGE_KEY = "toeic_quiz_progress_v2";

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}


function playSound(type) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "correct") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start(); osc.stop(audioCtx.currentTime + 0.4);
  } else if (type === "wrong") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === "click") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
  }
}

function playStreakSound(streak) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const baseFreq = 261.63;
  const multiplier = 1 + streak * 0.125;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq * multiplier, audioCtx.currentTime);
  gain.connect(audioCtx.destination);
  osc.connect(gain);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

// ─────────────────────────────────────────────────────
// HỆ THỐNG ĐỌC AUDIO GIỌNG AI (DÙNG PUTER API - CÓ PRELOAD)
// ─────────────────────────────────────────────────────
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

window.toggleTTS = function(btn) {
    // Nếu đang đọc thì dừng lại
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        btn.innerHTML = '<i class="fa-solid fa-volume-high text-lg"></i> Nghe Audio';
        btn.classList.remove('animate-pulse');
        return;
    }

    let text = activeQuizData[currentQuestion].ttsText;
    if(!text) return;
    
    // Vẫn giữ tính năng ngắt nhịp (đợi 1 chút) trước khi đọc A, B, C, D
    text = text.replace(/([A-D]\.)/g, ', , , $1');
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88; // Tốc độ vừa phải
    
    // Săn lùng giọng đọc tốt nhất trên máy
    // const availableVoices = window.speechSynthesis.getVoices();
    // const englishVoices = availableVoices.filter(voice => voice.lang.startsWith('en'));

    // // Chọn ngẫu nhiên 1 giọng tiếng Anh để đọc
    // if (englishVoices.length > 0) {
    //     utterance.voice = englishVoices[Math.floor(Math.random() * englishVoices.length)];
    // } else {
    //     utterance.lang = 'en-US'; // Dự phòng an toàn
    // }


// Lấy tất cả giọng trên máy
    const availableVoices = window.speechSynthesis.getVoices();
    
    // 1. DANH SÁCH ĐEN: Chứa các từ khóa của những giọng robot, quái gở, trẻ con trên iOS/Mac
    const weirdVoices = [
        'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 
        'Deranged', 'Good News', 'Hysterical', 'Pipe Organ', 'Trinoids', 'Whisper', 
        'Zarvox', 'Superstar', 'Jester', 'Wobble', 'Eddy', 'Flo', 'Grandpa', 
        'Grandma', 'Reed', 'Rocko', 'Sandy', 'Shelley', 'Ralph', 'Fred'
    ];

    // 2. Lọc giọng: Phải là tiếng Anh VÀ không được nằm trong danh sách đen
    const englishVoices = availableVoices.filter(voice => {
        const isEnglish = voice.lang.startsWith('en');
        // Kiểm tra xem tên giọng có chứa từ khóa cấm nào không
        const isWeird = weirdVoices.some(badName => voice.name.includes(badName));
        
        return isEnglish && !isWeird; // Chỉ lấy giọng Tiếng Anh chuẩn
    });

    // Chọn ngẫu nhiên 1 giọng xịn để đọc
    if (englishVoices.length > 0) {
        utterance.voice = englishVoices[Math.floor(Math.random() * englishVoices.length)];
    } else {
        utterance.lang = 'en-US'; // Dự phòng an toàn
    }

    // Đổi giao diện
    btn.innerHTML = '<i class="fa-solid fa-circle-stop text-red-500 text-lg"></i> Đang phát...';
    btn.classList.add('animate-pulse');
    
    // Khi đọc xong khôi phục lại nút
    utterance.onend = function() {
        btn.innerHTML = '<i class="fa-solid fa-volume-high text-lg"></i> Nghe Audio';
        btn.classList.remove('animate-pulse');
    };
    
    // Phát ngay lập tức không cần tải mạng!
    window.speechSynthesis.speak(utterance);
}

function stopAudio() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// KHỞI TẠO STATE
let rawQuestions = [];
let chapterNames = {};
let selectedChapters = [];

let activeQuizData = [];
let currentQuestion = 0;
let selectedAnswers = [];
let isCurrentAnswered = false;
let showResult = false;
let peekMode = false;      // THÊM: Trạng thái đang bật "Xem trước đáp án"

let statCorrectCount = 0;
let currentStreak = 0;
let maxStreak = 0;

function saveProgress() {
  const state = {
    testRoute: document.getElementById("testSelector").value,
    selectedChapters,
    currentQuestion,
    selectedAnswers,
    isCurrentAnswered,
    showResult,
    statCorrectCount,
    currentStreak,
    maxStreak,
    activeQuizData
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadProgress(currentFileRoute) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (state.testRoute === currentFileRoute && state.activeQuizData && state.activeQuizData.length > 0) {
        if (!state.showResult && state.selectedAnswers.some(ans => ans !== null)) {
          if (confirm("Lưu ý: Bạn có một bài làm đang dang dở cho đề này. Bạn có muốn tiếp tục làm không?")) {
            selectedChapters = state.selectedChapters || [];
            currentQuestion = state.currentQuestion || 0;
            selectedAnswers = state.selectedAnswers || [];
            isCurrentAnswered = state.isCurrentAnswered || false;
            showResult = state.showResult || false;
            statCorrectCount = state.statCorrectCount || 0;
            currentStreak = state.currentStreak || 0;
            maxStreak = state.maxStreak || 0;
            activeQuizData = state.activeQuizData;

            renderChapterCheckboxes();
            return true;
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch (e) {
      console.error("Lỗi khi tải tiến trình:", e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return false;
}

window.toggleChapterDropdown = function () {
  const menu = document.getElementById("chapterDropdownMenu");
  if (menu) menu.classList.toggle("hidden");
};

document.addEventListener("click", function (e) {
  const btn = document.getElementById("chapterDropdownBtn");
  const menu = document.getElementById("chapterDropdownMenu");
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

function convertToeicJsonToQuizData(toeicJson) {
  let mappedQuestions = [];
  let chapters = {};

  let isListeningSection = (toeicJson.section || "").toLowerCase().includes("listen") ||
    (toeicJson.test_name || "").toLowerCase().includes("listen");

  if (toeicJson.parts && Array.isArray(toeicJson.parts)) {
    toeicJson.parts.forEach((part, index) => {
      let chapterId = (part.part_number && part.part_number !== 0) ? part.part_number : (index + 1);
      chapters[chapterId] = `Part ${chapterId}: ${part.title || 'Incomplete Context'}`;

      if (part.question_groups && Array.isArray(part.question_groups)) {
        part.question_groups.forEach(group => {

          let contextHtml = "";
          if (group.context_text) contextHtml += `<div class="text-sm italic text-slate-500 dark:text-slate-400 mb-3"><i class="fa-solid fa-circle-info mr-1"></i> ${group.context_text}</div>`;
          if (group.passage_title) contextHtml += `<div class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">${group.passage_title}</div>`;

          if (group.passage_content) {
            let typeBadge = group.passage_type ? `<span class="inline-flex items-center gap-1 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-2.5 py-1 rounded-md text-xs font-bold mb-3 uppercase tracking-wider"><i class="fa-solid fa-tag"></i> ${group.passage_type}</span><br>` : "";
            contextHtml += `<div class="mb-5 p-4 md:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 font-medium whitespace-pre-line text-[14px] md:text-base max-h-72 overflow-y-auto leading-relaxed shadow-inner">${typeBadge}${group.passage_content}</div>`;
          }

          if (group.script && Array.isArray(group.script)) {
            let scriptHtml = group.script.map(s => `<span class="font-bold text-primary dark:text-blue-400">${s.speaker}:</span> <span class="text-slate-700 dark:text-slate-300">${s.line}</span>`).join("<br><br>");
            contextHtml += `<div class="mb-5 p-4 md:p-5 bg-blue-50/50 dark:bg-slate-800/80 rounded-lg border border-blue-100 dark:border-slate-700 text-[14px] md:text-base max-h-72 overflow-y-auto shadow-inner">
                              <div class="font-bold mb-3 text-slate-800 dark:text-slate-200 border-b border-blue-200 dark:border-slate-600 pb-2"><i class="fa-solid fa-headphones mr-2"></i> Audio Transcript:</div>
                              ${scriptHtml}
                             </div>`;
          }

          if (group.graphic_description) {
            contextHtml += `<div class="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border-l-4 border-amber-500 text-sm italic text-slate-700 dark:text-slate-300"><i class="fa-solid fa-image mr-2 text-amber-500"></i>[Mô tả hình ảnh/biểu đồ: ${group.graphic_description}]</div>`;
          }

          if (group.questions && Array.isArray(group.questions)) {
            group.questions.forEach(q => {
              let qText = q.question_text ? q.question_text.trim() : "";

              if (q.has_image && q.image_ref) {
                let imgDesc = q.image_description ? `<div class="text-sm text-slate-500 dark:text-slate-400 mt-3 text-center"><i class="fa-solid fa-closed-captioning mr-1"></i> ${q.image_description}</div>` : "";
                let imgSrc = q.image_ref;
                if (!imgSrc.match(/\.(jpeg|jpg|gif|png|svg)$/i)) imgSrc += ".png";

                let imgHtml = `
                <div class="w-full max-w-md my-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-slate-800 p-2">
                    <img src="${imgSrc}" alt="Question Image" class="w-full h-auto object-contain rounded animate-pop-in" 
                         onerror="this.onerror=null; this.outerHTML='<div class=\\'p-6 text-center text-red-500\\'><i class=\\'fa-solid fa-image-slash text-4xl mb-3\\'></i><br><span class=\\'font-medium\\'>Không tìm thấy ảnh tại đường dẫn:</span><br><code class=\\'text-sm bg-red-50 dark:bg-red-900/30 p-1 rounded mt-2 block\\'>${imgSrc}</code></div>';">
                    ${imgDesc}
                </div>`;

                if (qText === "") { qText = imgHtml; }
                else { qText = imgHtml + `<div class="mt-4">${qText}</div>`; }
              }

              let ttsRawText = "";
              if (isListeningSection || toeicJson.test_name.includes("listen")) {
                if (group.script && Array.isArray(group.script)) {
                  ttsRawText += group.script.map(s => s.line).join(". ") + ". ";
                }
                if (q.question_text) {
                  ttsRawText += "Question. " + q.question_text + ". ";
                }
                let optKeys = Object.keys(q.options || {});
                optKeys.forEach(k => {
                  ttsRawText += k + ". " + q.options[k] + ". ";
                });
              }

              let fullQuestionText = `${contextHtml}
                <div class="flex items-start gap-3 mt-6">
                    <div class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-300 dark:border-slate-600 shadow-sm">
                        ${q.question_number}
                    </div>
                    <div class="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 leading-snug pt-0.5 w-full">
                        ${qText}
                    </div>
                </div>`;

              let optionKeys = Object.keys(q.options || {});
              let optionsArray = optionKeys.map(key => `${key}. ${q.options[key]}`);
              let correctIndex = optionKeys.indexOf(q.answer);
              if (correctIndex === -1) correctIndex = 0;

              mappedQuestions.push({
                question: fullQuestionText,
                options: optionsArray,
                correct: correctIndex,
                explanation: q.explanation || "Không có giải thích chi tiết.",
                chapter: chapterId,
                ttsText: ttsRawText
              });
            });
          }
        });
      }
    });
  }
  return { chapterNames: chapters, questions: mappedQuestions };
}

async function loadSelectedTest() {
  stopAudio();
  const fileRoute = document.getElementById("testSelector").value;
  const status = document.getElementById("dataSourceStatus");
  if (status) status.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang tải: ${fileRoute}...`;

  try {
    const response = await fetch(fileRoute);
    if (!response.ok) throw new Error("Mất kết nối tới file");

    let jsonData = await response.json();
    if (jsonData.parts) jsonData = convertToeicJsonToQuizData(jsonData);

    rawQuestions = jsonData.questions || [];
    chapterNames = jsonData.chapterNames || {};

    selectedChapters = Object.keys(chapterNames).map(k => String(k));

    const isRestored = loadProgress(fileRoute);

    if (!isRestored) {
      renderChapterCheckboxes();
      applySettings();
    } else {
      render();
    }

    if (status) status.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-1 animate-pop-in"></i> Nạp dữ liệu thành công!`;
  } catch (error) {
    console.error(error);
    if (status) status.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-500 mr-1"></i> Lỗi tải file. Vui lòng chạy qua Live Server.`;
  }
}

function renderChapterCheckboxes() {
  const container = document.getElementById("chapterList");
  if (!container) return;
  container.innerHTML = "";

  const keys = Object.keys(chapterNames);
  if (keys.length === 0) {
    container.innerHTML = `<div class="text-slate-400 text-sm p-2 text-center">Không có phân chia Part</div>`;
    document.getElementById("chapterDropdownBtnText").innerText = "Không phân chia Part";
    return;
  }

  keys.forEach(key => {
    const isChecked = selectedChapters.includes(String(key));
    const div = document.createElement("div");
    div.className = "flex items-center gap-3 py-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors";
    div.innerHTML = `
      <label class="flex items-center gap-3 cursor-pointer w-full text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
        <input type="checkbox" value="${key}" class="chapter-box w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" 
          ${isChecked ? "checked" : ""} onchange="onChapterCheckboxChange()">
        ${chapterNames[key]}
      </label>
    `;
    container.appendChild(div);
  });
  updateDropdownButtonText();
}

window.onChapterCheckboxChange = function () {
  const boxes = document.querySelectorAll(".chapter-box");
  selectedChapters = [];
  boxes.forEach(box => { if (box.checked) selectedChapters.push(String(box.value)); });
  const selectAll = document.getElementById("selectAllChapters");
  if (selectAll) selectAll.checked = (selectedChapters.length === boxes.length);
  updateDropdownButtonText();
};

window.toggleAllChapters = function (master) {
  const boxes = document.querySelectorAll(".chapter-box");
  selectedChapters = [];
  boxes.forEach(box => {
    box.checked = master.checked;
    if (master.checked) selectedChapters.push(String(box.value));
  });
  updateDropdownButtonText();
};

function updateDropdownButtonText() {
  const btnText = document.getElementById("chapterDropdownBtnText");
  if (!btnText) return;
  if (selectedChapters.length === 0) btnText.innerText = "Chưa chọn Part nào";
  else if (selectedChapters.length === Object.keys(chapterNames).length) btnText.innerText = "Tất cả các Phần thi";
  else btnText.innerText = `Đang chọn (${selectedChapters.length}) Part`;
}

window.applySettings = function () {
  stopAudio();
  let filtered = rawQuestions.filter(q => selectedChapters.includes(String(q.chapter)));
  if (filtered.length === 0) { alert("Vui lòng tích chọn ít nhất 1 Part để học!"); return; }

  const isRandom = document.getElementById("randomToggle")?.checked;
  if (isRandom) {
    // CHỈ TRỘN THỨ TỰ CÂU HỎI. KHÔNG TRỘN A, B, C, D NỮA!
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
  }

  activeQuizData = filtered;
  currentQuestion = 0;
  selectedAnswers = new Array(activeQuizData.length).fill(null);
  isCurrentAnswered = false;
  showResult = false;
  peekMode = false;
  statCorrectCount = 0;
  currentStreak = 0;
  maxStreak = 0;

  saveProgress();
  // startAudioPreloadQueue();
  render();
};


// ─────────────────────────────────────────────────────
// HỆ THỐNG RENDER (CÓ NÚT XEM TRƯỚC ĐÁP ÁN)
// ─────────────────────────────────────────────────────

// Hàm bật/tắt xem trước đáp án
window.togglePeek = function () {
  playSound("click");
  peekMode = !peekMode;
  render();
}


function render() {
  const app = document.getElementById("app");
  if (!app) return;

  if (activeQuizData.length === 0) {
    app.innerHTML = `
      <div class="animate-slide-up bg-white dark:bg-darkCard rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-10 shadow-sm text-center w-full mx-4 max-w-lg">
        <i class="fa-solid fa-box-open text-4xl text-slate-300 dark:text-slate-600 mb-4"></i>
        <h3 class="font-bold text-lg md:text-xl text-slate-700 dark:text-slate-300">Đề thi đang trống</h3>
        <p class="text-slate-500 text-sm mt-2">Vui lòng tải dữ liệu hoặc kiểm tra lại bộ lọc Part.</p>
      </div>`;
    return;
  }

  if (showResult) {
    const rate = ((statCorrectCount / activeQuizData.length) * 100).toFixed(1);
    app.innerHTML = `
      <div class="animate-slide-up bg-white dark:bg-darkCard rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm w-full mx-4 max-w-3xl text-center">
        <div class="animate-pop-in inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
            <i class="fa-solid fa-flag-checkered text-2xl md:text-3xl"></i>
        </div>
        <h2 class="text-xl md:text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">KẾT QUẢ BÀI LÀM</h2>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <i class="fa-solid fa-check-circle text-emerald-500 text-lg md:text-xl mb-1 md:mb-2"></i>
            <div class="text-[10px] md:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 text-center">Số câu đúng</div>
            <div class="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${statCorrectCount} <span class="text-xs md:text-sm text-slate-400 font-normal">/ ${activeQuizData.length}</span></div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <i class="fa-solid fa-percent text-blue-500 text-lg md:text-xl mb-1 md:mb-2"></i>
            <div class="text-[10px] md:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 text-center">Tỷ lệ chính xác</div>
            <div class="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${rate}%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <i class="fa-solid fa-fire text-orange-500 text-lg md:text-xl mb-1 md:mb-2"></i>
            <div class="text-[10px] md:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 text-center">Chuỗi hiện tại</div>
            <div class="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${currentStreak}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <i class="fa-solid fa-trophy text-yellow-500 text-lg md:text-xl mb-1 md:mb-2"></i>
            <div class="text-[10px] md:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 text-center">Kỷ lục chuỗi</div>
            <div class="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${maxStreak}</div>
          </div>
        </div>

        <button onclick="playSound('click'); showResult=false; applySettings();"
          class="w-full md:w-auto bg-primary hover:bg-primaryHover text-white font-medium rounded-xl md:rounded-lg px-6 py-3.5 md:py-3 flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105 shadow-md active:scale-95">
          <i class="fa-solid fa-rotate-right"></i> Làm lại đề này
        </button>
      </div>`;
    return;
  }

  const q = activeQuizData[currentQuestion];
  const userAns = selectedAnswers[currentQuestion];

  let optionsHtml = "";
  q.options.forEach((opt, idx) => {
    let btnClass = "bg-white dark:bg-darkCard border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary active:bg-slate-100 dark:active:bg-slate-800 text-slate-700 dark:text-slate-300";
    let iconHtml = `<span class="w-7 h-7 md:w-6 md:h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-sm md:text-xs font-bold text-slate-500 mr-3 shrink-0">${String.fromCharCode(65 + idx)}</span>`;

    if (userAns !== null) {
      if (idx === q.correct) {
        btnClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-medium z-10 shadow-md";
        iconHtml = `<i class="fa-solid fa-circle-check text-emerald-500 text-2xl md:text-xl mr-3 shrink-0 animate-pop-in"></i>`;
      } else if (idx === userAns) {
        btnClass = "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-800 dark:text-red-400 font-medium z-10 animate-shake";
        iconHtml = `<i class="fa-solid fa-circle-xmark text-red-500 text-2xl md:text-xl mr-3 shrink-0"></i>`;
      } else {
        btnClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed";
      }
    } else if (peekMode) {
      if (idx === q.correct) {
        btnClass = "bg-emerald-50/70 dark:bg-emerald-900/10 border-emerald-400 border-dashed text-emerald-700 dark:text-emerald-300 font-medium z-10";
        iconHtml = `<i class="fa-solid fa-eye text-emerald-500 text-2xl md:text-xl mr-3 shrink-0 animate-pop-in"></i>`;
      }
    }

    optionsHtml += `
      <button onclick="${userAns === null ? `selectOption(${idx})` : 'void(0)'}"
        class="w-full text-left p-4 md:p-4 min-h-[3.5rem] rounded-xl md:rounded-lg border-2 transition-all duration-200 flex items-center ${btnClass}">
        ${iconHtml}
        <span class="leading-relaxed text-[15px] md:text-base break-words w-full">${opt.replace(/^[A-D]\.\s*/, '')}</span>
      </button>`;
  });

  let explanationHtml = "";
  if (userAns !== null || peekMode) {
    explanationHtml = `
      <div class="animate-pop-in mt-5 p-4 md:p-5 bg-blue-50/50 dark:bg-slate-800/80 rounded-xl md:rounded-lg border border-blue-100 dark:border-slate-700 text-[14px] md:text-base text-slate-700 dark:text-slate-300 shadow-inner">
        <div class="font-bold text-primary dark:text-blue-400 flex items-center gap-2 mb-2">
            <i class="fa-solid fa-lightbulb text-yellow-500"></i> ${peekMode && userAns === null ? 'Gợi ý / Giải thích:' : 'Giải thích:'}
        </div>
        <p class="whitespace-pre-line leading-relaxed">${q.explanation}</p>
      </div>`;
  }

  let helperBtnsHtml = "";
  if (q.ttsText && q.ttsText.trim() !== "") {
    helperBtnsHtml += `
      <button onclick="toggleTTS(this)"
        class="flex-1 flex items-center justify-center gap-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl md:rounded-lg py-3 md:py-2.5 px-4 transition-colors shadow-sm active:bg-indigo-200">
        <i class="fa-solid fa-volume-high text-lg"></i> Nghe Audio
      </button>
    `;
  }
  if (userAns === null) {
    helperBtnsHtml += `
        <button onclick="togglePeek()"
          class="flex-1 flex items-center justify-center gap-2 ${peekMode ? 'bg-amber-500 text-white shadow-md btn-pulse-emerald' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shadow-sm'} font-bold rounded-xl md:rounded-lg py-3 md:py-2.5 px-4 transition-colors active:scale-95">
          <i class="fa-solid ${peekMode ? 'fa-eye-slash' : 'fa-eye'} text-lg"></i> ${peekMode ? 'Ẩn Đáp Án' : 'Xem Đáp Án'}
        </button>
      `;
  }

  const nextBtnClass = userAns !== null
    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md btn-pulse-blue'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';

  app.innerHTML = `
    <div class="flex w-full max-w-6xl mx-auto items-stretch justify-center gap-4 relative">
      
      <div class="hidden md:flex flex-col justify-center">
          <button onclick="goBack()" ${currentQuestion === 0 ? "disabled" : ""}
            class="shrink-0 flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white dark:bg-darkCard border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary text-slate-500 dark:text-slate-400 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
            <i class="fa-solid fa-chevron-left text-xl"></i>
          </button>
      </div>

      <div class="w-full max-w-3xl bg-white dark:bg-darkCard md:rounded-2xl border-y md:border border-slate-200 dark:border-slate-700 p-4 md:p-8 shadow-sm flex flex-col gap-4 pb-28 md:pb-8">
        
        <div class="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-200 dark:border-slate-700 pb-3 md:pb-4 gap-2 md:gap-4">
          <div class="flex flex-wrap gap-2 md:gap-3">
              <span class="inline-flex items-center gap-1.5 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Câu ${currentQuestion + 1} / ${activeQuizData.length}
              </span>
              <span class="inline-flex items-center gap-1.5 font-medium text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800 truncate max-w-[200px] md:max-w-none">
                  <i class="fa-solid fa-bookmark opacity-70"></i> ${chapterNames[q.chapter] ? chapterNames[q.chapter].split(':')[0] : 'Part ' + q.chapter}
              </span>
          </div>
          <div class="self-end md:self-auto flex items-center gap-1.5 font-medium text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 md:mt-0">
            <i class="fa-solid fa-fire text-orange-500"></i> Chuỗi: <span class="font-bold text-slate-800 dark:text-slate-200">${currentStreak}</span>
          </div>
        </div>
        
        <div class="flex flex-row gap-3 mt-1 mb-2 w-full md:w-auto md:max-w-md">
          ${helperBtnsHtml}
        </div>

        <div class="w-full text-[15px] md:text-base">${q.question}</div>
        <div class="flex flex-col gap-2.5 md:gap-3 mt-2">${optionsHtml}</div>
        ${explanationHtml}
      </div>

      <div class="hidden md:flex flex-col justify-center">
          ${currentQuestion === activeQuizData.length - 1 && userAns !== null
      ? `<button onclick="submitQuiz()" class="shrink-0 flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md active:scale-95 btn-pulse-emerald animate-pop-in tooltip" title="Nộp bài">
                  <i class="fa-solid fa-check-double text-xl"></i>
                 </button>`
      : `<button onclick="goNext()" ${currentQuestion === activeQuizData.length - 1 ? "disabled" : ""}
                  class="shrink-0 flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white dark:bg-darkCard border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary text-slate-500 dark:text-slate-400 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                  <i class="fa-solid fa-chevron-right text-xl"></i>
                 </button>`
    }
      </div>

    </div>

    <div class="md:hidden flex fixed bottom-0 left-0 w-full bg-white/95 dark:bg-darkCard/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-3 z-50 justify-between items-center gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onclick="goBack()" ${currentQuestion === 0 ? "disabled" : ""}
          class="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl py-3.5 px-2 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
          <i class="fa-solid fa-arrow-left"></i> <span class="text-sm">Trước</span>
        </button>

        ${currentQuestion === activeQuizData.length - 1 && userAns !== null
      ? `<button onclick="submitQuiz()" class="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-3.5 px-4 active:scale-95 transition-transform shadow-md btn-pulse-emerald animate-pop-in">
                <i class="fa-solid fa-flag-checkered"></i> <span class="text-sm">Nộp Bài</span>
               </button>`
      : `<button onclick="goNext()" ${currentQuestion === activeQuizData.length - 1 ? "disabled" : ""}
                class="flex-[2] flex items-center justify-center gap-2 ${nextBtnClass} font-bold rounded-xl py-3.5 px-4 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
                <span class="text-sm">Câu Tiếp</span> <i class="fa-solid fa-arrow-right"></i>
               </button>`
    }
    </div>
  `;
  // preloadPuterAudio();
}

window.selectOption = function (idx) {
  if (selectedAnswers[currentQuestion] !== null) return;
  const q = activeQuizData[currentQuestion];
  selectedAnswers[currentQuestion] = idx;
  isCurrentAnswered = true;

  if (idx === q.correct) {
    statCorrectCount++; currentStreak++;
    if (currentStreak > maxStreak) maxStreak = currentStreak;
    playSound("correct");
    if (currentStreak >= 3) playStreakSound(currentStreak);
    if (currentQuestion === activeQuizData.length - 1) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  } else {
    currentStreak = 0; playSound("wrong");
  }

  saveProgress();
  render();

  if (idx === q.correct && currentQuestion < activeQuizData.length - 1) {
    setTimeout(() => {
      if (currentQuestion < activeQuizData.length - 1 && selectedAnswers[currentQuestion] === q.correct) {
        stopAudio();
        peekMode = false; // Reset peekMode khi qua câu mới
        currentQuestion++;
        isCurrentAnswered = selectedAnswers[currentQuestion] !== null;
        saveProgress();
        render();
      }
    }, 1500);
  }
};

window.goBack = function () {
  stopAudio();
  peekMode = false;
  playSound("click");
  if (currentQuestion > 0) {
    currentQuestion--;
    isCurrentAnswered = selectedAnswers[currentQuestion] !== null;
    saveProgress();
    render();
  }
};

window.goNext = function () {
  stopAudio();
  peekMode = false;
  playSound("click");
  if (currentQuestion < activeQuizData.length - 1) {
    currentQuestion++;
    isCurrentAnswered = selectedAnswers[currentQuestion] !== null;
    saveProgress();
    render();
  }
};

window.submitQuiz = function () {
  stopAudio();
  playSound("click");
  showResult = true;
  saveProgress();
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
  render();
};

window.toggleDarkMode = function () {
  playSound("click");
  const html = document.documentElement;
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  if (html.classList.contains("dark")) {
    html.classList.remove("dark");
    if (icon) icon.className = "fa-solid fa-moon";
    if (text) text.innerText = "Giao diện tối";
  } else {
    html.classList.add("dark");
    if (icon) icon.className = "fa-solid fa-sun";
    if (text) text.innerText = "Giao diện sáng";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  loadSelectedTest();
});
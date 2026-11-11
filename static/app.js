const promptBox = document.getElementById("prompt");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendButton = document.getElementById("sendButton");
const voiceToggle = document.getElementById("voiceToggle");
let history = [];
let voiceReplies = true;
let busy = false;

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function addMessage(text, role, link) {
  welcome.style.display = "none";
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "SPIRIT";
  const body = document.createElement("div");
  body.textContent = text;
  bubble.append(label, body);
  if (link) {
    const a = document.createElement("a");
    a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = "Open search results ↗";
    a.style.display = "inline-block"; a.style.marginTop = "10px";
    bubble.appendChild(a);
  }
  messagesEl.appendChild(bubble);
  document.getElementById("conversation").scrollTop = document.getElementById("conversation").scrollHeight;
}
function speak(text) {
  if (!voiceReplies || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
function setBusy(value) {
  busy = value; sendButton.disabled = value;
  sendButton.innerHTML = value ? "Thinking…" : 'Send <span>➤</span>';
}
async function sendMessage(prefilled) {
  if (busy) return;
  const text = (prefilled ?? promptBox.value).trim();
  if (!text) return;
  promptBox.value = ""; promptBox.style.height = "auto";
  addMessage(text, "user");
  history.push({role:"user", content:text});
  setBusy(true);
  const waiting = document.createElement("div");
  waiting.className = "message assistant"; waiting.textContent = "SPIRIT is thinking…";
  messagesEl.appendChild(waiting);
  try {
    const response = await fetch("/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:history})
    });
    const data = await response.json();
    waiting.remove();
    const answer = data.reply || "No answer received.";
    addMessage(answer, "assistant", data.link);
    history.push({role:"assistant", content:answer});
    if (history.length > 20) history = history.slice(-20);
    speak(answer);
    if (!response.ok) toast("Please check SPIRIT's server configuration.");
  } catch (error) {
    waiting.remove();
    addMessage("I couldn't connect to SPIRIT. Check that the app server is running and try again.", "assistant");
    toast("Connection error");
  } finally { setBusy(false); }
}
sendButton.addEventListener("click", () => sendMessage());
promptBox.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
promptBox.addEventListener("input", () => {
  promptBox.style.height = "auto";
  promptBox.style.height = Math.min(promptBox.scrollHeight, 150) + "px";
});
document.querySelectorAll(".suggestion").forEach(button =>
  button.addEventListener("click", () => sendMessage(button.dataset.prompt))
);
document.getElementById("newChat").addEventListener("click", () => {
  history = []; messagesEl.innerHTML = ""; welcome.style.display = "";
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  document.querySelector(".sidebar").classList.remove("open");
});
voiceToggle.addEventListener("click", () => {
  voiceReplies = !voiceReplies;
  voiceToggle.classList.toggle("active", voiceReplies);
  voiceToggle.innerHTML = voiceReplies ? "🔊 <span>Voice replies</span>" : "🔇 <span>Voice replies off</span>";
  toast(voiceReplies ? "Spoken replies enabled" : "Spoken replies disabled");
  if (!voiceReplies && "speechSynthesis" in window) speechSynthesis.cancel();
});
document.getElementById("voiceInput").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { toast("Voice input isn't supported here. Try Chrome."); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US"; recognition.interimResults = false;
  recognition.onstart = () => toast("Listening… speak now");
  recognition.onerror = () => toast("Couldn't hear that. Please try again.");
  recognition.onresult = event => sendMessage(event.results[0][0].transcript);
  recognition.start();
});
document.getElementById("menuButton").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

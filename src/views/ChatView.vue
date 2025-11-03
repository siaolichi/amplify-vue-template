<template>
  <div class="chat-view">
    <div class="chat-view__wrapper">
      <div class="chat-body" ref="messagesWrapper" aria-live="polite">
        <div class="message-list">
          <article v-for="message in messages" :key="message.id" :class="['message', `message--${message.role}`]">
            <div class="message__avatar" :aria-label="message.role === 'user' ? '使用者' : 'Dreamlog AI'">
              <span v-if="message.role === 'assistant'">DL</span>
              <span v-else>你</span>
            </div>
            <div class="message__bubble">
              <div class="message__meta">
                <div class="message__author">
                  {{ message.role === "user" ? "你" : "Dreamlog AI" }}
                </div>
                <div class="message__time">{{ formatTime(message.timestamp) }}</div>
              </div>
              <p class="message__content">{{ message.content }}</p>
            </div>
          </article>
        </div>

        <div v-if="isAssistantTyping" class="typing-indicator" role="status">
          <div class="message message--assistant">
            <div class="message__avatar">DL</div>
            <div class="message__bubble message__bubble--typing">
              <span class="typing-indicator__dot"></span>
              <span class="typing-indicator__dot"></span>
              <span class="typing-indicator__dot"></span>
            </div>
          </div>
        </div>
      </div>

      <footer class="chat-footer">
        <div class="chat-footer__input">
          <textarea
            ref="inputRef"
            v-model="draft"
            class="chat-footer__textarea"
            placeholder="輸入你任何想問的問題…"
            rows="1"
            @keydown="onInputKeyDown"
          ></textarea>
          <button
            type="button"
            class="chat-footer__send"
            :disabled="!draft.trim() || isAssistantTyping"
            @click="handleSubmit"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4.5 20.5L21 12 4.5 3.5l1.5 7 9 1.5-9 1.5-1.5 7z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <p class="chat-footer__hint">按 Enter 發送，Shift + Enter 換行</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const CHAT_API_URL = "https://response-api-0140b3406b18.herokuapp.com/api/chat";
const INACTIVITY_TIMEOUT = 180000;

let messageId = 0;
let inactivityTimerId = null;
let stopDraftWatcher = null;
let hasUserTyped = false;

const draft = ref("");
const isAssistantTyping = ref(false);
const messagesWrapper = ref(null);
const inputRef = ref(null);

const messages = ref([
  createMessage("assistant", "你好，MiraMirage 已經消失了四個月。給我一個時間，我可以告訴你發生什麼事。"),
]);

function updateViewportHeight() {
  document.documentElement.style.setProperty("--chat-view-height", `${window.innerHeight}px`);
}

function createMessage(role, content) {
  messageId += 1;
  return {
    id: messageId,
    role,
    content: content.trim(),
    timestamp: new Date(),
  };
}

function handleSubmit() {
  const content = draft.value.trim();
  if (!content || isAssistantTyping.value) return;

  messages.value.push(createMessage("user", content));
  draft.value = "";
  scrollToBottom({ smooth: true });
  triggerAssistantResponse();
}

async function triggerAssistantResponse() {
  isAssistantTyping.value = true;
  scrollToBottom({ smooth: true });

  try {
    const payload = {
      messages: messages.value.map(({ role, content }) => ({
        role,
        content: content.trim(),
      })),
    };

    const response = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Chat API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : "（沒有內容）";

    messages.value.push(createMessage("assistant", reply));
  } catch (error) {
    console.error("Chat API error:", error);
    messages.value.push(createMessage("assistant", "抱歉，我暫時無法回應。請稍後再試。"));
  } finally {
    isAssistantTyping.value = false;
    scrollToBottom({ smooth: true });
  }
}

function onInputKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scrollToBottom(options = {}) {
  const { smooth = false } = options;
  nextTick(() => {
    const element = messagesWrapper.value;
    if (!element) return;
    const scrollOptions = {
      top: element.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    };

    element.scrollTo(scrollOptions);
  });
}

function resetInactivityTimer() {
  clearInactivityTimer();
  inactivityTimerId = window.setTimeout(() => {
    window.location.reload();
  }, INACTIVITY_TIMEOUT);
}

function clearInactivityTimer() {
  if (inactivityTimerId !== null) {
    clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
}

function startInactivityWatcher() {
  if (stopDraftWatcher) return;
  stopDraftWatcher = watch(draft, (newValue) => {
    const trimmed = typeof newValue === "string" ? newValue.trim() : "";
    if (!hasUserTyped) {
      if (!trimmed) {
        return;
      }
      hasUserTyped = true;
    }
    resetInactivityTimer();
  });
}

function stopInactivityWatcher() {
  if (stopDraftWatcher) {
    stopDraftWatcher();
    stopDraftWatcher = null;
  }
  hasUserTyped = false;
  clearInactivityTimer();
}

onMounted(() => {
  scrollToBottom();
  inputRef.value?.focus();
  startInactivityWatcher();
  updateViewportHeight();
  window.addEventListener("resize", updateViewportHeight);
});

onBeforeUnmount(() => {
  stopInactivityWatcher();
  window.removeEventListener("resize", updateViewportHeight);
  document.documentElement.style.removeProperty("--chat-view-height");
});
</script>

<style scoped lang="scss">
.chat-view {
  min-height: calc(var(--chat-view-height, 100%));
  height: calc(var(--chat-view-height, 100%));
  display: flex;
  justify-content: center;
  padding: clamp(24px, 6vw, 64px) 16px 32px;
  color: #f5f6ff;
}

.chat-view__wrapper {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  background: rgba(9, 11, 23, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  box-shadow: 0 30px 80px rgba(8, 12, 28, 0.55);
  backdrop-filter: blur(6px);
  overflow: hidden;
}

.chat-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: clamp(24px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chat-body::-webkit-scrollbar {
  width: 8px;
}

.chat-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  width: 100%;
}

.message--user {
  flex-direction: row-reverse;
}

.message__avatar {
  flex: 0 0 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: rgba(59, 70, 134, 0.55);
  color: white;
}

.message--user .message__avatar {
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.8), rgba(255, 105, 180, 0.7));
  color: #1a1022;
}

.message__bubble {
  flex: 1 1 auto;
  padding: 18px;
  border-radius: 20px;
  background: rgba(23, 28, 52, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 12px 24px rgba(8, 12, 28, 0.35);
  min-width: 0;
}

.message--user .message__bubble {
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.22), rgba(241, 71, 149, 0.28));
  border-color: rgba(233, 30, 99, 0.35);
  color: #fff5fa;
}

.message__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.message__time {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.5);
}

.message--user .message__meta {
  flex-direction: row-reverse;
}

.message--user .message__time {
  margin-left: 0;
  margin-right: auto;
  text-align: left;
}

.message__author {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
}

.message__content {
  white-space: pre-wrap;
  color: rgba(255, 255, 255, 0.92);
  word-break: break-word;
}

.message--user .message__content {
  color: rgba(255, 255, 255, 0.95);
}

.message__bubble--typing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: auto;
  padding-right: 22px;
}

.typing-indicator__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  animation: typing 1.2s infinite ease-in-out;
}

.typing-indicator__dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator__dot:nth-child(3) {
  animation-delay: 0.3s;
}

.chat-footer {
  padding: clamp(20px, 3.5vw, 32px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(0deg, rgba(9, 11, 23, 0.95), rgba(9, 11, 23, 0.8));
}

.chat-footer__input {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 20px;
  background: rgba(12, 15, 31, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.chat-footer__textarea {
  flex: 1 1 auto;
  background: transparent;
  border: none;
  color: #f5f6ff;
  font: inherit;
  resize: none;
  max-height: 200px;
  outline: none;
}

.chat-footer__textarea::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.chat-footer__send {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: none;
  color: white;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.95), rgba(163, 69, 255, 0.9));
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.chat-footer__send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 25px rgba(163, 69, 255, 0.35);
}

.chat-footer__send:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.chat-footer__hint {
  margin-top: 12px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .chat-view {
    padding: 16px 12px 24px;
  }

  .chat-view__wrapper {
    border-radius: 20px;
  }

  .chat-footer__input {
    padding: 12px;
    border-radius: 16px;
  }
}
</style>

// Replace this with your deployed Cloudflare Worker URL.
// Example: "https://loreal-chatbot.your-subdomain.workers.dev/"
const workerUrl = "https://lorealmiami.theeboutiqueimages.workers.dev/";

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// Keep the assistant focused on L'Oréal and beauty-related questions.
const systemPrompt =
  "You are L’Oréal’s beauty assistant. Answer questions about L’Oréal products and brands, skincare, makeup, haircare, fragrance, beauty routines, recommendations, and related beauty topics. Politely decline questions unrelated to L’Oréal or beauty, and invite the user to ask about those topics instead. Use earlier conversation details, such as the user’s name and preferences, when relevant. Do not invent product details; ask a brief clarifying question when needed.";

// Keep this conversation in memory so the assistant can use earlier messages.
const conversationHistory = [
  { role: "system", content: systemPrompt },
];

function addMessage(content, sender) {
  const message = document.createElement("div");
  message.className = `msg ${sender}`;
  message.textContent = content;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setLoading(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;

  if (isLoading) {
    sendBtn.innerHTML = '<span class="material-icons">hourglass_top</span>';
  } else {
    sendBtn.innerHTML = '<span class="material-icons">send</span>';
  }
}

// Welcome message shown when the page loads.
addMessage("👋 Hello! I’m your L’Oréal beauty assistant. Ask me about skincare, makeup, haircare, or a personalized routine.", "ai");

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  // Show only the latest exchange; conversationHistory still keeps prior context.
  chatWindow.textContent = "";
  addMessage(message, "user");
  conversationHistory.push({ role: "user", content: message });
  userInput.value = "";
  setLoading(true);

  try {
    // Send the user's message to the Cloudflare Worker.
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    // The Cloudflare Worker returns the OpenAI response.
    // We read the assistant message from the first choice.
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("Worker response did not include assistant message content.");
    }

    conversationHistory.push({ role: "assistant", content: reply });
    addMessage(reply, "ai");
  } catch (error) {
    console.error(error);
    // Remove the failed message so it is not sent as unanswered context later.
    if (conversationHistory[conversationHistory.length - 1].role === "user") {
      conversationHistory.pop();
    }
    addMessage(
      "Sorry, I couldn’t reach the assistant. Please check your Cloudflare Worker URL and try again.",
      "ai"
    );
  } finally {
    setLoading(false);
    userInput.focus();
  }
});

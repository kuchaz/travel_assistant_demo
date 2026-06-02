const destinationData = {
  "New York": {
    intro: "A fast-paced city good for sightseeing, food, museums, and shopping.",
    interests: {
      food: [
        "Try a local brunch in Manhattan",
        "Visit Chelsea Market for casual food tasting",
        "Have dinner in Koreatown"
      ],
      culture: [
        "Visit the Metropolitan Museum of Art",
        "Walk through the New York Public Library area",
        "See a Broadway-style evening show"
      ],
      nature: [
        "Walk through Central Park",
        "Visit the High Line",
        "Watch sunset at Brooklyn Bridge Park"
      ],
      shopping: [
        "Shop around SoHo",
        "Visit Fifth Avenue",
        "Explore local design stores in Brooklyn"
      ]
    }
  },
  Boston: {
    intro: "A compact city ideal for history, education, seafood, and walking tours.",
    interests: {
      food: [
        "Try clam chowder near Quincy Market",
        "Have seafood dinner at the harbor",
        "Visit a local bakery in the morning"
      ],
      culture: [
        "Walk the Freedom Trail",
        "Visit the Museum of Fine Arts",
        "Explore Harvard Square"
      ],
      nature: [
        "Relax in Boston Common",
        "Walk along the Charles River",
        "Take a short harbor view break"
      ],
      shopping: [
        "Browse shops on Newbury Street",
        "Visit Quincy Market stores",
        "Explore small bookstores and gift shops"
      ]
    }
  },
  Washington: {
    intro: "A strong choice for monuments, museums, and formal cultural attractions.",
    interests: {
      food: [
        "Try a casual local brunch near Dupont Circle",
        "Visit a food hall for lunch",
        "Have dinner in Georgetown"
      ],
      culture: [
        "Visit the Smithsonian museums",
        "See the Lincoln Memorial and National Mall",
        "Explore the U.S. Capitol area"
      ],
      nature: [
        "Walk around the Tidal Basin",
        "Spend time in the National Arboretum",
        "Enjoy a riverside walk in Georgetown"
      ],
      shopping: [
        "Explore Georgetown shopping streets",
        "Visit Union Market stores",
        "Browse museum gift shops"
      ]
    }
  }
};

const budgetNotes = {
  low: "This plan focuses on walking, public transit, and lower-cost attractions.",
  medium: "This plan balances famous attractions with comfort and moderate spending.",
  high: "This plan includes more premium dining and flexible transportation choices."
};

const destinationSelect = document.getElementById("destination");
const destinationIntro = document.getElementById("destinationIntro");
const itineraryContainer = document.getElementById("itineraryContainer");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const generateBtn = document.getElementById("generateBtn");
const daysInput = document.getElementById("days");
const statusBadge = document.getElementById("statusBadge");

let selectedBudget = "medium";
let selectedInterests = ["food", "culture"];
let generatedPlan = null;
let chatLoading = false;
let aiSource = "checking";

function clampDays(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(7, Math.floor(numeric)));
}

function normalizeInterests(interests) {
  return Array.isArray(interests) && interests.length ? interests : ["culture", "food"];
}

function updateStatusBadge() {
  if (aiSource === "deepseek") {
    statusBadge.textContent = "DeepSeek Connected";
    statusBadge.style.background = "#dcfce7";
  } else if (aiSource === "local") {
    statusBadge.textContent = "Local Fallback Mode";
    statusBadge.style.background = "#fee2e2";
  } else {
    statusBadge.textContent = "Checking AI...";
    statusBadge.style.background = "#e5e7eb";
  }
}

function initDestinations() {
  Object.keys(destinationData).forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    destinationSelect.appendChild(option);
  });
  destinationSelect.value = "New York";
  updateDestinationIntro();
}

function updateDestinationIntro() {
  destinationIntro.textContent = destinationData[destinationSelect.value].intro;
}

function buildItinerary(destination, days, interests, budget) {
  const city = destinationData[destination];
  if (!city) return [];

  const safeDays = clampDays(days);
  const safeInterests = normalizeInterests(interests);
  const result = [];

  for (let day = 1; day <= safeDays; day += 1) {
    const focus = safeInterests[(day - 1) % safeInterests.length];
    const options = city.interests[focus] || [];

    result.push({
      day,
      theme: focus,
      morning: options[0] || "Free exploration",
      afternoon: options[1] || "City walk",
      evening: options[2] || "Local dinner",
      note: budgetNotes[budget] || budgetNotes.medium
    });
  }

  return result;
}

function getCurrentPlanSnapshot() {
  const destination = destinationSelect.value;
  const days = clampDays(daysInput.value);
  const interests = normalizeInterests(selectedInterests);
  const budget = selectedBudget;

  return {
    destination,
    days,
    budget,
    interests,
    itinerary: buildItinerary(destination, days, interests, budget)
  };
}

function renderItinerary(items) {
  if (!items.length) {
    itineraryContainer.className = "empty-box";
    itineraryContainer.innerHTML = "No itinerary available.";
    return;
  }

  itineraryContainer.className = "";
  itineraryContainer.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-header">
        <strong>Day ${item.day}</strong>
        <span class="tag">${item.theme}</span>
      </div>
      <div class="schedule-grid">
        <div class="slot">
          <div class="slot-title">Morning</div>
          <div>${item.morning}</div>
        </div>
        <div class="slot">
          <div class="slot-title">Afternoon</div>
          <div>${item.afternoon}</div>
        </div>
        <div class="slot">
          <div class="slot-title">Evening</div>
          <div>${item.evening}</div>
        </div>
      </div>
      <div class="plan-note"><strong>Plan note:</strong> ${item.note}</div>
    `;
    itineraryContainer.appendChild(card);
  });
}

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setLoading(isLoading) {
  chatLoading = isLoading;
  sendBtn.disabled = isLoading;
  chatInput.disabled = isLoading;
  chatBox.classList.toggle("loading", isLoading);
}

function generatePlan() {
  const snapshot = getCurrentPlanSnapshot();
  generatedPlan = snapshot;
  daysInput.value = snapshot.days;
  renderItinerary(snapshot.itinerary);
  addMessage(
    "system",
    `Itinerary updated: ${snapshot.days}-day ${snapshot.destination} trip, ${snapshot.budget} budget, interests: ${snapshot.interests.join(", ")}.`
  );
}

async function detectBackendMode() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    aiSource = data.deepseekConfigured ? "deepseek" : "local";
  } catch (error) {
    aiSource = "local";
  }
  updateStatusBadge();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || chatLoading) return;

  const activePlan = generatedPlan || getCurrentPlanSnapshot();
  addMessage("user", text);
  chatInput.value = "";
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        plan: activePlan
      })
    });

    const data = await response.json();

    if (data.source === "deepseek") {
      aiSource = "deepseek";
    } else {
      aiSource = "local";
    }
    updateStatusBadge();

    addMessage("assistant", data.reply || "Sorry, I could not generate a reply.");
  } catch (error) {
    aiSource = "local";
    updateStatusBadge();
    addMessage("assistant", "The server request failed. Please make sure the Node backend is running.");
  } finally {
    setLoading(false);
  }
}

function bindBudgetButtons() {
  document.querySelectorAll("[data-budget]").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-budget]").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      selectedBudget = this.dataset.budget;
    });
  });
}

function bindInterestButtons() {
  document.querySelectorAll("[data-interest]").forEach((btn) => {
    btn.addEventListener("click", function () {
      const value = this.dataset.interest;

      if (selectedInterests.includes(value)) {
        selectedInterests = selectedInterests.filter((item) => item !== value);
        this.classList.remove("active");
      } else {
        selectedInterests.push(value);
        this.classList.add("active");
      }
    });
  });
}

function init() {
  initDestinations();
  bindBudgetButtons();
  bindInterestButtons();
  destinationSelect.addEventListener("change", updateDestinationIntro);
  generateBtn.addEventListener("click", generatePlan);
  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
  });

  addMessage(
    "assistant",
    "Hello! I am your travel assistant demo. Generate an itinerary first, then ask follow-up questions in the chat window."
  );
  detectBackendMode();
}

init();

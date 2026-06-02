const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

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

function clampDays(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(7, Math.floor(numeric)));
}

function normalizeInterests(interests) {
  return Array.isArray(interests) && interests.length ? interests : ["culture", "food"];
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

function fallbackReply(message, plan) {
  const lower = String(message || "").toLowerCase();
  const destination = plan?.destination || "your destination";
  const days = clampDays(plan?.days || 1);
  const budget = plan?.budget || "medium";
  const interests = normalizeInterests(plan?.interests || []);

  if (lower.includes("budget")) {
    return `For a ${budget} budget trip to ${destination}, focus on ${interests.join(", ")} and group nearby attractions to save both time and money.`;
  }

  if (lower.includes("food")) {
    return `${destination} works well for a food-focused demo. I would keep one brunch, one casual lunch stop, and one dinner suggestion each day.`;
  }

  if (lower.includes("hotel") || lower.includes("stay")) {
    return `For this demo, stay near the city center so the itinerary looks more realistic and travel time stays short.`;
  }

  if (lower.includes("change") || lower.includes("edit")) {
    return `You can change destination, days, budget, or interests on the left, then generate a new itinerary.`;
  }

  return `Your current plan is a ${days}-day trip to ${destination} with a ${budget} budget, mainly focused on ${interests.join(", ")}.`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, plan } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const safePlan = {
      destination: plan?.destination && destinationData[plan.destination] ? plan.destination : "New York",
      days: clampDays(plan?.days || 3),
      budget: ["low", "medium", "high"].includes(plan?.budget) ? plan.budget : "medium",
      interests: normalizeInterests(plan?.interests),
      itinerary: Array.isArray(plan?.itinerary)
        ? plan.itinerary
        : buildItinerary(
            plan?.destination && destinationData[plan.destination] ? plan.destination : "New York",
            clampDays(plan?.days || 3),
            normalizeInterests(plan?.interests),
            ["low", "medium", "high"].includes(plan?.budget) ? plan.budget : "medium"
          )
    };

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.json({
        reply: fallbackReply(message, safePlan),
        source: "local-fallback"
      });
    }

    const systemPrompt = [
      "You are a helpful travel assistant for a university capstone demo.",
      "Use the itinerary and travel preferences below as context.",
      "Keep the answer practical, concise, and directly relevant to the user's request.",
      "If the user asks to improve the plan, suggest concrete adjustments.",
      "Do not invent unavailable booking details or live prices.",
      "",
      "Current plan:",
      JSON.stringify(safePlan, null, 2)
    ].join("\n");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("DeepSeek API error:", data);
      return res.json({
        reply: fallbackReply(message, safePlan),
        source: "local-fallback"
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    res.json({
      reply: reply || fallbackReply(message, safePlan),
      source: reply ? "deepseek" : "local-fallback"
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.json({
      reply: fallbackReply(req.body?.message || "", req.body?.plan || {}),
      source: "local-fallback"
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY)
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Travel Assistant Demo running on http://localhost:${PORT}`);
});

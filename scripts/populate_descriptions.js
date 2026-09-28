const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Import generator logic directly in JS
function generateServiceDescription(input) {
  const name = String(input.name || "").trim();
  const platform = String(input.platform || "Social Media").trim();
  const category = String(input.category || "").trim();
  const text = `${name} ${category}`.toLowerCase();

  // 1. Detect Speed
  let speed = "Fast & Stable Delivery";
  const speedMatch = name.match(/(\d+[\d\.,]*\s*(?:k|m|million|billion)?\s*\/\s*(?:day|d|hour|hr|minute|min))/i);
  if (speedMatch) {
    speed = speedMatch[1].trim();
  } else if (/instant/i.test(text)) {
    speed = "Instant delivery (high-speed servers)";
  } else if (/super\s*fast|ultra\s*fast/i.test(text)) {
    speed = "100k - 500k / Day (Super Fast)";
  } else if (/slow|gradual|drip/i.test(text)) {
    speed = "Gradual / Safe natural speed";
  } else {
    speed = "50,000 - 100,000 / Day";
  }

  // 2. Detect Start Time
  let startTime = "Instant to 15 Minutes";
  const startMatch = name.match(/start[\s:]*([0-9\-\s]+(?:mins?|minutes?|hours?|hrs?))/i);
  if (startMatch) {
    startTime = startMatch[1].trim();
  } else if (/instant/i.test(text)) {
    startTime = "Instant (0 - 10 Minutes)";
  } else if (/0\s*-\s*1\s*h/i.test(text) || /0-1\s*hour/i.test(text)) {
    startTime = "0 - 1 Hour";
  } else if (/0\s*-\s*24\s*h/i.test(text) || /0-24\s*hour/i.test(text)) {
    startTime = "0 - 24 Hours";
  }

  // 3. Guarantee & Refill Status
  const isDrop = /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|refill[\s:]*0|0%[\s-]*refill|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|can[\s-]*drop|drop[\s-]*possible/i.test(text);
  let guarantee = "No Refill / Non-Drop High Quality";
  if (!isDrop && (input.isGuaranteed || input.refill || /refill|guarantee|lifetime/i.test(text))) {
    if (/lifetime/i.test(text)) {
      guarantee = "Lifetime Refill Guarantee ⚡";
    } else if (/30\s*d|30\s*day/i.test(text)) {
      guarantee = "30 Days Auto-Refill Guarantee 🛡️";
    } else if (/60\s*d|60\s*day/i.test(text)) {
      guarantee = "60 Days Refill Guarantee 🛡️";
    } else {
      guarantee = "Refill Guarantee Available 🛡️";
    }
  } else {
    guarantee = "No Refill (High Stability) ⚠️";
  }

  // 4. Platform Specific Link Format and Guidelines
  const pLower = platform.toLowerCase();
  let linkFormat = "Valid target URL";
  let linkExample = "";
  let instructions = [
    "Ensure your account/target is PUBLIC before submitting the order.",
    "Do not change your username or URL while the order is in progress.",
    "Do not place multiple orders on the same link at the same time; wait for the first to complete.",
  ];

  if (pLower.includes("tiktok")) {
    if (/view|like|share|save|favorite|comment/i.test(text)) {
      linkFormat = "TikTok Video Link";
      linkExample = "https://www.tiktok.com/@username/video/1234567890123456789 or https://vt.tiktok.com/xxxxxx/";
    } else if (/follower/i.test(text)) {
      linkFormat = "TikTok Profile Link";
      linkExample = "https://www.tiktok.com/@username";
    } else if (/live/i.test(text)) {
      linkFormat = "TikTok Live Stream Link";
      linkExample = "https://www.tiktok.com/@username/live";
    } else {
      linkFormat = "TikTok Video or Profile Link";
      linkExample = "https://www.tiktok.com/@username";
    }
  } else if (pLower.includes("instagram")) {
    if (/follower/i.test(text)) {
      linkFormat = "Instagram Profile Link";
      linkExample = "https://www.instagram.com/your_username";
    } else if (/like|view|reel|impression|reach|save|comment/i.test(text)) {
      linkFormat = "Instagram Post / Reel Link";
      linkExample = "https://www.instagram.com/p/Cxxxxxx/ or https://www.instagram.com/reel/Cxxxxxx/";
    } else if (/story/i.test(text)) {
      linkFormat = "Instagram Profile or Story Link";
      linkExample = "https://www.instagram.com/your_username";
    } else {
      linkFormat = "Instagram Profile or Post Link";
      linkExample = "https://www.instagram.com/p/Cxxxxxx/";
    }
  } else if (pLower.includes("youtube")) {
    if (/subscriber/i.test(text)) {
      linkFormat = "YouTube Channel Link";
      linkExample = "https://www.youtube.com/@ChannelName or https://www.youtube.com/channel/UCxxxxxx";
    } else if (/view|like|comment|share|watch/i.test(text)) {
      linkFormat = "YouTube Video Link";
      linkExample = "https://www.youtube.com/watch?v=xxxxxx or https://youtu.be/xxxxxx";
    } else if (/short/i.test(text)) {
      linkFormat = "YouTube Shorts Link";
      linkExample = "https://www.youtube.com/shorts/xxxxxx";
    } else {
      linkFormat = "YouTube Video or Channel Link";
      linkExample = "https://www.youtube.com/watch?v=xxxxxx";
    }
  } else if (pLower.includes("facebook")) {
    if (/page/i.test(text)) {
      linkFormat = "Facebook Page Link";
      linkExample = "https://www.facebook.com/PageName";
    } else if (/post|like|reaction|share|comment|photo/i.test(text)) {
      linkFormat = "Facebook Post / Photo Link";
      linkExample = "https://www.facebook.com/username/posts/xxxxxx";
    } else if (/follower/i.test(text)) {
      linkFormat = "Facebook Profile Link (Follow button must be public)";
      linkExample = "https://www.facebook.com/username";
    } else if (/video|reel/i.test(text)) {
      linkFormat = "Facebook Video / Reel Link";
      linkExample = "https://www.facebook.com/watch/?v=xxxxxx";
    } else {
      linkFormat = "Facebook Page or Post Link";
      linkExample = "https://www.facebook.com/PageName";
    }
  } else if (pLower.includes("twitter") || pLower.includes("x")) {
    if (/follower/i.test(text)) {
      linkFormat = "X (Twitter) Profile Link";
      linkExample = "https://x.com/username";
    } else if (/like|retweet|repost|view|impression|quote/i.test(text)) {
      linkFormat = "X (Twitter) Post Link";
      linkExample = "https://x.com/username/status/1234567890";
    } else {
      linkFormat = "X (Twitter) Link";
      linkExample = "https://x.com/username";
    }
  } else if (pLower.includes("telegram")) {
    if (/channel|group|member|subscriber/i.test(text)) {
      linkFormat = "Telegram Public Channel/Group Link";
      linkExample = "https://t.me/channel_name";
    } else if (/post|view|reaction/i.test(text)) {
      linkFormat = "Telegram Post Link";
      linkExample = "https://t.me/channel_name/123";
    } else {
      linkFormat = "Telegram Public Link";
      linkExample = "https://t.me/channel_name";
    }
  } else if (pLower.includes("spotify")) {
    if (/follower|artist/i.test(text)) {
      linkFormat = "Spotify Artist or User Profile Link";
      linkExample = "https://open.spotify.com/artist/xxxxxx";
    } else if (/track|play|stream|save/i.test(text)) {
      linkFormat = "Spotify Track / Song Link";
      linkExample = "https://open.spotify.com/track/xxxxxx";
    } else if (/playlist/i.test(text)) {
      linkFormat = "Spotify Playlist Link";
      linkExample = "https://open.spotify.com/playlist/xxxxxx";
    } else {
      linkFormat = "Spotify Track or Artist Link";
      linkExample = "https://open.spotify.com/track/xxxxxx";
    }
  } else if (pLower.includes("traffic") || pLower.includes("website")) {
    linkFormat = "Website URL (Domain or Page)";
    linkExample = "https://yourwebsite.com/page";
    instructions = [
      "Ensure your website is live and does not redirect to ad networks/adult content.",
      "Google Analytics 4 / Bitly trackable traffic.",
      "Traffic starts gradually to ensure safe analytics tracking.",
    ];
  } else if (pLower.includes("whatsapp")) {
    linkFormat = "WhatsApp Channel / Group Link";
    linkExample = "https://whatsapp.com/channel/xxxxxx";
  }

  // 5. Build Formatted Description
  const minText = input.min ? Number(input.min).toLocaleString() : "10";
  const maxText = input.max ? Number(input.max).toLocaleString() : "1,000,000";

  return `⚡ Start Time: ${startTime}
🚀 Speed: ${speed}
🛡️ Guarantee: ${guarantee}
📊 Min / Max: ${minText} / ${maxText}
🔗 Link Format: ${linkFormat}
   Example: ${linkExample}

📌 Important Rules & Instructions:
${instructions.map((ins) => `• ${ins}`).join("\n")}`;
}

async function main() {
  try {
    const res = await pool.query(`SELECT id, name, platform, category, min, max, refill, is_guaranteed, description FROM vexo_routed_services`);
    console.log(`Found ${res.rows.length} routed services.`);

    let updatedCount = 0;
    for (const service of res.rows) {
      const generated = generateServiceDescription(service);
      await pool.query(
        `UPDATE vexo_routed_services SET description = $1 WHERE id = $2`,
        [generated, service.id]
      );
      updatedCount++;
    }

    console.log(`Successfully updated descriptions for ${updatedCount} services.`);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();

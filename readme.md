# 🎫 BlocksMC Ticket Chat Scraper

A simple Node.js tool that reads **Discord HTML ticket logs** from the **BlocksMC Ticket System** and converts them into clean, readable **JSON** and **CSV** files.

It automatically extracts ticket information (author, rank, hours, category, etc.) along with all messages, embeds, and reactions.

## 🚀 Features

- 🧩 Parses exported **Discord HTML** ticket logs
- 🎫 Automatically extracts **ticket details** (ID, author, category, rank, hours)
- 💬 Captures all messages (user + bot)
- 🤖 Detects **BlocksMC Tickets bot** messages
- 🧾 Saves results to:
  - `chat_data.csv` – message summary
  - `ticket_<id>_data.json` – full ticket data
- 📊 Shows chat statistics (message counts, top users, embeds, reactions)

## 📦 Installation

### 1. Clone this repository

```bash
git clone https://github.com/yourusername/blocksmc-ticket-scraper.git
cd blocksmc-ticket-scraper
```

### 2. Install dependencies

```bash
npm install jsdom
```

## 🧠 How to Use

### 1. Get your HTML ticket log

Export your Discord ticket (from the BlocksMC Discord) using a Discord chat export tool
(e.g. [DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter)) and save it as:

```
chat.html
```

### 2. Run the scraper

```bash
node scraper.js chat.html
```

### 3. View results

After running, you’ll see:

```
🔍 Scraping chat messages...
✅ Found 85 messages

📊 CHAT STATISTICS:
📝 Total Messages: 85
🤖 Bot Messages: 22
👤 User Messages: 63
📎 Messages with Embeds: 3
😀 Messages with Reactions: 4
👥 Unique Authors: 5

🏆 TOP AUTHORS:
1. BlocksMC Tickets: 22 messages
2. Player123: 18 messages
3. HelperBob: 12 messages
...
```

And two files will be created:

```
chat_data.csv
ticket_12345_data.json
```

## 📁 Output Examples

### **Ticket JSON (`ticket_12345_data.json`)**

```json
{
  "ticketId": "12345",
  "openedAt": "2025-10-19T14:12:00.000Z",
  "RemovedAt": "2025-10-19T15:42:00.000Z",
  "author": {
    "name": "Player123",
    "rank": "MVP+",
    "hours": "234h",
    "discordId": "987654321012345678"
  },
  "category": "Ban Appeal",
  "description": "I was banned for unfair reason.",
  "url": "https://discord.com/users/987654321012345678",
  "totalMessages": 85,
  "botMessages": 22,
  "userMessages": 63
}
```

### **Message CSV (`chat_data.csv`)**

| MessageID  | Author           | Timestamp     | Content                      | IsBot | HasEmbed | ReactionCount |
| ---------- | ---------------- | ------------- | ---------------------------- | ----- | -------- | ------------- |
| 1234567890 | Player123        | 1729314000000 | Hello, I need help.          | false | false    | 0             |
| 1234567891 | BlocksMC Tickets | 1729314010000 | Ticket created successfully! | true  | true     | 0             |

## 🧩 For Developers

If you want to use this inside another Node.js script:

```js
const { DiscordChatScraper, scrapeChat } = require("./scraper");

// Quick scrape
scrapeChat("chat.html");

// Or manually use the class
const fs = require("fs");
const html = fs.readFileSync("chat.html", "utf8");
const scraper = new DiscordChatScraper(html);
scraper.scrapeAll();
scraper.printStats();
scraper.saveToJSON("ticket_data.json");
```

## ⚙️ Sample `package.json`

If you want a simple setup:

```json
{
  "name": "blocksmc-ticket-scraper",
  "version": "1.0.0",
  "description": "Discord HTML chat scraper for BlocksMC ticket system.",
  "main": "scraper.js",
  "scripts": {
    "start": "node scraper.js chat.html"
  },
  "dependencies": {
    "jsdom": "^24.0.0"
  }
}
```

Run with:

```bash
npm start
```

## ⚠️ Notes

- This tool is **made specifically for the BlocksMC Ticket System** (using the “BlocksMC Tickets” Discord bot).
- Works best with exported **HTML logs** (not text or JSON exports).
- If your HTML format differs, you may need to adjust class names inside `scraper.js`.
- Requires Node.js 16+.

## 📄 License

MIT License © 2025
Developed for the **BlocksMC Community** ❤️

### ⭐ If this helped you analyze or archive tickets, give it a star on GitHub!

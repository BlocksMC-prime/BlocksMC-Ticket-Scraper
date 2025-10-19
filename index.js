const fs = require('fs');
const { JSDOM } = require('jsdom');

class DiscordChatScraper {
    constructor(htmlContent) {
        this.dom = new JSDOM(htmlContent);
        this.document = this.dom.window.document;
        this.messages = [];
        this.ticketId = null;
        this.lastAuthor = null;
    }

    scrapeAll() {
        const ticketIdScrape = this.document.querySelectorAll(".preamble__entry")[1]?.textContent.trim().split("-").pop().trim();
        this.ticketId = ticketIdScrape || null;
        const messageContainers = this.document.querySelectorAll('.chatlog__message-container');
        
        messageContainers.forEach(container => {
            const message = this.extractMessage(container);
            if (message) {
                this.messages.push(message);
            }
        });

        return this.messages;
    }

    extractMessage(container) {
        const messageDiv = container.querySelector('.chatlog__message');
        if (!messageDiv) return null;

        // Basic message info
        const messageId = container.getAttribute('data-message-id') || '';

        // Author info
        let PrimaryElement = messageDiv.querySelector('.chatlog__header');

        if(!PrimaryElement) {
            PrimaryElement = this.lastAuthor;
        }
        this.lastAuthor = PrimaryElement; // Store last author for next messages

        const authorElem = PrimaryElement ? PrimaryElement.querySelector('.chatlog__author') : null;
        const avatarElem = messageDiv.querySelector('.chatlog__avatar');
        const botLabel = PrimaryElement.querySelector('.chatlog__bot-label');
        const avatarUrl = avatarElem ? avatarElem.src : '';
        const authorName = authorElem ? authorElem.textContent.trim() : 'Unknown';
        const authorId = authorElem ? authorElem.getAttribute('data-user-id') || '' : '';
        // const avatarUrl = avatarElem.src
        const isBot = !!botLabel;

        // Timestamp
        const timestampElem = messageDiv.querySelector('.chatlog__short-timestamp') || messageDiv.querySelector('.chatlog__timestamp a');
                    
        const timestamp = timestampElem ? new Date(timestampElem.title || timestampElem.textContent.trim()).getTime() : '';

        // Content
        const contentElem = messageDiv.querySelector('.chatlog__content');
        const content = contentElem ? contentElem.textContent.trim().replace(/\s+/g, ' ') : '';
        const mentions = contentElem.querySelectorAll(".chatlog__markdown-mention");
        let mentionPeople = [];
        mentions.forEach(mention => {
            const userId = mention.getAttribute('title');
            if(userId) {
                mentionPeople.push(userId.replace("#0000", ""));
            }            
        });
        // Embed (simplified)
        const embed = this.extractEmbed(messageDiv);

        // Reactions (simplified)
        const reactions = this.extractReactions(container);

        return {
            messageId,
            authorName,
            authorId,
            avatarUrl,
            timestamp,
            content,
            mentionPeople,
            isBot,
            embed,
            reactions
        };
    }

    extractEmbed(messageDiv) {
        const embedDiv = messageDiv.querySelector('.chatlog__embed');
        if (!embedDiv) return null;

        const author = embedDiv.querySelector('.chatlog__embed-author');
        const title = embedDiv.querySelector('.chatlog__embed-title');
        const description = embedDiv.querySelector('.chatlog__embed-description');
        const thumbnail = embedDiv.querySelector('.chatlog__embed-thumbnail');
        const colorElement = embedDiv.querySelector('.chatlog__embed-color-pill');
        const link = embedDiv.querySelector('.chatlog__embed-author-link')?.getAttribute('href') || '';

        let color = '';
        if (colorElement) {
            const bgColor = colorElement.style.backgroundColor;
            if (bgColor && bgColor.startsWith('rgb')) {
            // Convert rgba to hex
            const rgba = bgColor.match(/\d+/g);
            if (rgba && rgba.length >= 3) {
                const r = parseInt(rgba[0]);
                const g = parseInt(rgba[1]);
                const b = parseInt(rgba[2]);
                color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
            } else {
            color = bgColor || '';
            }
        }

        // Extract fields
        const fields = [];
        const fieldElems = embedDiv.querySelectorAll('.chatlog__embed-field');
        fieldElems.forEach(field => {
            const name = field.querySelector('.chatlog__embed-field-name')?.textContent.trim() || '';
            const value = field.querySelector('.chatlog__embed-field-value')?.textContent.trim() || '';
            fields.push({ name, value });
        });

        return {
            author: author ? author.textContent.trim() : '',
            title: title ? title.textContent.trim() : '',
            description: description ? description.textContent.trim() : '',
            thumbnailUrl: thumbnail ? this.removeDiscordProxy(thumbnail.src) : '',
            link,
            color,
            fields
        };
    }



    extractReactions(container) {
        const reactionsDiv = container.querySelector('.chatlog__reactions');
        if (!reactionsDiv) return [];

        const reactions = [];
        const reactionElems = reactionsDiv.querySelectorAll('.chatlog__reaction');
        
        reactionElems.forEach(reaction => {
            const emoji = reaction.querySelector('.chatlog__emoji');
            const count = reaction.querySelector('.chatlog__reaction-count');
            
            reactions.push({
                url: emoji ? emoji.src : '',
                name: emoji ? emoji.alt : '',
                count: count ? parseInt(count.textContent) : 0
            });
        });

        return reactions;
    }
    saveToJSON(filename = 'chat_data.json', pretty = true, data = this.messages) {
        if (data.length === 0) {
            console.log('❌ No data to save');
            return;
        }

        try {
            const jsonContent = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
            fs.writeFileSync(filename, jsonContent);
            console.log(`✅ Data saved to ${filename} (${data?.messages.length} messages)`);
        } catch (error) {
            console.error(`❌ Failed to save JSON: ${error.message}`);
        }
    }

    saveToCSV(filename = 'chat_data.csv') {
        if (this.messages.length === 0) {
            console.log('❌ No messages to save');
            return;
        }

        const headers = 'MessageID,Author,Timestamp,Content,IsBot,IsPinned,HasEmbed,EmbedTitle,ReactionCount\n';
        
        const rows = this.messages.map(msg => {
            const embedTitle = msg.embed ? msg.embed.title.replace(/"/g, '""') : '';
            const content = msg.content.replace(/"/g, '""').replace(/\n/g, ' ');
            
            return `"${msg.messageId}","${msg.authorName}","${msg.timestamp}","${content}",${msg.isBot},${msg.isPinned},${!!msg.embed},"${embedTitle}",${msg.reactions.length}`;
        }).join('\n');

        fs.writeFileSync(filename, headers + rows);
        console.log(`✅ Data saved to ${filename}`);
    }

    getStats() {
        const total = this.messages.length;
        const botMessages = this.messages.filter(m => m.isBot).length;
        const userMessages = total - botMessages;
        const withEmbeds = this.messages.filter(m => m.embed).length;
        const withReactions = this.messages.filter(m => m.reactions.length > 0).length;

        // Count authors
        const authors = {};
        this.messages.forEach(msg => {
            authors[msg.authorName] = (authors[msg.authorName] || 0) + 1;
        });

        return {
            totalMessages: total,
            botMessages,
            userMessages,
            messagesWithEmbeds: withEmbeds,
            messagesWithReactions: withReactions,
            uniqueAuthors: Object.keys(authors).length,
            topAuthors: Object.entries(authors)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
        };
    }

    printStats() {
        const stats = this.getStats();
        console.log('\n📊 CHAT STATISTICS:');
        console.log(`📝 Total Messages: ${stats.totalMessages}`);
        console.log(`🤖 Bot Messages: ${stats.botMessages}`);
        console.log(`👤 User Messages: ${stats.userMessages}`);
        console.log(`📎 Messages with Embeds: ${stats.messagesWithEmbeds}`);
        console.log(`😀 Messages with Reactions: ${stats.messagesWithReactions}`);
        console.log(`👥 Unique Authors: ${stats.uniqueAuthors}`);
        
        console.log('\n🏆 TOP AUTHORS:');
        stats.topAuthors.forEach(([name, count], index) => {
            console.log(`${index + 1}. ${name}: ${count} messages`);
        });
    }
    removeDiscordProxy(url) {
        if (!url) return '';
        
        // Remove Discord's media proxy
        if (url.includes('media.discordapp.net')) {
            const match = url.match(/https:\/\/media\.discordapp\.net\/attachments\/(.+)/);
            if (match) {
                return `https://cdn.discordapp.com/attachments/${match[1]}`;
            }
        }
        
        // Remove Discord's proxy for external images
        if (url.includes('images-ext-')) {
            const match = url.match(/https:\/\/images-ext-\d+\.discordapp\.net\/external\/[^\/]+\/(.+)/);
            if (match) {
                try {
                    return decodeURIComponent(match[1].replace("http/", "http://").replace("https/", "https://"));
                } catch (e) {
                    return url;
                }
            }
        }
        
        return url;
    }

}

// Simple usage function
function scrapeChat(htmlFile) {
    try {
        // Read HTML file
        const htmlContent = fs.readFileSync(htmlFile, 'utf8');
        
        // Create scraper
        const scraper = new DiscordChatScraper(htmlContent);
        
        // Scrape messages
        console.log('🔍 Scraping chat messages...');
        const messages = scraper.scrapeAll();
        console.log(`✅ Found ${messages.length} messages`);
        
        // Show stats
        scraper.printStats();
        
        // Save data
        scraper.saveToCSV();
        
        return scraper;
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Export for use as module
module.exports = { DiscordChatScraper, scrapeChat };

// If running directly
if (require.main === module) {
    const htmlFile = process.argv[2] || 'chat.html';
    
    if (!fs.existsSync(htmlFile)) {
        console.error(`❌ HTML file not found: ${htmlFile}`);
        process.exit(1);
    }
    
    const scraper = scrapeChat(htmlFile);
    
    if (!scraper || !scraper.messages.length) {
        console.error('❌ No messages found or scraping failed');
        process.exit(1);
    }
    
    // Extract ticket ID from filename
    const ticketId = scraper.ticketId;
    
    // Find BlocksMC Tickets bot messages
    const ticketBotMessages = scraper.messages.filter(msg => 
        msg.isBot && msg.authorName?.toLowerCase() === "blocksmc tickets"
    );
    
    if (!ticketBotMessages.length) {
        console.error('❌ No BlocksMC Tickets bot messages found');
        process.exit(1);
    }
    
    // Find the first message with embed and fields (ticket details)
    const ticketDetailsMessage = ticketBotMessages.find(msg => 
        msg.embed && msg.embed.fields && msg.embed.fields.length > 0
    );
    
    if (!ticketDetailsMessage) {
        console.error('❌ No ticket details found');
        process.exit(1);
    }
    

    const DeleteAtMessage = ticketBotMessages.find(
        msg => msg.content.toLowerCase() === "saving..."
    )


    const { embed } = ticketDetailsMessage;
    
    // Extract ticket information
    const ticketData = {
        ticketId,
        openedAt: new Date(ticketDetailsMessage.timestamp).toISOString(),
        RemovedAt: DeleteAtMessage ? new Date(DeleteAtMessage.timestamp).toISOString() : new Date(scraper.messages.pop().timestamp).toISOString(),
        author: {
            name: embed.author || 'Unknown',
            rank: embed.fields.find(field => field.name.toLowerCase() === "rank")?.value || 'Unknown',
            hours: embed.fields.find(field => field.name.toLowerCase() === "hours")?.value || 'Unknown',
            discordId: embed.link.split("/").pop() || ''
        },
        category: embed.title ? embed.title.split(":")[0].trim() : 'Unknown',
        description: embed.description || '',
        url: embed.link || '',
        
        totalMessages: scraper.messages.length,
        botMessages: scraper.messages.filter(msg => msg.isBot).length,
        userMessages: scraper.messages.filter(msg => !msg.isBot).length,
        messages: scraper.messages
    };
    
    console.log('\n🎫 TICKET INFORMATION:');
    console.log(`ID: ${ticketData.ticketId}`);
    console.log(`Opened by: ${ticketData.openedBy}`);
    console.log(`Category: ${ticketData.category}`);
    console.log(`Rank: ${ticketData.rank}`);
    console.log(`Hours: ${ticketData.hours}`);
    console.log(`Description: ${ticketData.description}`);
    
    // Save ticket data
    const ticketFilename = `ticket_${ticketId}_data.json`;
    scraper.saveToJSON(ticketFilename, true, ticketData);


}
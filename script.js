let cards = [];
let imageMap = {};

// --- STAGE 1: PROCESSING DATA ---
document.getElementById('process-btn').addEventListener('click', () => {
    const text = document.getElementById('raw-input').value;
    if (!text.trim()) return alert("Please paste data first.");

    const lines = text.split('\n');
    
    // Parses lines containing the '|' separator
    cards = lines.filter(line => line.includes('|')).map((line, index) => {
        const parts = line.split('|').map(p => p.trim());
        return {
            id: Date.now() + index,
            front: parts[0] ? parts[0].replace(/Front:\s*/i, '').trim() : '',
            back: parts[1] ? parts[1].replace(/Back:\s*/i, '').trim() : '',
            type: parts[2] ? parts[2].replace(/Type:\s*/i, '').trim() : 'String',
            tags: parts[3] ? parts[3].replace(/Tags:\s*/i, '').trim() : 'General'
        };
    });

    if (cards.length === 0) {
        return alert("No valid cards found. Make sure your data uses the 'Front | Back' format.");
    }

    renderSiftingStage();
});

// --- STAGE 2: HANDLING IMAGES ---
document.getElementById('image-upload').addEventListener('change', (e) => {
    const files = e.target.files;
    for (let file of files) {
        imageMap[file.name] = file;
    }
    document.getElementById('file-list-count').innerText = `${Object.keys(imageMap).length} images mapped.`;
});

// --- STAGE 3: UI RENDERING ---
function renderSiftingStage() {
    document.getElementById('upload-stage').classList.add('hidden');
    document.getElementById('sift-stage').classList.remove('hidden');
    
    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';
    
    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'flashcard';
        
        // Check if an image matches the text on the card
        let imgHtml = '';
        const possibleImg = imageMap[card.front] || imageMap[card.back];
        if (possibleImg) {
            const url = URL.createObjectURL(possibleImg);
            imgHtml = `<img src="${url}" class="card-preview-img" style="max-width:100%; margin-top:10px; border-radius:4px;">`;
        }

        cardEl.innerHTML = `
            <button class="delete-btn" onclick="deleteCard(${card.id})" style="float:right; cursor:pointer;">✕</button>
            <div class="card-type" style="font-weight:bold; color:#666; font-size:12px;">${card.type.toUpperCase()}</div>
            <input type="text" value="${card.front}" onchange="updateCard(${card.id}, 'front', this.value)" style="width:90%; margin:5px 0;">
            <textarea onchange="updateCard(${card.id}, 'back', this.value)" style="width:90%; min-height:60px;">${card.back}</textarea>
            ${imgHtml}
            <div style="font-size:10px; color:#aaa; margin-top:5px">#${card.tags}</div>
        `;
        grid.appendChild(cardEl);
    });
    
    document.getElementById('card-count').innerText = cards.length;
}

// Global functions for the UI buttons
window.updateCard = (id, field, value) => {
    const card = cards.find(c => c.id === id);
    if (card) card[field] = value;
};

window.deleteCard = (id) => {
    cards = cards.filter(c => c.id !== id);
    renderSiftingStage();
};

// --- STAGE 4: EXPORTING THE DECK ---
document.getElementById('export-btn').addEventListener('click', async () => {
    if (cards.length === 0) return alert("No cards to export.");
    if (!window.SQL) return alert("The database engine is still loading. Please wait 3 seconds and try again.");

    // SAFETY: Catch both common library names used by CDNs
    const Anki = window.genanki || window.GenAnki;
    if (!Anki) return alert("Anki library not loaded. Check your internet connection.");

    try {
        const model = new Anki.Model({
            name: "EAP_Model",
            id: "1616161616",
            flds: [{ name: "Front" }, { name: "Back" }, { name: "Media" }],
            tmpls: [{
                name: "Default",
                qfmt: '<div style="text-align:center; font-family: Arial; font-size:24px;">{{Front}}</div><div style="margin-top:20px; text-align:center;">{{Media}}</div>',
                afmt: '{{FrontSide}}<hr id="answer"><div style="text-align:center; font-family: Arial; font-size:20px;">{{Back}}</div>',
            }],
        });

        const deck = new Anki.Deck(Date.now(), "EAP Generated Deck");

        cards.forEach(card => {
            let mediaTag = "";
            // Logic to embed images in the card if the filename matches the text
            if (imageMap[card.front]) {
                mediaTag = `<img src="${card.front}">`;
            } else if (imageMap[card.back]) {
                mediaTag = `<img src="${card.back}">`;
            }

            deck.addNote(model.note([card.front, card.back, mediaTag], [card.tags]));
        });

        const pkg = new Anki.Package();
        pkg.addDeck(deck);
        
        // Add the actual image data to the package
        Object.keys(imageMap).forEach(name => {
            pkg.addMedia(imageMap[name], name);
        });

        const zip = await pkg.writeToFile();
        const blob = new Blob([zip], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "EAP_Study_Deck.apkg";
        link.click();
        
    } catch (err) {
        console.error("Export Error:", err);
        alert("An error occurred while generating the deck: " + err.message);
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to start over? All current cards will be lost.")) {
        location.reload();
    }
});

/**
 * AI Tools | Textbook Splitter
 * Core Logic: PDF-Lib for manipulation, JSZip for bundling
 */

const state = {
    pdfDoc: null,
    fileName: ""
};

// DOM Elements
const pdfInput = document.getElementById('pdfInput');
const offsetInput = document.getElementById('offsetInput');
const chapterList = document.getElementById('chapterList');
const addChapterBtn = document.getElementById('addChapterBtn');
const processBtn = document.getElementById('processBtn');
const statusEl = document.getElementById('status');
const btnText = document.getElementById('btnText');

/**
 * Creates a new chapter input row with unique IDs and animations
 */
function createChapterRow() {
    const row = document.createElement('div');
    row.className = "chapter-row flex gap-2 items-center bg-slate-700/30 p-3 rounded-xl border border-slate-600/50 group";
    
    row.innerHTML = `
        <div class="flex-1">
            <input type="text" placeholder="Chapter Name (e.g. Intro)" 
                class="chapter-name w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition">
        </div>
        <div class="w-24">
            <input type="number" placeholder="Start" 
                class="page-start w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition">
        </div>
        <div class="w-24">
            <input type="number" placeholder="End" 
                class="page-end w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition">
        </div>
        <button onclick="this.parentElement.remove()" 
            class="text-slate-500 hover:text-red-400 transition-colors p-1" title="Remove Row">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;
    chapterList.appendChild(row);
}

/**
 * Updates UI status message
 */
function updateStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.remove('hidden', 'text-red-400', 'text-blue-400');
    statusEl.classList.add(isError ? 'text-red-400' : 'text-blue-400');
}

/**
 * Main Processing Logic
 */
async function processPdf() {
    const file = pdfInput.files[0];
    const offset = parseInt(offsetInput.value) || 0;
    const rows = document.querySelectorAll('.chapter-row');

    // Validation
    if (!file) return alert("Please upload a PDF file.");
    if (rows.length === 0) return alert("Please add at least one chapter row.");

    try {
        // UI Loading State
        processBtn.disabled = true;
        btnText.textContent = "Processing Pages...";
        updateStatus("Reading PDF metadata...");

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();
        const zip = new JSZip();

        let validChapters = 0;

        for (const row of rows) {
            const name = row.querySelector('.chapter-name').value.trim() || "Untitled_Chapter";
            const start = parseInt(row.querySelector('.page-start').value);
            const end = parseInt(row.querySelector('.page-end').value);

            if (isNaN(start) || isNaN(end)) continue;

            // Math: Offset conversion (Human 1-based to PDF 0-based)
            const startIdx = (start + offset) - 1;
            const endIdx = (end + offset) - 1;

            // Bounds checking
            if (startIdx < 0 || endIdx >= totalPages || startIdx > endIdx) {
                console.warn(`Skipping ${name}: Pages out of range.`);
                continue;
            }

            const subDoc = await PDFLib.PDFDocument.create();
            const pagesToCopy = Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i);
            
            const copiedPages = await subDoc.copyPages(pdfDoc, pagesToCopy);
            copiedPages.forEach(page => subDoc.addPage(page));

            const pdfBytes = await subDoc.save();
            zip.file(`${name}.pdf`, pdfBytes);
            validChapters++;
        }

        if (validChapters === 0) throw new Error("No valid page ranges were provided.");

        updateStatus("Generating ZIP archive...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Trigger Download
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Split_${file.name.replace('.pdf', '')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        updateStatus("Success! Your files are ready.");
    } catch (err) {
        console.error(err);
        updateStatus(`Error: ${err.message}`, true);
    } finally {
        processBtn.disabled = false;
        btnText.textContent = "Split & Export ZIP";
    }
}

// Event Listeners
addChapterBtn.addEventListener('click', createChapterRow);
processBtn.addEventListener('click', processPdf);

// Initialize with one empty row for better UX
window.addEventListener('DOMContentLoaded', createChapterRow);

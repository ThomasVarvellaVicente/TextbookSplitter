const pdfInput = document.getElementById('pdfInput');
const offsetInput = document.getElementById('offsetInput');
const chapterList = document.getElementById('chapterList');
const addChapterBtn = document.getElementById('addChapterBtn');
const processBtn = document.getElementById('processBtn');
const status = document.getElementById('status');

// 1. Function to create a new chapter row
function createChapterRow() {
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600 animate-in fade-in slide-in-from-left-2";
    
    div.innerHTML = `
        <input type="text" placeholder="Chapter Name" class="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-blue-500">
        <input type="number" placeholder="Start" class="w-20 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-blue-500">
        <input type="number" placeholder="End" class="w-20 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-blue-500">
        <button class="text-red-400 hover:text-red-300 px-2 font-bold" onclick="this.parentElement.remove()">✕</button>
    `;
    chapterList.appendChild(div);
}

// 2. Initialize with one row and handle "Add Row" button
addChapterBtn.addEventListener('click', createChapterRow);
window.onload = createChapterRow; // Adds first row automatically

// 3. The Splitting Logic
processBtn.addEventListener('click', async () => {
    const file = pdfInput.files[0];
    if (!file) return alert("Please select a PDF file first.");

    const offset = parseInt(offsetInput.value) || 0;
    const rows = chapterList.querySelectorAll('div');
    
    if (rows.length === 0) return alert("Please add at least one chapter.");

    status.classList.remove('hidden');
    status.innerText = "Processing PDF chapters...";
    
    try {
        const existingPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const zip = new JSZip();

        for (const row of rows) {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value || `Chapter_${Date.now()}`;
            const start = parseInt(inputs[1].value);
            const end = parseInt(inputs[2].value);

            if (isNaN(start) || isNaN(end)) continue;

            // Create new PDF for this chapter
            const subDoc = await PDFLib.PDFDocument.create();
            
            // Adjust for offset (Human page number to 0-indexed PDF page)
            const startIdx = (start + offset) - 1;
            const endIdx = (end + offset) - 1;

            const pages = await subDoc.copyPages(pdfDoc, 
                Array.from({length: endIdx - startIdx + 1}, (_, i) => startIdx + i)
            );
            
            pages.forEach(page => subDoc.addPage(page));
            
            const pdfBytes = await subDoc.save();
            zip.file(`${name}.pdf`, pdfBytes);
        }

        const content = await zip.generateAsync({type: "blob"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "split_textbook.zip";
        link.click();

        status.innerText = "Export Complete!";
        setTimeout(() => status.classList.add('hidden'), 3000);
        
    } catch (err) {
        console.error(err);
        alert("Error processing PDF. Check console for details.");
        status.classList.add('hidden');
    }
});

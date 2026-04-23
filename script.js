document.addEventListener('DOMContentLoaded', () => {
    const chapterList = document.getElementById('chapterList');
    const addChapterBtn = document.getElementById('addChapterBtn');
    const processBtn = document.getElementById('processBtn');
    const status = document.getElementById('status');
    const btnText = document.getElementById('btnText');

    // Function to create a new input row
    function createChapterRow() {
        console.log("Adding new chapter row..."); // Debugging line
        const div = document.createElement('div');
        div.className = "chapter-row grid grid-cols-12 gap-3 bg-slate-700/40 p-3 rounded-lg border border-slate-600 items-center transition-all hover:border-slate-500";
        div.innerHTML = `
            <div class="col-span-6">
                <input type="text" placeholder="Chapter Title" class="chap-title w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500">
            </div>
            <div class="col-span-2">
                <input type="number" placeholder="Start" class="chap-start w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500">
            </div>
            <div class="col-span-2">
                <input type="number" placeholder="End" class="chap-end w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500">
            </div>
            <div class="col-span-2 text-right">
                <button class="delete-row text-slate-500 hover:text-red-400 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        
        // Handle deletion
        div.querySelector('.delete-row').addEventListener('click', () => div.remove());
        
        chapterList.appendChild(div);
    }

    // Initialize with 3 rows
    for(let i=0; i<3; i++) createChapterRow();

    // Event Listener for the Add Button
    addChapterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        createChapterRow();
    });

    // --- PDF Processing Logic ---
    processBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('pdfInput');
        const offset = parseInt(document.getElementById('offsetInput').value) || 0;
        const rows = document.querySelectorAll('.chapter-row');

        if (!fileInput.files[0] || rows.length === 0) {
            alert("Upload a PDF and add at least one chapter.");
            return;
        }

        const chapters = Array.from(rows).map(row => ({
            title: row.querySelector('.chap-title').value.trim() || 'Untitled_Chapter',
            start: parseInt(row.querySelector('.chap-start').value),
            end: parseInt(row.querySelector('.chap-end').value)
        })).filter(c => !isNaN(c.start) && !isNaN(c.end));

        if (chapters.length === 0) {
            alert("Please fill in start and end pages.");
            return;
        }

        status.classList.remove('hidden');
        processBtn.disabled = true;
        btnText.innerText = "Processing...";

        try {
            const existingPdfBytes = await fileInput.files[0].arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
            const zip = new JSZip();

            for (const chap of chapters) {
                status.innerText = `Extracting: ${chap.title}`;
                const newPdf = await PDFLib.PDFDocument.create();
                
                const startIdx = (chap.start + offset) - 1;
                const endIdx = (chap.end + offset) - 1;

                if (startIdx < 0 || endIdx >= pdfDoc.getPageCount()) continue;

                const pageIndices = Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i);
                const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach(p => newPdf.addPage(p));

                const pdfBytes = await newPdf.save();
                zip.file(`${chap.title.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBytes);
            }

            status.innerText = "Building ZIP...";
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ankIMAT_Split_Textbook.zip`;
            a.click();
            
            status.innerText = "Success! Chapters exported.";
        } catch (err) {
            console.error(err);
            status.innerText = "Error. Check console.";
        } finally {
            processBtn.disabled = false;
            btnText.innerText = "Split & Export ZIP";
        }
    });
});

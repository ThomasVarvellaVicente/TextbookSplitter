const processBtn = document.getElementById('processBtn');
const status = document.getElementById('status');

processBtn.addEventListener('click', async () => {
    const file = document.getElementById('pdfInput').files[0];
    const offset = parseInt(document.getElementById('offsetInput').value);
    const jsonText = document.getElementById('jsonInput').value;

    if (!file || !jsonText) {
        alert("Please upload a PDF and provide the Chapter JSON.");
        return;
    }

    let chapters;
    try {
        chapters = JSON.parse(jsonText);
    } catch (e) {
        alert("Invalid JSON format. Please check your syntax.");
        return;
    }

    status.classList.remove('hidden');
    status.innerText = "Processing PDF... please wait.";
    processBtn.disabled = true;

    try {
        const existingPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const zip = new JSZip();

        for (const chap of chapters) {
            status.innerText = `Extracting ${chap.title}...`;
            const newPdf = await PDFLib.PDFDocument.create();
            
            // Adjusting for 0-indexing: (Page + Offset) - 1
            const startIdx = (chap.start + offset) - 1;
            const endIdx = (chap.end + offset) - 1;

            const pageIndices = Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i);
            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(p => newPdf.addPage(p));

            const pdfBytes = await newPdf.save();
            zip.file(`${chap.title}.pdf`, pdfBytes);
        }

        status.innerText = "Zipping files...";
        const zipContent = await zip.generateAsync({ type: "blob" });
        
        // Trigger download
        const url = window.URL.createObjectURL(zipContent);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Textbook_Chapters.zip";
        a.click();
        
        status.innerText = "Done! Download started.";
        status.classList.add('text-green-400');
    } catch (err) {
        console.error(err);
        status.innerText = "Error processing file. Check console.";
        status.classList.add('text-red-400');
    } finally {
        processBtn.disabled = false;
    }
});

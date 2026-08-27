// Live API Endpoint Configuration
const API_BASE_URL = "http://127.0.0.1:8001";

// Gauge Circle Calculation setup
const gaugeFill = document.getElementById("gaugeFill");
const RADIUS = gaugeFill ? gaugeFill.r.baseVal.value : 52;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * RADIUS;

if (gaugeFill) {
  gaugeFill.style.strokeDasharray = `${GAUGE_CIRCUMFERENCE} ${GAUGE_CIRCUMFERENCE}`;
  gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
}

const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const uploadPrompt = document.getElementById("uploadPrompt");
const previewWrap = document.getElementById("previewWrap");
const previewImg = document.getElementById("previewImg");
const scanLine = document.getElementById("scanLine");
const analyzeBtn = document.getElementById("analyzeBtn");
const analyzeBtnText = document.getElementById("analyzeBtnText");
const errorMsg = document.getElementById("errorMsg");
const report = document.getElementById("report");
const reportPlaceholder = document.getElementById("reportPlaceholder");
const resetBtn = document.getElementById("resetBtn");

let selectedFile = null;

// --- Selecting a File (Click & Drag-and-Drop) ---
if (uploadZone) {
  uploadZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  ["dragover", "dragleave", "drop"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (e) => e.preventDefault());
  });

  uploadZone.addEventListener("dragover", () => uploadZone.classList.add("is-dragover"));
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("is-dragover"));
  uploadZone.addEventListener("drop", (e) => {
    uploadZone.classList.remove("is-dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
}

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Please select a valid image file (PNG, JPG, or JPEG).");
    return;
  }
  hideError();
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    uploadPrompt.hidden = true;
    previewWrap.hidden = false;
  };
  reader.readAsDataURL(file);

  analyzeBtn.disabled = false;
  report.hidden = true;
  reportPlaceholder.hidden = false;
}

// --- Request Analysis from Backend ---
if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    setLoading(true);
    hideError();
    if (scanLine) scanLine.classList.add("is-active");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Server error while evaluating image.");
      }

      const data = await response.json();
      renderReport(data);
    } catch (err) {
      showError(
        err.message === "Failed to fetch"
          ? "Unable to reach the server. Verify that your backend service is running on port 8001."
          : err.message
      );
    } finally {
      setLoading(false);
      if (scanLine) scanLine.classList.remove("is-active");
    }
  });
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtnText.textContent = isLoading ? "Analyzing Image..." : "Analyze photo";
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}

// --- Dynamic Report Rendering ---
function renderReport(data) {
  document.getElementById("reportId").textContent =
    "#" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const diseaseNameEl = document.getElementById("diseaseName");

  if (data.is_confident === false) {
    diseaseNameEl.textContent = "Low Confidence Diagnosis";
    diseaseNameEl.classList.add("report__disease--warning");
  } else {
    const readableName = data.predicted_class
      .replaceAll("___", " — ")
      .replaceAll("_", " ");
    diseaseNameEl.textContent = readableName;
    diseaseNameEl.classList.remove("report__disease--warning");
  }

  // Update Gauge Chart
  const pct = Math.min(Math.max(data.confidence || 0, 0), 100);
  document.getElementById("confidenceValue").textContent = pct + "%";
  
  if (gaugeFill) {
    const offset = GAUGE_CIRCUMFERENCE * (1 - pct / 100);
    gaugeFill.style.strokeDashoffset = offset;
    gaugeFill.classList.toggle("gauge__fill--warning", data.is_confident === false);
  }

  // Populate Content Sections
  const info = data.disease_info || {};
  document.getElementById("diseaseSummary").textContent =
    info.disease_summary || "No specific summary available for this item.";

  fillList("symptomsList", info.symptoms);
  fillList("treatmentList", info.treatment_steps);
  fillList("preventionList", info.prevention_tips);

  const hasDetails = data.is_confident !== false;
  document.getElementById("symptomsSection").hidden = !hasDetails;
  document.getElementById("treatmentSection").hidden = !hasDetails;
  document.getElementById("preventionSection").hidden = !hasDetails;

  reportPlaceholder.hidden = true;
  report.hidden = false;
  report.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fillList(elementId, items) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = "";
  
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No specific guidelines provided.";
    el.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

// --- Reset State Action ---
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";
    uploadPrompt.hidden = false;
    previewWrap.hidden = true;
    analyzeBtn.disabled = true;
    report.hidden = true;
    reportPlaceholder.hidden = false;
    
    if (gaugeFill) {
      gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
    }

    const diagnoseSection = document.getElementById("diagnose");
    if (diagnoseSection) {
      diagnoseSection.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// --- Print & PDF Export Feature for Index Page ---
document.addEventListener("DOMContentLoaded", () => {
  const printBtn = document.getElementById("printReportBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const diseaseName = document.getElementById("diseaseName")?.textContent || "Plant Diagnosis";
      const confidence = document.getElementById("confidenceValue")?.textContent || "0%";
      const summary = document.getElementById("diseaseSummary")?.textContent || "";
      const symptoms = document.getElementById("symptomsList")?.innerHTML || "";
      const treatment = document.getElementById("treatmentList")?.innerHTML || "";
      const prevention = document.getElementById("preventionList")?.innerHTML || "";

      const printWindow = window.open('', '_blank');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Verdant - Plant Diagnosis Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111; padding: 30px; line-height: 1.6; }
            h1 { color: #065f46; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            h3 { color: #047857; margin-top: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .meta { color: #4b5563; font-size: 14px; margin-bottom: 20px; }
            .card { background: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #10b981; }
            ul, ol { padding-left: 20px; }
            li { margin-bottom: 6px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>🌱 Verdant - Plant Disease Diagnosis Report</h1>
          <div class="meta">
            <p><strong>Report Date:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div class="card">
            <p><strong>Detected Disease:</strong> <span style="font-size: 18px; color: #065f46;">${diseaseName}</span></p>
            <p><strong>Confidence Rate:</strong> ${confidence}</p>
          </div>

          <div>
            <h3>Overview</h3>
            <p>${summary}</p>
          </div>

          <div>
            <h3>Symptoms</h3>
            <ul>${symptoms}</ul>
          </div>

          <div>
            <h3>Treatment Plan</h3>
            <ol>${treatment}</ol>
          </div>

          <div>
            <h3>Prevention Tips</h3>
            <ul>${prevention}</ul>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    });
  }
});
const API_BASE_URL = "http://127.0.0.1:8001";
let globalStatsData = null;
let perClassChartInstance = null;

async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/model-stats`);
    if (!response.ok) throw new Error("Failed to load model stats");
    const data = await response.json();
    globalStatsData = data;
    renderDashboard(data);
  } catch (err) {
    console.error("Dashboard Load Error:", err);
    const subtitle = document.querySelector(".dash__subtitle");
    if (subtitle) {
      subtitle.textContent = "Couldn't load model statistics. Make sure the backend server is running on port 8001.";
      subtitle.style.color = "#ef4444";
    }
  }
}

function renderDashboard(data) {
  if (data.is_placeholder) {
    const banner = document.getElementById("placeholderBanner");
    if (banner) banner.hidden = false;
  }

  // --- Top metric cards ---
  document.getElementById("statClasses").textContent = data.dataset.num_classes || 25;
  document.getElementById("statTrain").textContent = (data.dataset.train_size || 0).toLocaleString();
  document.getElementById("statSvm").textContent = formatPct(data.models.svm.accuracy);
  document.getElementById("statCnn").textContent = formatPct(data.models.cnn.accuracy);

  // --- Model Comparison List ---
  const compSvm = document.getElementById("compSvm");
  const compCnn = document.getElementById("compCnn");
  if (compSvm) compSvm.textContent = formatPct(data.models.svm.accuracy);
  if (compCnn) compCnn.textContent = formatPct(data.models.cnn.accuracy);

  // --- Populate Class Selector Dropdown ---
  setupClassSelector(data.per_class_metrics || []);

  // --- Per-class bar chart & initial selection ---
  renderPerClassChart(data.per_class_metrics || []);

  // --- Render Error Insights instead of dense sparse matrix ---
  renderConfusionMatrix(data.confusion_matrix || { labels: [], matrix: [] });

  // --- Error Analysis ---
  renderErrorAnalysis(data.confusion_matrix || { labels: [], matrix: [] });
}

function formatPct(value) {
  if (value === undefined || value === null) return "0.0%";
  return (value * 100).toFixed(1) + "%";
}

function setupClassSelector(perClassMetrics) {
  const select = document.getElementById("classSelect");
  if (!select) return;
  select.innerHTML = "";

  perClassMetrics.forEach((m, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = m.class_name.replaceAll("_", " ");
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    const selectedIndex = parseInt(e.target.value);
    updateSelectedClassMetrics(perClassMetrics[selectedIndex]);
  });

  if (perClassMetrics.length > 0) {
    updateSelectedClassMetrics(perClassMetrics[0]);
  }
}

function updateSelectedClassMetrics(metric) {
  if (!metric) return;
  document.getElementById("valPrecision").textContent = formatPct(metric.precision);
  document.getElementById("valRecall").textContent = formatPct(metric.recall);
  document.getElementById("valF1").textContent = formatPct(metric.f1_score);
  document.getElementById("valSupport").textContent = metric.support || "—";
}

function renderPerClassChart(perClassMetrics) {
  const ctx = document.getElementById("perClassChart").getContext("2d");
  
  // --- Sort metrics from lowest to highest performance (by f1_score) ---
  const sortedMetrics = [...perClassMetrics].sort((a, b) => a.f1_score - b.f1_score);

  // --- Calculate and display Weakest & Strongest Classes in HTML card ---
  if (sortedMetrics.length > 0) {
    const weakest = sortedMetrics[0]; 
    const strongest = sortedMetrics[sortedMetrics.length - 1]; 

    const weakEl = document.getElementById("weakestClassVal");
    const strongEl = document.getElementById("strongestClassVal");

    if (weakEl) {
      weakEl.textContent = `${weakest.class_name.replaceAll("_", " ")} (Recall: ${(weakest.recall * 100).toFixed(1)}%, F1: ${(weakest.f1_score * 100).toFixed(1)}%)`;
    }
    if (strongEl) {
      strongEl.textContent = `${strongest.class_name.replaceAll("_", " ")} (Recall: ${(strongest.recall * 100).toFixed(1)}%, F1: ${(strongest.f1_score * 100).toFixed(1)}%)`;
    }
  }

  const labels = sortedMetrics.map((m) => m.class_name.replaceAll("_", " "));

  if (perClassChartInstance) {
    perClassChartInstance.destroy();
  }

  perClassChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Precision",
          data: sortedMetrics.map((m) => m.precision),
          backgroundColor: "#3b82f6",
          borderRadius: 4,
        },
        {
          label: "Recall",
          data: sortedMetrics.map((m) => m.recall),
          backgroundColor: "#10b981",
          borderRadius: 4,
        },
        {
          label: "F1-score",
          data: sortedMetrics.map((m) => m.f1_score),
          backgroundColor: "#f59e0b",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#9ca3af", font: { family: "Plus Jakarta Sans", size: 10 }, maxRotation: 45, minRotation: 45 },
          grid: { color: "rgba(255, 255, 255, 0.05)" },
        },
        y: {
          beginAtZero: true,
          max: 1,
          ticks: { color: "#9ca3af", font: { family: "JetBrains Mono", size: 11 } },
          grid: { color: "rgba(255, 255, 255, 0.05)" },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#f9fafb",
            font: { family: "Plus Jakarta Sans", weight: "600", size: 12 },
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: "#1f2937",
          titleColor: "#f9fafb",
          bodyColor: "#d1d5db",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          padding: 12,
        },
      },
    },
  });
}

function renderConfusionMatrix(confusionMatrix) {
  const container = document.getElementById("confusionMatrix");
  if (!container) return;
  
  container.innerHTML = `
    <div style="padding: 16px; color: #9ca3af; font-family: 'Plus Jakarta Sans', sans-serif;">
      <h4 style="color: #f9fafb; margin-bottom: 8px; font-size: 14px;">📊 Key Model Insights & Error Analysis</h4>
      <p style="font-size: 12px; line-height: 1.5; margin-bottom: 12px; color: #9ca3af;">
        Cross-class overlap and top misclassification margins across the agricultural disease categories:
      </p>
      <ul id="confusedClassesList" style="list-style-type: disc; padding-left: 20px; font-size: 13px; color: #d1d5db;">
        <!-- Error list will be injected by renderErrorAnalysis -->
      </ul>
    </div>
  `;
}

function renderErrorAnalysis(confusionMatrix) {
  const { labels, matrix } = confusionMatrix;
  const listEl = document.getElementById("confusedClassesList");
  if (!listEl || !matrix || matrix.length === 0) return;

  listEl.innerHTML = "";
  let confusions = [];

  matrix.forEach((row, rIdx) => {
    row.forEach((val, cIdx) => {
      if (rIdx !== cIdx && val > 0) {
        confusions.push({
          trueClass: (labels[rIdx] || `Class ${rIdx}`).replaceAll("_", " "),
          predClass: (labels[cIdx] || `Class ${cIdx}`).replaceAll("_", " "),
          count: val
        });
      }
    });
  });

  // Sort by highest confusion count
  confusions.sort((a, b) => b.count - a.count);
  const topConfusions = confusions.slice(0, 5); // Top 5 errors

  if (topConfusions.length === 0) {
    listEl.innerHTML = "<li>No significant cross-class confusion detected. Model is highly accurate!</li>";
    return;
  }

  topConfusions.forEach(item => {
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    li.innerHTML = `<strong>${item.trueClass}</strong> often misclassified as <strong>${item.predClass}</strong> — <span style="color: #f59e0b;">${item.count} instances</span>`;
    listEl.appendChild(li);
  });
}

// --- Export Model Report Functionality ---
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();

  const exportBtn = document.getElementById("exportReportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!globalStatsData) {
        alert("Model statistics are not loaded yet!");
        return;
      }

      const reportData = {
        projectName: "Verdant - Plant Disease Diagnosis",
        generatedAt: new Date().toISOString(),
        datasetInfo: globalStatsData.dataset,
        modelAccuracies: globalStatsData.models,
        perClassMetrics: globalStatsData.per_class_metrics
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "verdant_model_performance_report.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }
});
const API_BASE = 'http://127.0.0.1:3210';

const state = {
  cleanupAnalysis: null,
  processes: [],
  startup: [],
  history: [],
  chartPoints: [],
};

const elements = {
  cpuUsage: document.getElementById('cpu-usage'),
  ramUsage: document.getElementById('ram-usage'),
  diskUsage: document.getElementById('disk-usage'),
  networkState: document.getElementById('network-state'),
  processList: document.getElementById('process-list'),
  cleanupSummary: document.getElementById('cleanup-summary'),
  cleanupList: document.getElementById('cleanup-list'),
  startupList: document.getElementById('startup-list'),
  storageList: document.getElementById('storage-list'),
  networkPanel: document.getElementById('network-panel'),
  performanceHistory: document.getElementById('performance-history'),
  logHistory: document.getElementById('log-history'),
  platformLabel: document.getElementById('platform-label'),
  optimizeNow: document.getElementById('optimize-now'),
  runCleanup: document.getElementById('run-cleanup'),
  processSearch: document.getElementById('process-search'),
  sortProcesses: document.getElementById('sort-processes'),
  historyPeriod: document.getElementById('history-period'),
  canvas: document.getElementById('monitor-chart'),
};

function requestJson(url, options = {}) {
  return fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Erro na operação.');
    }
    return payload;
  });
}

function formatMb(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Não disponível';
  return `${Number(value).toFixed(2)} MB`;
}

function renderMonitor(data) {
  const cpuUsage = data?.cpu?.usage ?? 'Não disponível';
  const ram = data?.memory ?? {};
  const disk = data?.disk?.[0] ?? {};
  const total = Number(disk.total || 0);
  const free = Number(disk.free || 0);
  const used = total > 0 ? ((total - free) / total) * 100 : 0;

  elements.platformLabel.textContent = `${process.platform}`;
  elements.cpuUsage.textContent = typeof cpuUsage === 'number' ? `${cpuUsage}%` : cpuUsage;
  elements.ramUsage.textContent = `${ram.used ?? 'N/A'} / ${ram.total ?? 'N/A'} MB`;
  elements.diskUsage.textContent = `${used.toFixed(1)}%`;
  elements.networkState.textContent = data?.network?.activeInterface || 'Não disponível';

  if (state.chartPoints.length > 30) state.chartPoints.shift();
  state.chartPoints.push({ y: Number(cpuUsage) || 0 });
  drawChart();
}

function drawChart() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#2bd4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  state.chartPoints.forEach((point, index) => {
    const x = (index / Math.max(1, state.chartPoints.length - 1)) * width;
    const y = height - (point.y / 100) * height;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

async function loadDashboard() {
  try {
    const response = await requestJson('/api/dashboard');
    const monitor = response?.monitor ?? {};
    const cleanup = response?.cleanup ?? {};
    const startup = response?.startup ?? [];
    const storage = response?.storage ?? [];
    const network = response?.network ?? {};
    const performance = response?.performance ?? [];

    renderMonitor(monitor);
    renderStartupList(startup);
    renderStorageList(storage);
    renderNetwork(network);
    renderPerformance(performance);
    renderCleanupAnalysis(cleanup);
    renderHistory();
    await loadProcesses();
  } catch (error) {
    console.error(error);
    elements.cpuUsage.textContent = 'Erro';
  }
}

async function loadProcesses() {
  try {
    const response = await requestJson('/api/processes');
    state.processes = response.data || [];
    renderProcesses();
  } catch (error) {
    console.error(error);
  }
}

function renderProcesses() {
  const search = elements.processSearch.value.trim().toLowerCase();
  const sortMode = elements.sortProcesses.value;

  const items = [...state.processes]
    .filter((proc) => {
      const haystack = `${proc.name} ${proc.user} ${proc.pid}`.toLowerCase();
      return !search || haystack.includes(search);
    })
    .sort((a, b) => {
      if (sortMode === 'memory') return Number(b.memory || 0) - Number(a.memory || 0);
      return Number(b.cpu || 0) - Number(a.cpu || 0);
    });

  if (!items.length) {
    elements.processList.innerHTML = '<p>Nenhum processo encontrado.</p>';
    return;
  }

  elements.processList.innerHTML = items.slice(0, 15).map((proc) => `
    <div class="process-item">
      <div>
        <strong>${proc.name}</strong>
        <small>PID ${proc.pid} · ${proc.user}</small>
      </div>
      <div class="process-meta">
        <span>CPU ${Number(proc.cpu || 0).toFixed(2)}%</span>
        <span>RAM ${Number(proc.memory || 0).toFixed(2)} MB</span>
        <button class="danger small" data-kill="${proc.pid}">Encerrar</button>
      </div>
    </div>
  `).join('');

  elements.processList.querySelectorAll('[data-kill]').forEach((button) => {
    button.addEventListener('click', async () => {
      const pid = button.getAttribute('data-kill');
      const target = state.processes.find((proc) => String(proc.pid) === String(pid));
      const confirmed = confirm(`Encerrar processo ${target?.name || 'desconhecido'} (PID ${pid})?`);
      if (!confirmed) return;

      try {
        const result = await requestJson('/api/processes/terminate', {
          method: 'POST',
          body: JSON.stringify({ pid: Number(pid) }),
        });
        alert(result.message || 'Resultado da operação.');
        await loadProcesses();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function renderCleanupAnalysis(cleanup) {
  if (!cleanup || !Array.isArray(cleanup.items) || !cleanup.items.length) {
    elements.cleanupSummary.textContent = 'Nenhum item seguro identificado ainda.';
    elements.cleanupList.innerHTML = '';
    elements.runCleanup.hidden = true;
    state.cleanupAnalysis = null;
    return;
  }

  state.cleanupAnalysis = cleanup;
  const totalFiles = cleanup.totalFiles || 0;
  const totalBytes = Number(cleanup.totalBytes || 0) / (1024 * 1024);
  elements.cleanupSummary.textContent = `Encontrados ${totalFiles} arquivos seguros, liberando ~${totalBytes.toFixed(2)} MB.`;
  elements.cleanupList.innerHTML = cleanup.items.map((item) => `
    <label class="check-row">
      <input type="checkbox" value="${item.category}" checked />
      <span>${item.category}</span>
      <small>${item.files} arquivos · ${Number(item.sizeBytes / (1024 * 1024)).toFixed(2)} MB</small>
    </label>
  `).join('');
  elements.runCleanup.hidden = false;
}

function renderStartupList(items) {
  if (!items.length) {
    elements.startupList.innerHTML = '<p>Nenhum item de inicialização encontrado.</p>';
    return;
  }

  elements.startupList.innerHTML = items.map((item) => `
    <div class="startup-item">
      <div>
        <strong>${item.name}</strong>
        <small>${item.source}</small>
      </div>
      <div class="switch-block">
        <span>${item.enabled ? 'Ativado' : 'Desativado'}</span>
        <button data-startup-toggle="${item.id}" data-enabled="${item.enabled ? 'true' : 'false'}">${item.enabled ? 'Desativar' : 'Ativar'}</button>
      </div>
    </div>
  `).join('');

  elements.startupList.querySelectorAll('[data-startup-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-startup-toggle');
      const enabled = button.getAttribute('data-enabled') === 'true';
      const shouldEnable = !enabled;
      const confirmed = confirm(`Alterar item de inicialização: ${shouldEnable ? 'ativar' : 'desativar'}?`);
      if (!confirmed) return;
      try {
        const result = await requestJson('/api/startup-items/toggle', {
          method: 'POST',
          body: JSON.stringify({ id, enabled: shouldEnable }),
        });
        alert(result.message || 'Alteração registrada.');
        await loadDashboard();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function renderStorageList(items) {
  if (!items.length) {
    elements.storageList.innerHTML = '<p>Sem unidades disponíveis.</p>';
    return;
  }

  elements.storageList.innerHTML = items.map((volume) => {
    const usedPct = volume.total ? ((volume.used / volume.total) * 100).toFixed(1) : 0;
    return `
      <div class="storage-item">
        <div class="storage-header"><strong>${volume.path}</strong><span>${usedPct}% usado</span></div>
        <small>${volume.fileSystem}</small>
        <div class="bar"><span style="width:${usedPct}%"></span></div>
        <small>${formatMb(volume.used)} / ${formatMb(volume.total)}</small>
      </div>
    `;
  }).join('');
}

function renderNetwork(data) {
  elements.networkPanel.innerHTML = `
    <div><strong>Interface ativa:</strong> ${data.activeInterface || 'Indisponível'}</div>
    <div><strong>IP local:</strong> ${data.localAddress || 'Indisponível'}</div>
    <div><strong>Velocidade:</strong> ${data.speed || 'Não disponível'}</div>
    <div><strong>Gateway:</strong> ${data.gateway || 'Não disponível'}</div>
  `;
}

function renderPerformance(items) {
  if (!items.length) {
    elements.performanceHistory.innerHTML = '<p>Sem histórico disponível.</p>';
    return;
  }

  elements.performanceHistory.innerHTML = items.slice(-10).map((item) => `
    <div class="history-row">
      <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
      <span>CPU ${item.cpu ?? 'N/A'}%</span>
      <span>RAM ${item.ram ?? 'N/A'}%</span>
      <span>Rede ${item.network ?? 'N/A'}</span>
    </div>
  `).join('');
}

function renderHistory() {
  requestJson('/api/history')
    .then((response) => {
      const rows = response.data || [];
      elements.logHistory.innerHTML = rows.slice(0, 12).map((log) => `
        <div class="log-row">
          <strong>${log.module}</strong>
          <small>${new Date(log.timestamp).toLocaleString()} · ${log.operation}</small>
          <span>${log.result || 'unknown'}</span>
        </div>
      `).join('');
    })
    .catch((error) => {
      elements.logHistory.innerHTML = `<p>${error.message}</p>`;
    });
}

async function runCleanupAction() {
  const selected = Array.from(document.querySelectorAll('#cleanup-list input:checked')).map((input) => input.value);
  const confirmed = confirm(`Você está prestes a remover ${selected.length || 'itens seguros'} e liberar espaço do sistema.`);
  if (!confirmed) return;

  try {
    const response = await requestJson('/api/cleanup/run', {
      method: 'POST',
      body: JSON.stringify({ selected }),
    });
    alert(response.message || 'Limpeza concluída.');
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function runOptimizationPlan() {
  const selected = [
    'cleanup-tmp',
    'startup-check',
    'processes',
  ];

  const confirmed = confirm('Executar diagnóstico e otimização segura nas ações selecionadas?');
  if (!confirmed) return;

  try {
    const response = await requestJson('/api/optimize', {
      method: 'POST',
      body: JSON.stringify({ actions: selected }),
    });
    alert(response.message || 'Otimização concluída.');
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function runNetworkTest(type) {
  try {
    const response = await requestJson('/api/network/test', {
      method: 'POST',
      body: JSON.stringify({ type, host: '1.1.1.1' }),
    });
    alert(response.data?.message || 'Teste executado.');
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById('refresh-processes').addEventListener('click', loadProcesses);
document.getElementById('analyze-cleanup').addEventListener('click', async () => {
  try {
    const response = await requestJson('/api/cleanup/analyze');
    renderCleanupAnalysis(response.data || {});
  } catch (error) {
    alert(error.message);
  }
});
document.getElementById('run-cleanup').addEventListener('click', runCleanupAction);

document.getElementById('optimize-now').addEventListener('click', runOptimizationPlan);
document.getElementById('process-search').addEventListener('input', renderProcesses);
document.getElementById('sort-processes').addEventListener('change', renderProcesses);
document.getElementById('history-period').addEventListener('change', async () => {
  const period = document.getElementById('history-period').value;
  try {
    const response = await requestJson(`/api/performance?period=${period}`);
    renderPerformance(response.data || []);
  } catch (error) {
    console.error(error);
  }
});

document.querySelectorAll('[data-test]').forEach((button) => {
  button.addEventListener('click', () => runNetworkTest(button.getAttribute('data-test')));
});

setInterval(() => {
  loadDashboard();
}, 5000);

loadDashboard();

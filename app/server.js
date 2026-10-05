const express = require('express');
const path = require('path');
const { SystemAdapter } = require('./systemAdapter');
const { getDb, recordLog, listLogs, getMetricsHistory, insertMetric, ensureDefaults } = require('./db');
const { saveBackup, undoLastChange } = require('./backup');

function createServer(port = 3210) {
  const app = express();
  const publicDir = path.join(__dirname, '..', 'public');
  const system = new SystemAdapter();

  ensureDefaults();

  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(publicDir));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, platform: process.platform });
  });

  app.get('/api/dashboard', async (req, res) => {
    try {
      const monitor = await system.getMonitor();
      const processes = await system.getProcesses();
      const storage = await system.getStorage();
      const network = await system.getNetwork();
      const startup = await system.getStartupItems();
      const cleanup = await system.analyzeCleanup();
      const performance = await system.getPerformanceHistory();

      res.json({
        monitor,
        processes: processes.slice(0, 20),
        storage,
        network,
        startup,
        cleanup,
        performance,
      });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'DASHBOARD_ERROR', message: error.message });
    }
  });

  app.get('/api/monitor', async (_req, res) => {
    try {
      const data = await system.getMonitor();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'MONITOR_ERROR', message: error.message });
    }
  });

  app.get('/api/processes', async (_req, res) => {
    try {
      const result = await system.getProcesses();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'PROCESSES_ERROR', message: error.message });
    }
  });

  app.post('/api/processes/terminate', async (req, res) => {
    try {
      const { pid } = req.body || {};
      const pidNumber = Number(pid);
      if (!Number.isInteger(pidNumber) || pidNumber <= 0) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_PID', message: 'PID inválido.' });
      }

      const result = await system.terminateProcess(pidNumber);
      recordLog({
        module: 'processes',
        operation: 'terminate_process',
        involved: String(pidNumber),
        result: result.success ? 'success' : 'failed',
        errorCode: result.success ? null : result.errorCode || 'PROCESS_KILL_FAILED',
        durationMs: result.durationMs || 0,
      });

      if (!result.success) {
        return res.status(403).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'TERMINATE_ERROR', message: error.message });
    }
  });

  app.get('/api/cleanup/analyze', async (_req, res) => {
    try {
      const result = await system.analyzeCleanup();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'CLEANUP_ANALYZE_ERROR', message: error.message });
    }
  });

  app.post('/api/cleanup/run', async (req, res) => {
    try {
      const { selected = [] } = req.body || {};
      const result = await system.runCleanup(selected);
      recordLog({
        module: 'cleanup',
        operation: 'run_cleanup',
        involved: String(selected.length),
        result: result.success ? 'success' : 'failed',
        errorCode: result.success ? null : result.errorCode || 'CLEANUP_FAILED',
        durationMs: result.durationMs || 0,
        releasedSpace: result.bytesFreed || 0,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'CLEANUP_RUN_ERROR', message: error.message });
    }
  });

  app.get('/api/startup-items', async (_req, res) => {
    try {
      const data = await system.getStartupItems();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'STARTUP_ERROR', message: error.message });
    }
  });

  app.post('/api/startup-items/toggle', async (req, res) => {
    try {
      const { id, enabled } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Identificador da entrada inválido.' });
      }

      const backup = await saveBackup({ module: 'startup', id, enabled, timestamp: new Date().toISOString() });
      const result = await system.toggleStartupItem(id, !!enabled, backup);
      recordLog({
        module: 'startup',
        operation: 'toggle_startup_item',
        involved: id,
        result: result.success ? 'success' : 'failed',
        errorCode: result.success ? null : result.errorCode || 'STARTUP_TOGGLE_FAILED',
        durationMs: result.durationMs || 0,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'STARTUP_TOGGLE_ERROR', message: error.message });
    }
  });

  app.get('/api/storage', async (_req, res) => {
    try {
      const data = await system.getStorage();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'STORAGE_ERROR', message: error.message });
    }
  });

  app.get('/api/network', async (_req, res) => {
    try {
      const data = await system.getNetwork();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'NETWORK_ERROR', message: error.message });
    }
  });

  app.post('/api/network/test', async (req, res) => {
    try {
      const { type = 'connectivity', host = '1.1.1.1' } = req.body || {};
      const result = await system.runNetworkTest(type, host);
      recordLog({
        module: 'network',
        operation: `test_${type}`,
        involved: host,
        result: result.success ? 'success' : 'failed',
        errorCode: result.success ? null : result.errorCode || 'NETWORK_TEST_FAILED',
        durationMs: result.durationMs || 0,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'NETWORK_TEST_ERROR', message: error.message });
    }
  });

  app.get('/api/performance', async (req, res) => {
    try {
      const period = req.query.period || '30m';
      const data = await system.getPerformanceHistory(period);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'PERFORMANCE_ERROR', message: error.message });
    }
  });

  app.post('/api/optimize', async (req, res) => {
    try {
      const { actions = [] } = req.body || {};
      const result = await system.runOptimizationPlan(actions);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'OPTIMIZE_ERROR', message: error.message });
    }
  });

  app.get('/api/history', (_req, res) => {
    try {
      const history = listLogs(50);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'HISTORY_ERROR', message: error.message });
    }
  });

  app.post('/api/undo', async (_req, res) => {
    try {
      const result = await undoLastChange();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, errorCode: 'UNDO_ERROR', message: error.message });
    }
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  const serverInstance = app.listen(port, '127.0.0.1', () => {
    console.log(`Optimizer Panel API listening on http://127.0.0.1:${port}`);
  });

  return serverInstance;
}

module.exports = createServer;

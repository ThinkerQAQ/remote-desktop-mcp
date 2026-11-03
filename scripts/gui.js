(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fragment = location.hash.slice(1) || sessionStorage.getItem('rdmcp-session-token') || '';
  if (!/^[a-f0-9]{64}$/.test(fragment)) {
    $('message').textContent = 'Configuration session expired. Open RemoteDesktopMCP again.';
    return;
  }
  sessionStorage.setItem('rdmcp-session-token', fragment);
  history.replaceState(null, '', location.pathname);
  let previousId = '', active = false, busy = false;
  const notice = (text, error = false) => {
    $('message').textContent = text;
    $('message').classList.toggle('error', error);
  };
  async function api(route, data) {
    const headers = { 'X-Session-Token': fragment };
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch('/api/' + route, {
      method: data === undefined ? 'GET' : 'POST', headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      credentials: 'omit', cache: 'no-store', redirect: 'error'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Operation failed');
    return result;
  }
  function controls(disabled) {
    busy = disabled;
    $('save').disabled = disabled;
    $('refresh').disabled = disabled;
    $('service').disabled = disabled || !active;
    $('autostart').disabled = disabled || !active || $('autostart').dataset.available !== 'true';
  }
  async function refresh() {
    if (busy) return;
    try {
      const s = await api('status');
      active = s.configured;
      if (s.tunnelId && (previousId === '' || $('tunnelId').value === previousId)) {
        $('tunnelId').value = s.tunnelId;
        previousId = s.tunnelId;
      }
      $('keyHint').textContent = s.keySaved ?
        'A runtime API key is saved. Leave the field blank to keep it.' :
        'Enter your runtime API key. It will be stored locally.';
      $('apiKey').placeholder = s.keySaved ? '•••••••• (saved)' : 'Enter a runtime API key';
      $('service').textContent = s.running ? 'Stop Service' : 'Start Service';
      $('service').dataset.action = s.running ? 'stop' : 'start';
      const state = s.connected ? 'Connected' : s.running ? 'Starting…' : 'Stopped';
      $('connection').textContent = 'Local Tunnel: ' + state;
      $('serviceDetails').textContent = s.configured ?
        (s.connected ? 'The local Tunnel is connected.' : s.running ?
        'The service is running. Waiting for Tunnel readiness.' : 'Start the service after saving the configuration.') :
        'No configuration saved yet.';
      $('indicator').className = 'indicator' + (s.connected ? ' connected' : s.running ? ' starting' : '');
      $('autostart').dataset.available = String(s.autostart !== null);
      $('autostart').checked = s.autostart === true;
      controls(false);
    } catch { notice('Cannot read local service status. Try Refresh Status.', true); }
  }
  async function mutate(route, data, success) {
    controls(true); notice('Applying…');
    try {
      await api(route, data);
      notice(success);
    } catch (e) {
      notice(e.message, true);
    } finally {
      busy = false;
      await refresh();
    }
  }
  $('config-form').addEventListener('submit', async event => {
    event.preventDefault();
    const tunnelId = $('tunnelId').value.trim(), apiKey = $('apiKey').value;
    if (!/^tunnel_[A-Za-z0-9_-]+$/.test(tunnelId)) {
      notice('Enter a valid Tunnel ID.', true); return;
    }
    await mutate('save', { tunnelId, apiKey },
      'Configuration saved. Start the service to use it.');
    $('apiKey').value = '';
  });
  $('service').addEventListener('click', async () => {
    const action = $('service').dataset.action;
    if (!['start', 'stop'].includes(action)) return;
    await mutate('service', { action }, action === 'start' ?
      'Service started. Refresh Status to check the Tunnel.' : 'Service stopped.');
  });
  $('refresh').addEventListener('click', () => refresh());
  $('autostart').addEventListener('change', async () => {
    const enabled = $('autostart').checked;
    await mutate('autostart', { enabled },
      enabled ? 'Auto-start enabled for your user account.' : 'Auto-start disabled; the current service is unchanged.');
  });
  refresh();
  setInterval(refresh, 8000);
})();

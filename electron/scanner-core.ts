import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const numCores = Math.max(1, os.cpus().length);

// ── Docker helpers ────────────────────────────────────────────────────────────

export async function getDockerPortMap(): Promise<Map<number, { id: string; name: string }>> {
  const map = new Map<number, { id: string; name: string }>();
  try {
    const { stdout } = await execAsync('docker ps --format "{{.ID}}\\t{{.Names}}\\t{{.Ports}}"', {
      timeout: 3000,
    });
    for (const line of stdout.split('\n')) {
      const parts = line.trim().split('\t');
      if (parts.length < 3) continue;
      const [id, name, portsStr] = parts;
      for (const m of portsStr.matchAll(/(?:0\.0\.0\.0|\[::\]|->)[:]*(\d+)(?:->|\/)/g)) {
        const port = parseInt(m[1], 10);
        if (port > 0 && port <= 65535) map.set(port, { id, name });
      }
    }
  } catch { /* docker not available or not running */ }
  return map;
}

export async function getDockerContainerForPort(targetPort: number): Promise<{ id: string; name: string } | null> {
  const map = await getDockerPortMap();
  return map.get(targetPort) ?? null;
}

// ── Process metrics ────────────────────────────────────────────────────────────

export async function getProcessMetrics(): Promise<Map<number, { cpu: number; memMB: number }>> {
  const map = new Map<number, { cpu: number; memMB: number }>();
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /FO CSV /NH', { timeout: 5000 });
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const fields = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
          .map(f => f.replace(/^"|"$/g, '').trim());
        if (fields.length < 5) continue;
        const pid = parseInt(fields[1], 10);
        const memKB = parseInt(fields[4].replace(/[^0-9]/g, ''), 10);
        if (!isNaN(pid) && pid > 0) {
          map.set(pid, { cpu: 0, memMB: isNaN(memKB) ? 0 : Math.round((memKB / 1024) * 10) / 10 });
        }
      }
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('ps -A -o pid=,pcpu=,rss=', { timeout: 5000 });
      for (const line of stdout.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) continue;
        const pid = parseInt(parts[0], 10);
        const rawCpu = parseFloat(parts[1]);
        const rssKB = parseInt(parts[2], 10);
        if (!isNaN(pid) && pid > 0) {
          const normalizedCpu = Math.min(100, Math.round((isNaN(rawCpu) ? 0 : rawCpu / numCores) * 10) / 10);
          map.set(pid, { cpu: normalizedCpu, memMB: isNaN(rssKB) ? 0 : Math.round((rssKB / 1024) * 10) / 10 });
        }
      }
    } else {
      const { stdout } = await execAsync('ps -A -o pid=,pcpu=,rss=', { timeout: 5000 });
      for (const line of stdout.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) continue;
        const pid = parseInt(parts[0], 10);
        const rawCpu = parseFloat(parts[1]);
        const rssKB = parseInt(parts[2], 10);
        if (!isNaN(pid) && pid > 0) {
          const normalizedCpu = Math.min(100, Math.round((isNaN(rawCpu) ? 0 : rawCpu / numCores) * 10) / 10);
          map.set(pid, { cpu: normalizedCpu, memMB: isNaN(rssKB) ? 0 : Math.round((rssKB / 1024) * 10) / 10 });
        }
      }
    }
  } catch { /* ignore */ }
  return map;
}

// ── Port listening check ───────────────────────────────────────────────────────

export async function isPortListening(port: number): Promise<boolean> {
  if (!port || port < 1 || port > 65535) return false;
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano`, {
        timeout: 3000,
      });
      return stdout.split('\n').some(l =>
        l.includes('LISTENING') && l.includes(`:${port} `)
      );
    } else {
      // ss is preferred; fall back to lsof
      try {
        const { stdout } = await execAsync(`ss -tlnp "sport = :${port}"`, {
          timeout: 2000,
        });
        return stdout.split('\n').filter(l => l.trim() && !l.startsWith('Netid')).length > 0;
      } catch {
        const { stdout } = await execAsync(`lsof -i TCP:${port} -s TCP:LISTEN -t`, {
          timeout: 2000,
        });
        return stdout.trim().length > 0;
      }
    }
  } catch {
    return false;
  }
}

// ── Unix port scanner ──────────────────────────────────────────────────────────

export async function scanUnixPorts(): Promise<Array<Record<string, unknown>>> {
  // key = `port-protocol`  (deduplicate on port+protocol combination)
  const portMap = new Map<string, Record<string, unknown>>();
  const dockerMap = await getDockerPortMap();
  const metrics = await getProcessMetrics();
  const currentUser = process.env.USER || process.env.LOGNAME || 'user';

  // ── 1) Primary: ss ──────────────────────────────────────────────────────────
  try {
    const { stdout: ssOut } = await execAsync('ss -tulpn', { timeout: 5000 });
    for (const line of ssOut.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Netid') || trimmed.startsWith('State')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;

      const proto = parts[0].toLowerCase().startsWith('tcp') ? 'TCP' : 'UDP';
      const rawState = parts[1].toUpperCase();
      const state = rawState.includes('LISTEN') ? 'LISTEN' : rawState;
      const localAddr = parts[4];

      const portMatch = localAddr.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port < 1 || port > 65535) continue;

      let pid = 0;
      let processName = 'System Process';

      if (dockerMap.has(port)) {
        processName = `docker: ${dockerMap.get(port)!.name}`;
      } else {
        const usersMatch = trimmed.match(/users:\(\("([^"]+)",pid=(\d+)/);
        if (usersMatch) {
          processName = usersMatch[1];
          pid = parseInt(usersMatch[2], 10);
        }
      }

      const key = `${port}-${proto}-${pid}`;
      if (portMap.has(key)) continue; // already have it

      const isDocker = processName.startsWith('docker:');
      const SYSTEM_PATTERNS = ['systemd', 'kernel', 'init', 'launchd', 'docker-proxy', 'containerd', 'kthreadd'];
      const isSystem = isDocker
        ? false
        : SYSTEM_PATTERNS.some(p => processName.toLowerCase().includes(p)) || pid === 0 || pid < 100;

      const m = metrics.get(pid);
      portMap.set(key, {
        port,
        protocol: proto,
        processName,
        pid,
        state,
        user: isDocker ? 'docker' : pid === 0 ? 'root' : currentUser,
        isSystemProcess: isSystem,
        requiresAdmin: isDocker ? false : pid === 0 || isSystem,
        address: localAddr.replace(/:(\d+)$/, '').replace(/^\*$/, '0.0.0.0') || '0.0.0.0',
        cpuUsage: m?.cpu ?? 0,
        memoryUsage: m?.memMB ?? 0,
      });
    }
  } catch (err) {
    console.warn('[scanner] ss warning:', (err as Error).message);
  }

  // ── 2) Fallback / enrich: lsof ─────────────────────────────────────────────
  try {
    const { stdout: lsofOut } = await execAsync('lsof -i -P -n -s TCP:LISTEN', {
      timeout: 8000,
    });
    const lines = lsofOut.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length < 9) continue;

      const rawName = parts[0];
      const pid = parseInt(parts[1], 10);
      const user = parts[2];
      const addrField = parts[8];

      const portMatch = addrField.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port < 1 || port > 65535) continue;

      const protocol = (parts[7] ?? '').includes('TCP') ? 'TCP' : 'UDP';
      const key = `${port}-${protocol}-${pid}`;

      const processName = dockerMap.has(port) ? `docker: ${dockerMap.get(port)!.name}` : rawName;

      if (portMap.has(key)) {
        // enrich existing entry with PID/process if it was 0
        const ex = portMap.get(key)!;
        if ((ex.pid as number) === 0 && pid > 0) {
          ex.pid = pid;
          ex.user = user;
          if (!(ex.processName as string).startsWith('docker:')) {
            ex.processName = processName;
          }
          const m = metrics.get(pid);
          ex.cpuUsage = m?.cpu ?? 0;
          ex.memoryUsage = m?.memMB ?? 0;
          const SYSTEM_PATTERNS = ['systemd', 'kernel', 'init', 'launchd'];
          ex.isSystemProcess = SYSTEM_PATTERNS.some(p => (ex.processName as string).toLowerCase().includes(p));
          ex.requiresAdmin = user === 'root';
        }
      } else {
        const isDocker = processName.startsWith('docker:');
        const SYSTEM_PATTERNS = ['systemd', 'kernel', 'init', 'launchd'];
        const isSystem = isDocker
          ? false
          : SYSTEM_PATTERNS.some(p => processName.toLowerCase().includes(p)) || pid < 100;
        const m = metrics.get(pid);
        portMap.set(key, {
          port,
          protocol,
          processName,
          pid,
          state: 'LISTEN',
          user,
          isSystemProcess: isSystem,
          requiresAdmin: isDocker ? false : user === 'root',
          address: addrField.replace(/:(\d+)$/, '').replace(/^\*$/, '0.0.0.0') || '0.0.0.0',
          cpuUsage: m?.cpu ?? 0,
          memoryUsage: m?.memMB ?? 0,
        });
      }
    }
  } catch (err) {
    console.warn('[scanner] lsof fallback:', (err as Error).message);
  }

  return [...portMap.values()];
}

// ── Windows port scanner ───────────────────────────────────────────────────────

export async function scanWindowsPorts(): Promise<Array<Record<string, unknown>>> {
  const portMap = new Map<string, Record<string, unknown>>(); // key = `port-protocol`
  const dockerMap = await getDockerPortMap();
  const metrics = await getProcessMetrics();

  // Build process name lookup from tasklist (already done in metrics; do name separately)
  const processNames = new Map<number, string>();
  try {
    const { stdout: taskOut } = await execAsync('tasklist /FO CSV /NH', { timeout: 5000 });
    for (const line of taskOut.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const fields = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map(f => f.replace(/^"|"$/g, '').trim());
      if (fields.length < 2) continue;
      const pid = parseInt(fields[1], 10);
      if (!isNaN(pid) && pid > 0) processNames.set(pid, fields[0]);
    }
  } catch { /* ignore */ }

  // Scan netstat -ano for all LISTENING ports
  try {
    const { stdout: netstatOut } = await execAsync('netstat -ano', { timeout: 8000 });

    for (const line of netstatOut.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Active') || trimmed.startsWith('Proto')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) continue;

      const proto = parts[0].toUpperCase();
      const localAddr = parts[1];
      const state = parts[3] ?? 'LISTENING';
      const pidStr = parts[parts.length - 1];

      // Only capture LISTENING TCP and all UDP
      if (proto === 'TCP' && !state.includes('LISTENING')) continue;

      const portMatch = localAddr.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port < 1 || port > 65535) continue;

      const pid = parseInt(pidStr, 10);
      if (isNaN(pid)) continue;

      // Deduplicate by port+protocol+pid (same port can have multiple listeners on Windows)
      const key = `${port}-${proto.includes('TCP') ? 'TCP' : 'UDP'}-${pid}`;
      if (portMap.has(key)) continue;

      let processName = 'Unknown';
      let isSystemProcess = false;

      if (dockerMap.has(port)) {
        processName = `docker: ${dockerMap.get(port)!.name}`;
      } else if (pid === 0 || pid === 4) {
        processName = 'System';
        isSystemProcess = true;
      } else if (processNames.has(pid)) {
        processName = processNames.get(pid)!;
      }

      const SYS_PROCS = ['System', 'svchost.exe', 'services.exe', 'lsass.exe', 'smss.exe', 'wininit.exe', 'ntoskrnl.exe', 'System Idle Process'];
      if (SYS_PROCS.some(s => processName.toLowerCase() === s.toLowerCase()) || pid < 10) {
        isSystemProcess = true;
      }

      const m = metrics.get(pid);
      portMap.set(key, {
        port,
        protocol: proto.includes('TCP') ? 'TCP' : 'UDP',
        processName,
        pid,
        state: state.includes('LISTENING') ? 'LISTEN' : state,
        user: isSystemProcess ? 'NT AUTHORITY\\SYSTEM' : (process.env.USERNAME || 'User'),
        isSystemProcess,
        requiresAdmin: isSystemProcess,
        address: localAddr.replace(/:(\d+)$/, '') || '0.0.0.0',
        cpuUsage: m?.cpu ?? 0,
        memoryUsage: m?.memMB ?? 0,
      });
    }
  } catch (err) {
    console.error('[scanner] netstat failed:', (err as Error).message);
  }

  return [...portMap.values()];
}

// ── Main entry point ───────────────────────────────────────────────────────────

export async function scanSystemPorts(): Promise<Array<Record<string, unknown>>> {
  if (process.platform === 'win32') {
    return scanWindowsPorts();
  }
  return scanUnixPorts();
}

// ── Process kill ───────────────────────────────────────────────────────────────

export async function killProcessCore(pid: number, port?: number): Promise<void> {
  const platform = process.platform;
  const validPid = Number.isInteger(pid) && pid > 0 ? pid : 0;
  const validPort = Number.isInteger(port) && (port ?? 0) >= 1 && (port ?? 0) <= 65535 ? port! : 0;

  if (!validPid && !validPort) {
    throw new Error('Invalid kill parameters: need a valid PID or port.');
  }

  // 1. Docker stop/kill
  if (validPort) {
    const dockerInfo = await getDockerContainerForPort(validPort);
    if (dockerInfo && /^[a-zA-Z0-9_-]+$/.test(dockerInfo.id)) {
      try {
        await execAsync(`docker stop ${dockerInfo.id}`);
        if (!(await isPortListening(validPort))) return;
      } catch {
        try {
          await execAsync(`docker kill ${dockerInfo.id}`);
          if (!(await isPortListening(validPort))) return;
        } catch { /* fall through */ }
      }
    }
  }

  // 2. Direct PID kill
  if (validPid > 0) {
    try {
      if (platform === 'win32') {
        await execAsync(`taskkill /PID ${validPid} /F /T`);
      } else {
        await execAsync(`kill -9 ${validPid}`);
      }
      if (!validPort || !(await isPortListening(validPort))) return;
    } catch { /* fall through to port-based kill */ }
  }

  // 3. Port-based kill fallback (Unix only)
  if (validPort && platform !== 'win32') {
    try {
      await execAsync(`fuser -k ${validPort}/tcp 2>/dev/null || true`);
      if (!(await isPortListening(validPort))) return;
    } catch { /* ignore */ }
    try {
      await execAsync(`lsof -t -iTCP:${validPort} | xargs -r kill -9`);
      if (!(await isPortListening(validPort))) return;
    } catch { /* ignore */ }
  }

  if (validPort && (await isPortListening(validPort))) {
    throw new Error(`Failed to kill process on port ${validPort}. Try running with elevated privileges.`);
  }
}

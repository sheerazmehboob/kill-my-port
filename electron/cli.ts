#!/usr/bin/env node
import { cac } from 'cac';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Table from 'cli-table3';
import { scanSystemPorts, killProcessCore } from './scanner-core';

const cli = cac('kmp');
const STATE_FILE = path.join(os.tmpdir(), '.kmp-state.json');

// Helper to save state for fast killing
function saveState(ports: any[]) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(ports), 'utf8');
}

// Helper to read state
function readState(): any[] {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore read errors
  }
  return [];
}

// Helper to sort ports
function sortPorts(ports: any[], sortBy: string) {
  if (sortBy === 'port') {
    ports.sort((a: any, b: any) => a.port - b.port);
  } else if (sortBy === 'pid') {
    ports.sort((a: any, b: any) => b.pid - a.pid);
  } else {
    // 'latest' default: highest PID first, system processes at the bottom
    ports.sort((a: any, b: any) => {
      const aIsSys = a.pid === 0 || a.isSystemProcess;
      const bIsSys = b.pid === 0 || b.isSystemProcess;
      if (aIsSys && !bIsSys) return 1;
      if (!aIsSys && bIsSys) return -1;
      return b.pid - a.pid;
    });
  }
}

// Helper to format process name with colors
function formatProcessName(name: string, isSystem: boolean) {
  if (!name) return pc.gray('Unknown');
  if (name.startsWith('docker:')) return pc.blue(name);
  if (isSystem || name === 'System Process') return pc.gray(name);
  if (name.includes('node') || name.includes('npm')) return pc.green(name);
  if (name.includes('python')) return pc.yellow(name);
  return pc.white(name);
}


cli.command('list', 'List all active ports')
  .option('-s, --sort <type>', 'Sort by: latest, port, pid', { default: 'latest' })
  .option('-a, --all', 'Show all ports including system processes')
  .action(async (options) => {
    console.log(pc.cyan(pc.bold('Scanning for active ports...')));
    let ports = await scanSystemPorts();
    
    if (!options.all) {
      ports = ports.filter((p: any) => !p.isSystemProcess);
    }
    
    sortPorts(ports, options.sort);
    
    if (ports.length === 0) {
      console.log(pc.yellow('No active listening ports found.'));
      return;
    }
    
    saveState(ports);
    
    const table = new Table({
      head: [pc.bold('Idx'), pc.bold('Port'), pc.bold('PID'), pc.bold('Process Name')],
      chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    });
    
    ports.forEach((port: any, idx: number) => {
      table.push([
        pc.gray(`[${idx + 1}]`),
        pc.cyan(port.port.toString()),
        port.pid === 0 ? pc.gray(port.pid.toString()) : pc.magenta(port.pid.toString()),
        formatProcessName(port.processName || 'Unknown', port.isSystemProcess)
      ]);
    });
    
    console.log(table.toString());
    console.log(`\nRun ${pc.cyan('kmp kill <Idx or Port>')} to terminate a process.`);
  });

cli.command('kill <target>', 'Kill a process by port number or list index')
  .option('-f, --force', 'Force kill the process')
  .action(async (target, options) => {
    const num = parseInt(target, 10);
    if (isNaN(num)) {
      console.log(pc.red('Please provide a valid number (index or port).'));
      process.exit(1);
    }
    
    let pidToKill = 0;
    let portToKill = 0;
    
    // If it's a small number, assume it's an index from the list
    if (num <= 1000) {
      const state = readState();
      const portObj = state[num - 1];
      if (!portObj) {
        console.log(pc.red(`No process found at index [${num}]. Run 'kmp list' again to refresh.`));
        process.exit(1);
      }
      pidToKill = portObj.pid;
      portToKill = portObj.port;
    } else {
      // Treat as a direct port number
      portToKill = num;
      const ports = await scanSystemPorts();
      const match = ports.find((p: any) => p.port === num);
      if (match) {
        if (match.isSystemProcess && !options.force) {
          console.log(pc.red('Safety lock: Cannot kill a system process. Use --force to override.'));
          process.exit(1);
        }
        pidToKill = match.pid;
      }
    }
    
    const spinner = p.spinner();
    spinner.start(`Terminating process on port ${portToKill}...`);
    
    try {
      await killProcessCore(pidToKill, portToKill);
      spinner.stop(pc.green(`✔ Successfully terminated process on port ${portToKill}.`));
    } catch (e: any) {
      spinner.stop(pc.yellow(`⚠ Requires elevated privileges. Prompting for permission...`));
      
      const { spawnSync } = require('child_process');
      if (process.platform === 'win32') {
        const result = spawnSync('powershell', ['-Command', `Start-Process taskkill -ArgumentList "/F /PID ${pidToKill}" -Verb RunAs -WindowStyle Hidden`], { stdio: 'ignore' });
        if (result.status === 0) {
           console.log(pc.green(`✔ Successfully requested UAC to terminate process on port ${portToKill}.`));
        } else {
           console.log(pc.red(`✖ Failed to terminate even with elevated privileges.`));
           process.exit(1);
        }
      } else {
        const result = spawnSync('sudo', ['kill', '-9', pidToKill.toString()], { stdio: 'inherit' });
        if (result.status === 0) {
           console.log(pc.green(`✔ Successfully terminated process on port ${portToKill} using sudo.`));
        } else {
           console.log(pc.red(`✖ Failed to terminate even with sudo.`));
           process.exit(1);
        }
      }
    }
  });

// Default action (Interactive TUI)
cli.command('', 'Interactive port killer')
  .option('-s, --sort <type>', 'Sort by: latest, port, pid', { default: 'latest' })
  .option('-a, --all', 'Show all ports including system processes')
  .action(async (options) => {
    p.intro(pc.inverse(' KILL MY PORT '));
    
    const s = p.spinner();
    s.start('Scanning system for active ports');
    
    let ports = await scanSystemPorts();
    
    if (!options.all) {
      ports = ports.filter((p: any) => !p.isSystemProcess);
    }
    
    if (ports.length === 0) {
      s.stop('Scan complete');
      p.note('No active listening ports found on your system.', 'All clear');
      p.outro('Goodbye!');
      return;
    }
    
    sortPorts(ports, options.sort);
    saveState(ports);
    
    s.stop(`Found ${ports.length} active ports`);
    
    const selectedPorts = await p.multiselect({
      message: 'Select ports to kill (Space to select, Enter to confirm)',
      options: ports.map((port: any) => {
        const processStr = formatProcessName(port.processName || 'Unknown', port.isSystemProcess);
        return {
          value: `${port.port}-${port.pid}`,
          label: `[${pc.cyan(port.port)}] ${processStr}`,
          hint: pc.gray(`PID: ${port.pid}`)
        };
      }),
      required: false
    });
    
    if (p.isCancel(selectedPorts) || (selectedPorts as any[]).length === 0) {
      p.outro('Operation cancelled.');
      return;
    }
    
    for (const val of (selectedPorts as any[])) {
      const [portId, pidId] = val.split('-');
      const port: any = ports.find((p: any) => p.port === parseInt(portId, 10) && p.pid === parseInt(pidId, 10));
      if (!port) continue;
      s.start(`Killing ${port.processName} on port ${port.port}...`);
      try {
        await killProcessCore(port.pid, port.port);
        s.stop(pc.green(`✔ Killed port ${port.port} (${port.processName})`));
      } catch (err: any) {
        s.stop(pc.yellow(`⚠ Requires elevated privileges. Prompting for permission...`));
        
        const { spawnSync } = require('child_process');
        if (process.platform === 'win32') {
          const result = spawnSync('powershell', ['-Command', `Start-Process taskkill -ArgumentList "/F /PID ${port.pid}" -Verb RunAs -WindowStyle Hidden`], { stdio: 'ignore' });
          if (result.status === 0) {
             console.log(pc.green(`✔ Successfully requested UAC to terminate process on port ${port.port}.`));
          } else {
             console.log(pc.red(`✖ Failed to terminate even with elevated privileges.`));
          }
        } else {
          const result = spawnSync('sudo', ['kill', '-9', port.pid.toString()], { stdio: 'inherit' });
          if (result.status === 0) {
             console.log(pc.green(`✔ Successfully terminated process on port ${port.port} using sudo.`));
          } else {
             console.log(pc.red(`✖ Failed to terminate even with sudo.`));
          }
        }
      }
    }
    
    p.outro('Finished cleaning up ports!');
  });

cli.help();
cli.version('0.0.1');

// Run the CLI
cli.parse();

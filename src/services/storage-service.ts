import type { CustomPort, AppSettings, AutoKillRule } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

const STORAGE_KEYS = {
  CUSTOM_PORTS: 'killmyport_custom_ports',
  AUTO_KILL_RULES: 'killmyport_autokill_rules',
  SETTINGS: 'killmyport_settings',
  INITIALIZED: 'killmyport_initialized',
};

/**
 * Storage service for persisting data locally
 * Uses localStorage for web, will be adapted for Electron's storage
 */
class StorageService {

  /**
   * Get custom ports from storage
   */
  getCustomPorts(): CustomPort[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PORTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading custom ports:', error);
      return [];
    }
  }

  /**
   * Save custom ports to storage
   */
  saveCustomPorts(ports: CustomPort[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PORTS, JSON.stringify(ports));
    } catch (error) {
      console.error('Error saving custom ports:', error);
    }
  }

  /**
   * Get Auto-Kill Rules from storage
   */
  getAutoKillRules(): AutoKillRule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTO_KILL_RULES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading auto-kill rules:', error);
      return [];
    }
  }

  /**
   * Save Auto-Kill Rules to storage
   */
  saveAutoKillRules(rules: AutoKillRule[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_KILL_RULES, JSON.stringify(rules));
    } catch (error) {
      console.error('Error saving auto-kill rules:', error);
    }
  }

  /**
   * Get app settings from storage
   */
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error reading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save app settings to storage
   */
  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Clear all storage
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_PORTS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

export const storageService = new StorageService();

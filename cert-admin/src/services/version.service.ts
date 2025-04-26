/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {BindingScope, injectable} from '@loopback/core';
import * as fs from 'fs';
import * as path from 'path';

export interface VersionInfo {
  version: string;
  timestamp: string;
  node_version: string;
  platform: string;
  arch: string;
}

@injectable({scope: BindingScope.SINGLETON})
export class VersionService {
  private versionInfo: VersionInfo;

  constructor() {
    // Try multiple possible locations for the version file
    const possibleLocations = [
      path.join(__dirname, '../../version.json'),
      path.join(__dirname, '../version.json'),
      path.join(__dirname, '../../dist/version.json'),
      path.join(__dirname, '../../dist/src/version.json'),
      path.join(process.cwd(), 'dist/version.json'),
      path.join(process.cwd(), 'dist/src/version.json'),
    ];

    let versionFile: string | undefined;
    for (const location of possibleLocations) {
      if (fs.existsSync(location)) {
        versionFile = location;
        break;
      }
    }

    if (!versionFile) {
      throw new Error(
        `Version file not found. Tried:\n${possibleLocations.join('\n')}\nPlease run npm build first.`
      );
    }

    this.versionInfo = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    console.log('Loaded version file from:', versionFile);
  }

  getCurrentVersion(): string {
    return this.versionInfo.version;
  }

  getVersionInfo(): VersionInfo {
    return this.versionInfo;
  }
} 

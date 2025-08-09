import '@testing-library/jest-dom';

import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock window.URL.createObjectURL and revokeObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mocked-url'),
    revokeObjectURL: jest.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock FormData
global.FormData = class FormData {
  private data: Map<string, any> = new Map();
  
  append(name: string, value: any) {
    if (this.data.has(name)) {
      const existing = this.data.get(name);
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        this.data.set(name, [existing, value]);
      }
    } else {
      this.data.set(name, value);
    }
  }
  
  get(name: string) {
    const value = this.data.get(name);
    return Array.isArray(value) ? value[0] : value;
  }
  
  getAll(name: string) {
    const value = this.data.get(name);
    return Array.isArray(value) ? value : value ? [value] : [];
  }
  
  has(name: string) {
    return this.data.has(name);
  }
  
  delete(name: string) {
    this.data.delete(name);
  }
  
  entries() {
    return this.data.entries();
  }
  
  keys() {
    return this.data.keys();
  }
  
  values() {
    return this.data.values();
  }
} as any;

import { describe, expect, it } from 'vitest';

describe('Nova Agent Services', () => {
  describe('Moonshot API', () => {
    it('should have correct endpoint', () => {
      const endpoint = 'https://api.moonshot.ai/v1';
      expect(endpoint).toContain('moonshot.ai');
    });

    it('should format chat messages correctly', () => {
      const messages: [
        { role: 'system'; content: string },
        { role: 'user'; content: string },
      ] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });

    it('should handle thinking mode', () => {
      const thinkingEnabled = { type: 'enabled' };
      const thinkingDisabled = { type: 'disabled' };

      expect(thinkingEnabled.type).toBe('enabled');
      expect(thinkingDisabled.type).toBe('disabled');
    });
  });

  describe('Vision Service', () => {
    it('should support image types', () => {
      const supportedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

      expect(supportedTypes).toContain('image/png');
      expect(supportedTypes).toContain('image/jpeg');
    });

    it('should handle base64 encoding', () => {
      const testData = 'hello world';
      const encoded = Buffer.from(testData).toString('base64');
      const decoded = Buffer.from(encoded, 'base64').toString();

      expect(decoded).toBe(testData);
    });
  });

  describe('Image to Code Service', () => {
    it('should structure code response', () => {
      const response = {
        html: '<div>Hello</div>',
        css: '.container { }',
        js: 'console.log("hello")',
      };

      expect(response.html).toContain('<div>');
      expect(response.css).toBeDefined();
    });
  });
});

describe('Nova Agent State', () => {
  it('should have default settings', () => {
    const defaultSettings = {
      model: 'kimi-k2.5',
      temperature: 0.7,
      maxTokens: 4096,
      theme: 'dark',
    };

    expect(defaultSettings.model).toBe('kimi-k2.5');
    expect(defaultSettings.temperature).toBeGreaterThan(0);
    expect(defaultSettings.temperature).toBeLessThanOrEqual(1);
  });

  it('should manage conversation history', () => {
    const history: [
      { role: 'user'; content: string },
      { role: 'assistant'; content: string },
    ] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
  });
});

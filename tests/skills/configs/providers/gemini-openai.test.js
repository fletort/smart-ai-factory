const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// 1. Mock Promptfoo before importing the provider
const mockBaseProvider = {
  callApi: async () => {},
};

const mockPromptfoo = {
  default: {
    loadApiProvider: async () => mockBaseProvider,
  },
};

// Intercept the require call for promptfoo
require.cache[require.resolve('promptfoo')] = {
  exports: mockPromptfoo,
};

// 2. Import the class under test
const GeminiOpenAiProvider = require('./geminiOpenAiProvider.js');

describe('GeminiOpenAiProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new GeminiOpenAiProvider({ config: { model: 'google:gemini-1.5-pro' } });
    // Reset mock implementation
    mockBaseProvider.callApi = async () => ({});
  });

  describe('_mapOpenAiToGoogle', () => {
    it('should map standard user and assistant text messages correctly', () => {
      const openAiInput = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ];

      const expectedGoogle = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there' }] },
      ];

      assert.deepStrictEqual(provider._mapOpenAiToGoogle(openAiInput), expectedGoogle);
    });

    it('should handle complex parallel tool calls and consecutive tool responses', () => {
      const openAiInput = [
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_2',
              type: 'function',
              function: { name: 'read_file', arguments: '{"path": "template.txt"}' },
            },
            {
              id: 'call_3',
              type: 'function',
              function: { name: 'read_file', arguments: '{"path": "index.html"}' },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'call_2',
          name: 'read_file',
          content: '{"result": "template content"}',
        },
        {
          role: 'tool',
          tool_call_id: 'call_3',
          name: 'read_file',
          content: '{"result": "index content"}',
        },
      ];

      const expectedGoogle = [
        {
          role: 'model',
          parts: [
            {
              functionCall: { id: 'call-2', name: 'read_file', args: { path: 'template.txt' } },
              thoughtSignature: 'skip_thought_signature_validator',
            },
            {
              functionCall: { id: 'call-3', name: 'read_file', args: { path: 'index.html' } },
            },
          ],
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: 'call-2',
                name: 'read_file',
                response: { result: 'template content' },
              },
            },
            {
              functionResponse: {
                id: 'call-3',
                name: 'read_file',
                response: { result: 'index content' },
              },
            },
          ],
        },
      ];

      assert.deepStrictEqual(provider._mapOpenAiToGoogle(openAiInput), expectedGoogle);
    });
  });

  describe('_mapGoogleToOpenAi', () => {
    it('should map Gemini function calls back to OpenAI format', () => {
      const geminiOutput = [
        {
          functionCall: {
            id: 'call-1',
            name: 'read_file',
            args: { path: '.smart.ai/config.yml' },
          },
        },
      ];

      const expectedOpenAi = [
        {
          type: 'function',
          index: 0,
          id: 'call-1',
          function: {
            name: 'read_file',
            arguments: '{"path":".smart.ai/config.yml"}',
          },
        },
      ];

      assert.deepStrictEqual(provider._mapGoogleToOpenAi(geminiOutput), expectedOpenAi);
    });
  });

  describe('callApi', () => {
    it('should intercept, map input, call native provider, and map output', async () => {
      const openAiInputPrompt = JSON.stringify([{ role: 'user', content: 'Run tool' }]);
      let receivedPrompt = null;

      // Setup mock behavior and capture input arguments
      mockBaseProvider.callApi = async (prompt) => {
        receivedPrompt = prompt;
        return {
          output: JSON.stringify([{ functionCall: { id: 'call-1', name: 'my_tool', args: {} } }]),
        };
      };

      const response = await provider.callApi(openAiInputPrompt, {}, {});

      // Verify the native provider received the stringified Gemini format
      const expectedNativePrompt = JSON.stringify([
        { role: 'user', parts: [{ text: 'Run tool' }] },
      ]);
      assert.strictEqual(receivedPrompt, expectedNativePrompt);

      // Verify the final output is mapped back to OpenAI format
      assert.deepStrictEqual(response.output, [
        {
          type: 'function',
          index: 0,
          id: 'call-1',
          function: { name: 'my_tool', arguments: '{}' },
        },
      ]);
    });
  });
});

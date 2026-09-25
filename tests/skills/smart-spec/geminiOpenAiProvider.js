const promptfoo = require('promptfoo').default;

class GeminiOpenAiProvider {
  constructor(options) {
    this.config = options.config;
    const baseModel = this.config?.model || 'google:gemini-1.5-pro';
    this.providerId = options.id || `custom-gemini-openai-${baseModel}`;
    this.baseModel = baseModel;
    this.baseProvider = null;
  }

  id() {
    return this.providerId;
  }

  async _ensureProvider() {
    if (!this.baseProvider) {
      const context = {
        options: {
          id: this.providerId,
          config: this.config,
        },
      };

      this.baseProvider = await promptfoo.loadApiProvider(this.baseModel, context);
    }
    return this.baseProvider;
  }

  async callApi(prompt, context, options) {
    // 1. Get the official provider
    const provider = await this._ensureProvider();

    // 2. Delegate the actual API call to the official native provider
    const response = await this.baseProvider.callApi(prompt, context, options);

    // If there's an error or no output, return the response as-is
    if (!response || !response.output) {
      return response;
    }

    try {
      // 3. Extract and parse the raw Google function call data
      const data =
        typeof response.output === 'string' ? JSON.parse(response.output) : response.output;
      if (Array.isArray(data)) {
        // 4. Map Gemini's structure to OpenAPI / OpenAI format
        const openAiResponse = data.map((item, index) => {
          if (item.functionCall) {
            return {
              type: 'function',
              index: index,
              // Use existing ID or fallback to an indexed identifier
              id: item.functionCall.id || `call_${index}`,
              function: {
                name: item.functionCall.name,
                // OpenAI expects arguments as a serialized JSON string
                arguments: JSON.stringify(item.functionCall.args),
              },
            };
          }
          // Return the item unchanged if it is not a function call
          return item;
        });

        // Override the output with our beautifully mapped OpenAPI JSON string
        //response.output = JSON.stringify(openAiResponse);
        response.output = openAiResponse;
      }
    } catch (e) {
      // If parsing fails (e.g., standard text output), safely leave original response untouched
    }
    return response;
  }
}

module.exports = GeminiOpenAiProvider;

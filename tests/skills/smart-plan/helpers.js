// =========================================================================
// PRIVATE FUNCTION (Not exported, hidden from Promptfoo)
// =========================================================================
function getAllPaths(output) {
  return output.map((c) => {
    const args =
      typeof c.function?.arguments === 'string'
        ? JSON.parse(c.function.arguments)
        : c.function?.arguments;
    return args?.path;
  });
}

function getFileContent(output, filename) {
  if (!Array.isArray(output)) return '';

  // Find the tool call writing to the requested path
  const call = output.find((c) => {
    const args =
      typeof c.function?.arguments === 'string'
        ? JSON.parse(c.function.arguments)
        : c.function?.arguments;
    return args?.path === filename;
  });

  if (!call) return '';

  // Safely extract and parse the content
  const finalArgs =
    typeof call.function.arguments === 'string'
      ? JSON.parse(call.function.arguments)
      : call.function.arguments;

  return finalArgs.content || '';
}

// =========================================================================
// PUBLIC FUNCTIONS (Exported and accessible by Promptfoo)
// =========================================================================
module.exports = {
  /**
   * Checks if the specified paths are present in the tool call parameters present in the output
   * @param {array} output Array of tool call objects present in the output (Openai format)
   * @param {Object} context The context object provided by promptfoo for each assertion
   * @param {Record<string, any>} [context.config] - Specific configurations passed to the assertion.
   * @param {string|string[]} [context.config.value] - path or array of paths to check for in the tool call path parameters
   * @returns {boolean} True if all specified paths are present in the tool call parameters, false otherwise.
   *
   * If the LLM does the following tool call:
   * - function(path: "some/path")
   * - function(path: "another/path")
   *
   *  The following assertion would pass:
   *  - type: javascript
   *      value: file://helpers.js:checkToolParamPaths
   *      config:
   *        value:
   *          - 'some/path'
   *          - 'another/path'
   */
  checkToolParamPaths: (output, context) => {
    const valueToFind = context?.config?.value;
    if (!valueToFind) return false;

    const calledPaths = getAllPaths(output);
    if (Array.isArray(valueToFind)) {
      return valueToFind.every((str) => calledPaths.includes(str));
    }
    return calledPaths.includes(valueToFind);
  },

  /**
   * Checks in the specified tool call if content parameter contains a string or an array of strings
   * @param {array} output Array of tool call objects present in the output (Openai format)
   * @param {Object} context The context object provided by promptfoo for each assertion
   * @param {Record<string, any>} [context.config] - Specific configurations passed to the assertion.
   * @param {string|string[]} [context.config.filename] - filename used to select the tool call (tool with filename parameter equals to the given value)
   * @param {string|string[]} [context.config.value] - string or array of strings to check for in the content parameter of the selected tool call.
   * @returns {boolean} True if all specified strings are present in the tool call content parameter, false otherwise.
   */
  checkToolFilenameContentContains: (output, context) => {
    const filename = context?.config?.filename;
    const valueToFind = context?.config?.value;
    if (!filename || !valueToFind) return false;

    const content = getFileContent(output, filename);

    if (Array.isArray(valueToFind)) {
      return valueToFind.every((str) => content.includes(str));
    }
    return content.includes(valueToFind);
  },

  /**
   * Checks in the specified tool call if content parameter DOES NOT contain a string or an array of strings
   * @param {array} output Array of tool call objects present in the output (Openai format)
   * @param {Object} context The context object provided by promptfoo for each assertion
   * @param {Record<string, any>} [context.config] - Specific configurations passed to the assertion.
   * @param {string|string[]} [context.config.filename] - filename used to select the tool call (tool with filename parameter equals to the given value)
   * @param {string|string[]} [context.config.value] - string or array of strings to check for absence in the content parameter of the selected tool call.
   * @returns {boolean} True if all specified strings are NOT present in the tool call content parameter, false otherwise.
   */
  checkToolFilenameContentNotContains: (output, context) => {
    const filename = context?.config?.filename;
    const valueToFind = context?.config?.value;
    if (!filename || !valueToFind) return false;

    // As getFileContent returns an empty string if the file is not found, we need to check if file is present
    if (!Array.isArray(output) || !getAllPaths(output).includes(filename)) return false;

    const content = getFileContent(output, filename);

    if (Array.isArray(valueToFind)) {
      return valueToFind.every((str) => !content.includes(str));
    }
    return !content.includes(valueToFind);
  },

  /**
   * Checks in the specified tool call if content parameter matches a regex pattern or an array of patterns
   * @param {array} output Array of tool call objects present in the output (Openai format)
   * @param {Object} context The context object provided by promptfoo for each assertion
   * @param {Record<string, any>} [context.config] - Specific configurations passed to the assertion.
   * @param {string|string[]} [context.config.filename] - filename used to select the tool call (tool with filename parameter equals to the given value)
   * @param {string|string[]} [context.config.value] - regex pattern or array of regex patterns to check for in the content parameter of the selected tool call.
   * @returns {boolean} True if all specified matches are successful in the tool call content parameter, false otherwise.
   */
  checkToolFilenameContentRegex: (output, context) => {
    const filename = context?.config?.filename;
    const regexToFind = context?.config?.value;
    if (!filename || !regexToFind) return false;

    const content = getFileContent(output, filename);

    if (Array.isArray(regexToFind)) {
      return regexToFind.every((pattern) => new RegExp(pattern).test(content));
    }
    return new RegExp(regexToFind).test(content);
  },
};

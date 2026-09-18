// prompt.js
// Initially used to have only one PROMPT column in the promptfoo web report in a Skill Unit Test context

const fs = require('fs');
const path = require('path');

module.exports = function ({ vars, provider }) {
  const originalPath = path.resolve(vars.prompt_path);
  const pathParsed = path.parse(originalPath);

  // 1. Define the different levels of fallback names
  // Level 1: Custom grammar/group type from provider config (e.g., 'legacy_json', 'strict_chat')
  const grammarType = provider.config && provider.config.grammar_type;

  // Level 2: Sanitize the provider ID (e.g., 'openai:gpt-4o' -> 'openai-gpt-4o')
  const providerName = provider.label || provider.id.replace(/:/g, '-');

  // 2. Build the prospective file paths for each level
  // Priority 1: e.g., prompts/02-get_config.chat.legacy_json.json
  const pathWithGrammar = grammarType
    ? path.join(pathParsed.dir, `${pathParsed.name}.${grammarType}${pathParsed.ext}`)
    : null;

  // Priority 2: e.g., prompts/02-get_config.chat.openai-gpt-4o.json
  const pathWithProvider = path.join(
    pathParsed.dir,
    `${pathParsed.name}.${providerName}${pathParsed.ext}`,
  );

  // 3. Evaluate the fallbacks sequentially (Highest priority first)
  let finalPath = null;

  if (pathWithGrammar && fs.existsSync(pathWithGrammar)) {
    finalPath = pathWithGrammar;
  } else if (fs.existsSync(pathWithProvider)) {
    finalPath = pathWithProvider;
  } else if (fs.existsSync(originalPath)) {
    finalPath = originalPath;
  } else {
    // Safety guard if none of the files can be resolved on disk
    const grammarMsg = pathWithGrammar ? `'${pathWithGrammar}', ` : '';
    throw new Error(
      `promptfoo loader error: Could not find any of the requested prompt files. Checked: ${grammarMsg}'${pathWithProvider}', or '${originalPath}'`,
    );
  }

  // 4. Read the content of the resolved file
  const fileContent = fs.readFileSync(finalPath, 'utf8');

  // 5. Detect the file extension and return the appropriate type
  const fileExtension = path.extname(finalPath).toLowerCase();

  // Print a clear visual anchor in your terminal to see the resolved file
  // console.log(`[Prompt Loader] Using prompt file for ${provider.id}: ${path.basename(finalPath)}`);

  if (fileExtension === '.json') {
    // If it's a JSON (OpenAI Chat format), parse it into a JS object/array
    return JSON.parse(fileContent);
  } else {
    // For any other file format (.txt, .md, etc.), return raw text
    return fileContent;
  }
};

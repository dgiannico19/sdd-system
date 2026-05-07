/**
 * Extracts text content from an array of content blocks.
 * @param {Array} content - An array of content blocks, where each block is an object with a 'type' and 'text' property.
 * @returns {string} A string containing the concatenated text from all blocks of type 'text'.
 */
module.exports = (content) =>
  Array.isArray(content)
    ? content
        .filter((b) => b && b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n")
    : "";

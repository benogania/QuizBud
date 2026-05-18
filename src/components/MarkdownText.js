import React from 'react';
import { View, Text } from 'react-native';

export function MarkdownText({ text, isDark }) {
  if (!text) return null;

  // Split text into paragraphs/lines to handle block elements like lists
  const lines = text.split('\n');

  return (
    <View className="w-full">
      {lines.map((line, lineIndex) => {
        // 1. Handle Bullet Points (* or -)
        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
        // 2. Handle Numbered Lists (e.g., 1. 2.)
        const isNumbered = /^\d+\.\s/.test(line.trim());

        let cleanLine = line;
        let prefix = null;

        if (isBullet) {
          cleanLine = line.trim().replace(/^[\*\-]\s/, '');
          prefix = <Text className={`mr-2 text-base ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>• </Text>;
        } else if (isNumbered) {
          const match = line.trim().match(/^(\d+\.)\s/);
          cleanLine = line.trim().replace(/^\d+\.\s/, '');
          prefix = <Text className={`mr-1 font-bold text-base ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{match[1]} </Text>;
        }

        // 3. Regex parser for inline elements (**bold** and `code`) inside the line
        // Splits by pattern but keeps the delimiters so we know what's what
        const tokens = cleanLine.split(/(\*\*.*?\*\*|`.*?`)/g);

        return (
          <View 
            key={lineIndex} 
            className={`flex-row items-start flex-wrap ${isBullet || isNumbered ? 'pl-2 mb-1.5' : 'mb-1'}`}
          >
            {prefix}
            <Text className="flex-1 flex-row flex-wrap">
              {tokens.map((token, tokenIndex) => {
                // Check if Bold
                if (token.startsWith('**') && token.endsWith('**')) {
                  return (
                    <Text 
                      key={tokenIndex} 
                      className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {token.slice(2, -2)}
                    </Text>
                  );
                }
                // Check if Inline Code
                if (token.startsWith('`') && token.endsWith('`')) {
                  return (
                    <Text 
                      key={tokenIndex} 
                      className={`font-mono text-[14px] px-1.5 py-0.5 rounded-md ${
                        isDark ? 'bg-gray-900 text-pink-400 border border-gray-700' : 'bg-gray-100 text-pink-600 border border-gray-200'
                      }`}
                    >
                      {token.slice(1, -1)}
                    </Text>
                  );
                }
                // Regular Text
                return (
                  <Text 
                    key={tokenIndex} 
                    className={`text-base leading-6 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                  >
                    {token}
                  </Text>
                );
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
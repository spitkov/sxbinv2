import hljs from 'highlight.js';
export interface PreviewResponse {
  content: string;
  language: string;
  isText: boolean;
  lineCount: number;
  contentType: string;
}
export function isPreviewableFile(contentType: string, fileName: string): boolean {
  const previewableTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/typescript',
    'application/json',
    'text/yaml',
    'text/markdown',
    'text/xml',
    'application/xml'
  ];
  const previewableExtensions = [
    '.js', '.jsx', '.ts', '.tsx',
    '.html', '.htm', '.css',
    '.json', '.yaml', '.yml',
    '.md', '.markdown', '.txt',
    '.env', '.gitignore', '.dockerignore',
    '.conf', '.config', '.ini',
    '.py', '.rb', '.php', '.java',
    '.c', '.cpp', '.h', '.hpp',
    '.go', '.rs', '.sh',
    '.xml', '.svg', '.sql', '.csv'
  ];
  if (previewableTypes.some(type => contentType.includes(type))) {
    return true;
  }
  const extension = fileName.toLowerCase().split('.').pop();
  return extension ? previewableExtensions.includes(`.${extension}`) : false;
}
export function getHighlightLanguage(fileName: string, contentType: string): string {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'env': 'plaintext',
    'conf': 'plaintext',
    'config': 'plaintext',
    'ini': 'ini',
    'md': 'markdown',
    'markdown': 'markdown',
    'txt': 'plaintext',
    'py': 'python',
    'rb': 'ruby',
    'php': 'php',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'go': 'go',
    'rs': 'rust',
    'sh': 'bash',
    'xml': 'xml',
    'svg': 'xml',
    'sql': 'sql',
    'csv': 'plaintext',
    'gitignore': 'plaintext',
    'dockerignore': 'plaintext'
  };
  return languageMap[extension] || 'plaintext';
}
export function formatContentWithHighlighting(
  content: string,
  language: string
): string {
  try {
    if (language === 'plaintext') {
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    const highlighted = hljs.highlight(content, { language }).value;
    return highlighted;
  } catch (error) {
    console.error('Error applying syntax highlighting:', error);
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
export async function preparePreview(
  content: string,
  fileName: string,
  contentType: string
): Promise<PreviewResponse> {
  const language = getHighlightLanguage(fileName, contentType);
  const highlightedContent = formatContentWithHighlighting(content, language);
  const lineCount = content.split('\n').length;
  return {
    content: highlightedContent,
    language,
    isText: true,
    lineCount,
    contentType
  };
}
export function isBinaryContent(buffer: Buffer): boolean {
  const sampleSize = Math.min(1000, buffer.length);
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
} 
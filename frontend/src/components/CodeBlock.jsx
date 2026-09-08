import { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { copyText } from '../lib/clipboard';

// The async-light build rather than the plain `Prism` one. `Prism` registers
// every language refractor ships — close to 300 of them, COBOL and Fortran
// included — into the main bundle, which is most of the reason the whole app
// used to download as a single 445 kB gzipped file. This build loads
// refractor's core on first use and fetches one small chunk per language, so a
// post containing only a TypeScript block pays for TypeScript and nothing
// else. It also keeps working as the dev.to sync brings in languages nobody
// picked in advance, which a hand-curated register list would not.
const CodeBlock = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');

  if (!match) {
    return <code className="rounded bg-surface-muted px-1.5 py-0.5 text-sm">{code}</code>;
  }

  const handleCopy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="relative my-4 overflow-hidden rounded-lg shadow-card">
      <div className="flex items-center justify-between bg-dark-800 px-4 py-1.5 text-xs text-dark-300">
        <span>{match[1]}</span>
        <button onClick={handleCopy} className="hover:text-white">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={match[1]}
        style={oneDark}
        customStyle={{ margin: 0, fontSize: '0.875rem' }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;

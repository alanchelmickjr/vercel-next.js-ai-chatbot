'use client';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className?: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const codeContent = String(children).replace(/\n$/, '');
  
  // Log information about the code block
  console.log('CodeBlock rendering:', {
    inline,
    parentTagName: node?.parent?.tagName,
    contentPreview: codeContent.substring(0, 50) + (codeContent.length > 50 ? '...' : '')
  });

  if (inline) {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {codeContent}
      </code>
    );
  }

  // Block-level code
  return (
    <pre
      {...props}
      className="text-sm w-full max-w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900 my-4"
      data-parent-tag={node?.parent?.tagName}
    >
      <code className="whitespace-pre-wrap break-words">
        {codeContent}
      </code>
    </pre>
  );
}

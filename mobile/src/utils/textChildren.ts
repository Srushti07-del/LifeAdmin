import React from 'react';

type PrimitiveText = string | number;

function flattenChildren(
  nodes: React.ReactNode,
  out: React.ReactNode[] = []
): React.ReactNode[] {
  React.Children.forEach(nodes, (child) => {
    if (child === null || child === undefined || typeof child === 'boolean') {
      return;
    }
    if (Array.isArray(child)) {
      flattenChildren(child, out);
      return;
    }
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      flattenChildren(child.props.children, out);
      return;
    }
    out.push(child);
  });
  return out;
}

/**
 * Returns true if an optional UI slot (such as a button icon) contains
 * renderable content rather than falsy/empty primitives like "", "   ", or 0.
 */
export function hasRenderableNode(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return false;
  }
  if (typeof node === 'number') {
    return node !== 0;
  }
  if (typeof node === 'string') {
    return node.trim().length > 0;
  }

  return flattenChildren(node).some((item) => {
    if (typeof item === 'string') return item.trim().length > 0;
    if (typeof item === 'number') return item !== 0;
    return true;
  });
}

/**
 * Normalizes arbitrary ReactNode children for React Native fragments/Views so no
 * string, number, array, Fragment child, or stray whitespace renders outside <Text>.
 */
export function renderTextSafeChildren(
  children: React.ReactNode,
  wrapText: (content: React.ReactNode, key: string) => React.ReactNode
): React.ReactNode {
  const flat = flattenChildren(children);
  if (flat.length === 0) return null;

  const result: React.ReactNode[] = [];
  let textRun: PrimitiveText[] = [];
  let textRunIndex = 0;

  const flushTextRun = () => {
    if (textRun.length === 0) return;
    const hasVisibleText = textRun.some(
      (part) => typeof part === 'number' || part.trim().length > 0
    );
    if (hasVisibleText) {
      const content = textRun.length === 1 ? textRun[0] : textRun;
      result.push(wrapText(content, `text-${textRunIndex++}`));
    }
    textRun = [];
  };

  for (const node of flat) {
    if (typeof node === 'string' || typeof node === 'number') {
      textRun.push(node);
    } else {
      flushTextRun();
      result.push(node);
    }
  }
  flushTextRun();

  if (result.length === 0) return null;
  if (result.length === 1) return result[0];
  return result;
}


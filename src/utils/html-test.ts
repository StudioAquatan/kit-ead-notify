export const convertNodesToMDText = (nodes?: NodeListOf<ChildNode>): string => {
  return [].slice
    .apply<NodeListOf<ChildNode> | undefined, ChildNode[]>(nodes)
    .map((child) => {
      if (child.nodeType === 3) {
        return child.textContent?.replace(/[\r\n]/g, '').trim() || '';
      }
      if (child.nodeType === 1) {
        const elem = child as Element;
        if (elem.tagName === 'BR') {
          return '\n';
        }
        if (elem.tagName === 'A') {
          return `[${elem.textContent}](${elem.getAttribute('href')})`;
        }
        return convertNodesToMDText(elem.childNodes);
      }
      return '';
    })
    .join('')
    .replace(/^[\r\n]+/, '');
};

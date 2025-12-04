import type { Node } from 'jsonc-parser';
import { findNodeAtLocation, parseTree } from 'jsonc-parser';

export interface PackageDependency {
  name: string;
  version: string;
  line: number;
  start: number;
  end: number;
  type: 'dependencies' | 'devDependencies';
}

function getLineFromOffset(text: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
    }
  }
  return line;
}

function extractDependenciesFromSection(
  text: string,
  root: Node | undefined,
  section: 'dependencies' | 'devDependencies',
): PackageDependency[] {
  if (!root) {
    return [];
  }

  const sectionNode = findNodeAtLocation(root, [section]);
  if (!sectionNode || sectionNode.type !== 'object' || !sectionNode.children) {
    return [];
  }

  const deps: PackageDependency[] = [];
  for (const property of sectionNode.children) {
    const [keyNode, valueNode] = property.children ?? [];
    if (!keyNode || !valueNode) {
      continue;
    }

    const name = typeof keyNode.value === 'string' ? keyNode.value : undefined;
    const version = typeof valueNode.value === 'string' ? valueNode.value : undefined;
    if (!name || !version) {
      continue;
    }

    deps.push({
      end: valueNode.offset + valueNode.length,
      line: getLineFromOffset(text, valueNode.offset),
      name,
      start: valueNode.offset,
      type: section,
      version,
    });
  }

  return deps;
}

export function parsePackageJson(text: string): PackageDependency[] {
  const root = parseTree(text);
  if (!root) {
    return [];
  }

  return [...extractDependenciesFromSection(text, root, 'dependencies'), ...extractDependenciesFromSection(text, root, 'devDependencies')];
}

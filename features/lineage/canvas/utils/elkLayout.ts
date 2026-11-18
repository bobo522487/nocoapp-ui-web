import ELK, { ElkNode } from 'elkjs/lib/elk.bundled.js';
import { GenealogyFlowNode, GenealogyFlowEdge } from '../types';

const elk = new ELK();

export async function layoutWithElk(
  nodes: GenealogyFlowNode[],
  edges: GenealogyFlowEdge[]
): Promise<GenealogyFlowNode[]> {
  if (!nodes || nodes.length === 0) return [];

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '26',
      'elk.layered.spacing.nodeNodeBetweenLayers': '46',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: nodes.map((node) => {
      const isCard = node.type === 'person' || node.type === 'quickAdd';
      const width = isCard ? 100 : 8;
      const height = isCard ? 114 : 8;
      const generation =
        node.type === 'person'
          ? (node.data as { person?: { generation?: number } }).person?.generation
          : (node.data as { generation?: number })?.generation;

      return {
        id: node.id,
        width,
        height,
        layoutOptions: generation
          ? {
              'elk.layered.layering.layerId': String(generation),
            }
          : undefined,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  try {
    const layouted = await elk.layout(elkGraph);

    return nodes.map((node) => {
      const layoutNode = layouted.children?.find((c) => c.id === node.id);
      return {
        ...node,
        position: {
          x: layoutNode?.x ?? node.position.x,
          y: layoutNode?.y ?? node.position.y,
        },
      };
    });
  } catch (err) {
    console.warn('ELK layout fallback:', err);
    return nodes;
  }
}

import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { getAffectedGraph, NxGraph, runAffectedBuild } from '../../lib/affected';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function AffectedVisualizer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(
    null,
  );
  const [buildPid, setBuildPid] = useState<number | null>(null);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw: NxGraph = await getAffectedGraph();
      // Use type narrowing rather than explicit any
      const graphObj = raw.graph ?? ('nodes' in raw ? raw : { nodes: {}, dependencies: {} });
      const nodes: GraphNode[] = Object.values(graphObj.nodes ?? {}).map((n: unknown) => {
        const node = n as { name: string; type: string };
        return {
          id: node.name,
          name: node.name,
          type: node.type,
        };
      });
      const deps = graphObj.dependencies ?? {};
      const links: GraphLink[] = Object.values(deps)
        .flat()
        .map((d: unknown) => {
          const dep = d as { source: string; target: string };
          return { source: dep.source, target: dep.target };
        });
      setGraphData({ nodes, links });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async () => {
    setError(null);
    try {
      const pid = await runAffectedBuild();
      setBuildPid(pid);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Auto-load on mount
  useEffect(() => {
    void loadGraph();
  }, []);

  // D3 force graph
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });
    svg.call(zoom);

    const simulation = d3
      .forceSimulation<GraphNode>(graphData.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphData.links)
          .id((d) => d.id)
          .distance(80),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Links
    const link = g
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', 'rgba(99, 102, 241, 0.25)')
      .attr('stroke-width', 1);

    // Nodes
    const colorMap: Record<string, string> = {
      app: '#6366f1',
      lib: '#22d3ee',
      e2e: '#eab308',
    };

    const node = g
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(graphData.nodes)
      .join('circle')
      .attr('r', 6)
      .attr('fill', (d) => colorMap[d.type] ?? '#94a3b8')
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    // Labels
    const label = g
      .selectAll('text')
      .data(graphData.nodes)
      .join('text')
      .text((d) => d.name)
      .attr('font-size', 9)
      .attr('fill', '#94a3b8')
      .attr('dx', 10)
      .attr('dy', 3)
      .attr('font-family', 'Inter, sans-serif');

    // Drag

    const drag = d3
      .drag<SVGCircleElement, GraphNode>()
      .on('start', (event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);

      label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  return (
    <div className="cp-root">
      <div className="cp-header">
        <h2 className="cp-title">
          <span>📈</span> Affected Intelligence
        </h2>
        <div className="aff-controls">
          <button
            onClick={() => void loadGraph()}
            disabled={loading}
            className="aff-btn aff-btn--load"
          >
            {loading ? 'Loading...' : 'Reload Graph'}
          </button>
          <button onClick={() => void handleBuild()} className="aff-btn aff-btn--build">
            🔥 Build Affected
          </button>
          {buildPid && <span className="aff-status">Build PID: {buildPid}</span>}
        </div>
      </div>

      {error && <div className="cp-error">{error}</div>}

      <div className="aff-graph" ref={containerRef}>
        {loading && !graphData ? (
          <div className="cp-loading">
            <div className="cp-spinner" />
            <div>Loading affected graph...</div>
          </div>
        ) : (
          <svg ref={svgRef} />
        )}
      </div>
    </div>
  );
}

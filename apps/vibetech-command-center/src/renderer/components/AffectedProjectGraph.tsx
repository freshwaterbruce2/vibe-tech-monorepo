import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { RefreshCw, Maximize2 } from 'lucide-react';
import { useNxMcpWorkspace } from '../hooks';

interface NxProjectData {
  name: string;
  type: 'app' | 'lib';
  root: string;
  sourceRoot?: string;
  tags?: string[];
}

interface NxWorkspaceResult {
  projects: Record<string, NxProjectData>;
  dependencies: Record<string, Array<{ source: string; target: string; type?: string }>>;
}

// Strict D3 Node & Link Types
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'app' | 'lib';
  isAffected: boolean;
  isDownstream: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
}

interface AffectedProjectGraphProps {
  affectedProjects: string[]; // List of projects that were auto-healed / affected
}

export const AffectedProjectGraph: React.FC<AffectedProjectGraphProps> = ({ affectedProjects }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch workspace details from the MCP tool
  const { data: workspaceData, isLoading, error, refetch } = useNxMcpWorkspace();

  // Parse nodes and edges with calculated blast radius
  const graphData = useMemo(() => {
    if (!workspaceData) return { nodes: [], links: [] };

    // Format raw workspaceData into structured lists
    const rawWorkspace = workspaceData as NxWorkspaceResult;
    const projects = rawWorkspace.projects ?? {};
    const dependencies = rawWorkspace.dependencies ?? {};

    // 1. Calculate downstream dependents (blast radius) recursively
    const downstream = new Set<string>();
    const visited = new Set<string>();

    const findDownstream = (project: string) => {
      if (visited.has(project)) return;
      visited.add(project);

      // Find any project that depends on the current project
      for (const [src, targets] of Object.entries(dependencies)) {
        const dependsOnCurrent = targets.some((t) => t.target === project);
        if (dependsOnCurrent) {
          downstream.add(src);
          findDownstream(src);
        }
      }
    };

    // Initialize search from each affected project
    affectedProjects.forEach((proj) => findDownstream(proj));

    // 2. Filter nodes and links to keep the visualization clean and focused
    // We want to show: affected projects, their downstream dependents, and direct dependencies
    const visibleProjects = new Set<string>([...affectedProjects, ...downstream]);

    // Add immediate dependencies of affected/downstream projects for context
    visibleProjects.forEach((proj) => {
      const deps = dependencies[proj] ?? [];
      deps.forEach((d) => visibleProjects.add(d.target));
    });

    const nodes: GraphNode[] = Object.keys(projects)
      .filter((name) => visibleProjects.has(name))
      .map((name) => ({
        id: name,
        type: projects[name]?.type ?? 'lib',
        isAffected: affectedProjects.includes(name),
        isDownstream: downstream.has(name) && !affectedProjects.includes(name),
      }));

    const links: GraphLink[] = [];
    Object.entries(dependencies).forEach(([src, targets]) => {
      if (!visibleProjects.has(src)) return;
      targets.forEach((t) => {
        if (visibleProjects.has(t.target)) {
          links.push({
            source: src,
            target: t.target,
            type: t.type ?? 'static',
          });
        }
      });
    });

    return { nodes, links };
  }, [workspaceData, affectedProjects]);

  // Handle D3 Rendering
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svgElement = svgRef.current;
    const width = svgElement.clientWidth || 800;
    const height = 450;

    // Clear previous SVG contents
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create a container group for zooming
    const g = svg.append('g').attr('class', 'graph-container');

    // Add Zoom and Pan behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });
    svg.call(zoomBehavior);

    // Setup arrow markers for dependency direction
    svg.append('defs')
      .selectAll('marker')
      .data(['static', 'dynamic', 'implicit'])
      .enter()
      .append('marker')
      .attr('id', (d) => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22) // Position marker relative to node boundary
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#4B5563')
      .attr('d', 'M0,-5L10,0L0,5');

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id((d) => d.id)
        .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    // Render link edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => (d.type === 'dynamic' ? '#A78BFA' : '#4B5563'))
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d) => (d.type === 'implicit' ? '4 4' : 'none'))
      .attr('marker-end', (d) => `url(#arrow-${d.type ?? 'static'})`);

    // Render node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        setSelectedNode(d);
      })
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Node circles (colored based on affected / downstream state)
    node.append('circle')
      .attr('r', 16)
      .attr('fill', (d) => {
        if (d.isAffected) return '#EF4444'; // Red for affected
        if (d.isDownstream) return '#F59E0B'; // Amber for downstream dependents
        return '#374151'; // Slate-700 for others
      })
      .attr('stroke', (d) => {
        if (d.isAffected) return '#FCA5A5'; // Glowing light red
        if (d.isDownstream) return '#FDE68A'; // Light amber
        return '#4B5563'; // Slate-600
      })
      .attr('stroke-width', 2)
      .style('filter', (d) => (d.isAffected ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : 'none'));

    // Node labels
    node.append('text')
      .attr('dy', 26)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E5E7EB')
      .style('font-size', '10px')
      .style('font-family', 'var(--font-mono)')
      .text((d) => d.id);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag helper functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  // Quick action: fit to view or center graph
  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom<SVGGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  return (
    <div className="bg-bg-panel border border-bg-line p-5 rounded-lg space-y-4">
      <div className="flex justify-between items-center border-b border-bg-line pb-2 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <Maximize2 size={14} className="text-pulse-cyan animate-pulse" />
            Affected Blast Radius Graph
          </h3>
          <p className="text-xs text-slate-400 font-mono">Interactive visualization of changes to dependencies.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2 py-1 bg-black/45 border border-bg-line rounded text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pulse-cyan w-36"
          />
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn text-xs font-mono py-1 px-2.5 flex items-center gap-1.5"
            title="Refresh graph data"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleResetZoom}
            className="btn text-xs font-mono py-1 px-2.5 flex items-center gap-1.5"
            title="Center View"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <div className="relative border border-bg-line bg-black/35 rounded overflow-hidden">
        {/* Color Legend */}
        <div className="absolute top-3 left-3 bg-black/60 border border-bg-line/40 px-3 py-2 rounded text-[10px] font-mono space-y-1.5 pointer-events-none backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_6px_#EF4444]" />
            <span className="text-red-400 font-bold">Affected (Auto-healed)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-amber-400">Downstream Dependent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
            <span className="text-slate-400">Context Dependency</span>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <RefreshCw className="animate-spin text-pulse-cyan mr-2" size={16} />
            <span className="text-xs font-mono text-slate-400">Quering Nx Workspace via MCP...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 p-4 text-center">
            <span className="text-xs font-mono text-red-400">
              MCP Sync Error: {error instanceof Error ? error.message : String(error)}. Graph using fallback details.
            </span>
          </div>
        )}

        {/* D3 Canvas */}
        <svg
          ref={svgRef}
          className="w-full h-[450px] bg-gradient-to-b from-bg-panel/40 to-bg-base/30"
        />

        {/* Selected Node Sidebar Overlay */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-64 bg-black/85 border border-bg-line p-3 rounded text-xs font-mono space-y-2 max-h-[90%] overflow-y-auto backdrop-blur-sm shadow-glow-cyan">
            <div className="flex justify-between items-center border-b border-bg-line pb-1.5">
              <span className="font-bold text-slate-200 uppercase truncate max-w-[150px]">
                {selectedNode.id}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-500 hover:text-slate-300 text-[10px]"
              >
                ✕ Close
              </button>
            </div>
            <div className="space-y-1 text-slate-400">
              <div>Type: <span className="text-slate-200">{selectedNode.type}</span></div>
              <div>
                Status:{' '}
                <span
                  className={
                    selectedNode.isAffected
                      ? 'text-red-400 font-bold'
                      : selectedNode.isDownstream
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }
                >
                  {selectedNode.isAffected
                    ? 'AFFECTED (HEALED)'
                    : selectedNode.isDownstream
                    ? 'DOWNSTREAM BLAST'
                    : 'STATIC DEP'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

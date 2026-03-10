// Type declarations for d3 - comprehensive for codebase visualization
declare module 'd3' {
  // Re-export all d3 modules
  export * from 'd3-selection';
  export * from 'd3-scale';
  export * from 'd3-axis';
  export * from 'd3-shape';
  export * from 'd3-array';
  export * from 'd3-color';
  export * from 'd3-format';
  export * from 'd3-interpolate';
  export * from 'd3-time';
  export * from 'd3-time-format';
  export * from 'd3-transition';
  export * from 'd3-zoom';
  export * from 'd3-drag';
  export * from 'd3-force';
  export * from 'd3-hierarchy';

  // Core selection functions
  export function select(selector: string | Element): Selection<any, any, any, any>;
  export function selectAll(selector: string): Selection<any, any, any, any>;

  // Force simulation
  export function forceSimulation<NodeDatum = any>(nodes?: NodeDatum[]): Simulation<NodeDatum, any>;
  export function forceLink<NodeDatum = any, LinkDatum = any>(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;
  export function forceManyBody<NodeDatum = any>(): ForceManyBody<NodeDatum>;
  export function forceCenter<NodeDatum = any>(x?: number, y?: number): ForceCenter<NodeDatum>;
  export function forceCollide<NodeDatum = any>(radius?: number | ((d: NodeDatum) => number)): ForceCollide<NodeDatum>;

  // Scales
  export function scaleOrdinal<Range = any>(range?: Range[]): ScaleOrdinal<string, Range>;
  export function scaleLinear<Range = number>(): ScaleLinear<Range>;
  export const schemeCategory10: readonly string[];

  // Zoom and drag
  export function zoom<ZoomRefElement extends Element = SVGSVGElement, Datum = unknown>(): ZoomBehavior<ZoomRefElement, Datum>;
  export function drag<GElement extends Element = Element, Datum = unknown, Subject = unknown>(): DragBehavior<GElement, Datum, Subject>;

  // Selection interface with all methods used in CodebaseMapPanel
  export interface Selection<GElement, Datum, PElement, PDatum> {
    select(selector: string): Selection<any, any, any, any>;
    selectAll(selector: string): Selection<any, any, any, any>;
    append(type: string): Selection<any, any, any, any>;
    attr(name: string, value?: any): this;
    style(name: string, value?: any): this;
    text(value?: any): this;
    html(value?: any): this;
    data<NewDatum>(data: NewDatum[]): Selection<GElement, NewDatum, PElement, PDatum>;
    enter(): Selection<any, any, any, any>;
    exit(): Selection<any, any, any, any>;
    join(enter: string): Selection<any, any, any, any>;
    remove(): this;
    on(type: string, listener?: ((event: any, d: any) => void) | null): this;
    call(fn: any, ...args: any[]): this;
    node(): GElement | null;
    nodes(): GElement[];
    each(fn: (this: GElement, d: Datum, i: number, groups: GElement[]) => void): this;
    transition(name?: string): any;
    merge(other: Selection<any, any, any, any>): Selection<any, any, any, any>;
    filter(selector: string | ((d: Datum, i: number) => boolean)): Selection<any, any, any, any>;
    sort(comparator?: (a: Datum, b: Datum) => number): this;
    order(): this;
    raise(): this;
    lower(): this;
    classed(names: string, value?: boolean): this;
    property(name: string, value?: any): this;
    datum<NewDatum>(value?: NewDatum): Selection<GElement, NewDatum, PElement, PDatum>;
    empty(): boolean;
    size(): number;
  }

  // Simulation interface
  export interface Simulation<NodeDatum, LinkDatum> {
    nodes(nodes: NodeDatum[]): this;
    force(name: string, force?: any): this;
    on(type: string, listener: ((event: any) => void) | null): this;
    alpha(value?: number): number;
    alphaTarget(value?: number): this;
    alphaMin(value?: number): this;
    alphaDecay(value?: number): this;
    velocityDecay(value?: number): this;
    restart(): this;
    stop(): this;
    tick(iterations?: number): this;
    find(x: number, y: number, radius?: number): NodeDatum | undefined;
  }

  // Force interfaces
  export interface ForceLink<NodeDatum, LinkDatum> {
    links(links: LinkDatum[]): this;
    id(fn: (d: NodeDatum, i: number, nodes: NodeDatum[]) => string): this;
    distance(value: number | ((d: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    strength(value: number | ((d: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    iterations(value: number): this;
  }

  export interface ForceManyBody<NodeDatum> {
    strength(value: number | ((d: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    theta(value: number): this;
    distanceMin(value: number): this;
    distanceMax(value: number): this;
  }

  export interface ForceCenter<NodeDatum> {
    x(value: number): this;
    y(value: number): this;
    strength(value: number): this;
  }

  export interface ForceCollide<NodeDatum> {
    radius(value: number | ((d: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(value: number): this;
    iterations(value: number): this;
  }

  // Zoom behavior
  export interface ZoomBehavior<ZoomRefElement extends Element, Datum> {
    (selection: Selection<ZoomRefElement, Datum, any, any>): void;
    scaleExtent(extent: [number, number]): this;
    translateExtent(extent: [[number, number], [number, number]]): this;
    on(type: string, listener: ((event: any) => void) | null): this;
    transform(selection: Selection<ZoomRefElement, Datum, any, any>, transform: any): void;
    filter(filter: (event: any) => boolean): this;
  }

  // Drag behavior
  export interface DragBehavior<GElement extends Element, Datum, Subject> {
    (selection: Selection<GElement, Datum, any, any>): void;
    on(type: string, listener: ((event: any, d: Datum) => void) | null): this;
    container(container: any): this;
    subject(subject: (event: any, d: Datum) => Subject): this;
    filter(filter: (event: any, d: Datum) => boolean): this;
    touchable(touchable: boolean | ((event: any, d: Datum) => boolean)): this;
    clickDistance(distance: number): this;
  }

  // Scale interfaces
  export interface ScaleOrdinal<Domain extends string, Range> {
    (value: Domain): Range;
    domain(): Domain[];
    domain(domain: Iterable<Domain>): this;
    range(): Range[];
    range(range: Iterable<Range>): this;
    unknown(): Range | undefined;
    unknown(value: Range): this;
    copy(): ScaleOrdinal<Domain, Range>;
  }

  export interface ScaleLinear<Range> {
    (value: number): Range;
    domain(): [number, number];
    domain(domain: Iterable<number>): this;
    range(): Range[];
    range(range: Iterable<Range>): this;
    clamp(): boolean;
    clamp(clamp: boolean): this;
    nice(count?: number): this;
    ticks(count?: number): number[];
    tickFormat(count?: number, specifier?: string): (d: number) => string;
    copy(): ScaleLinear<Range>;
    invert(value: Range): number;
  }
}

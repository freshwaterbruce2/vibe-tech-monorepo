const horizontalTraces = [18, 42, 68, 86];
const verticalTraces = [9, 28, 72, 91];

export const SiteBackground = () => (
  <div aria-hidden="true" className="site-background" data-testid="site-background">
    <div className="site-background__glow site-background__glow--cyan" />
    <div className="site-background__glow site-background__glow--violet" />
    <div className="site-background__grid" />
    <div className="site-background__rails" />
    <div className="site-background__traces">
      {horizontalTraces.map((position, index) => (
        <span className="site-background__trace site-background__trace--horizontal" key={`horizontal-${position}`} style={{ top: `${position}%`, animationDelay: `${index * -2.4}s` }} />
      ))}
      {verticalTraces.map((position, index) => (
        <span className="site-background__trace site-background__trace--vertical" key={`vertical-${position}`} style={{ left: `${position}%`, animationDelay: `${index * -3.1}s` }} />
      ))}
    </div>
    <div className="site-background__processor">
      <span className="site-background__processor-core" />
      <span className="site-background__processor-pin site-background__processor-pin--top" />
      <span className="site-background__processor-pin site-background__processor-pin--right" />
      <span className="site-background__processor-pin site-background__processor-pin--bottom" />
      <span className="site-background__processor-pin site-background__processor-pin--left" />
    </div>
    <span className="site-background__signal site-background__signal--cyan" />
    <span className="site-background__signal site-background__signal--violet" />
    <span className="site-background__signal site-background__signal--teal" />
    <div className="site-background__fade" />
    <div className="site-background__grain" />
  </div>
);

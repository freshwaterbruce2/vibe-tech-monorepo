export const motionProps = new Set([
  'animate', 'initial', 'exit', 'whileHover', 'whileTap', 'whileFocus',
  'whileDrag', 'whileInView', 'transition', 'variants', 'layout',
  'layoutId', 'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'onDragStart', 'onDrag', 'onDragEnd', 'onHoverStart', 'onHoverEnd',
  'onTap', 'onTapStart', 'onTapCancel', 'onPan', 'onPanStart', 'onPanEnd',
  'onPanSessionStart', 'viewport', 'style'
]);

export const shouldForwardMotionProp = (prop: string) => !motionProps.has(prop);

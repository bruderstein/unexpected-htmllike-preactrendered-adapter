import preact from 'preact';
var nextVNode = preact.options.vnode;
preact.options.vnode = function (vnode) {
  if (isFunctionalComponent(vnode)) wrapFunctionalComponent(vnode);
  if (nextVNode) return nextVNode(vnode);
};


function isFunctionalComponent(vnode) {
  var nodeName = vnode && vnode.nodeName;
  return nodeName && typeof nodeName === 'function' && !(nodeName.prototype && nodeName.prototype.render);
}

const functionalComponentWrappers = new Map();
function wrapFunctionalComponent(vnode) {
  const originalRender = vnode.nodeName;
  const name = vnode.nodeName.name || '(Function.name missing)';
  const wrappers = functionalComponentWrappers;
  if (!wrappers.has(originalRender)) {
    let wrapper = class extends preact.Component {
      render(props, state, context) {
        return originalRender(props, context);
      }
    };

    // Expose the original component name. React Dev Tools will use
    // this property if it exists or fall back to Function.name
    // otherwise.
    wrapper.displayName = name;

    wrappers.set(originalRender, wrapper);
  }
  vnode.nodeName = wrappers.get(originalRender);
}


const DefaultOptions = {
  includeKeyProp: false
};

export const NODE_TYPE = typeof Symbol === 'function' ? Symbol('PreactDOMNode') : '__$$preact_dom_node 4$hnLx';
export const COMPONENT_TYPE = typeof Symbol === 'function' ? Symbol('PreactComponentInstance') : '__$$preact_component_instance 4$hnLx';

const elementGetNameFunctions = {
  [NODE_TYPE]: (element) => (element.node.tagName && element.node.tagName.toLowerCase()) || 'no-display-name',
  [COMPONENT_TYPE]: (element) => element.component.constructor.displayName || element.component.constructor.name
};

const symbolAttr = typeof Symbol === 'function' && Symbol('preactattr');

class PreactRenderedAdapter {

  constructor(options) {
    this._options = Object.assign({}, DefaultOptions, options);
  }

  getName(element) {

    const getNameFunc = elementGetNameFunctions[element.type];
    if (getNameFunc) {
      return getNameFunc(element);
    }

  }

  getAttributes(wrapped) {

    if (wrapped.type === COMPONENT_TYPE) {
      const props = Object.assign({}, wrapped.component.props);
      delete props.children;
      // Normalise `className` to `class`
      if (typeof props.className === 'string' && props.class === undefined) {
        props.class = props.className;
        delete props.className;
      }

      if (!this._options.includeKeyProp) {
        delete props.key;
      } else if (wrapped.component.__key || wrapped.component.__k) {
        props.key = wrapped.component.__key || wrapped.component.__k;
      }

      if (!this._options.includeRefProp) {
        delete props.ref;
      } else if (wrapped.component.__ref || wrapped.component.__r) {
        props.ref = wrapped.component.ref || wrapped.component.__r;
      }

      return props;
    }
    const providedProps = wrapped.node.__preactattr_ || (symbolAttr && wrapped.node[symbolAttr]);

    if (providedProps) {
      const resultProps = Object.assign({}, providedProps);
      if (typeof resultProps.className === 'string' && resultProps.class === undefined) {
        resultProps.class = resultProps.className;
        delete resultProps.className;
      }
      if (!this._options.includeKeyProp) {
        delete resultProps.key;
      }

      if (!this._options.includeRefProp) {
        delete resultProps.ref;
      }
      return resultProps;
    }

    throw new Error('Non-wrapped or non-preact element passed to preactRenderedAdapter.getAttributes()');
  }

  getChildren(wrapped) {

    if (wrapped.type === COMPONENT_TYPE) {
      if (wrapped.component._component) {
        return [ { type: COMPONENT_TYPE, component: wrapped.component._component, node: wrapped.node } ];
      } else {
        // No more sub-components, so we actually return the node
        return [ { type: NODE_TYPE, node: wrapped.node } ];
      }
    }

    if (wrapped.type === NODE_TYPE) {
      if (wrapped.node.nodeType === 3) {
        return [ wrapped.node.textContent ];
      }

      const element = wrapped.node;
      return ((element && element.childNodes && Array.prototype.slice.call(element.childNodes)) || []).map(item => {
        if (item.nodeType === 3) {
          return item.textContent ? item.textContent : null;
        }

        return wrapNode(item);
      }).filter(node => node !== null);

    }

    throw new Error('getChildren() called on non-wrapped Preact rendered node (probably an error in unexpected-preact');
  }

  setOptions(newOptions) {

    this._options = Object.assign({}, this._options, newOptions);
  }

  getOptions() {
    return this._options;
  }
}


PreactRenderedAdapter.prototype.classAttributeName = 'class';

PreactRenderedAdapter.COMPONENT_TYPE = COMPONENT_TYPE;
PreactRenderedAdapter.NODE_TYPE = NODE_TYPE;

PreactRenderedAdapter.wrapRootNode = function wrapRootNode(node) {
  // If the root node rendered a custom component as it's top level node, then wrap that child
  if (node._component && node._component._component) {
    return { type: COMPONENT_TYPE, component: node._component._component, node };
  }

  // otherwise wrap the node itself
  return { type: NODE_TYPE, node };
};

function wrapNode(node) {
  if (node._component) {
    return { type: COMPONENT_TYPE, component: node._component, node };
  }

  return { type: NODE_TYPE, node };
}

PreactRenderedAdapter.wrapNode = wrapNode;

module.exports = PreactRenderedAdapter;

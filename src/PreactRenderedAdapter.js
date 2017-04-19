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


const DefaultOptions = {};

export const NODE_TYPE = typeof Symbol === 'function' ? Symbol('PreactDOMNode') : '__$$preact_dom_node 4$hnLx';
export const COMPONENT_TYPE = typeof Symbol === 'function' ? Symbol('PreactComponentInstance') : '__$$preact_component_instance 4$hnLx';

const elementGetNameFunctions = {
  [NODE_TYPE]: (element) => (element.node.tagName && element.node.tagName.toLowerCase()) || 'no-display-name',
  [COMPONENT_TYPE]: (element) => element.component.constructor.displayName || element.component.constructor.name
};

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
      return props;
    }

    return Array.prototype.map.call(wrapped.node.attributes, (attr) => ({ name: attr.name, value: attr.value }))
      .reduce((attrs, item) => {
        attrs[item.name] = item.value;
        return attrs;
      }, {});

    // TODO: ref & key
    return (element._component && element._component.props) || element.__preact_attr_ || {};
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
          return item.textContent;
        }

        return wrapNode(item);
      });

    }

    // TODO: cleanup
    return { x: 'UNEXPECTED NODE TYPE PASSED TO GETCHILDREN', type: wrapped.type, wrapped }
  }

  setOptions(newOptions) {

    this._options = Object.assign({}, this._options, newOptions);
  }

  getOptions() {
    return this._options;
  }
}


PreactRenderedAdapter.prototype.classAttributeName = 'className';

export function wrapRootNode(node) {
  // If the root node rendered a custom component as it's top level node, then wrap that child
  if (node._component && node._component._component) {
    return { type: COMPONENT_TYPE, component: node._component._component, node };
  }

  // otherwise wrap the node itself
  return { type: NODE_TYPE, node };
}

function wrapNode(node) {
  if (node._component) {
    return { type: COMPONENT_TYPE, component: node._component, node };
  }

  return { type: NODE_TYPE, node };
}


export default PreactRenderedAdapter;

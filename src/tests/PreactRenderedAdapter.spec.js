const EmulateDom = require('./helpers/emulateDom');
import Preact from 'preact';
import PreactCompat from 'preact-compat';

import PreactRenderedAdapter from '../PreactRenderedAdapter';
import unexpected from 'unexpected';

const expect = unexpected.clone();

const wrapRootNode = PreactRenderedAdapter.wrapRootNode;
const wrapNode = PreactRenderedAdapter.wrapNode;


function runTests(groupName, { h, Component, preactRender }) {
  function StatelessComponent(props) {
    return <span>stateless</span>;
  }

  function RenderStateless2(props) {
    return <StatelessComponent />;
  }

  function RenderStateless3(props) {
    return <RenderStateless2 />;
  }

  class ES6Comp extends Component {
    render() {
      return <div {...this.props}>es6 component</div>
    }
  }

  class RenderES6 extends Component {
    render() {
      return <ES6Comp className={this.props.className}/>;
    }
  }
  class RenderStateless extends Component {
    render() {
      return <StatelessComponent className={this.props.className}/>;
    }
  }

  class DeepComponent extends Component {
    render() {
      return (
        <div className="foo">
        <span className="bar">
          <ES6Comp className="one"/>
          <ES6Comp className="two"/>
        </span>
          <span>second</span>
        </div>
      );
    }
  }

  class DangesrouslySetHtml extends Component {
    render() {
      return (
        <div className="set-inner" dangerouslySetInnerHTML={{
          __html: 'Here is a <a class="inner" href="/foo">link</a>'
        }}>
        </div>
      );
    }
  }

  class WithEvents extends Component {
    constructor() {
      super();
      this.state = { count: 0 };
      this.onClick = this.onClick.bind(this);
    }

    onClick() {
      this.setState({
        count: this.state.count + 1
      });
    }

    render() {
      return <button onClick={this.onClick}>Click {this.state.count}</button>;
    }
  }

  function render(element) {
    const container = document.createElement('div');
    return preactRender(element, container);
  }


  describe(`PreactRenderedAdapter (${groupName})`, function () {

    let adapter;
    beforeEach(function () {
      adapter = new PreactRenderedAdapter();
      expect.addAssertion('<object> to have name <string>', function (expect, subject, name) {
        return expect(adapter.getName(subject), 'to equal', name);
      });
    });

    describe('getName', function () {

      it('returns the name of an ES6 component', function () {
        const component = wrapRootNode(render(<RenderES6 />));
        expect(adapter.getName(component), 'to equal', 'ES6Comp');
      });

      it('returns the name of the HTML node rendered as a direct child', function () {
        const component = wrapRootNode(render(<DeepComponent />));  // renders <div>...</div>
        expect(adapter.getName(component), 'to equal', 'div')

      });

      it('returns the name of a stateless component', function () {
        const component = wrapRootNode(render(<RenderStateless2 />));
        expect(adapter.getName(component), 'to equal', 'StatelessComponent');
      });

      it('returns the name of a rendered class node when using wrapNode', function () {
        const component = wrapNode(render(<RenderES6 />));
        expect(adapter.getName(component), 'to equal', 'RenderES6');
      });

      it('returns the name of a rendered stateless node when using wrapNode', function () {
        const component = wrapNode(render(<RenderStateless />));
        expect(adapter.getName(component), 'to equal', 'RenderStateless');
      });

      it.skip('returns the name of a rendered HTML element when using wrapNode', function () {
        // Skipped, as it doesn't work with preact-compat under preact v7, and it doesn't really make sense
        // Rendering an HTML node is probably not really supported
        const component = wrapNode(render(<div />));
        expect(adapter.getName(component), 'to equal', 'div');
      });
    });

    describe('getChildren', function () {

      it('returns a single string child of a rendered component', function () {
        const component = wrapRootNode(render(<ES6Comp />));
        expect(adapter.getChildren(component), 'to equal', ['es6 component']);
      });

      it('returns a single stateless component child', function () {
        const component = wrapRootNode(render(<RenderStateless3 />));
        const children = adapter.getChildren(component);
        expect(adapter.getName(children[0]), 'to equal', 'StatelessComponent');
      });

      it('returns a single stateless component grandchild', function () {
        const component = wrapRootNode(render(<RenderStateless3 />));
        const children = adapter.getChildren(component);
        const grandchildren = adapter.getChildren(children[0]);
        expect(adapter.getName(grandchildren[0]), 'to equal', 'span');
      });

      it('returns a single stateless component great-grandchild text', function () {
        const component = wrapRootNode(render(<RenderStateless3 />));
        const children = adapter.getChildren(component);
        const grandchildren = adapter.getChildren(children[0]);
        const greatgrandchildren = adapter.getChildren(grandchildren[0]);
        expect(greatgrandchildren, 'to equal', ['stateless']);
      });

      it('returns multiple custom components', function () {
        const component = wrapRootNode(render(<DeepComponent />));  // renders <div>...</div>
        expect(adapter.getName(component), 'to equal', 'div');
        const children = adapter.getChildren(component);   // returns <span> .... </span>
        const grandchildren = adapter.getChildren(children[0]);
        expect(grandchildren, 'to satisfy', [
          expect.it('to have name', 'ES6Comp'),
          expect.it('to have name', 'ES6Comp')
        ]);
      });

      it('returns multiple HTML elements', function () {
        const component = wrapRootNode(render(<DeepComponent />));  // renders <div>...</div>
        expect(adapter.getName(component), 'to equal', 'div');
        const children = adapter.getChildren(component);   // returns <span> .... </span><span>second</span>
        expect(children, 'to satisfy', [
          expect.it('to have name', 'span'),
          expect.it('to have name', 'span')
        ]);
      });

      it('returns empty children when a node has no content', function () {

        const RenderEmptyDiv = () => <div>{null}</div>;
        const component = wrapRootNode(render(<RenderEmptyDiv />));
        expect(adapter.getChildren(component), 'to equal', []);
      });

      it('returns children from a node set with dangerouslySetInnerHTML', function () {
        const component = wrapRootNode(render(<DangesrouslySetHtml />));
        expect(adapter.getChildren(component), 'to satisfy', [ 'Here is a ', expect.it('to have name', 'a')])
      });
    });

    describe('getAttributes', function () {

      it('returns simple props from an class component', function () {
        const component = wrapRootNode(render(<RenderES6 className="passed-through"/>));
        expect(adapter.getAttributes(component), 'to equal', { class: 'passed-through' })
      });

      it('returns simple props from an HTML element', function () {
        const component = wrapRootNode(render(<ES6Comp className="passed-through" data-foo="bar"/>));
        expect(adapter.getAttributes(component), 'to equal', { class: 'passed-through', 'data-foo': 'bar' })
      });

      it('returns an event handler', function () {
        const component = wrapRootNode(render(<WithEvents />));
        expect(adapter.getAttributes(component), 'to satisfy', {
          onClick: expect.it('to be a function')
        });
      });

      it('gets attributes for a deep nested result', function () {
        const Deep = () => <div data-foo="bar"><span data-deep="baz">Hi</span></div>;
        const component = wrapRootNode(render(<Deep />));
        expect(adapter.getAttributes(adapter.getChildren(component)[0]), 'to satisfy', {
          'data-deep': 'baz'
        });
      });

      it('gets attributes for a node created with dangerouslySetInnerHTML', function () {
        const component = wrapRootNode(render(<DangesrouslySetHtml />));
        const child = adapter.getChildren(component);
        expect(adapter.getAttributes(child[1]), 'to satisfy', {
          'class': 'inner',
          href: '/foo'
        });

      });

      it('normalizes className to class for a custom component', function () {
        const ClassTest = (props) => <ES6Comp className={props.className}/>;
        const component = wrapRootNode(render(<ClassTest className="foo"/>));
        expect(adapter.getAttributes(component), 'to satisfy', {
          class: 'foo'
        });
      });

      it('normalizes className to class for an HTML element', function () {
        const ClassTest = (props) => <div className={props.className}/>;
        const component = wrapRootNode(render(<ClassTest className="foo"/>));
        expect(adapter.getAttributes(component), 'to satisfy', {
          class: 'foo'
        });
      });

      it('with standard options does not return the key on an HTML node', function () {
        const KeyTest = (props) => <div key={42} class="one two"/>;
        const component = wrapRootNode(render(<KeyTest />));
        expect(adapter.getAttributes(component), 'to equal', { class: 'one two' })
      });

      it('with includeKeyProp returns the key on an HTML node', function () {
        const KeyTest = (props) => <div key={42} class="one two"/>;
        const component = wrapRootNode(render(<KeyTest />));
        adapter.setOptions({ includeKeyProp: true });
        expect(adapter.getAttributes(component), 'to equal', { key: 42, class: 'one two' })
      });

      it('with standard options does not return the key on a custom node', function () {
        const KeyTest = (props) => <RenderES6 key={42} class="one two"/>;
        const component = wrapRootNode(render(<KeyTest />));
        expect(adapter.getAttributes(component), 'to equal', { class: 'one two' })
      });

      it('with includeKeyProp returns the key on a custom node', function () {
        const KeyTest = (props) => <RenderES6 key={42} class="one two"/>;
        const component = wrapRootNode(render(<KeyTest />));
        adapter.setOptions({ includeKeyProp: true });
        expect(adapter.getAttributes(component), 'to equal', { key: 42, class: 'one two' })
      });

      it('with standard options does not return the ref on an HTML node', function () {
        const RefTest = (props) => <div ref={() => {
        }} class="one two"/>;
        const component = wrapRootNode(render(<RefTest />));
        expect(adapter.getAttributes(component), 'to equal', { class: 'one two' })
      });

      it('with includeRefProp returns the ref on an HTML node', function () {
        const refFn = () => {
        };
        const RefTest = (props) => <div ref={refFn} class="one two"/>;
        const component = wrapRootNode(render(<RefTest />));
        adapter.setOptions({ includeRefProp: true });
        expect(adapter.getAttributes(component), 'to equal', { ref: refFn, class: 'one two' })
      });

      it('with standard options does not return the ref on a custom node', function () {
        const RefTest = (props) => <RenderES6 ref={() => {
        }} class="one two"/>;
        const component = wrapRootNode(render(<RefTest />));
        expect(adapter.getAttributes(component), 'to equal', { class: 'one two' })
      });

      it('with includeRefProp returns the ref on a custom node', function () {
        const refFn = () => {
        };
        const RefTest = (props) => <RenderES6 ref={refFn} class="one two"/>;
        const component = wrapRootNode(render(<RefTest />));
        adapter.setOptions({ includeRefProp: true });
        expect(adapter.getAttributes(component), 'to equal', { ref: refFn, class: 'one two' })
      });

    });
  });
}

runTests('preact', { h: Preact.h, Component: Preact.Component, preactRender: Preact.render });

runTests('preact-compat', {
  h: PreactCompat.createElement,
  Component: PreactCompat.Component,
  preactRender: PreactCompat.render
});

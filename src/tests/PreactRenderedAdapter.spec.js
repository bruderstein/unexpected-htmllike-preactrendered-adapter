const EmulateDom = require('./helpers/emulateDom');
import preact, { h } from 'preact';
import PreactRenderedAdapter, { wrapRootNode } from '../PreactRenderedAdapter';
import unexpected from 'unexpected';

const expect = unexpected.clone();

function StatelessComponent(props) {
  return <span>stateless</span>;
}

function RenderStateless2(props) {
  return <StatelessComponent />;
}

function RenderStateless3(props) {
  return <RenderStateless2 />;
}

class ES6Comp extends preact.Component {
  render() {
    return <div {...this.props}>es6 component</div>
  }
}

class RenderES6 extends preact.Component {
  render() {
    return <ES6Comp className={this.props.className} />;
  }
}
class RenderStateless extends preact.Component {
  render() {
    return <StatelessComponent className={this.props.className} />;
  }
}

class DeepComponent extends preact.Component {
  render() {
    return (
      <div className="foo">
        <span className="bar">
          <ES6Comp className="one" />
          <ES6Comp className="two" />
        </span>
        <span>second</span>
      </div>
    );
  }
}

function render(element) {
  const container = document.createElement('div');
  return preact.render(element, container);
}


describe('PreactRenderedAdapter', function () {

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
  });

  describe('getChildren', function () {

    it('returns a single string child of a rendered component', function () {
      const component = wrapRootNode(render(<ES6Comp />));
      expect(adapter.getChildren(component), 'to equal', [ 'es6 component' ]);
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
      expect(greatgrandchildren, 'to equal', [ 'stateless' ]);
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

  });

  describe('getAttributes', function () {

    it('returns simple props from an class component', function () {
      const component = wrapRootNode(render(<RenderES6 className="passed-through"/>));
      expect(adapter.getAttributes(component), 'to equal', { className: 'passed-through' })
    });

    it('returns simple props from an HTML element', function () {
      const component = wrapRootNode(render(<ES6Comp className="passed-through" data-foo="bar"/>));
      expect(adapter.getAttributes(component), 'to equal', { 'class': 'passed-through', 'data-foo': 'bar' })
    });
  });
});

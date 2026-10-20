/* Tiny runtime for the Events at Wates concept pages (static, no dependencies). */
(function () {
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) { Object.assign(this.state, p); if (this.__render) this.__render(); };
  window.DCLogic = DCLogic;

  var EVENTS = { onclick: 'click', onsubmit: 'submit', onchange: 'change', oninput: 'input', onkeydown: 'keydown' };
  function get(scope, path) {
    var cur = scope, parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (cur == null) return undefined; cur = cur[parts[i]]; }
    return cur;
  }
  var WHOLE = /^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;
  function interp(str, scope) {
    return str.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, function (_, p) { var v = get(scope, p); return v == null ? '' : v; });
  }
  function build(nodes, scope, out) {
    nodes.forEach(function (n) {
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(n.nodeValue.indexOf('{{') > -1 ? interp(n.nodeValue, scope) : n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      var kind = n.tagName === 'TEMPLATE' && n.getAttribute('data-sc');
      if (kind === 'for') {
        var list = get(scope, WHOLE.exec(n.getAttribute('list') || '')[1]) || [];
        var as = n.getAttribute('as') || 'item';
        list.forEach(function (item, i) {
          var s = Object.create(scope); s[as] = item; s.$index = i;
          build(Array.prototype.slice.call(n.content.childNodes), s, out);
        });
        return;
      }
      if (kind === 'if') {
        var v = get(scope, WHOLE.exec(n.getAttribute('value') || '')[1]);
        if (v && v !== 'false') build(Array.prototype.slice.call(n.content.childNodes), scope, out);
        return;
      }
      var el = document.importNode(n, false);
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var name = a.name, val = a.value, lower = name.toLowerCase();
        if (EVENTS[lower]) {
          var m = WHOLE.exec(val); var fn = m && get(scope, m[1]);
          el.removeAttribute(name);
          if (typeof fn === 'function') el.addEventListener(EVENTS[lower], fn);
          return;
        }
        if (val.indexOf('{{') > -1) el.setAttribute(name, interp(val, scope));
      });
      build(Array.prototype.slice.call(n.childNodes), scope, el);
      out.appendChild(el);
    });
  }
  function snapshot(root) {
    return Array.prototype.map.call(root.querySelectorAll('input,textarea,select'), function (c) {
      return { v: c.value, k: c.checked };
    });
  }
  function restore(root, snap) {
    var ctl = root.querySelectorAll('input,textarea,select');
    if (ctl.length !== snap.length) return;
    Array.prototype.forEach.call(ctl, function (c, i) {
      if (c.type === 'checkbox' || c.type === 'radio') { if (!c.hasAttribute('checked') || true) c.checked = snap[i].k; }
      else c.value = snap[i].v;
    });
  }
  window.addEventListener('DOMContentLoaded', function () {
    var tpl = document.getElementById('tpl'), app = document.getElementById('app');
    var src = document.getElementById('logic').textContent;
    var Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
    var inst = new Component({});
    function render() {
      var snap = snapshot(app), y = window.scrollY;
      var frag = document.createDocumentFragment();
      build(Array.prototype.slice.call(tpl.content.childNodes), inst.renderVals(), frag);
      app.replaceChildren(frag);
      restore(app, snap);
      window.scrollTo(0, y);
    }
    inst.__render = render;
    render();
  });
})();

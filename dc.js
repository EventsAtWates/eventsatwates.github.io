/* Tiny runtime for the Events at Wates concept pages (static, no dependencies). */
(function () {
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) { Object.assign(this.state, p); if (this.__render) this.__render(); };
  DCLogic.prototype.forceUpdate = function () { if (this.__render) this.__render(); };
  window.DCLogic = DCLogic;

  var SIMPLE = { onclick: 'click', onsubmit: 'submit', oninput: 'input', onkeydown: 'keydown' };
  function get(scope, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    var cur = scope, parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (cur == null) return undefined; cur = cur[parts[i]]; }
    return cur;
  }
  var WHOLE = /^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;
  function interp(str, scope) {
    return str.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, function (_, p) { var v = get(scope, p); return v == null ? '' : v; });
  }
  function changeEventFor(el) {
    var t = (el.getAttribute('type') || '').toLowerCase();
    if (el.tagName === 'SELECT' || t === 'checkbox' || t === 'radio') return 'change';
    return 'input'; // React's onChange fires on every keystroke for text fields
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
        if (lower === 'onchange' || SIMPLE[lower]) {
          var m = WHOLE.exec(val); var fn = m && get(scope, m[1]);
          el.removeAttribute(name);
          if (typeof fn === 'function') el.addEventListener(lower === 'onchange' ? changeEventFor(n) : SIMPLE[lower], fn);
          return;
        }
        if (val.indexOf('{{') > -1) {
          var v2 = interp(val, scope);
          el.setAttribute(name, v2);
          if (name === 'value') el.value = v2;
        }
      });
      build(Array.prototype.slice.call(n.childNodes), scope, el);
      out.appendChild(el);
    });
  }
  var CTL = 'input,textarea,select';
  var FOCUSABLE = 'input,textarea,select,button,a';
  function snapshot(root) {
    return Array.prototype.map.call(root.querySelectorAll(CTL), function (c) { return { v: c.value, k: c.checked }; });
  }
  function restore(root, snap) {
    var ctl = root.querySelectorAll(CTL);
    if (ctl.length !== snap.length) return;
    Array.prototype.forEach.call(ctl, function (c, i) {
      if (c.type === 'checkbox' || c.type === 'radio') c.checked = snap[i].k;
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
      var focusables = Array.prototype.slice.call(app.querySelectorAll(FOCUSABLE));
      var fi = focusables.indexOf(document.activeElement), sel = null;
      if (fi > -1) { try { sel = [document.activeElement.selectionStart, document.activeElement.selectionEnd]; } catch (e) { sel = null; } }
      var frag = document.createDocumentFragment();
      build(Array.prototype.slice.call(tpl.content.childNodes), inst.renderVals(), frag);
      app.replaceChildren(frag);
      restore(app, snap);
      if (fi > -1) {
        var nf = app.querySelectorAll(FOCUSABLE)[fi];
        if (nf) {
          nf.focus({ preventScroll: true });
          if (sel && sel[0] != null) { try { nf.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
          else if ('value' in nf && (nf.tagName === 'INPUT' || nf.tagName === 'TEXTAREA') && nf.type !== 'checkbox' && nf.type !== 'radio') { var v = nf.value; nf.value = ''; nf.value = v; }
        }
      }
      window.scrollTo(0, y);
    }
    inst.__render = render;
    render();
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  });
})();

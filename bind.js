var w = require('global/window')
var d = require('global/document')
var xtend = require('xtend')
var jsonist = require('jsonist')
var href = require('nanohref')
var routing = require('@ishiduca/routing')
var { through } = require('mississippi')

module.exports = function bindRoute (org, _opt) {
  if (!org.routes) return org

  var defaultPathName = '/'
  var initEffect = Symbol('initRoute')
  var actionHistoryStateChanged = Symbol('actionHistoryStateChanged')
  var opt = xtend({ default: defaultPathName, notFound: _notFound }, _opt)
  var notFound = opt.notFound
  var router = routing()
  var xhrRouter = routing()
  var render

  Object.keys(org.routes).map(function (routePattern) {
    router.define(routePattern, function (node, params, model, actionsUp) {
      return org.routes[routePattern](node, params, model, actionsUp)
    })
  })

  if (opt.xhrs) {
    Object.keys(opt.xhrs).map(function (routePattern) {
      xhrRouter.define(routePattern, opt.xhrs[routePattern])
    })
  }

  var m = router.match(opt.default)
  _changeRenderFunc(m, { pathname: opt.default })

  if (opt.default !== new URL(d.location).pathname) {
    w.history.pushState({}, '', opt.default)
  }

  return xtend(org, { init, update, view, run })

  function update (model, action) {
    if (action === actionHistoryStateChanged) return { model: xtend(model) }
    return org.update(model, action)
  }

  function view (model, actionsUp) {
    return render(model, actionsUp)
  }

  function init () {
    var state = org.init() || {}
    var model = state.model || {}
    var effect = (
      state.effect
        ? [].concat(state.effect).concat(initEffect)
        : initEffect
    )

    return { model: model, effect: effect }
  }

  function run (effect, sources) {
    if (effect === initEffect) {
      var s = through.obj()
      href(function (loc) {
        var m = router.match(loc.pathname)
        _changeRenderFunc(m, loc)

        if (opt.xhrs) {
          _xhr(loc, function (err, action) {
            err
              ? s.write({ type: 'error', value: err })
              : s.write(action)
          })
        }

        w.history.pushState({}, '', loc.pathname)
        s.write(actionHistoryStateChanged)
      })

      w.onpopstate = function (e) {
        var u = new URL(d.location)
        var m = router.match(u.pathname)
        _changeRenderFunc(m, u)

        if (opt.xhrs) {
          _xhr(u, function (err, action) {
            err
              ? s.write({ type: 'error', value: err })
              : s.write(action)
          })
        }

        s.write(actionHistoryStateChanged)
      }

      if (opt.xhrs) {
        var l = d.location
        var loc = new URL(`${l.protocol}//${l.host}${opt.default}`)
        _xhr(loc, function (err, action) {
          err
            ? s.write({ type: 'error', value: err })
            : s.write(action)
        })
      }

      return s
    }

    return org.run && org.run(effect, sources)
  }

  function _changeRenderFunc (m, node) {
    return (render = function (model, actionsUp) {
      return (
        m == null
          ? notFound(node, null, model, actionsUp)
          : m.values[0](node, m.params, model, actionsUp)
      )
    })
  }

  function _xhr (loc, cb) {
    var m = xhrRouter.match(loc.pathname)
    if (m == null) return
    var v = m.values[0]
    var uri = (
      typeof v[0] === 'function'
        ? v[0](loc, m.params)
        : v[0]
    )
    jsonist.get(uri, function (err, json) {
      if (err) return cb(err)
      var action = (
        typeof v[1] === 'function'
          ? v[1](json)
          : xtend(v[1], { value: json })
      )
      return cb(null, action)
    })
  }
}

function _notFound (node, maybeNull, model, actionsUp) {
  var sel = d.createElement('section')
  var p = d.createElement('p')
  var message = `not found: ${node.pathname} :(`
  p.innerHTML = message
  sel.appendChild(p)

  return sel
}

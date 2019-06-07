var w = require('global/window')
var d = require('global/document')
var yo = require('yo-yo')
var xtend = require('xtend')
var { through, pipe } = require('mississippi')
var { start } = require('@ishiduca/snoopy')
var multi = require('@ishiduca/snoopy-multi')
var bind = require('../bind')

function writeFavs (favs) {
  if (!(Array.isArray(favs) && favs.length > 0)) {
    return yo`<p>wait for loading...</p>`
  }
  return favs.map(fa => yo`<li>${fa}</li>`)
}

var org = {
  init () {
    return {
      model: {
        users: [],
        targetUser: {},
        error: null
      }
    }
  },
  update (model, action) {
    if (action.type === 'error') {
      return { model: xtend(model, { error: action.value }) }
    }
    if (action.type === 'getUsers') {
      return { model: xtend(model, { users: action.value }) }
    }
    if (action.type === 'getUserProfile') {
      return { model: xtend(model, { targetUser: action.value }) }
    }
    return { model }
  },
  run (effect, sources) {},
  routes: {
    '/' (node, params, model, actionsUp) {
      return yo`
        <section>
          <header>
            <p>index</p>
          </header>
          <nav>
            <ul>
              <li><a href="/wrong/uri">not found</a></li>
              ${model.users.map(p => yo`
                <li><a href=${'/users/' + p.id}>${p.id}</a></li>
              `)}
            </ul>
          </nav>
        </section>
      `
    },
    '/users/:id' (node, params, model, actionsUp) {
      return yo`
        <section>
          <header>
            <p>id: ${params.id}</p>
            <p>name: ${model.targetUser.name}</p>
          </header>
          <section class="article">
            <p>nickname: ${model.targetUser.nickname}</p>
            <p>favs</p>
            <ul>${writeFavs(model.targetUser.favs)}</ul>
          </section>
          <nav>
            <ul>
              <li><a href="/">index</a></li>
            </ul>
          </nav>
        </section>
      `
    }
  }
}

var xhrs = {
  '/': [ touri('/users.json'), { type: 'getUsers' } ],
  '/users/:id': [
    (loc, { id }) => touri(`/users/${id}.json`),
    json => xtend({ type: 'getUserProfile' }, { value: json })
  ]
}

var opt = { default: '/', xhrs }
var main = yo`<main>wait for ...</main>`
var { actions, views, effects } = start(multi(bind(org, opt)))

pipe(
  views(),
  through.obj((el, _, done) => {
    yo.update(main, yo`<main>${el}</main>`)
    done()
  }),
  err => err && console.error(err)
)

pipe(
  effects(),
  through.obj((effect, _, done) => {
    console.log(effect)
    done()
  }),
  err => err && console.error(err)
)

pipe(
  actions(),
  through.obj((action, _, done) => {
    console.log(action)
    done()
  }),
  err => err && console.error(err)
)

d.body.appendChild(main)

function touri (uri) {
  var loc = w.location
  return [ loc.protocol, '//', loc.host, uri ].join('')
}

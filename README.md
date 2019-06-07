# snoopy-bind-route

bind routes in [ '@ishiduca/snoopy' ](https://github.com/ishiduca/snoopy)

## install

```shell
npm i --save @ishiduca/snoopy-bind-route
```

## usage

### bindRoutesApp = bindRoute(app[, opt])

```js
{ init, update, run, view } = bindRoute(
  { init, update, run, routes },
  { default, notFound, xhrs }
)
```

### example

```js
var yo = require('yo-yo')
var xtend = require('xtend')
var jsonist = require('jsonist')
var { pipe, through } = require('mississippi')
var { start } = require('@ishiduca/snoopy')
var multi = require('@ishiduca/snoopy-multi')
var bindRoute = require('@ishiduca/snoopy-bind-route')

var org = {
  init () {
    return {
      model: {
        todos: {},
        current: {},
        error: null
      },
      effect: { type: 'xhr:getTodos' }
    }
  },
  update (model, action) {
    if (action.type === 'error') {
      console.error(action.value)
      return {
        model: xtend(model, { error: String(action.value) }),
        effect: { type: 'error:scheduleDelete', value: 2000 }
      }
    }
    if (action.type === 'error:delete') {
      return { model: xtend(model, { error: null }) }
    }
    if (action.type === 'store:setTodos') {
      return { model: xtend(model, { todos: action.value }) }
    }
    if (action.type === 'stoe:getTodo') {
      return { model: xtend(model, { current: model.todos[action.value] }) }
    }
    return { model }
  },
  run (effect, sources) {
    if (effect.type === 'xhr:getTodos') {
      return get('/todos.json', json => ({ type: 'store:setTodos', value: json }))
    }

    if (effect.type === 'error:scheduleDelete') {
      return scheduleDeleteError(effect.value)
    }
  },
  routes: {
    '/' (loc, params, model, actionsUp) {
      return yo`
        <section>
          <header>
            <h1>index</h1>
          </header>
          ${
            model.error
              ? yo`<p class="error">${model.error}</p>`
              : ``
          }
          <div class="content">
            <ul>
              ${model.todos.map(todo => yo`
                <li>
                  <a href=`/todo/${todo.id}`
                    onclick=${e => actionsUp({ type: 'store:getTodo', value: todo.id})}
                  >
                    id: ${todo.id}
                  </a>
                </li>
              `)}
            </ul>
          </div>
        </section>
      `
    },
    '/todo/:id' (loc, { id }, model, actionsUp) {
      return yo`
        <section>
          <header>
            <h1>todo - ${id}</h1>
          </header>
          <div class="todo-detail">
            <p>todo: ${model.current.title}</p>
          </div>
          <nav>
            <a href="/"
              onclick=${e => actionsUp({ type: 'xhr:getTodos' })}
            >index</a>
          </nav>
        </section>
      `
    }
  }
}
var opt = { default: '/' }
var app = bindRoute(org, opt)

var root = yo`<main></main>`
var { views } = start(multi(app))

pipe(views(), through.obj(ondata), err => (err && console.error(err)))

document.body.appendChild(root)

function ondata (el, enc, done) {
  yo.update(root, yo`<main>${el}</main>`)
  done()
}

function get (uri, onSuccess) {
  var s = through.obj()
  jsonist.get(uri, (err, json) => {
    if (err) return s.end({ type: 'error', value: err })
    s.end(onSuccess(json))
  })
  return s
}

function scheduleDeleteError (msec) {
  var s = through.obj()
  setTimeout(() => (
    s.end({ type: 'error:delete' })
  ), msec)
  return s
}
```

#### app has a "routes" property

* `routes` - an object literal of routes create.
  + `key` - `routePattern` string.
  + `value` - `renderingFunction`
    - args - [ `node or urlObject`, `params`, `model`, `actions up function` ]

#### opt has "default", "notFound", "xhrs" properties

* `default` - default pathname.
* `notFound` - view function for url not found.
* `xhrs` - an object literal that describes the processing of xhr when document.location changes.

```
// xhrs object
{ routePattern: [
  function to create xhr request uri when document.location changes,
  function to create action creator for sending received xhr response (json) to update function ]
}

var xhrs = {
  '/(products)': [
    () => { return '/products.json' },
    (json) => { return { type: 'setProducts', value: json } }
  ],
  '/product/:id': [
    (node, params) => { return node.pathname }, // ex: "/product/001"
    (json) => { return { type: 'replaceProduct', value: json } }
  ]
}
```

## authour

ishiduca@gmail.com

## license

The Apache License

Copyright &copy; 2019 ishiduca

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

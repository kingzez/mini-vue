function Vue(options = {}) {
  this.$options = options
  const data = this._data = this.$options.data
  observe(data)
  proxyData.call(this, data)
  initComputed.call(this)
  new Compile(options.el, this)
}

// this 代理 _data
function proxyData(data) {
  console.log('proxy', this, data)
  const vm = this
  for (let key in data) {
    Object.defineProperty(vm, key, {
      enumerable: true,
      get() {
        return vm._data[key]
      },
      set(newVal) {
        vm._data[key] = newVal
      }
    })
  }
}

// 具有缓存功能，只依赖引用值的变化
function initComputed() {
  const vm = this
  const computed = this.$options.computed
  Object.keys(computed).forEach(key => {
    Object.defineProperty(vm, key, {
      get: typeof computed[key] === 'function' ? computed[key] : computed[key].get
    })
  })

}

// 编译，替换插值变量，声明
function Compile(el, vm) {
  // el 表示替换的范围
  vm.$el = document.querySelector(el)
  const fragment = document.createDocumentFragment()
  // 将 app 中的元素移入内存中
  while (child = vm.$el.firstChild) {
    fragment.appendChild(child)
  }

  replace(fragment)

  function replace(fragment) {
    Array.from(fragment.childNodes).forEach(node => {
      // 循环每一层
      const text = node.textContent
      const reg = /\{\{(.*)\}\}/
      // 文本节点 Node.TEXT_NODE: 3
      if (node.nodeType === Node.TEXT_NODE && reg.test(text)) {
        console.log(RegExp.$1) // a.a   b
        const arr = RegExp.$1.split('.') // [a, a]  [b]
        let val = vm
        arr.forEach(k => (val = val[k]))
        // console.log(val)
        // 替换逻辑
        new Watcher(vm, RegExp.$1, (newVal) => {
          console.log('newVal', newVal)
          node.textContent = text.replace(reg, newVal)
        })
        node.textContent = text.replace(reg, val)
      }
      // 元素节点 Node.ELEMENT_NODE: 1
      if (node.nodeType === Node.ELEMENT_NODE) {
        const nodeAttrs = node.attributes // 获取当前 DOM 节点的属性
        // console.log('node attr', nodeAttrs)
        Array.from(nodeAttrs).forEach(attr => {
          const name = attr.name // type="text"
          const exp = attr.value // v-model="b"
          console.log('attr', name, exp)
          if (name.indexOf('v-') === 0) { // v-model 指令
            node.value = vm[exp]
          }
          new Watcher(vm, exp, newVal => {
            node.value = newVal // 当 watcher 触发时会自动将内容放进输入框内
          })
          node.addEventListener('input', e => {
            const newVal = e.target.value
            vm[exp] = newVal
          })
        })

      }
      if (node.childNodes) {
        replace(node)
      }
    })
  }

  vm.$el.appendChild(fragment)
}

// 观察对象 给对象增加 Object defineProperty
function Observe(data) {
  const dep = new Dep()
  for (let key in data) {
    let val = data[key]
    observe(val)
    // 把 data 属性通过 Object.defineProperty 的方式定义属性
    Object.defineProperty(data, key, {
      enumerable: true,
      get() {
        Dep.target && dep.addSub(Dep.target) // [watcher] watcher 中的读取变量触发 get 函数
        return val
      },
      set(newVal) {
        // 更改值的时候
        if (newVal === val) return // 新值与旧值相等时 不做处理
        val = newVal
        observe(newVal)
        dep.notify() // 让 dep 中所有的 watcher 执行 update 方法
      }
    })
  }
}

// vue 新增不存在的属性，不存在的属性没有 get set
// 因为每次赋予一个新对象是会给新对象增加数据劫持
function observe(data) {
  if (typeof data !== 'object') return
  return new Observe(data)
}

// 发布订阅
function Dep() {
  this.subs = []
}

Dep.prototype.addSub = function(sub) {
  this.subs.push(sub)
}

Dep.prototype.notify = function() {
  this.subs.forEach(sub => sub.update())
}

// watcher
function Watcher(vm, exp, fn) {
  this.fn = fn
  this.vm = vm
  this.exp = exp // 添加到订阅中
  Dep.target = this
  let val = vm
  const arr = exp.split('.') // [a, a]  [b]
  arr.forEach(k => (val = val[k])) // 读取 this.a.a，为了触发 Observe 的 get 函数
  Dep.target = null
}

Watcher.prototype.update = function() {
  let val = this.vm
  const arr = this.exp.split('.')
  arr.forEach(k => (val = val[k]))
  this.fn(val) // 传入 newVal
}
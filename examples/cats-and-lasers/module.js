(function() {
const setTimeout = window.setTimeout;
const clearTimeout = window.clearTimeout;

const scripts = {};

window.module = (dependencies, code) => {
  const tag = document.currentScript;
  const src = absolutePath(tag.src);
  if(!scripts[src]) {
    // backfill script tracker
    scripts[src] = new Script(tag);
  }
  scripts[src].newModule(dependencies, code);
}

class Script {
  constructor(tag) {
    this._loadModule = this._loadModule.bind(this);

    this.tag = tag;
    this.src = absolutePath(tag.src); // ensure we get a full path (tag.src might be '')
    this.isModule = false;
    this._moduleLoaded;
    this.loaded = this._getLoaded();
  }

  _getLoaded() {
    return new Promise(resolve => {
      const stack = new Error('Timeout trying to load module: "'+this.src+'"').stack;
      const timeoutID = setTimeout(()=>console.error(stack), 1000);

      if(this.tag.src === '') { // if the module was created in an inline script
        clearTimeout(timeoutID);
        setTimeout(resolve, 1); // wait until the script is done running
      } else {
        this.tag.onload = () => {
          clearTimeout(timeoutID);
          if(this.isModule) {
            this._moduleLoaded.then(resolve);
          } else {
            resolve();
          }
        };
      }
    });
  }

  newModule(dependencies, code){
    this.isModule = true;
    const importPromises = dependencies.map(this._loadModule);
    this._moduleLoaded = Promise.all(importPromises).then(imports => code(...imports));
  }

  _loadModule(target) {
    const path = getPath(this.src, target);
    if(!scripts[path]) {
      this._addScriptHeader(path);
    }

    return scripts[path].loaded;
  }

  _addScriptHeader(path) {
    const node = document.createElement('script');
    node.src = path;
    node.type = "application/javascript";
    document.head.appendChild(node);
    scripts[path] = new Script(node);
  }
}

function getPath(root, target) {
  return new URL(target, root).href
}

function absolutePath(path) {
  var link = document.createElement("a");
  link.href = path;
  return link.href;
}

})();

/* ── content-loader.js ── Fetch pillar config from server ── */

var ContentLoader = (function() {

  var config = null;

  function load(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/config', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          config = JSON.parse(xhr.responseText);
          if (callback) callback(config);
        } else {
          console.error('Failed to load pillar config:', xhr.status);
          // Retry after 2 seconds (server may not be ready yet)
          setTimeout(function() { load(callback); }, 2000);
        }
      }
    };
    xhr.send();
  }

  function getConfig() {
    return config;
  }

  function getItem(index) {
    return config && config.items ? config.items[index] : null;
  }

  function getItemCount() {
    return config && config.items ? config.items.length : 0;
  }

  return {
    load: load,
    getConfig: getConfig,
    getItem: getItem,
    getItemCount: getItemCount
  };

})();

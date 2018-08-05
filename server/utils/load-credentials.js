const fs = require('fs');

module.exports = function(keyPath=null, certPath=null) {
    if(!keyPath || !certPath) return undefined;

    var key  = fs.readFileSync(keyPath, 'utf8');
    var cert = fs.readFileSync(certPath, 'utf8');

    return { key, cert };
};

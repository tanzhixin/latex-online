var nMemcached = require('memcached')
  , fs = require('fs')
  , exec  = require('child_process').exec
  , CACHING = true;

var memcached = new nMemcached( "localhost:11211", { });

// each time a server fails
memcached.on( "issue", function( issue ){
    console.log( "Issue occured on server " + issue.server + ", " + issue.retries  + " attempts left untill failure" );
});

memcached.on( "failure", function( issue ){
    console.log( issue.server + " failed!" );
});

memcached.on( "reconnecting", function( issue ){
    console.log( "reconnecting to server: " + issue.server + " failed!" );
});

function generate(url, callback) {
    var cmd = 'cd tmp && sh compile.sh ' + url;
    console.log(cmd);
    exec(cmd, function (error, stdout, stderr) {
        if (error !== null) {
            console.error("cmd ERR: " + error);
            callback(error);
            return;
        }
        var fileName = "./tmp/" + stdout.trim();
        console.log("reading file " + fileName);
        fs.readFile(fileName, function(err, data){
            if (err) {
                console.error("File read error: " + err);
                callback(err);
                return;
            }
            console.log("Successfully read " + data.length + " bytes");
            memcacheData(encodeURIComponent(url), data);
            console.log("calling callback");
            callback(null, data);
            console.log("removing file");
            fs.unlink(fileName);
        });
    });
}

function memcacheData(key, data) {
    if (!CACHING) return;
    console.log("memcaching data");
    memcached.set(key, data, 60 * 60 * 3, function(error, result){
        if (error) {
            console.error(error);
        } else {
            console.log("" + result.length + " bytes are memcached");
        }
    });
}

function retrieveData(key, callback) {
    memcached.get(key, callback);
}

function get(url, callback) {
    if (!CACHING) {
        console.log("Caching is OFF, generating");
        generate(url, callback);
        return;
    }

    var key = encodeURIComponent(url);
    retrieveData(key, function(err, result) {
        if (err || !result) {
            console.log("memcache doesn't have anything for KEY " + key);
            generate(url, callback);
        } else {
            console.log("fetched " + result.length + " bytes from memcache for KEY " + key);
            callback(null, result);
        }
    });
}

module.exports = function(caching) {
    CACHING = caching;
    return get;
}

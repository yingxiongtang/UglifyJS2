var vm = require("vm");

function safe_log(arg) {
    if (arg) switch (typeof arg) {
      case "function":
        return arg.toString();
      case "object":
        if (/Error$/.test(arg.name)) return arg.toString();
        arg.constructor.toString();
        for (var key in arg) {
            arg[key] = safe_log(arg[key]);
        }
    }
    return arg;
}

var FUNC_TOSTRING = [
    "Function.prototype.toString = Function.prototype.valueOf = function() {",
    "    var id = 0;",
    "    return function() {",
    '        if (this === Array) return "[Function: Array]";',
    '        if (this === Object) return "[Function: Object]";',
    "        var i = this.name;",
    '        if (typeof i != "number") {',
    "            i = ++id;",
    '            Object.defineProperty(this, "name", {',
    "                get: function() {",
    "                    return i;",
    "                }",
    "            });",
    "        }",
    '        return "[Function: " + i + "]";',
    "    }",
    "}();",
].join("\n");
exports.run_code = function(code) {
    var stdout = "";
    var original_write = process.stdout.write;
    process.stdout.write = function(chunk) {
        stdout += chunk;
    };
    try {
        vm.runInNewContext([
            FUNC_TOSTRING,
            "!function() {",
            code,
            "}();",
        ].join("\n"), {
            console: {
                log: function() {
                    return console.log.apply(console, [].map.call(arguments, safe_log));
                }
            }
        }, { timeout: 5000 });
        return stdout;
    } catch (ex) {
        return ex;
    } finally {
        process.stdout.write = original_write;
    }
};
exports.same_stdout = ~process.version.lastIndexOf("v0.12.", 0) ? function(expected, actual) {
    if (typeof expected != typeof actual) return false;
    if (typeof expected != "string") {
        if (expected.name != actual.name) return false;
        expected = expected.message.slice(expected.message.lastIndexOf("\n") + 1);
        actual = actual.message.slice(actual.message.lastIndexOf("\n") + 1);
    }
    return expected == actual;
} : function(expected, actual) {
    return typeof expected == typeof actual && expected.toString() == actual.toString();
};

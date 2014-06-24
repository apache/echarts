define(function (){
    function kwargs(func, defaults) {
        /*jshint maxlen : 200*/
        var removeComments = new RegExp('(\\/\\*[\\w\\\'\\,\\(\\)\\s\\r\\n\\*]*\\*\\/)|(\\/\\/[\\w\\s\\\'][^\\n\\r]*$)|(<![\\-\\-\\s\\w\\>\\/]*>)', 'gim');
        var removeWhitespc = new RegExp('\\s+', 'gim');
        var matchSignature = new RegExp('function.*?\\((.*?)\\)', 'i');
        // get the argument names from function source
        var names = func.toString()
                        .replace(removeComments, '')
                        .replace(removeWhitespc, '')
                        .match(matchSignature)[1]
                        .split(',');

        // Check the existance of default, if not create an object
        if(defaults !== Object(defaults)){
            defaults = {};
        }

        return function () {
            var args = Array.prototype.slice.call(arguments);
            var kwargs = args[args.length - 1];

            // Check the existance of the kwargs
            if (kwargs && kwargs.constructor === Object) {
                args.pop();
            }
            else{
                kwargs = {};
            }

            // Fill the arguments and apply them
            for (var i = 0; i < names.length; i++) {
                var name = names[i];
                if (name in kwargs) {
                    args[i] = kwargs[name];
                }
                else if(name in defaults && args[i] == null){
                    args[i] = defaults[name];
                }
            }

            return func.apply(this, args);
        };
    }
    // As function prototype
    // Function.prototype.kwargs = kwargs;
    return kwargs;
});
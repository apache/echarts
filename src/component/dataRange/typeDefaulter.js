define(function (require) {

    require('../../model/Component').registerSubTypeDefaulter('dataRange', function (option) {
        return (
                !(
                    option.splitList
                        ? option.splitList.length > 0
                        : option.splitNumber > 0
                )
                || option.calculable
            )
            ? 'continuity' : 'piecewise';
    });

});
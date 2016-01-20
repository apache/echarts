define(function (require) {

    require('../../model/Component').registerSubTypeDefaulter('visualMap', function (option) {
        // Compatible with ec2, when splitNumber === 0, continuous visualMap will be used.
        return (
                !option.categories
                && (
                    !(
                        option.pieces
                            ? option.pieces.length > 0
                            : option.splitNumber > 0
                    )
                    || option.calculable
                )
            )
            ? 'continuous' : 'piecewise';
    });

});
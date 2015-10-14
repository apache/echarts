define(function (require) {

    require('../../model/Component').registerSubTypeDefaulter('dataRange', function (option) {
        // Compatible with ec2, when splitNumber === 0, continuous dataRange will be used.
        return (
                !(
                    option.splitList
                        ? option.splitList.length > 0
                        : option.splitNumber > 0
                )
                || option.calculable
            )
            ? 'continuous' : 'piecewise';
    });

});
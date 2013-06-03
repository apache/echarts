/**
 * ESL (Enterprise Standard Loader)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file JS Loader-Plugin
 * @author errorrik(errorrik@gmail.com)
 */

// 构建环境暂不支持分析，为了能合并该plugin到loader里，
// 只能暂时使用具名id
define( 'js', {
    load: function ( resourceId, req, load, config ) {
        var script = document.createElement( 'script' );
        script.src = req.toUrl( resourceId );
        script.async = true;
        if ( script.readyState ) {
            script.onreadystatechange = onload;
        }
        else {
            script.onload = onload;
        }

        var parent = document.getElementsByTagName( 'head' )[ 0 ] || document.body;
        parent.appendChild( script ) && ( parent = null );
        
        function onload() {
            var readyState = script.readyState;
            if ( 
                typeof readyState == 'undefined'
                || /^(loaded|complete)$/.test( readyState )
            ) {
                script.onload = script.onreadystatechange = null;
                script = null;
                load( true );
            }
        }
    }
} );

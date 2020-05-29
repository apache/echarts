/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
}(this, function (exports, echarts) {
    var log = function (msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    }
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }
    if (!echarts.registerMap) {
        log('ECharts Map is not loaded')
        return;
    }
    echarts.registerMap('china-contour', {"type":"FeatureCollection","features":[{"id":"100000","type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[["@@¦ŜiÀºƦƞòïè§ŞCêɕrŧůÇąĻõ·ĉ³œ̅ó­@ċȧŧĥĽʉ­ƅſȓÒË¦ŝE}ºƑ[ÍĜȋ AɞÏĤ¨êƺ\\Ɔ¸ĠĎvʄȀÐ¾jNðĒĞȠzÐŘÎ°H¨ȔBĠ "],["@@ƛĴÕƊÉɼģºðʀI̠ÔĚäθؾǊŨxĚĮǂƺòƌĪŐĮXŦţƸZûÐƕƑʳÛǅƝɉlÝƯֹÅŃ^Ó·śŃǋƏďíåɛGɉ¿@ăƑ¥ĘWǬÏĶŁâ"],["@@Óɖ± dƊ½ǒÂň×äı§ĤƩ¶hlçxÄ¬ŸĄŞkâÌwøàĲaĞfƠ¥Ŕd®UɎÖ¢aƆúŪtŠųƠjdƺƺÅìnŢ¯äɝĦ]èpĄ¦´LƞĬ´ƤǬ˼Ēɸ¤rºǼìĴPðŀbþ¹ļD¢¹\\ĜÑ̔ùўÊȮǪűÀêZǚŐ¤qȂ\\`ºłĤ\\ºs|zºÿŐãѦvĪĺĺĈłÈ͚FÞºĠUƢ¾ªì°`öøu®Ì¼ãÐUÞĖ¶¬æɒlʐßØvWʚÖÕÁÜÅŵ­_«EÍɪëÏ÷ÅyXo͂ĝĂÛÎf`Þ¹ÂÿÐGĮÕĞXŪōŸMźÈƺQèĽôe|¿ƸJR¤ĘETėº¯ɀáMĺŝOéÈ¿ÖğǤǷŔ²å]­Ĥĝœ¦EP}ûƥé¿İƷTėƫœŕƅƱB»Đ±řü]µȺrĦáŖuÒª«ĲπdƺÏɌ]͚ĐǂZɔ¹ÚZצʥĪï|ÇĦMŔ»İĝǈì¥Βba­¯¥Ǖǚk˦ӷxūД̵nơԆ|ǄࡰţાíϲäʮW¬®ҌeרūȠkɬɻ̼ãɜRצɩςåȈHϚÎKǳͲOðÏȆƘ¼CϚǚ࢚˼ФÔ¤ƌĞ̪Qʤ´ԜÃƲÀɠmǐnȺĸƠ´ǠNˠŜ¶ƌĆĘźʆȬμƒĞGȖƴƀj`ĢçĶȅŚēĢĖćYÀŎüôQÐÂŎŞǆŞêƖoˆDƞŧǘÛۨĝȘĲªǬ¾äʀƪ¼ÐĔǎ¨Ȕ»͠^ˮÊ˰ȎŜHĦðDÄ|ø˂˜ƮÐ¬ҌqjĔ²Äw°ǆdĞéĸdîàŎjɒĚŌŜWÈ|Ŗ¶îÎFCĊZĀēƄNĤ¶łKĊOjĚj´ĜYp{¦SĚÍ\\T×ªV÷Šų¬K°ȧļ¨ǵÂcḷ̌ĚǣȄɧ\\ĵŇȣFέ̿ʏƶɷØ̫»ƽū¹Ʊő̝Ȩ§ȞʘĖiɜɶʦ}¨֪ࠜ̀ƇǬ¹ǨE˦ĥªÔǲl¶øZh¤Ɛ E ĈDJì¸̚¸ƎGú´P¬WÄìHsĲ¾wLVnƽCw`h`¥V¦U¤¸}¾Ô[~âxh¢ªHÆÂriĐɘǜhÀoRzNyÀDs~bcfÌ`L¾n|¾T°c¨È¢aÈÄ[|òDȎŸÖdHƮÀì~Æâ¦^¢ķ¶eÐÚEêɡČÅyġLûŇV®ÄÐź~Ď°ƂŤǒČ¦ÒŬÂezÂvǴZ{ĘFĒĴAΜĐȄEÔ¤ØQĄĄ»ΈZǺ¨ìSŊÄƸwn¼c]Ü¬ì¯Ǆ]ȘŏńzƺŷɄeeOĨSfm Ɋ̎ēz©þÐÙÊmgÇsJ¥ƔŊśÎÔsÁtÃßGoÀ­ xňË_½ä@êíuáĠ[ġ¥gɊ×ûÏWXáǠǱÌsNÍ½ƎÁ§čŐAēeL³àydl¦ĘVçŁpśǆĽĺſÊQíÜçÛġÔsĕ¬ǲ¡SíċġHµ ¡EŃļrĉŘóƢFƺ«øxÊkƈdƬÌr|©ÛńRŀøďŊŀàŀU²ŕƀBQ£Ď}L¹Îk@©ĈuǰųǨÚ§ƈnTËÇéƟÊcfčŤ^gēĊĕƯǏx³ǔķÐċJāwİ_ĸȀ^ôWr­°oú¬Ɏ~ȰCĐ´Ƕ£fNÎèâ_ÐŮeʆǊǘuȔ\\¤ÒĨA¢Ê͠æÔ ŬGƠƦYêŊàƆXvkmͥœ@čŅĻA¶çÎqC½Ĉ»NăëKďÍQɅřęgßÔÇOÝáWáħ£˯ā¡ÑķĎÛå¯°WKÉ±_d_}}vyõu¬ïÏŅ½@gÏ¿rÃ½±Cdµ°MFYxw¿CG£ǧ«»ó¡Ɵ¿BÇƻğëܭǊĭôµ}čÓpg±ǫŋRwŕnéÑƕfSŋ®ÍD Ûǖ֍]gr¡µŷzįm³~S«þeo³l{iē¥yZ÷īĹõġMRÇģZmÃ|¡ģTɟĳÂÂ`ÀçmFK¥ÚíÁbX³ÌQÒHof{]ept·GŋĜTǊŋBh¬ƩDo±enq©G`wGçǑKFuNĝwőXtW·Ýďæßa}xVXRãQ`­©GM»­ďÏd©ÑW_ÏǷr¡é\\ɹ~ɍuØ©Bš¤ÝĤ½¢Å_Á¿LŅñuT\\rÅIs®y}ywdSǱtCmûvaʋJrƯâ¦³PrbbÍzwBGĭTÁk»lY­ċ²zÇ£^§»d¯íŻ£ćGŵǅƍÓ]íM^o£Ã]ªUóo½~Å|ŋÝ¥ċh¹·CÉ­Dřlgȵë[}ģS}xƃği©ĝɝǡFęĽµáƣ©HĕoƫŇqr³Ãg[šÃSő_±ÅFC¥Pq{ñg¿įXƝıĉǋûěŉ³F¦oĵhÕP{¯~TÍl¸ÓßYÏàs{ÃVUeĎwk±ŉVÓ½ŽJūĉ»Jm°fĎdF~ĀeĖO² ĈżĀiÂd^~ăÔH¦\\§|ĄVez¤NP ǹÓRÆƇP[¦´Âghwm}ÐÐ¨źhI|VV|p[¦À¶èNä¶ÒCÀ¢^hPfvƾĪ×òúNZÞÒKxpw|ÊEZÂI¨®œİFÜçmĩWĪñtÞŉËÝ^³uL±|Əlĉ¥čn§ßÅcB× CNǟ_ñŧı¯Y]ăÙĽѷť³ÃARZRlʑýSëÍDěïÿȧ¢ÙġěŗŷęUªhJƁƅn³gF³HàŋÅÃƉÀKť`ċŮÁõYėé÷`Ù_ÏǵR§òoEÅąLœŐœƜVµąłíļĐ·ũ̈«ªdÎÉnb²ĦhņBĖįĦåXćì@L¯´ywƕCéÃµė ƿäćú y±¨Mf~C¿`à_ÿƌfQnð³ƬŲŎ¥ĠʦĘĒØ¼Â±ŴPè¸ŔLƔÜƺ_TüÃĤBBċÈöA´faM¨{«MúīôÖ°ʊkŲÆM|²@¤u¤Û´ä«̰\\}ēÅM¼Ã­]NągoõľHyGă{{çrnÓEƕZGª¹Fj¢ïWuøC̍ƃhÛ­Å\\bÅxì²ƝýNīCȽĿǃŖÕy\\¹kxÃ£Č×G¿Ï¤ÁçFQ¡KtŵΥëÚź«ėn½ĉŀÁ¼zK¶G­Y§Ë@´śÇµƕñxZ¯uÏï{éƵP_K«pÍÁwƏčaEU£uŻāɌŁFŴu»¹İ×ȖħŴw̌ŵ²ǹǠ͛hĭłƕrçü±hǥ®jű¢KOķÅ}`åÂK­_Юƫ²ʯÊ^H{ǸÃĆēĤȍzȥÝµċF͓ŸI©Õ͈ǫȌȥ¦ŋEÓıŪěřÀåżȟLƏŽąđGǛģǈƧĎOłčȶʋÀBŖÕªÁŐTőŕåqûõi¨hÜ·ñt»¹ýv_[«²K{L¯SªGÃµ¸gÑpY´«ęƘʑcoċ\\­gěŧ«Āý¶ŧ·ÅKsËÉc¢Ù\\ĭƛëbf¹­ģSĜkáƉÔ­ĈZ~ïµfzŉfåÂȝǷÕĕÊĉ{ğč±uƁí]Í»ęX\\­Ip¡éĥZEãoPþy¸k³¡ƽ¿å³BRØ¶Wlâþäą`]aģc ĹGµ¶HåÕ¾xĨôȉðX«½đCIŇOK³ÁÄţ¬OAwã»aLŉËĥW[ÂGIÂNrį~IÐêĘÎG§Ė¥ÝF{ WK}ùaHāÖ{OouHEÅÇqĬuë±KEò£UplÀ÷tMāe£bYÂý¡a±Öcp©®^ö±qÇGjųªKy¬ŏ®¤ÉEĀåA¬V{XģĐpě¼³Ăp·¤īyÚ¡ŅLĻÅ§qlÀh¬µ»åÇGnùčÙmÆßėuĕeûÒiÁŧSW¥Qûŗ½ùěYÓ±]ÓđīkWó«íěCŇͱčvĭõĉę÷N¹³ĉoTĵËçŁYÙǝŕ¹tȏģ·Ĕĭ|đėÊK½Rē ó]ĀęAxNk©|ām¡diď×YïYWªŉOeÚtĐ«zđ¹TāúEáÎÁąÏHcòßÎſ¿Çdğ·ùT×Çūʄ¡XgWÀǇƟĻOj YÇ÷Sğ³kzőȝğ§õ¡VÙæÅöMÌ³¹pÁaËýý©D©ÜJŹƕģGą¤{ÙūÇO²«BƱéAÒƇ×«BhlmtÃPµyÓɉUīí}GBȅŹãĻFŷŽǩoo¿ē±ß}wƋtƺCőØEîǻīƓʑãÍƍDĈ±ÌÜÓĨ£LóɢVȞĆĖMĸĤfÜǗjđĆ»ýͥãğ¶ĞØO¤Ǜn³ő}¦·zYwašőűMę§ZĨíÛ]éÛUćİȹ¯dy¹TcÂĕ½A´µê÷wĻþÙ`K¦¢ÍeĥR¡ãĈu¼dltU¶¶ď\\z}Æ°Ŭ{ÚfK¶Ð_ÂÒ¿C©ÖTmu¼ãlŇÕVåĤĵfÝYYįkÒīØſNQĠ³r³øÓrÖÍ³gÍſGįÅ_±he¡ÅM²Ɠï¥ßīZgmkǭƁć¦UĔť×ëǟe˭ʔħǛāĘPªĳ¶Ņăw§nď£S»şÍļɉŀ}ÛÞ»å£_ıęÏZ÷`[ùx½}ÑRHYėĺďsÍné½Ya¤Ïm¬ĝgĂsAØÅwďõ¤q}«Dx¿}Uũlê@HÅ­F¨ÇoJ´Ónȯ×Ã¢pÒÅØ Têa²ËXcÌlLìģËŁkŻƑŷÉăP¹æƧÝ¡¦}veèÆ´UvÅ~§½Ġ²Ŵwæč\\D}O÷£[ăá[įŷvRsdĒƄwŎĒo~t¾ÍŶÒtD¦Úiôöz«Ųƭ¸Û±¯ÿm·zR¦Ɵ`ªŊÃh¢rOÔ´£Ym¼èêf¯ŪĽnAĦw\\ưĆ ¦gʉË£¢ιǫßKÙIįóVesbaĕ ǠƺpªqÂďE®tôřkȌwêżĔÂenËÂQƞ´¼ŲĘ¯Îô¶RäQ^Øu¬°_Èôc´¹ò¨PÎ¢hlĎ¦´ĦÂ¬oêÇŲÚr^¯°^º{ªBH²Ö¤ɦ§Țvqĸ ­viļndĜ­ĆfŒxÝgyÞqóSį¯³X_ĞçêtrmÚ§z¦c¦¥jnŞi¯´ÓH@ÂċĂį·Ì_þ·¹_wzË£Z­¹|ÅWM|O¥ÃWTÕ­ùÔQ¥¥Rã»GeeƃīQ}J[ÒK¬Ə|oėjġĠÑN¡ð¯EBčnkòəėª²œm˽ŏġǝʅįĭạ̃ūȹ]ΓͧŹəăЕ·ƭęgſ¶ҍć`ĘąŌJÞä¤rÅň¥ÖƝ^ęuůÞiĊÄÀ\\Æs¦ÓRäřÌkÄŷ¶½÷ùCMÝÛĥ°G¬ĩ`£Øąğ¯ß§aëbéüÑOčk£ÍI ïCċÀÕÕĻSŧŉïŽŗãWÑăû··Qòı}¯ãIéÕÂZ¨īès¶ZÈsæĔƦÚ@îá¾ó@ÙwU±ÉTå»£TđWxĉWù×¯cĩvėŧ³BM|¹kªħ¥TzNYnÝßpęrñĠĉRÑÈěVVµõ«¯ůĉ¥áºaeõ|uĐh`Ü³ç@ƋĿa©|z²Ý¼Ĵč²ŸIûI āóK¥}rÝ_Á´éMaňæêSĈ½½KÙóĿeƃÆB·¬ƃV×ĴƳlŒµ`bÔ¨ÐÓ@s¬ƿûws¡åQÑßÁ`ŋĴ{ĪTÚÅTSÄį¤Ç[Ç¾µMW¢ĭiÕØ¿@ÂpÕ]jéò¿OƇĆƇpêĉâlØwěsǩĵ¸cbU¹ř¨^±zeė·¥Ó@~¯éīB\\āƚǗÀƷŘóQīÈáPǥ@ŗĸIæÅhnszÁCËìñÏ·ąĚÝUm®ó­Z±đ[Âÿiñ¬Òj°ŁŤ_uµ^°ìÇÊĶĒ¡ÆMğźİĨƥôRāð©[wâäĄ©Ô\\°ÝĄ̄ƢăknéǀůĆKĒĬ¶èâz¨u¦¥L~ƄýÎIƖßµĔƱĐċņbÎÕĄæ_ƞZRÖíJ²öLĸÒcºƖÎ\\ñºÛqYŃ¨`x¥ù^}ÌđYªƅAÐ¹n~ź¯f¤áÀzgÇDIÔ´Aňńňĕuĩt[{ù°ŁÏ|Soċxţ[õÔĥkŋÞŭZËºóYËüċrw ÞkrťË¿XGǣ@Dü·Ē÷AÃª[ÄäIÂ®BÕĐÞ_¢āĠpÛÄȉĖġDKÕKÄNôfƫVó¼ǳHQµâFù­Âœ³¦{YÂ¢ĚÜO {Ö¦ÞÍ¨JÜÄƨlUĖ§ªÍEË¨¡ĐĬĬùÎRƠHÕŔ_ƪàÒKäȇĬə²ȕnáûl÷eǛòĞ\\ªÑòÜìc\\üqÕ[ēǆċªbØ­ø|¶ȴZdÆÂońéGŠǚnìÈƲŪȖưòTxÊǪMīĞÖŲÃɎO̚ǰRěò¿ġ~åŊú¬ô¸qĘ[Ĕ¶ÂćnÒPĒÜvúĀÊbÖ{Äî¸~Ŕünp¤ŀ¤ĄYÒ©ÊfºmÔȈ¡Ǆ~¤s²ʘÚžȂVƼîèW²æĲXŔþɔÖĚêϜêĮŢɨJ¯ÎrDDĤ`Q¾§~wâJÂñÈOú¤p¨ŪŊMǎÀW|ų ¿¾ɄĦƖAiƒ÷fØĶK¢ȝ˔"]],"encodeOffsets":[[[112750,20508]],[[123335,22980]],[[82455,44869]]]},"properties":{"cp":[116.3683244,39.915085],"name":"中华人民共和国","childNum":3}}],"UTF8Encoding":true});
}));
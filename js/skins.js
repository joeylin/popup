;
(function($, document, window, undefined) {
    // Optional, but considered best practice by some
    "use strict";

    var  Popup = $.popup;
    
    Popup.skins = {
        skinRimless: {
            minTop: 20,
            minLeft: 10,
            holderWidth: 0,
            holderHeight: 100,

            autoSize: true,
            sliderEffect: 'none',

            components: {
                controls: {
                    ui: 'outside',
                },
            },
            //ajust layout for mobile device
            _mobile: function(holderWidth,holderHeight,minTop,minLeft) {
                holderWidth = 0;
                holderHeight = 10;
                Popup.current.autoSize = true; 
                Popup.$content.find('img').css({width:'100%',height:'100%'});
                return {
                    w: holderWidth,
                    h: holderHeight,
                    t: minTop,
                    l: minLeft,
                }
            }    
                   
        },
        skinSimple: {
            holderWidth: 20,
            holderHeight: 120,

            minTop: 20,
            minLeft: 0,

            autoSize: true,
            sliderEffect: 'none',

            components: {
                controls: {
                    ui: 'inside',
                },
                thumbnails: {
                    padding: 2,
                    bottom: 10,
                }
            },
            
            _mobile: function(holderWidth,holderHeight,minTop,minLeft) {
                holderWidth = 20;
                holderHeight = 20;
                Popup.current.autoSize = true; 
                Popup.$content.find('img').css({width:'100%',height:'100%'});
                return {
                    w: holderWidth,
                    h: holderHeight,
                    t: minTop,
                    l: minLeft,
                }
            }           
        },
    };


})(jQuery, document, window);



;
(function($, document, window, undefined) {
    // Optional, but considered best practice by some
    "use strict";
    // Plugin constructor
    var Popup = $.Popup = function(element, options) {
        $(element).on('click', function(e) {

            Popup._init(this,options);
            Popup.show();
            return false;
        });
    };
    
    $.extend(Popup, {
        //properties
        defaults: {
            width: 960,
            height: 600,
            minWidth: 400,
            minHeight: 200,

            playSpeed: 1500,

            closeBtn: false,

            components: {},
            skinSetting: {
                holderWidth: 0,
                holderHeight: 80,

                minTop: 40,
                minLeft: 10,
            },

            transition: 'fade',
            transitionEffect: {},

            autoSize: true,
            autoPlay: false, //open autoplay
            action: false, // taggle to autoplay by click

            isPaused: false,

            selector: null,
            ajax: {
                dataType: 'text',
            },

            keyboard: {
                left: true,
                right: true,
                esc: false
            },

            keys: true,
            initialTypeOptions: false,
            loop: true,
            overlay: {
                close: false
            },
            preload: false,
        },
        current: {},
        previous: {},
        coming: {},

        settings: {},

        components: {},

        isMobile: false,

        //
        //privite method
        //

        _init: function(element,options) {

            var self = element,
                $self = $(element),
                url, index, group, count,metas = {};
       
            $.each($self.data(), function(k, v) {
                if (/^popup/i.test(k)) {
                    metas[k.toLowerCase().replace(/^popup/i, '')] = v;
                }
            });


            group = Popup.elements.filter(function() {
                var data = $(this).data('popup-group');
                if (metas.group) {
                    return data == metas.group;
                }
            });
            
            count = group.length;
            if (count >= 2) {
                $.each(group, function(i, v) {
                    if ($(v).data('popup-group-options')) {
                        metas.groupoptions = $(v).data('popup-group-options');
                    }
                });
            }
            console.log(metas)

            if (metas.options) {
                metas.options = Popup._string2obj(metas.options);
            }            

            if (metas.groupoptions) {
                metas.options = $.extend(true,Popup._string2obj(metas.groupoptions),metas.options);
            } 

            if(!options) {
                options = {};
            }

            Popup.settings = {};
            $.extend(true,Popup.settings,Popup.defaults, options, metas.options , metas); //要修改

            //build Popup.group object
            index = count>=2 ? group.index(self) : 0;
            url = $self.attr('href');

            Popup.settings = $.extend({}, Popup.settings, {
                index: index,
                url: url,
                element: element
            });

            if (count >= 2) {
                Popup.group = [];
                group.each(function(i, v) {
                    var $url, $type, obj = {};

                    $url = $(v).attr('href');
                    $type = $(v).data('popup-type');

                    $.extend(obj, {
                        index: i,
                        url: $url,
                        type: $type,
                        element: v
                    });
                    Popup.group.push(obj);
                });
            }
        },
        _afterLoad: function() {
            var $container,$content,$controls,$close,$custom,$info,
                aspect     = Popup.current.aspect, 
                type       = Popup.current.type,
                bindEvents = function() {
                    //binding resize event on window
                    $(window).on('resize',function() {
                        Popup._resize();
                        return false;
                    });

                    //bind close button event
                    if (Popup.current.closeBtn) {
                        $close.on('click', function() {
                            Popup.close();
                            return false;
                        });
                    }
                                   
                    // Key Bindings
                    if(Popup.current.keys && !Popup.isOpen) { 
                        $(document).bind('keypress.popup',function(e){
                            var key = e.keyCode;

                            if (key === 27) {
                                Popup.close();
                                return false;
                            }
                            if(Popup.slider==true && key === 37) {
                                Popup.prev();
                                return false;
                            } else if (Popup.slider==true && key === 39) {
                                Popup.next();
                                return false;
                            }
                        });
                    }
                }; 

            if (!Popup.isOpen) {

                //create container 
                $container = Popup._makeEls('div', 'popup-container');
                $container.css({
                    'position': 'absolute',
                    'display': 'block',
                });
                $content = Popup._makeEls('div', 'popup-content');
                $info = Popup._makeEls('div','popup-info');
                $controls = Popup._makeEls('div', 'popup-controls');
                $custom = Popup._makeEls('div','popup-custom');
                $container.append($content,$info,$controls,$custom);

                $.extend(Popup,{
                    $container: $container,
                    $content: $content,
                    $info: $info,
                    $controls: $controls,
                    $custom: $custom,
                });

                if (Popup.current.closeBtn) {
                    $close = Popup._makeEls('div','popup-controls-close');
                    $close.css({'position': 'absolute'}).appendTo($controls);
                }

                //load skin value
                Popup.current.skin = Popup.current.skin == null? Popup.defaultSkin || 'custom' : Popup.current.skin;
                $.extend(true,Popup.current.skinSetting,Popup.skins[Popup.current.skin]);

                console.log(Popup.current);
                
                //trigger the component registered on components object
                Popup._trigger('onReady');

                //set skin
                if (Popup.$overlay) {
                    Popup.$overlay.addClass(Popup.current.skin);
                } else {
                    Popup.$container.addClass(Popup.current.skin);
                }

                //add container to overlay or body
                $container.appendTo( Popup.$overlay || 'body' );

                //binding event
                bindEvents();

                //trigger open transition
                Popup.transitions[Popup.current.transition]['openEffect'](Popup.current); 
                
                Popup.isOpen = true;
            }

            //remove old content before loading new content
            Popup.$content.empty();
            Popup.$content.append(Popup.current.content);

            //give a chance to reset some infos
            Popup._trigger('afterLoad');

            //set postion every loading
            Popup._resize();

            if (type=="image" && Popup.group && Popup.group[1]) {
                Popup.types.image.imgPreLoad();
            }                      

            //reset some properties after load
            Popup.current.type = null;
            Popup.angle = null; //可以放在这里是因为旋转是在用户点击的时候才执行，因此在旋转期间没有执行到这里，变量不会被销毁。
        },
        _slider: {
            timer: {},
            clear: function() {
                clearTimeout(this.timer);
            },
            set: function() {
                this.clear();
                if(Popup.group && Popup.group[1]) {
                    this.timer = setTimeout(Popup.next,Popup.current.playSpeed);
                }  
            },
            play: function() {
                Popup.current.isPaused = false;
                this.set();
            },
            pause: function() {
                this.clear();
                Popup.current.isPaused = true;
            }
        },
        _resize: function() {
            var obj,top,left, width, height,
                result = {},
                rez = {},

                current = Popup.current,
                aspect = current.aspect,

                //save original image dimension,
                originWidth = Popup.current.width,
                originHeight = Popup.current.height,

                maxWidth = $(window).width() - current.skinSetting.holderWidth,
                maxHeight = $(window).height() - current.skinSetting.holderHeight,
                minWidth = Popup.current.minWidth,
                minHeight = Popup.current.minHeight,

                minTop = current.skinSetting.minTop,
                minLeft = current.skinSetting.minLeft,

                scale = function(x,y,rate) {
                    var w,h;

                    w = y * rate;
                    h = x / rate;

                    if (w > x) {
                        w = x;
                    }
                    if (h > y) {
                        h = y;
                    }

                    return {
                        w: w,
                        h: h,
                    }
                };


            if (current.autoSize) {
                width = (maxWidth - 2 * minLeft)>originWidth? originWidth: (maxWidth - 2 * minLeft)<minWidth? minWidth: (maxWidth - 2 * minLeft);
                height = (maxHeight - 2 * minTop)>originHeight? originHeight: (maxHeight - 2 * minTop)<minHeight? minHeight: (maxHeight - 2 * minTop);

                if (aspect) {
                    result = scale(width,height,aspect);
                    width = result.w;
                    height = result.h;
                }
            }            
            
            //centered the container
            top = (maxHeight - height)/2 < minTop ? minTop : (maxHeight - height)/2;
            left = (maxWidth - width)/2 < minLeft ? minLeft : (maxWidth - width)/2;
            
            //reposition set on container
            Popup.$container.css({
                top: top,
                left: left,
            });
            //resize set on content
            Popup.$content.css({
                width: width,
                height: height,
            });

            //give a chance for components component resize
            //note: it defaults padding and margin both equal to 0 
            rez = {
                winWidth: maxWidth + current.skinSetting.holderWidth,
                winHeight: maxHeight + current.skinSetting.holderHeight,
                containerWidth: width,
                containerHeight: height,
                holderWidth: current.skinSetting.holderWidth,
                holderHeight: current.skinSetting.holderHeight,
                top: top,
                left: left,
            };

            //here pass dimension info as a argument to components
            Popup._trigger('resize',rez);
        },
        _makeEls: function(tag, className, style) {
            var element = document.createElement(tag),
                $element = $(element);
            if (arguments[1]) {
                $element.addClass(className);
            }
            if (arguments[2]) {
                $element.css(style);
            }
            return $element;
        },
        _string2obj: function(string) {
            var obj = {},
                arr, subArr, count, i = 0;
            arr = string.split(',');
            count = arr.length;
            for (i = 0; i < count; i++) {
                subArr = arr[i].split(':');
                obj[subArr[0]] = subArr[1];//.replace("\'","").replace("\"","")
            }
            return obj;
        },
        _trigger: function(event) {
            var component, components = Popup.components;
            for (var component in components) {

                //here to check wether to close some component
                if (Popup.current.skinSetting[component] !== null) {
                    components[component][event] && components[component][event](arguments[1]);
                }            
            }
        },
        _showLoading: function() {
            var $loading;
            Popup._hideLoading();

            // If user will press the escape-button, the request will be canceled
            $(document).on('keypress.loading',function() {
                if ((e.which || e.keyCode) === 27) {
                    Popup.cancel();
                    return false;
                }
            });

            $loading = Popup._makeEls('div','popup-loading');
            $loading.appendTo(Popup.$container);
        },
        _hideLoading: function() {
            $(document).unbind('keypress.loading');
            $('.popup-loading').remove();
        },

        //
        //adding public Method
        //
        show: function(contents, options) {
            var previous = Popup.current,
                toString = Object.prototype.toString,
                options, current, index, url, obj, type;

            console.log(Popup.settings);
            if (!Popup.settings || Popup.isOpen) { 
                Popup.settings = {};
                $.extend(true,Popup.settings, Popup.defaults);
                console.log(Popup.settings);
            }
            
            //options 
            if (toString.apply(options) === '[object Object]' || options == undefined) {
                options = options || {};
            } else if (!isNaN(options)) {
                index = options;
                options = {};
            }

            //contents
            if (toString.apply(contents) === '[object Array]' && !Popup.isOpen) {
                var count = contents.length,
                    i = 0;
                Popup.group = [];
                for (i; i < count; i++) {
                    obj = {
                        url: null,
                        title: '',
                    };
                    if (toString.apply(contents[i]) === '[object String]') {
                        obj.url = contents[i];
                    } else if (toString.apply(contents[i]) === '[object Object]') {
                        $.extend(obj, contents[i]);
                    }
                    Popup.group.push($.extend({}, options, obj));
                }

                if (isNaN(arguments[1])) {
                    index = 0;
                }
                index = index % Popup.group.length;

                if(!Popup.current) {
                    Popup.current = {};
                }

                $.extend(true,Popup.current,Popup.defaults, Popup.group[index]);

                Popup.current.index = index;
            } else if (!Popup.isOpen) {
                if (arguments.length == 1) { 
                    Popup.current = $.extend(true,Popup.current,Popup.settings, arguments[0].options);
                    Popup.current.url = arguments[0].url;
                } else {
                    Popup.current = $.extend(true,Popup.current,Popup.settings, options);
                    console.log(options);
                    console.log(Popup.current); 
                }
            }           

            Popup.current.aspect = null;
            current = Popup.current;

            if (index < 0 || (Popup.group && index > Popup.group.length - 1)) {
                index = 0;
            }

            //here we can see how it works
            //click image: making Popup.current,Popup.group
            //click next: extent Popup.current with Popup.group[index]
            //note: Popup.current only made when firstly click
            if (Popup.group && Popup.group[1]) {
                if (arguments.length == 2 && toString.apply(arguments[1]) === '[object Number]') {

                    Popup.current = $.extend({}, Popup.current, Popup.group[index]);
                    Popup.current.index = index;
                }
                Popup.slider = true;
            }

            // trigger types verifaction.
            $.each(Popup.types,function(key,value) {
                if (Popup.types[key].match && Popup.types[key].match(current.url)) {
                    type = key;
                    return false;
                }
            });
                        
            type = current.type || type;
            Popup.current.type = type;

            //initialize custom type register
            Popup.types[type].initialize && Popup.types[type].initialize();

            Popup.types[type].load();          
        },
        close: function() {

            //if already closed ,return
            if (!Popup.isOpen) {
                return
            }

            //trigger close transition
            if (Popup.closeAnimate == null ) {
               Popup.closeAnimate = true; 
               return Popup.transitions[Popup.current.transition]['closeEffect']();               
            }  

            Popup.cancel();

            //unbind event
            $(window).unbind('resize');
            $(document).unbind('keypress.popup');

            //delete skin
            if (Popup.$overlay) {
                Popup.$overlay.removeClass(Popup.current.skin);
            } else {
                Popup.$container.removeClass(Popup.current.skin);
            }         

            //trigger to remove the component registered on components object
            Popup._trigger('close');

            Popup.$container.remove();

            Popup.slider = false;
            Popup.closeAnimate = null;
            Popup.current.isPaused = null;
            
            Popup.isOpen = false;
            Popup.current = null;
            Popup.settings = null; 
            Popup.group = null;  
        },
        next: function() {
            var index = Popup.current.index,
                count = Popup.group.length;
            console.log(index);
            index += 1;
            if (index >= count) {
                index = 0;
            }

            index = index % count;
            Popup.current.index = index;
            console.log(Popup.current.index);

            Popup.show({}, index);
        },
        prev: function() {
            var index = Popup.current.index,
                count = Popup.group.length;
            index -= 1;
            if (index < 0) {
                index = count - 1;
            }
            index = index % count;
            Popup.current.index = index;
            Popup.show({}, index);
        },
        //cancel iamge loading or abort ajax request
        cancel: function(){
            Popup._hideLoading();
            if (Popup.photo) {
                Popup.photo.onload = Popup.photo.onerror = null;
            }
            if (Popup.ajax) {
                Popup.ajax.abort();
            }
            Popup.ajax = null;
        },
        RegisterType: function(name,options) {
            Popup.types[name] = {};
            Popup.types[name].initialize = function() {
                options.initialize(Popup.current);
            };

            Popup.types[name].load = function() {
                if(options.extends) {
                    Popup.types[options.extends].load();
                } else {
                    alert('you need set extends for options');
                }
            };
        },
        setDefaultSkin: function(name) {            
            Popup.defaultSkin = name;
        },
        registerComponent:function(name,options) {
            alert('componennt');
            Popup.components[name] = {};
            Popup.components[name]['isUse'] = false;
            Popup.components[name].onReady = function() {
                Popup.$custom.append($(options.html).css({
                    'position': 'absolute',
                    'display': 'block'
                }));
                if (typeof options.func == "function") {
                    options.func();
                }
            }
        },
        update: function() {
            Popup.show({},Popup.current.index);
        },
        destroy: function() {
            Popup.$overlay.remove();
            $(window).unbind('resize');
            Popup = null;
        },
        getCurrent: function() {
            return Popup.current.index;     
        },
        hasNext: function() {
            if(Popup.group && Popup.current.index < Popup.group.length-1) {
                return true;
            } else {
                return false;
            }
        },
        play: function() {
            slider.play();
        },
        pause: function() {
            slider.pause();
        },
        isPaused: function() {
            return Popup.current.isPaused;
        },
        isPopOut: function() {
            return Popup.isOpened;
        },
        jumpto: function(index) {
            if(index<0 && index >Popup.group.length-1) {
                index = 0;
            }
            Popup.show({},index);
        },
        dimensions: function() {
            var rez = {
                width: Popup.current.width,
                height: Popup.current.height,
            };
            return rez;
        },
        resize: function(w,h) {
            var $content = Popup.$content;
            $content.css({
                'width': w,
                'height': h,
            });
        },
        reposition: function(x,y) {
            var $container = Popup.$container;
            $container.css({
                'top': x,
                'left': y,
            });
        },
        rotate: function(angle) {
            var rotation,costheta,sintheta,scale,transform,
                width = $('.popup-content').width(),
                height = $('.popup-content').height();             

            if (Popup.photo == undefined) {
                return false;
            } 

            if (!Popup.angle) {
                Popup.angle = 0;
            } 
            Popup.angle = Popup.angle + angle;

            if (Popup.angle >= 0) { 
                rotation = Math.PI * Popup.angle / 180; 
            } else { 
                rotation = Math.PI * (360+Popup.angle) / 180; 
            } 

            costheta = Math.round(Math.cos(rotation) * 1000) / 1000; 
            sintheta = Math.round(Math.sin(rotation) * 1000) / 1000;  
     
            Popup.photo.style.filter = "progid:DXImageTransform.Microsoft.Matrix(M11="+costheta+",M12="+(-sintheta)+",M21="+sintheta+",M22="+costheta+",SizingMethod='auto expand')"; 

            if ((Popup.angle / 90) % 2 == 1 || (Popup.angle / 90) % 2 == -1) {
                if (width > height) {
                    scale = height / width;
                } else if (width < height) {
                    scale = width / height;
                }
            } else {
                scale = 1;
            }

            transform = 'rotate(' +Popup.angle +'deg)'+' '+'scale('+scale+')';

            $(Popup.photo).css({
                '-moz-transform'   : transform,
                '-webkit-transform': transform,
                '-o-transform'     : transform,
            });

            console.log(Popup.angle);   
        },
    });

    //
    //below object contains basic method and defaults for extending effect.
    //
    Popup.transitions = {
        defaults: {
            openSpeed: 250,
            openEasing: 'swing',
            openMethod: 'zoom',

            closeSpeed: 250,
            closeEasing: 'swing',
            closeMethod: 'zoom',
        },
        step: function(now,fx) {},
        getPosition: function(x,y) {

        }
    };

    Popup.types = {
        image: {
            match: function(url) {
                return url.match(/\.(png|PNG|jpg|JPG|jpeg|JPEG|gif|GIF)$/i);
            },
            load: function() {
                var img = Popup.photo = new Image();

                img.onload = function() {
                    var width = img.width,
                        height = img.height;
                    this.onload = this.onerror = null;

                    Popup.current.width = width;
                    Popup.current.height = height;

                    Popup.current.aspect = width / height;
                    Popup.current.autoSize = true;

                    Popup.current.content = img;

                    Popup._hideLoading();

                    Popup._afterLoad();
                };
                img.onerror = function() {
                    alert('error');
                    this.onload = this.onerror = null;
                    return "can't find Image !";
                };
                img.src = Popup.current.url;

                if (img.complete === undefined || !img.complete) {
                   Popup._showLoading();
                }
            },
            imgPreLoad: function() {
                var group = Popup.group,
                    count = group.length,
                    obj;
                for (var i = 0; i < count; i += 1) {
                    obj = group[i];
                    new Image().src = obj.url;
                }
            }
        },
        iframe: {
            match: function(url) {
                
                if (url.match(/youtube\.com\/watch\?v\=(\w+)(&|)/i)||url.match(/vimeo\.com\/(\d+)/i)||url.match(/vid\.ly\/(\d+)/i)||url.match(/\.(ppt|PPT|tif|TIF|pdf|PDF)$/i)) {
                    return true;
                }
            },
            load: function() {
                var $iframe, iframe = {
                    'width': '100%',
                    'height': '100%',
                    'border': 'none'
                };
                $iframe = Popup._makeEls('iframe', 'popup-content-iframe', iframe);

                Popup.$iframe = $iframe.attr('src', Popup.current.url);
                Popup.current.content = Popup.$iframe;

                Popup._afterLoad();
            }
        },
        swf: {
            match: function(url) {   
                           
                return url.match(/\.(swf)((\?|#).*)?$/i);
            },
            load: function() {
                var $object, $swf, object = {
                    'classid': 'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000',
                    'codebase': 'http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,29,0',
                    'width': '100%',
                    'height': '100%'
                },
                swf = {
                    'allowscriptaccess': 'always',
                    'allowfullscreen': 'true',
                    'wmode': 'transparent',
                    'type': 'application/x-shockwave-flash',
                    'src': Popup.current.url
                };

                $object = Popup._makeEls('object', 'popup-content-object', swf);
                $object.append($('<param value="http://www.adobe.com/jp/events/cs3_web_edition_tour/swfs/perform.swf" name="movie"><param value="transparent" name="wmode"><param value="true" name="allowfullscreen"><param value="always" name="allowscriptaccess">'))

                $swf = $('<embed></embed>').css({
                    'width': '100%',
                    'height': '100%'
                }).attr(swf);
                $swf.appendTo($object);

                Popup.current.content = Popup.$swf = $object;

                Popup._afterLoad();
            }
        },
        //ajax need user to set type and dataType manually
        ajax: {
            load: function() {
                var content,current = Popup.current;
                Popup.ajax = $.ajax($.extend({},current.ajax,{
                    url: current.url,
                    error: function() {
                        alert('ajax load fail !');
                        Popup._hideLoading();
                    },
                    success: function(data,textStatus) {
                        if (textStatus === 'success') {
                            Popup._hideLoading();

                            // proceed data
                            if (current.selector) {
                               content = $('<div>').html(data).find(current.selector); 
                            } else {
                                content = data;
                            }

                            current.content = $('<div>').addClass('popup-content-inner').css({'width':'100%','height':'100%','overflow':'scroll'}).html(content);
                            Popup._afterLoad();
                        }
                    }
                }));
            }
        },
        inline: {
            match: function(url) {
                
                return url.charAt(0) == "#";
            },
            load: function() {
                var $inline = $(Popup.current.url).clone().css({
                    'display': 'block'
                });

                Popup.current.content = $('<div>').addClass('popup-content-inner').css({'width':'100%','height': '100%'}).html($inline);
                Popup._afterLoad();
            }
        },   
    };

    Popup.sliderEffect = {
        defaults: {
            sliderSpeed: 250,
            sliderEasing: 'swing',
            sliderMethod: 'zoom',
        },
    };

    Popup.components = {};

    // skin Option: 
    // controls => holderWidth,holderHeight,minTop,minLeft,ui
    // thumbnail => count,unitWidth,unitHeight,bottom,left,padding,gap
    // save these value on Popup.current.skinSetting
    Popup.skins = {
        custom: {
            holderWidth: 0,
            holderHeight: 80,

            minTop: 40,
            minLeft: 10,

            controls: {
                ui: 'outside',
            },
        },
        whiteBorder: {        
            holderWidth: 10,
            holderHeight: 120,

            minTop: 20,
            minLeft: 20,

            controls: {
                ui: 'inside',
            },

            thumbnails: {
                count: 5,

                bottom: 10,
                left: 0,
                padding: 2,
            },
        },
    }

    //
    // here you can add your custom transition & slider effect  , types , components 
    //

    //transitions
    Popup.transitions.zoom = {
        defaults: {
            openSpeed: 150,
            closeSpeed: 150,
        },       
        openEffect: function(opts) {            
            console.log(Popup.current.element);
            alert('openEffect');

            var el = Popup.current.element,
                origin, startPos,endPos;
            origin = $(el).find('img').filter(':first');
            console.log(origin);
        },
        closeEffect: function() {},
    };
    Popup.transitions.fade = {
        defaults: {
            openSpeed: 500,
            closeSpeed: 500,
        },
        openEffect: function(){
            var opts = $.extend({},this.defaults,Popup.current.transitionEffect);
            if (Popup.isOpen) {
                return
            }
            if (Popup.$overlay) {
                Popup.$container.css({'display': 'block'});
                Popup.$overlay.fadeIn(opts.openSpeed);
            } else {
                Popup.$container.fadeIn(opts.openSpeed);
            }
        },
        // closeEffect need callback function to close popup
        closeEffect: function() {
            var opts = $.extend({},this.defaults,Popup.current.transitionEffect);
            if (!Popup.isOpen) {
                return
            }
            if (Popup.$overlay) {
                Popup.$overlay.fadeOut(opts.closeSpeed,Popup.close);
            } else {
                Popup.$container.fadeOut(opts.closeSpeed,Popup.close);
            }
        },
    };

    //slider
    Popup.sliderEffect.fade = {
    }; 

    //types
    Popup.types.vhtml5 = {
        defaults: {
            preload: "load",
            controls: "controls",
            width: "320",
            height: "240",
            mp4: {
                type: "video/mp4; codecs=avc1.42E01E, mp4a.40.2",
            },
            webm: {
                type: "video/webm; codecs=vp8, vorbis",
            },
            ogv: {
                type: "video/ogg; codecs=theora, vorbis",
            }
        },
        match: function(url) {
            return url.match(/\.(mp4|webm|ogv)$/i);
        },
        load: function() {
            var $video,$source,$object,url,index,type;
            $video = makeEls('video','popup-content-video');
            $video.attr({
                'width': Popup.current.vhtml5.width,
                'height': Popup.current.vhtml5.height,
                'preload':Popup.current.vhtml5.preload,
                'controls':Popup.current.vhtml5.controls,
                'poster': Popup.current.vhtml5.poster, 
            });


            url = Popup.current.url.toLowerCase().split(',');

            for(var i=0;i<url.length;i++) {

                index = url[i].lastIndexOf(".")+1;
                type = url[i].slice(index);

                $source = makeEls('source');
                $source.attr({
                    'type':Popup.current.vhtml5[type].type,
                    'src': url[i]
                }); //不可以的话，去掉type。
                $source.appendTo($video);
            }

            $object = makeEls('object');
            $object.attr({
                'classid': 'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000',
                'codebase': 'http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,29,0',
                'width': '100%',
                'height': '100%'
            });

            // url = Popup.current.url.toLowerCase();
            // index = url.lastIndexOf(".")+1;
            // type = url.slice(index);
            // $source = makeEls('source');
            // $source.attr({
            //     'type': Popup.current.vhtml5.format || Popup.current.vhtml5[type].type,
            //     'src': url,
            // });
            // $source.appendTo($video);
            Popup.current.content = $video;
            afterLoad();
        }
    };

    //components 
    Popup.components.overlay = {
        defaults: {},
        opts: {},
        onReady: function() {  
            if (!this.$overlay) {
                this.create();
            }
            this.open();
        },
        create: function() {
            var $overlay = Popup._makeEls('div', 'popup-overlay').appendTo('body');
            $overlay.on('click', function(event) {
                if($(event.target).is('.popup-overlay')) {
                    Popup.close();
                    return false;
                }                             
            }).css({
                'position': 'fixed',
                'top': 0,
                'left': 0,
                'width': '100%',
                'height': '100%',
            });
            Popup.$overlay = $overlay;
        },
        open: function() {
            Popup.$overlay.css({

                'display': 'none',

                'position': 'fix',
                'top': 0,
                'left': 0,

                'width': '100%',
                'height': '100%',                
            });
        },
        close: function() {
            Popup.$overlay.remove();
        }
    };   
    Popup.components.controls = {
        defaults: {
            slider: true,
            ui: 'outside',
            autoPlay: false,
            action: false,
        },
        opts: {},
        active: false,

        onReady: function() {
            if(Popup.current.skin) {
                this.opts = $.extend({},this.defaults,Popup.current.skinSetting.controls);
            } else {
                this.opts = this.defaults;
            }

            console.log(Popup.current.skinSetting.controls)
            console.log(this.opts);
            
            if (!Popup.group) {
                return
            }

            this.create();           
            this.open();
            this.active = true;
        },
        create: function() {
            var self = this,
                $prev = Popup._makeEls('div','popup-controls-prev'),
                $next = Popup._makeEls('div','popup-controls-next'),
                $close = Popup._makeEls('div','popup-controls-close'),
                $play = Popup._makeEls('div','popup-controls-play'),
                bindEvents = function() {
                    if(self.opts.action || self.opts.autoPlay) {
                        Popup.$content.on('click',function() {
                            if (Popup.current.isPaused === true) {
                                slider.play();
                            }
                            if (Popup.current.isPaused === false) {
                                slider.pause();
                            }
                        });
                    }
                    if(self.opts.action) {
                        Popup.$content.on('click',function() {
                            play();
                        });
                    }

                    //bind slider button event
                    $prev.on('click', function() {
                        Popup.prev();
                        return false;
                    });
                    $next.on('click', function() {
                        Popup.next();
                        return false;
                    }); 

                    //bind close button event
                    $close.on('click', function() {
                        Popup.close();
                        return false;
                    });
                }

            Popup.$controls.append($prev,$play,$next,$close);

            $.extend(Popup,{
                $prev: $prev,
                $next: $next,
                $close: $close,
                $play: $play,
            });

            //optional ui
            if (self.opts.ui == 'outside') {
                Popup.$prev.css({
                    'position': 'fixed',
                });
                Popup.$next.css({
                    'position': 'fixed',
                });
            } else if (self.opts.ui == 'inside') {
                Popup.$prev.css({
                    'position': 'absolute',
                });
                Popup.$next.css({
                    'position': 'absolute',
                });
            }

            bindEvents();
        },
        open: function() {
            if (this.opts.autoPlay) {
                Popup.$play.css({'display': 'block'});
                Popup._slider.play();
            }
        },
        close: function() {
            Popup.$controls.remove();
            this.active = false;
        },
        resize: function(rez) {
            var top,left;
            if (!this.active || this.opts.ui !== 'outside') {
                return
            }


            top = (rez.winHeight - rez.holderHeight)/2;
            left = (rez.winWidth -rez.containerWidth)/4;

            console.log(top)
            console.log(left)

            Popup.$prev.css({
                'position': 'fixed',
                'top': top,
                'left': left,
            });
            Popup.$next.css({
                'position': 'fixed',
                'top': top,
                'right': left,
            });
        }
    };
    Popup.components.thumbnails = {
        defaults: {
            count: 5,

            unitWidth: 80,
            unitHeight: 80,
            bottom: 16,
            left: 0,
            padding: 0, //for border
            gap: 20,
        },
        opts: {},
        $thumbnails: null,
        $thumHolder: null,
        $inner: null,

        visualWidth: null,

        onReady: function() {

            if (!Popup.group || Popup.current.type !== 'image') {
                return
            }

            //for mobile
            if (Popup.isMobile) {
                Popup.current.skinSetting.holderWidth = 0;
                Popup.current.skinSetting.holderHeight = 0;
            }
            
            this.opts = $.extend({},this.defaults,Popup.current.skinSetting.thumbnails);            
           
            this.create();
        },
        create: function() {
            var top, visualWidth,totalWidth,
                unitWidth = this.opts.unitWidth,
                unitHeight = this.opts.unitHeight,
                bottom = this.opts.bottom,
                left = this.opts.left,
                padding = this.opts.padding,
                gap = this.opts.gap,
                count = this.opts.count,
                group = Popup.group,
                $thumbnails = $('<div>').addClass('popup-thumbnails'),
                $leftButtom = $('<a href="#">').addClass('popup-thumbnails-left'),
                $rightButtom = $('<a href="#">').addClass('popup-thumbnails-right'),
                $thumHolder = $('<div>').addClass('popup-thumbnails-holder'),
                $inner = $('<div>').addClass('popup-thumbails-inner').appendTo($thumHolder),
                moveEvent = function(direction) {
                    var left =  $inner.css('left');

                    totalWidth = $inner.width();
                    left = parseInt(left);

                    if (direction == 'left') {
                        $inner.css({
                            'left': left-visualWidth<0? 0: (left-visualWidth),
                        });
                    } else {
                        $inner.css({
                            'left': -(left+visualWidth>totalWidth-visualWidth? totalWidth-visualWidth:left+visualWidth),
                        });
                    }
                }

            $.each(Popup.group,function(i) {
                var url = Popup.group[i].url;
                $('<img />').attr('src', url).appendTo($('<a href="#">').appendTo($inner)); 
            });

            count = count > group.length? group.length:count; 
            visualWidth = count * (unitWidth+2*padding) + (count-1)*gap;

            //set necessary css style
            $inner.css({
                'position': 'absolute',
                'width': group.length * (unitWidth+2*padding) + (group.length-1)*gap,
            });

            $thumHolder.css({
                'display':'inline-block',
                'position':'relative',
                'width': visualWidth,
                'height': unitHeight + 2* padding,
            });

            $thumbnails.css({
                'position': 'fixed',
                'bottom': bottom,
                'left': left,
                'text-align': 'center',
            }).append($leftButtom,$thumHolder,$rightButtom);

            $thumbnails.appendTo(Popup.$container);

            //bind click to thumb buttom 
            $leftButtom.on('click',function() {
                moveEvent('left');
                return false;
            });
            $rightButtom.on('click',function() {
                moveEvent('right');
                return false;
            });
            $inner.children().on('click',function() {
                var index = $inner.children().index(this);
                Popup.show({},index);
            });

            //save var to obj
            this.$thumbnails = $thumbnails;
            this.$thumHolder = $thumHolder;   
            this.$inner = $inner;
            this.visualWidth = visualWidth;        
        },
        open: function(index) { 
            var gallery = Popup.group;
            this.$inner.children().removeClass('popup-thumbnails-active').eq(index).addClass('popup-thumbnails-active');
        },
        afterLoad: function() {
            var index = Popup.current.index;

            if (!Popup.group || Popup.current.type !== 'image') {
                return
            }
            
            this.open(index); 
            this.resetPosition(index);           
        },

        //L:the distance from start to index of img,
        //v: visualWidth, unit: the length of every img including gap
        //left = left+(L-w)>0? -(L-w): left,
        //left = left+L<0? -(L-unit): left,
        resetPosition: function(index) {
            var inner = this.$inner,
                visualWidth = this.opts.visualWidth,
                length = (index +1)*(this.opts.unitWidth+2*this.opts.padding) + index*this.opts.gap,
                left = parseInt(inner.css('left'));

            if (left+length-visualWidth > 0) {
                left = visualWidth - length;
            } else if (left + length < 0) {
                left = this.opts.unitWidth + 2*this.opts.padding - length;
            }

            inner.css({
                'left': left,
            });
        }
    };
    Popup.components.title = {
        $title: null,
        onReady: function() {
            if (!Popup.current.title) {
                return
            }
            this.create();
        },
        create: function() {
            var $title = $('<span>').addClass('popup-info-title');
            $title.appendTo(Popup.$info).text(Popup.current.title);
            this.$title = $title;
        },
        afterLoad: function() {
            if (!this.$title) {
                this.create();
            } else {
                this.$title.text(Popup.current.title);
            }           
        },
        close: function() {
            this.$title = null;
        }
    };
    Popup.components.count = {
        $count: null,
        total: null,
        onReady: function() {
            if (!Popup.group) {
                return
            }
            this.create();
        },
        create: function() {
            var $count = $('<span>').addClass('popup-info-count'),
                total = Popup.group.length,
                current = Popup.current.index+1;
            $count.appendTo(Popup.$info).text(current+"/"+total);
            this.$count = $count;   
            this.total = total; 
        },
        afterLoad: function() {
            var current = Popup.current.index+1;
            if (!Popup.group) {
                return
            }
           
            this.$count.text(current+"/"+this.total);           
        }
    };
    Popup.components.social = {
        defaults: {
            facebook: true,
            twitter: true,
        },
        opts: {},
        onReady: function() {
            this.opts = $.extend({},Popup.defaults,Popup.current.components.social);
            this.create();
        },
        create: function() {
            var $social = $('<div>').addClass('popup-info-social');
            for(var i in this.opts) {
                if (this.opts[i] == true) {

                }
            }
        },
        afterLoad: function() {},
        fackbook: function() {},
        twitter: function() {},
    };
    
    // jQuery plugin initialization 
    $.fn.Popup = function(options) {
        var self = this;
        Popup.elements = $(self);
        return self.each(function() {
            if (!$.data(self, 'popup')) {
                $.data(self, 'popup', new Popup(self, options));
            }
        });
    };
})(jQuery, document, window);



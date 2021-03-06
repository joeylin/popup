;
(function($, document, window, undefined) {
    // Optional, but considered best practice by some
    "use strict";

    var
    //waiting to use
    singleTon = function(fn) {
        var result;
        return function() {
            return result || (result=fn.apply(this,arguments));
        }
    },
    events = function() {
        var listen,log,one,remove,trigger,self,
            obj = {};
        self = this;
        listen = function(key,eventfn) {
            var stack,_ref;
            stack = (_ref = obj[key])!=null? _ref : obj[key]=[];
            return stack.push(eventfn);
        };
        one = function(key,eventfn) {
            remove(key);
            return listen(key,eventfn);
        };
        remove = function(key) {
            var _ref;
            return (_ref = obj[key])!=null? _ref.length=0: void 0;
        };
        trigger = function() {
            var fn,stack,i,_len,_ref,key;
            key = Array.prototype.shift.call(arguments);
            stack = (_ref = obj[key])!=null? _ref: obj[key]=[];
            _len = stack.length;
            for (i=0;i<_en;i++) {
                fn = stack[i];
                if (fn.apply(self,arguments) == false) {
                    return false;
                }
            }
        };
        return {
            listen: listen,
            one: one,
            remove: remove,
            trigger: trigger
        }
    },

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
            maxWidth: 9999,
            maxHeight: 9999,

            playSpeed: 1500,

            autoSize: false,
            autoPlay: false, //open autoplay
            action: false, // taggle to autoplay by click

            isPaused: false,

            tuning: {
                width: 0,
                height: 0
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

        //
        //privite method
        //
        _init: function(element,options) {
            alert('init');
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

            if (metas.options) {
                metas.options = string2obj(metas.options);
            }

            if (metas.groupoptions) {
                $.extend(true,metas.options,string2obj(metas.groupoptions));
            } 

            if(!options) {
                options = {};
            }

            Popup.options = {};
            $.extend(true,Popup.options,Popup.defaults, options, metas.options || metas); //要修改

            //build Popup.group object
            index = count>=2 ? group.index(self) : 0;
            url = $self.attr('href');

            Popup.settings = $.extend({}, Popup.options, {
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
            var $container,$content,
                aspect     = Popup.current.aspect, 
                type       = Popup.current.type,
                bindEvents = function() {
                    //binding resize event on window
                    $(window).on('resize',function() {
                        resize();
                        return false;
                    });

                    $popup.on('click', function(event) {
                        if($(event.target).is('.popup-overlay')) {
                            Popup.close();
                            return false;
                        }                             
                    });
                    $prev.on('click', function() {
                        Popup.prev();
                        return false;
                    });
                    $next.on('click', function() {
                        Popup.next();
                        return false;
                    });
                    $close.on('click', function() {
                        Popup.close();
                        return false;
                    });
                     // Key Bindings
                    if(Popup.current.keys && !Popup.isOpen) { 
                        $(document).bind('keypress.popup',function(e){
                            var key = e.keyCode;
                            console.log(e);
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
                console.log('transitions');

                //create container and adding to body
                $container = makeEls('div', 'popup-container');
                $content = makeEls('div', 'popup-content').appendTo($container);
                Popup.$contaner = $container;
                Popup.$content = $content;

                $container.appendTo('body');

                
                //trigger the component registered on helper object
                trigger('onReady');

                //binding event
                bindEvents();

                //trigger open transition
                Popup.current.transition && Popup.transitions[Popup.current.transition]['onOpen'](Popup.current); 
            }

            if (Popup.group && Popup.group[1] && Popup.current.autoPlay) {
                this._slider.play();
            }                      

            if (!Popup.current.autoSize) {
                aspect = null;
            }

            $.extend(Popup.current, {
                width: width,
                height: height,
                aspect: aspect
            });

            Popup.$content.append(Popup.current.content);

            if (type=="image" && Popup.group && Popup.group.length >= 2) {
                types.image.imgPreLoad();
            }
           

            //根据载入的css样式，重新计算需要定位的大小
            Popup.current.tuning.width = Popup.$container.outerWidth() - Popup.$content.width();
            Popup.current.tuning.height = Popup.$container.outerHeight() - Popup.$content.height();
            
            resize();
            hideLoading();

            console.log(Popup.current);

            Popup.current.autoSize = false;
            Popup.current.title = null;
            Popup.current.type = null;
            Popup.angle = null; //可以放在这里是因为旋转是在用户点击的时候才执行，因此在旋转期间没有执行到这里，变量不会被销毁。

            Popup.settings = {};
            // Popup.photo = null;
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
            var current = Popup.current,
                maxWidth = $(window).width(),
                maxHeight = $(window).height(),
                tuningWidth = parseInt(Popup.current.tuning.width),
                tuningHeight = parseInt(Popup.current.tuning.height),
                // minWidth = Popup.current.minWidth,
                // minHeight = Popup.current.minHeight,
                width, height, obj,top,left;

            width = parseInt(current.width);
            height = parseInt(current.height);

            if (current.aspect) {

                if (width > maxWidth * 0.8 - tuningWidth) {
                    width = maxWidth * 0.8 - tuningWidth;
                    height = width / current.aspect;
                }
                if (height > maxHeight * 0.8 -tuningHeight) {
                    height = maxHeight * 0.8 - tuningHeight;
                    width = height * current.aspect;
                }
            } else {
                if (width > maxWidth * 0.8 - tuningWidth) {
                    width = maxWidth * 0.8 - tuningWidth;
                }
                if (height > maxHeight * 0.8 - tuningHeight) {
                    height = maxHeight * 0.8 - tuningHeight;
                }
            }

            obj = {
                'width': width,
                'height': height,
            };

            Popup.$content.css(obj);

            left = (maxWidth - width - tuningWidth) / 2;
            top = (maxHeight - height - tuningHeight) / 2;

            if (top < 0) {
                top = 0;
            }
            if (left < 0) {
                left = 0;
            }

            Popup.$container.css({
                'top': top,
                'left': left
            });
        },
        _rePosition: function() {
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
        _trigger: function() {
            var help, helps = M.helps;
            for (var help in helps) {
                helps[help][event]();
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

            $loading = makeEls('div','popup-loading');
            $loading.appendTo(Popup.$container);
        },
        _hideLoading: function() {
            $(document).unbind('keypress.loading');
            $('.popup-loading').remove();
        }

        //
        //adding public Method
        //
        show: function(contents, options) {
            var previous = Popup.current,
                toString = Object.prototype.toString,
                options, current, index, url, obj, type
                $container,$content;

            if (!Popup.settings || Popup.isOpen) { //slider中每一张的切换也要重新读取默认值再做判断。
                Popup.settings = {};
                $.extend(true,Popup.settings, Popup.defaults);
                console.log(Popup.settings);

            }
            console.log(Popup.defaults);
            if (toString.apply(options) === '[object Object]' || options == undefined) {
                options = options || {};
            } else if (!isNaN(options)) {
                index = options;
                options = {};
            }

            if (toString.apply(contents) === '[object Array]' && !Popup.isOpen) {
                var count = contents.length,
                    i = 0;
                Popup.group = [];
                for (i; i < count; i++) {
                    obj = {};
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

            if (Popup.group && Popup.group.length >= 2) {
                if (arguments.length == 2 && toString.apply(arguments[1]) === '[object Number]') {
                    console.log(index);
                    obj = Popup.group[index];
                    $.extend(Popup.current, obj);
                    Popup.current.index = index;
                }
                Popup.slider = true;
            }

            // trigger types verifaction.
            for (var i in Popup.types) {
                if (Popup.types[i].match && Popup.types[i].match(current.url)) {
                    type = v;
                    return false;
                }
            }

                        
            type = current.type || type;
            Popup.current.type = type;

            //initialize custom type register
            types[type].initialize && types[type].initialize();

            types[type].load();          
        },
        close: function() {
            var component;

            //if already closed ,return
            if (!Popup.isOpen) {
                return
            }

            Popup.cancel();

            //unbind event
            $(window).unbind('resize');
            $(document).unbind('keypress.popup');

            //trigger close transition
            Popup.current.transition && Popup.transitions[Popup.current.transition]('onClose');

            //trigger to remove the component registered on helper object
            trigger('close');
            Popup.$container.remove();

            Popup.slider = false;
            Popup.current.isPaused = null;
            
            Popup.isOpen = false;
            Popup.current = {};
            Popup.settings = null; //如果设置为{}，！{}值为false，{}也代表存在
            Popup.options = {};
            Popup.group = {}; //好处在于slider中，不会保留上一次的group信息。  
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
            hideLoading();
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
            components[name] = function() {

                $('.popup-custom').append($(options.html).css({
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
        }
    });

    //
    //below object contains basic method  and defaults.
    //
    Popup.transitions = {
        defaults: {
            openSpeed: 250,
            openEasing: 'swing',
            openMethod: 'zoom',

            closeSpeed: 250,
            closeSpeed: 'swing',
            closeSpeed: 'zoom',
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

                    Popup.current.content = img;

                    hideLoading();

                    Popup._afterLoad();
                };
                img.onerror = function() {
                    alert('error');
                    this.onload = this.onerror = null;
                    return "can't find Image !";
                };
                img.src = Popup.current.url;

                if (img.complete === undefined || !img.complete) {
                   showLoading();
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
                $iframe = makeEls('iframe', 'popup-content-iframe', iframe);

                Popup.$iframe = $iframe.attr('src', Popup.current.url);
                Popup.current.content = Popup.$iframe;

                afterLoad();
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

                $object = makeEls('object', 'popup-content-object', swf);
                $object.append($('<param value="http://www.adobe.com/jp/events/cs3_web_edition_tour/swfs/perform.swf" name="movie"><param value="transparent" name="wmode"><param value="true" name="allowfullscreen"><param value="always" name="allowscriptaccess">'))

                $swf = $('<embed></embed>').css({
                    'width': '100%',
                    'height': '100%'
                }).attr(swf);
                $swf.appendTo($object);

                Popup.current.content = Popup.$swf = $object;

                afterLoad();
            }
        },
        //ajax need user to set type and dataType manually
        ajax: {
            load: function() {
                var current = Popup.current;
                Popup.ajax = $.ajax($.extend({},current.ajax,{
                    url: current.url,
                    error: function() {
                        alert('ajax load fail !');
                        hideLoading();
                    },
                    success: function(data,textStatus) {
                        if (textStatus === 'success') {
                            hideLoading();
                            current.content = $('<div>').addClass('popup-content-inner').html(data);
                            afterLoad();
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

                Popup.current.content = $('<div>').addClass('popup-content-inner').html($inline);
                afterLoad();
            }
        },
        vhtml5: {
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
        }      
    };

    Popup.sliderEffect = {
        defaults: {
            sliderSpeed: 250,
            sliderSpeed: 'swing',
            sliderSpeed: 'zoom',
        },

    };

    //
    // here you can add your custom transition & slider effect and types
    //
    Popup.transitions.zoom = {
        defaults: {
            openSpeed: 150,
            closeSpeed: 150,
        },       
        openEffect: function(opts) {
            
            console.log(Popup.current.element);
            alert('openEffect')
        },
        closeEffect: function() {},
    };
    Popup.sliderEffect.fade = {

    }; 
    Popup.types.gDoc = {
        match: function() {},
        load: function() {},
    };
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
        match: function() {},
        load: function() {},
    };

    //
    //helper function used to extend component
    //
    Popup.helper.overlay = {
        defaults: {            
        },
        onReady: function(opts) {
            if (!this.$overlay) {
                this.create();
            }
        },
        create: function() {

        },
        open: function(opts) {},
        close: function() {
            Popup.$overlay.remove();
        }
    };   
    Popup.helper.controls = {
        defaults: {
            slider: true,
            ui: 'inside',
        },
        onReady: function(opts) {
            if (!this.controls) {
                this.create();
            }
            this.open(opts);
        },
        create: function() {

        },
        open: function(opts) {
            if(Popup.current.action || Popup.current.autoPlay) {
                Popup.$content.on('click',function() {
                    if (Popup.current.isPaused === true) {
                        slider.play();
                    }
                    if (Popup.current.isPaused === false) {
                        slider.pause();
                    }
                });
            }
            if(Popup.current.action) {
                Popup.$content.on('click',function() {
                    play();
                });
            }
            if (Popup.slider == true) { //这是通过display = block 来开启注册的，所以slider点击时不会重复添加。
                Popup.$prev.add(Popup.$next).css({
                    display: 'block'
                });  
            } 
        }
    };
    Popup.helper.loading = {
        show: function() {
            var $loading;
            this.hide();
            // If user will press the escape-button, the request will be canceled
            $(document).on('keypress.loading',function() {
                if ((e.which || e.keyCode) === 27) {
                    Popup.cancel();
                    return false;
                }
            });

            $loading = makeEls('div','popup-loading');
            $loading.appendTo(Popup.$container);
        },
        hide: function() {
            $(document).unbind('keypress.loading');
            $('.popup-loading').remove();
        }
    };
    Popup.helper.thumbnails = {};
    Popup.helper.title = {};

    
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



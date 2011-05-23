/* 
 * Gianluca Esposito tilt2k@gmail.com
 * If you find this tool useful please donate at the address above, it'll help to start a start-up!
 */
(function($){
    // jQuery events
    $().ready(function() {
        // Display home content
        $("iframe#loader").hide();
        
        $("#home").addClass("show");

        $("#menu_left").addClass("show");
        $("#menu_right").addClass("show");
        
        $("#scroll_left").addClass("show fontText sizeB size100");
        $("#scroll_right").addClass("show fontMenu sizeB size100");
        
        // Reset view, Reload bug on FF?
        $("#source").scrollLeft(0); 
        
        // Menu builder
        get.xml(settings.rss);
        option.build();
    });
    
    $("div#list a.menuItem").live('click', function(evt) {
        $("#home").removeClass("show");
        reader.spinner('on');
        
        var url = $(this).attr('href');
        // txt select * from html where url="http://lib.store.yahoo.net/lib/paulgraham/acl1.txt"
        if (url.search(/htm/i) != -1) {
            get.html(url);
        } else {
            url = url.replace(/http:\/\/www.paulgraham.com\//, ''); // Fixes RSS feed
            get.other(url);
        }

        $("iframe#loader").attr('src', url); // Load paulgraham.com to hit impression
        evt.preventDefault();
    });
    $("div#list a.menuNav").live('click', function(evt) {
        var $element = $("div#list .menuList");
        
        switch ($(this).parents("ul").attr('class')) {
            case "menuNext":
                nav.scroll($element, "Next");
                evt.preventDefault();
                break;
            case "menuPrev":
                nav.scroll($element, "Prev");
                evt.preventDefault();
                break;
            default:
                evt.preventDefault();
                break;
        }
    });
    $("div#option a.menuOption").live('click', function(evt) {
        // Bugged selector?
        var left, size, option = $(this).text();
        console.log(option);
        
        switch (option) {
            case "Next Page":
                left = $("#source").scrollLeft();
                size = $("#source").innerWidth();
                $("#source").scrollLeft(left + size);
                evt.preventDefault();
            break;
            case "Prev Page":
                left = $("#source").scrollLeft();
                size = $("#source").innerWidth();
                size = -size;
                $("#source").scrollLeft(left + size);
                evt.preventDefault();
            break;
            case "Full View":
                //toggle
                $("div#main").css("height", "auto");

                $("div#scroll_left").removeClass("show");
                $("div#scroll_right").removeClass("show");

                $("div#reader").css("height", "auto");

                $("div#source").removeClass("col");
            break;
            default:
                evt.preventDefault();
            break;
        }
    });
    $("div#scroll_left, div#scroll_right").live('click', function(evt) {
        var left, size, option = $(this).text();
        left = $("#source").scrollLeft();
        size = $("#source").innerWidth();
                
        switch (option) {
            case "<":
                size = -size;
                $("#source").scrollLeft(left + size);
                evt.preventDefault();
            break;
            case ">":

                $("#source").scrollLeft(left + size);
                evt.preventDefault();
            break;
            default:
                evt.preventDefault();
            break;
        }
    });
    $("div#source a.noteLink").live("mouseover mouseout", function(evt) {
        if ( evt.type == "mouseover" ) {
            console.log("note")
            var number = $(this).text;
            reader.note(number, evt.pageX, evt.pageY);
        } else {
            reader.note();
        }
    });
    
    // Cross-Origin Resource Sharing workarounds
    var get = {
        xml: function(setting) {
            $.ajax({
                type: "GET",
                url: "http://query.yahooapis.com/v1/public/yql",
                data: "q=select%20*%20from%20rss%20where%20url%3D%22" + encodeURIComponent(setting.url) + "%22",
                dataType: setting.format,
                timeout: setting.timeout,
                success: function(data) { menu.build(data); },
                error: function() { get.rss(settings.alt); } // Fallback to local stored feed
            });
        },
        rss: function(setting, format) {
            $.ajax({
                type: "GET",
                url: setting.url,
                data: setting.data,
                dataType: format,
                timeout: setting.timeout,
                success: function(data) { menu.build(data); },
                error: function() { get.rss(settings.alt); } // Fallback to local stored feed
            });
        },
        html: function(setting) {
            $.ajax({
                // Credits http://icant.co.uk/articles/crossdomain-ajax-with-jquery/error-handling.html
                type: "GET",
                url: "http://query.yahooapis.com/v1/public/yql",
                data: "q=select%20table%20from%20html%20where%20url%3D%22" + encodeURIComponent(setting) + "%22&format=xml&callback=?",
                // Yahoo! Query Language: select * from html where url="" & format=xml
                dataType: 'json',
                success: function(data) { reader.build(data); }
            });
        },
        other: function(setting) {
            $.ajax({
                // Credits http://icant.co.uk/articles/crossdomain-ajax-with-jquery/error-handling.html
                type: "GET",
                url: "http://query.yahooapis.com/v1/public/yql",
                data: "q=select%20*%20from%20html%20where%20url%3D%22" + encodeURIComponent(setting)+ "%22&format=json&callback=?",
                // Yahoo! Query Language: select * from html where url="" & format=xml
                dataType: 'json',
                success: function(data) { reader.display(data); }
            });
        }
    }
    
    // Essays builder
    var reader = {
        build: function(data) {      
            data = reader.parse(data);
            
            var $this = $("#source");
            $this.scrollLeft(0); // Reset view
            $this.html(data);
            
            $this.contents().html(function() {
                var content = $(this).html();
                return $.trim(content);
            }); // Remove whitespaces
            $("#source p:empty").remove(); // Clean empty Paragraphs
            
            // Style dates
            $("h1, p:first").next("p").filter(':contains("January"),:contains("February"),:contains("March"),:contains("April"),:contains("May"),:contains("June"),:contains("July"),:contains("August"),:contains("September"),:contains("October"),:contains("November"),:contains("December")')
            //      .removeClass("fontText").addClass("fontMenu size09 sizeB");
                    .each(function () {
                        var content = $(this).html();
                        $(this).wrap($("<h3>").addClass("fontMenu"))
                                .replaceWith(content);
                    });

            reader.spinner('off');
            reader.paginate(); // Bugged on first build?
        },
        parse: function(data) {
            var $parse = $(data.results[0]).find('td[width="455"], td[width="375"]'); 
            // 121. 113. ... Missing "Related" -^ 2nd table width="455"
            // 58. 44. 40. ... content bugged 
            // 55. header bugged
            // 34. parse error table width="375"
            // 53. 46. notes bugged
            // 16. 15. 13. bugged td bgcolor="#FFFFDD" table width="410"
            // 104. td bgcolor="#cccc99 2xtable bugged
            // essay image header bugged

            // Avoiding virtumundo.com Loading times, Open rate tracker?
            $parse.find('img[src*="http://www.virtumundo.com/"]').remove();
            
            // Image to H1 Title
            // <img hspace="0" height="18" width="126" vspace="0" border="0" alt="*" src="http://ep.yimg.com/ca/I/paulgraham*">
            $parse.find('img[src*="http://ep.yimg.com/ca/I/paulgraham"]').each(function () {
                var content = $(this).attr('alt');
                $(this).wrap($("<h1>").addClass("fontMenu"))
                        .replaceWith(content);
            });

            // Unwrap Paragraphs
            $parse.find('p').each(function() {
                $(this).contents().unwrap();
            });
            
            // Notes
            $parse.find('font[color*="999999"] a').each(function(i) {
                i++;
                $(this).parent("font").replaceWith($("<a>", {
                        "class": "noteLink",
                        html: "(" + i + ")",
                        href: "#"
                    })
                );
            });
            $parse.find('font[color*="000000"]').each(function(i) {
                i++;
                $(this).parent("a").replaceWith($("<a>", {
                        "class": "noteText",
                        html: "(" + i + ")",
                        name: i
                    })
                );
            });
            
            // YC #ff9922 //Etherpad #cccc99
            $parse.find('table[width*="100%"]').wrap($("<p>").addClass("info fontText size11"));
            var style = $parse.find('table[width*="100%"] td').attr('bgcolor');

            switch (style) {
                case "#FF9922":
                    style = "yc";
                    break;
                case "#FFFFDD":
                    style = "quote";
                    break;
                case "#CCCC99":
                    style = "ext";
                    break;
                default:
                    style = "yc";
                    break;
            }
            
            $parse.find('p.info').each(function() {
                $(this).find("strong").contents().unwrap();
                var content = $(this).find("font").html();
                $(this).html(content);
                $(this).addClass(style);
            });
            
            // Strong to H2
            $parse.find('strong').each(function() {
                var content = $(this).html();
                $(this).wrap($("<h2>").addClass("fontMenu"))
                        .replaceWith(content);
            });
            $parse.find('h2').before("<br>").after("<br>"); // Fixes <h2> wrapping in <p>
            
            // Retrieve raw content
            var parse = $parse.html(); 
            // Remove carriage returns, [] Notes
            parse = parse.replace(/\r|\[|\]/g, '');
            // Remove empty [] from old notes
            //parse = parse.replace(/\[|\]/g, '');
            // Remove <p></p> (unmatched paragraphs)
            //parse = parse.replace(/<p>|<\/p>/g, '');
            
            // Font > Break, Font to Paragraph
            // <br>|<br/> Come at pairs, <font size="2" face="verdana"></font>, <font face="verdana" size="2"></font>
            var regExp = /<font[^>]*>|<br>|<\/font>/;
            var i = 0;
            do {
                i++;
                parse = i%2 ? parse.replace(regExp, '<p class="fontText">') : parse.replace(regExp, '</p>');
                search = parse.search(regExp);
            } while (search != -1)

            return parse;
        },
        display: function(data) {
            var $this = $("#source");
            $this.scrollLeft(0); // Reset view

            //data = data.results[0];
            //var parse = data.replace(/<body>|<\/body>|<p>|<\/p>/g, '');
            data = data.query.results.body.p;
            
            // .txt formatting bugged
            $this.html($("<p>").addClass("fontText").html(data));
            reader.spinner('off');
        },
        paginate: function() {
            var $this = $("#source");

            $this.removeClass("col");
            var totalHeight = $this.height(); // Bugged on first build?
            
            $this.addClass("col");
            var height = $this.height();
            
            var pages = Math.ceil(totalHeight / height);
            $this.data('pages', pages);
        },
        spinner: function(toggle) {
            if (toggle == "on") {
                $("body").append($("<div>", {id: "spinner"}));
            } else {
                $("body").children("#spinner").fadeOut().remove();
            }
        },
        note: function(note) {
            // Incomplete
            /*if (note) {
                var note = "(" + note.toString() + ")";
                var $note = $("h2:contains(Notes)");
                $note = $note.nextUntil("p:contains('(3)')");
                var noteText = $note.html();
                $("body").append($("<div>", {id: "note", "class": "fontText", html: noteText}));
            } else {
                $("body").children("#note").fadeOut().remove();
            }*/
            return;
        }
    }

    
    // #list builder
    var menu = {
        build: function(data) {
            $("div#list .menuHome").append(
                menu.add({
                    _class: "menuNav fontMenu size09 sizeB",
                    html: "Essays:", href: "#", title: ""
                })
            );

            $(data).find("item").each(function() {
                var xmlItem = $(this);
                var xmlTitle = $(xmlItem).find("title").text();
                var xmlLink = $(xmlItem).find("link").text();
                $("div#list .menuList").append(
                    menu.add({
                        _class: "menuItem fontMenu size09 sizeB",
                        html: xmlTitle, //item.index + ". " + item.title,
                        href: xmlLink,
                        title: "" //item.title
                    })
                );
                    //= menu.list($list, {title: , link: });
            });

            $("div#list .menuNext").append(
                menu.add({
                    _class: "menuNav fontMenu size09 sizeB",
                    html: "Older", href: "#", title: ""
                })
            );
            
            nav.size($("div#list .menuList")); // menuList .data()
            menu.index(); // menuList numbering
            
            $("div#list .menuList").scrollTop(0); // Reset view
        },
        add: function(element) {
            if (element) {
                return $("<li>").append(
                            $("<a>", {
                                "class": element._class, html: element.html,
                                href: element.href, title: element.title
                            })
                        );
            } else {
                return $("<li>").append(
                            $("<a>", {
                                "class": "", html: "", href: "#", title: ""
                            })
                        );
            }
        },
        index: function () {
            // menuList numbering
            var i = $("div#list .menuList").data('itemCount');
            $("div#list .menuList li a").each(function () {
                var content = $(this).html();
                $(this).html(i + ". " + content);
                i--;
            })
            return;
        }
    }

    var option = {
        build: function() {
            var $this = $("div#option .menuSetting");

            $this.append(
                menu.add({
                    _class: "menuOption fontMenu size09 sizeB",
                    html: "Settings:", href: "#", title: ""
                })
            );
            $this.append(
                menu.add({
                    _class: "menuOption fontMenu size09 sizeB",
                    html: "Full View", href: "#", title: ""
                })
            );
            // Full view
            // 
            // Page next prev
            // Notes
        }
    }

    var nav = {
        size: function($element) {
            // retrieve Menu infos
            var itemSize = $(".menuHome").innerHeight();
            $element.data('itemSize', itemSize);
            var itemCount = 0;
            $(".menuItem").each(function() {itemCount++;});
            $element.data('itemCount', itemCount);

            $element.data('itemOffset', 0);
        },
        scroll: function($element, dir) {
            // menuList scrolling
            var menuVisible = $element.innerHeight(); // / 2;
            var menuSize = parseInt($element.data('itemCount') / (menuVisible / $element.data('itemSize')), 10);
            var menuOffset = $element.data('itemOffset') ? $element.data('itemOffset') : 0;

            if (dir == "Next") {
                $(".menuHome li a").text("Newer");
                $("div#list ul.menuHome").toggleClass("menuHome menuPrev");
                ++menuOffset;
                if (menuOffset >= menuSize) {
                    $("div#list ul.menuNext").toggleClass("menuHome menuNext");
                    $(".menuHome li a").text("");
                }
            } else {
                if (menuOffset >= menuSize) {
                    $("div#list ul.menuHome").toggleClass("menuHome menuNext");
                    $(".menuNext li a").text("Older");
                }
                --menuOffset;
                if (!menuOffset) {
                    $("div#list ul.menuPrev").toggleClass("menuHome menuPrev");
                    $(".menuHome li a").text("Essays:");
                } 
            }

            $("div#list .menuList").scrollTop(menuOffset * menuVisible);
            $element.data('itemOffset', menuOffset);
        }
    }
    
    var settings = {
        rss: {
            url: "http://www.aaronsw.com/2002/feeds/pgessays.rss",
            data: "",
            format: "xml",
            timeout: 1 *1000
        },
        alt: {
            url: "rss/pgessays.rss",
            data: "",
            format: "xml",
            timeout: 1 *1000
        },
        
        target: {
            $menu: $("div#list")
        }
    }

})( jQuery );
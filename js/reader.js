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

        $("#menuLeft").addClass("show");
        $("#menuRight").addClass("show");
        
        $("#scrollLeft").addClass("size70 right").html("&#8249;");
        $("#scrollRight").addClass("size70 left").html("&#8250;");
        
        // Reset view, Reload bug on FF?
        $("#source").scrollLeft(0); 
        
        // Menu builder
        get.xml(settings.rss);
        menu.option();
    });
    
    $("#scrollLeft, #scrollRight").live('click', function(evt) {
        evt.preventDefault();
        
        var left = $("#source").scrollLeft(), size = $("#source").innerWidth(), $this = $(this).attr("id"); 
        var option = ($this.indexOf("Left") != -1) ? "<" : ">";
        
        switch (option) {
            case "<":
                size = -size;
                $("#source").scrollLeft(left + size);
            break;
            case ">":
                $("#source").scrollLeft(left + size);
            break;
            default:
            break;
        }
    });
    $("#source a.noteLink").live("mouseover mouseout", function(evt) {
        // Incomplete
        /*if ( evt.type == "mouseover" ) {
            var number = $(this).text;
            reader.note(number, evt.pageX, evt.pageY);
        } else {
            reader.note();
        }*/
        return;
    });
    
    // Cross-Origin Resource Sharing workarounds
    var get = {
        xml: function(setting) {
            // check success with empty return
            $.ajax({
                type: "GET",
                url: "http://query.yahooapis.com/v1/public/yql",
                data: "q=select%20*%20from%20rss%20where%20url%3D%22" + encodeURIComponent(setting.url) + "%22",
                dataType: setting.format,
                timeout: setting.timeout,
                success: function(data) { menu.list(data); },
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
                success: function(data) { menu.list(data); },
                error: function() { menu.list(); /*get.rss(settings.alt);*/ } // Build anyway, avoid loops on GitHub
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
                success: function(data) { reader.build(data); },
                error: function() { return; } // add error handling
            });
        },
        other: function(setting) {
            $.ajax({
                type: "GET",
                url: "http://query.yahooapis.com/v1/public/yql",
                data: "q=select%20*%20from%20html%20where%20url%3D%22" + encodeURIComponent(setting)+ "%22&format=json&callback=?",
                dataType: 'json',
                success: function(data) { reader.display(data); },
                error: function() { return; } // add error handling
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
            
            // Remove whitespaces
            $this.contents().html(function() {
                var content = $(this).html();
                return $.trim(content);
            }); 
            $("#source p:empty").remove(); // Clean empty Paragraphs
            
            // Style dates
            $("h1, p:first").next("p").filter(':contains("January"),:contains("February"),:contains("March"),:contains("April"),:contains("May"),:contains("June"),:contains("July"),:contains("August"),:contains("September"),:contains("October"),:contains("November"),:contains("December")')
                    .each(function() {
                        var content = $(this).html();
                        $(this).wrap($("<h3>")).replaceWith(content);
                    });

            reader.spinner('off');
            reader.paginate(); // Bugged on first build?
        },
        parse: function(data) {
            var $parse = $(data.results[0]).find('td[width="455"], td[width="375"]'); 
            // 121. 113. ... Missing "Related:" -^ 2nd table width="455"
            // 58. 44. 40. ... content bugged 
            // 55. header bugged
            // 34. parse error table width="375"
            // 53. 46. notes bugged
            // 16. 15. 13. bugged td bgcolor="#FFFFDD" table width="410"
            // 104. td bgcolor="#cccc99 2xtable bugged
            // essay image header bugged

            // Avoiding virtumundo.com Loading times, Open rate tracker?
            $parse.find('img[src*="http://www.virtumundo.com/"]').remove();
            
            // Convert image titles to H1
            // <img hspace="0" height="18" width="126" vspace="0" border="0" alt="*" src="http://ep.yimg.com/ca/I/paulgraham*">
            $parse.find('img[src*="http://ep.yimg.com/ca/I/paulgraham"]').each(function() {
                var content = $(this).attr('alt');
                $(this).wrap($("<h1>")).replaceWith(content);
            });

            // Unwrap Paragraphs
            $parse.find('p').each(function() {
                $(this).contents().unwrap();
            });
            
            // Fixes local links
            $parse.find("a:not(:contains('http'))").each(function() {
                var content = "http://www.paulgraham.com/" + $(this).attr('href'); 
                $(this).attr('href', content);
            })
            
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
            
            // YC #ff9922 
            // Etherpad #cccc99
            $parse.find('table[width*="100%"]').wrap($("<p>").addClass("info size11"));
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
                $(this).wrap($("<h2>")).replaceWith(content);
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
                parse = i%2 ? parse.replace(regExp, '<p>') : parse.replace(regExp, '</p>');
                var search = parse.search(regExp);
            } while (search != -1)

            return parse;
        },
        display: function(data) {
            var $this = $("#source");
            $this.scrollLeft(0); // Reset view
            
            // Different format:
            // data = data.results[0];
            // var parse = data.replace(/<body>|<\/body>|<p>|<\/p>/g, '');
            data = data.query.results.body.p;
            
            // .txt formatting bugged
            $this.html($("<p>").html(data));
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
                $("body").append($("<div>", {id: "note", "class": "", html: noteText}));
            } else {
                $("body").children("#note").fadeOut().remove();
            }*/
            return;
        }
    }
    
    // #list builder
    var menu = {
        list: function(data) {
            $("ul.menuPrev").append(
                menu.add({
                    _class: "menuHead size09 sizeB",
                    html: "Essays: ", href: "#", title: "", handler: "menuPrev"
                })
            );
            $("ul.menuNext").append(
                menu.add({
                    _class: "menuNav size09 sizeB",
                    html: "Older", href: "#", title: "", handler: "menuNext"
                })
            );

            if (data) {
                $(data).find("item").each(function() {
                    var xmlItem = $(this);
                    var xmlTitle = $(xmlItem).find("title").text();
                    var xmlLink = $(xmlItem).find("link").text();
                    $("ol.menuList").append(
                        menu.add({
                            _class: "menuItem size09 sizeB", html: xmlTitle,
                            href: xmlLink, title: "", handler: "openLink"
                        })
                    );
                });
            }            
            nav.size($("ol.menuList")); // menuList .data()
            menu.index(); // menuList numbering
            
            $("ol.menuList").scrollTop(0); // Reset view
        },
        option: function() {
            $("ul.menuMore").append(
                menu.add({
                    _class: "menuHead size09 sizeB",
                    html: "Settings: ", href: "#", title: ""
                })
            );
            $("ul.menuSett").append(
                menu.add({
                    _class: "menuOption size09 sizeB",
                    html: "Full View", href: "#", title: "", handler: "fullView"
                })
            );

            /*$("ul.menuSetting").append(
                menu.add({
                    _class: "menuOption size09 sizeB",
                    html: "Show Notes", href: "#", title: "", handler: "showNotes"
                })
            );*/
            // Add: Full view
            // Add: Notes
            // Fonts
        },
        add: function(element) {
            if (element) {
                return $("<li>").append(
                            $("<a>", {
                                "class": element._class, html: element.html,
                                href: element.href, title: element.title
                            }).bind("click", {handler: element.handler, link: element.href}, menu.event)
                        );
            } else {
                return $("<li>").append(
                            $("<a>", {
                                "class": "", html: "", href: "#", title: ""
                            })
                        );
            }
        },
        index: function() {
            // menuList numbering
            var i = $("ol.menuList").data('itemCount');
            $("ol.menuList a").each(function() {
                var content = $(this).html();
                $(this).html(i + ". " + content);
                i--;
            })
            return;
        }, 
        event: function(evt) {
            evt.preventDefault();

            switch (evt.data.handler) {
                case "menuPrev":
                    nav.scroll("Prev");
                    break;
                case "menuNext":
                    nav.scroll("Next");
                    break;
                case "openLink":
                    reader.spinner('on');
                    nav.link(evt.data.link);
                    break;
                case "fullView":
                    nav.full();
                    break;
                case "showNotes":
                    nav.note(); 
                    break;
                default:
                    break;
            }
        }
    }
    
    var nav = {
        size: function($element) {
            // retrieve Menu infos
            var itemSize = $("ul.menuPrev").innerHeight();
            $element.data('itemSize', itemSize);
            var itemCount = 0;
            $(".menuItem").each(function() {itemCount++;});
            $element.data('itemCount', itemCount);
        },
        scroll: function(dir) {
            // menuList scrolling
            var $element = $("ol.menuList");
            var menuVisible = $element.innerHeight();
            var menuSize = parseInt($element.data('itemCount') / (menuVisible / $element.data('itemSize')), 10);
            var menuOffset = $element.data('itemOffset') ? $element.data('itemOffset') : 0;

            if (dir == "Next") {
                if (++menuOffset < menuSize) {
                    $("ul.menuPrev a").html("Newer");
                    $element.data('itemOffset', menuOffset);
                } else {
                    $("ul.menuNext li a").html("");
                }
            } else {
                if (--menuOffset > 0) {
                    $("ul.menuNext a").text("Older");
                    $element.data('itemOffset', menuOffset);
                } else {
                    $("ul.menuPrev a").text("Essays: ");
                }
            }
            $element.scrollTop(menuOffset * menuVisible);
        },
        link: function(url) {
            $("#home").removeClass("show");

            if (url.search(/htm/i) != -1) {
                get.html(url);
            } else {
                url = url.replace(/http:\/\/www.paulgraham.com\//, ''); // Fixes RSS feed
                get.other(url);
            }

            $("#scrollLeft").addClass("show");
            $("#scrollRight").addClass("show");
            //$("iframe#loader").attr('src', url); // Load paulgraham.com to hit impression // Disabled, scripts conflict?
        },
        full: function() {
            // Add: toggle
            $("#main").css("height", "auto");
            $("#reader").css("height", "auto");
            $("#source").removeClass("col");
            
            $("#scrollLeft").removeClass("show");
            $("#scrollRight").removeClass("show");
        },
        note: function() {
            // incomplete
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
        }
    }
    var target = {
        $menu: $("#list")
    }
})( jQuery );
/* 
 * Gianluca Esposito tilt2k@gmail.com
 */
(function($){
	// jQuery events
	$().ready(function() {
		
		// Reset view
		$("#source").scrollLeft(0); 
		
		// Menu builder
		var menuData = get.rss( settings.rss );
		menu.list( menuData );
		menu.index(); // Menu Numbering
		menu.option(); // Settings menu
		
		// Jump to page
		var url = location.hash;
		if (url) {
			$("home").removeClass("show");
			tool.spinner('on');
			url = url.replace(/#/, 'http://www.paulgraham.com/')
			nav.load(url);
		}
		
		// Display Scroll content
		$("#scrollLeft").html("&#8249;");
		$("#scrollRight").html("&#8250;");
	});
	
	// Page Scroller
	$("#scrollLeft, #scrollRight").live('click', function(evt) {
		evt.preventDefault();

		var $source = $("#source");
		
		var left = $source.scrollLeft();
		var size = $source.innerWidth();
		
		var count = $source.data('count');
		var pages = $source.data('pages');
		
		var option = $(this).hasClass("left") ? "left" : "right";
		
		switch (option) {
			case "left":
				size = -size;
				$source.scrollLeft(left + size);
				$source.data('count', --count)
			break;
			case "right":
				$source.scrollLeft(left + size);
				$source.data('count', ++count)
			break;
			default:
			break;
		}
		
		// Update Scroll arrows
		count <= 1 ? $("#scrollLeft").removeClass("show") : $("#scrollLeft").addClass("show");
		count < pages ? $("#scrollRight").addClass("show") : $("#scrollRight").removeClass("show");
	});
	
	$("#source a.noteLink").live("mouseover mouseout", function(evt) {
		// Incomplete
		/*if ( evt.type == "mouseover" ) {
			var number = $(this).text;
			tool.note(number, evt.pageX, evt.pageY);
		} else {
			tool.note();
		}*/
		return;
	});
	
	$("#source a.noteLink").live("click", function(evt) {
		evt.preventDefault();
	});
	
	// Cross-Origin Resource Sharing workarounds
	var get = {
		// RSS Feed
		rss: function(setting) {
			return data =
			$.ajax({
				type: "GET",
				url: "http://query.yahooapis.com/v1/public/yql",
				data: "q=select%20*%20from%20rss%20where%20url%3D%22" + encodeURIComponent(setting.url) + "%22",
				// Yahoo! Query Language: select * from rss where url=""
				dataType: setting.format,
				timeout: setting.timeout,
				error: function() { get.alt(settings.alt); }, // Fallback to local cached feed
				async: false
			}).responseXML;
		},
		alt: function(setting) {
			$.ajax({
				type: "GET",
				url: setting.url,
				data: setting.data,
				dataType: setting.format,
				timeout: setting.timeout,
				success: function(data) { menu.list(data); },
				error: function() { menu.list(); /*get.rss(settings.alt);*/ } // Build anyway, avoid loops on GitHub
			});
		},
		// Articles
		html: function(url) {
			$.ajax({
				type: "GET",
				url: "http://query.yahooapis.com/v1/public/yql",
				data: "q=select%20table%20from%20html%20where%20url%3D%22" + encodeURIComponent(url) + "%22&format=xml&callback=?",
				// Yahoo! Query Language: select * from html where url="" & format=xml
				dataType: 'json',
				success: function(data) { reader.build(data); },
				error: function() { return; } // add error handling
			});
		},
		other: function(url) {
			$.ajax({
				type: "GET",
				url: "http://query.yahooapis.com/v1/public/yql",
				data: "q=select%20*%20from%20html%20where%20url%3D%22" + encodeURIComponent(url)+ "%22&format=json&callback=?",
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

			tool.spinner('off');
			tool.paginate();
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
			$parse.find('img[src*="virtumundo.com"]').remove();
			
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
			$parse.find('table[width*="100%"]').wrap($("<p>").addClass("info size17"));
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
			var search = 1, i = 0;
			while (search != -1) {
				i++;
				parse = i%2 ? parse.replace(regExp, '<p>') : parse.replace(regExp, '</p>');
				search = parse.search(regExp);
			}

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
			tool.spinner('off');
		}
	}
	
	var tool = {
		paginate: function() {
			var $this = $("#source");

			$this.removeClass("col");
			var totalHeight = $this.height(); // Bugged on first build?
			
			$this.addClass("col");
			var height = $this.height();
			
			var pages = Math.ceil(totalHeight / height);
			
			$("#scrollRight").addClass("show");
			$("#scrollLeft").removeClass("show"); // Reset Scroll
			$this.data('pages', pages);
			$this.data('count', 1)
		},
		spinner: function(toggle) {
			if (toggle == "on") {
				$("body").append($("<div>", {id: "spinner"}));
				$("#source").css("opacity", "0.4");
			} else {
				$("body").children("#spinner").fadeOut().remove();
				$("#source").css("opacity", "1");
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
					_class: "menuHead menuEssay size14 sizeB",
					html: "Essays ", href: "#", title: "", handler: "menuPrev"
				})
			);
			$("ul.menuNext").append(
				menu.add({
					_class: "menuNav size14 sizeB",
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
							_class: "menuItem size14 sizeB", html: xmlTitle,
							href: xmlLink, title: "", handler: "openLink"
						})
					);
				});
			}			
			nav.size($("ol.menuList")); // menuList .data()
			
			$("ol.menuList").scrollTop(0); // Reset view
		},
		option: function() {
			$("ul.menuSett").append(
				menu.add({
					_class: "menuOption size14 sizeB",
					html: "Full View", href: "#", title: "", handler: "fullView"
				})
			);

			/* Add:
				Notes
				Change Fonts
				Zoom
			*/
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
					tool.spinner('on');
					nav.load(evt.data.link);
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
					$("ul.menuPrev a").removeClass("menuEssay").html("Newer");
					$element.data('itemOffset', menuOffset);
				} else {
					$("ul.menuNext li a").html("");
				}
			} else {
				if (--menuOffset > 0) {
					$("ul.menuNext a").text("Older");
					$element.data('itemOffset', menuOffset);
				} else {
					$("ul.menuPrev a").addClass("menuEssay").text("Essays ");
				}
			}
			$element.scrollTop(menuOffset * menuVisible);
		},
		load: function(url) {
			$("#home").removeClass("show");
			$("#menuMore").addClass("show");

			if (url.search(/htm/i) != -1) {
				get.html( url ); // Html pages
			} else {
				url = url.replace(/http:\/\/www.paulgraham.com\//, ''); // Fixes RSS feed
				get.other( url ); // Text and other pages
			}
			
			url = url.replace(/http:\/\/www.paulgraham.com\//, '');
			location.hash = url;

			//$("iframe#loader").attr('src', url); // Load paulgraham.com to hit impression // Removed
		},
		full: function() {
			$source = $("#source");
			if ( $source.hasClass("col") ) { 
				// Go to full
				$source.removeClass("col");
				$(".menuOption").addClass("less");
				
				$("#reader").css("height", "auto");
				$("#scrollLeft").removeClass("show");
				$("#scrollRight").removeClass("show");
			} else { 
				$source.addClass("col");
				$(".menuOption").removeClass("less");
				
				var count = $source.data('count');
				var pages = $source.data('pages');
				if (count > 1) $("#scrollLeft").addClass("show");
				if (count < pages) $("#scrollRight").addClass("show");
			}
		},
		note: function() {
			// incomplete
			return;
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
})( jQuery );
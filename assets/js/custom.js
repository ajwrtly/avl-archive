// debugging variables
var map;
var createDate;
var allAssetsList = {"activeAssets": []};
var assetRefreshToggle = 0; // 0 = disabled, 1 = enabled
var showActiveLayers;

// The following are functions that, unfortunately, pollute the global namespace, but are required for proper setting up 
// of map states once the window has fully loaded. These functions are called within $(window).load() rather than 
// $(document).ready(), and are also defined using the following format:
// 		getState = function () {}
// rather than the typical:
// 		function getState () {}
var	getState, positionFleetsPanel, getFleets, getAssets, updateZoomControl, assetListHeight, positionZoomControl, toggleCollapsedNav, createMap, defaultView, populateLayersPanel;

$(document).ready(function () {

	preventMoving = true;

	var assetArray = [];
	var preventZoomToAsset = false;

	String.prototype.capitalize = function() {
	    return this.charAt(0).toUpperCase() + this.slice(1);
	}

	String.prototype.createId = function() {
		return this.replace(/ /g, "-").toLowerCase();
	}

	String.prototype.parseId = function() {
		return this.replace(/-/g, " ").toLowerCase();
	}

	///////////////////
	//		Map 	 //
	///////////////////
	// { 
		// spherical mercator = 3857
		// Bob's projection = 200068

		mapView = new ol.View({
		  center: config.map.defaultCenter,
		  zoom: config.map.defaultZoom,
		  maxZoom: config.map.maxZoom,
		  minZoom: config.map.minZoom
		});

		map = new ol.Map({
			target: 'map',
			view: mapView,
			attributions: []
		});

		// map layers are stored in a seperate file called layers.js
		// on load we'll always add our basemaps
		
		$.each(config.basemaps, function (basemap) {
			map.addLayer(config.basemaps[basemap]);
		});
		
		map.addLayer(config.overlay);
				
		// when a user moves the map, updateURL() is called and we update the url to reflect the current zoom level and map position
		map.on("moveend", function () {

			if(preventMoving == false)
			{
				updateURL();
				updateZoomControl();
			}

		});

		// redraw all active layers every 10 seconds
		setInterval(redrawOverlays, 10000);
		setInterval(getAssets, 300000);

	    updateZoomControl = function () 
	    {
	    	if(map.getView().getZoom() == config.map.minZoom)
    		{
    			$(".ol-zoom-out > span.fa").addClass("zoom-disabled");
    		}
    		else if(map.getView().getZoom() == config.map.maxZoom)
    		{
    			$(".ol-zoom-in > span.fa").addClass("zoom-disabled");
    		}
    		else
    		{
    			$(".zoom-disabled").removeClass("zoom-disabled");
    		}
	    }

		function redrawOverlays()
		{
			var stateVariables = getUrlVars();

			config.overlay.getSource().updateParams({
				"_olSalt":  Math.random()
			});
		}

		function zoomToFullExtent()
		{
			map.setView(new ol.View({center: config.map.defaultCenter, zoom: config.map.defaultZoom}));
		}
	// }

	///////////////////
	// Miscellaneous //
	///////////////////
	// {

		Array.prototype.remove = function() {
		    var what, a = arguments, L = a.length, ax;
		    while (L && this.length) {
		        what = a[--L];
		        while ((ax = this.indexOf(what)) !== -1) {
		            this.splice(ax, 1);
		        }
		    }
		    return this;
		};

		function getLayerGrouping(searchLayerName)
		{
			$.each(config.layers, function (grouping){

				$.each(config.layers[grouping]["layers"], function (layerName){

					if (searchLayerName == layerName)
					{
						return grouping;
					}

				});

			});
		}

		function layerOn(layer)
		{
			layer.setVisible(true);
		}

		function layerOff(layer)
		{
			layer.setVisible(false);
		}

		// extension used to insert charactrs at a certain point in a string based on an index 
		String.prototype.insertAt = function(index, string) 
		{ 
			return this.substr(0, index) + string + this.substr(index);
		}

		String.prototype.beginsWith = function (string) 
		{
	   		return(this.indexOf(string) === 0);
		}

		getAllLayers = function () {

			var layers = [];
			$.each(config.layers, function (grouping) {
				$.each(config.layers[grouping]["layers"], function (layerName) {
					layers.push({"name": layerName, "grouping": grouping, "layer": config.layers[grouping]["layers"][layerName]});
				});
			});
			return layers;
		}

		getGroupingByName = function (name) {

			var returnValue;

			$.each(config.layers, function (grouping) {

				if(grouping == name)
				{
					returnValue = config.layers[grouping];
				}
			});

			return returnValue;

		}

		$(document).on("mouseenter",".assetListItem", function () {
			
			var assetItem = $(this);
			$(assetItem).find(".listItem-time").hide();
			$(assetItem).find(".listItem-hiddenTime").show();
			
		});

		$(document).on("mouseleave",".assetListItem", function () {

			var assetItem = $(this);
			$(assetItem).find(".listItem-hiddenTime").hide()
			$(assetItem).find(".listItem-time").show();
		
		});

		// setting up the date time picker
		dateTimeOptions = {
			lang:'en',
			format: 'm/d/Y H:i',
			step: 30
		};

	     $('#timeBegin').datetimepicker(dateTimeOptions);
	     $('#timeEnd').datetimepicker(dateTimeOptions);

	     $("#nav-title").click(function () {
	     	clearState();
	     });

	     $(document).on("click",".panel-header.collapse", function () {

	     	var panelGroupToOpen = $(this).next(".panel-group");

	     	$(".panel-group").not(panelGroupToOpen).slideUp(200, function () {
	     		$(panelGroupToOpen).delay(100).slideToggle(200, function () {
	     			$("#menu-fleets").animate({width: $("#panel-fleets").width()}, 50);
	     		});
	     		
	     	});

	     });

	     function clearState() 
	     {
	     	config.tracking.trackingList = [];
	     	$(document).trigger("analysisOff");
	     	$(document).trigger("trackingOff");
	     	
			map.setView(new ol.View({
			  center: config.map.defaultCenter,
			  zoom: config.map.defaultZoom,
			  maxZoom: config.map.maxZoom,
			  minZoom: config.map.minZoom
			}));

	     	updateURL();
	     }

		///////////////////////////////////
		//	Asset list scroll indicators //
		///////////////////////////////////
		// {
			$("#assetList").mouseenter(function () {
				assetListHeight();
				if($("#assetList").scrollTop() == 0)
				{
					$("#downScroll").show("fade", 100);
				}
				else if (Math.abs(($("#assetList").scrollTop() + $("#assetList").height()) - $("#assetList")[0].scrollHeight) < 30)
				{
					$("#upScroll").show("fade",100);
				}
				else
				{
					$("#upScroll").show("fade",100);
					$("#downScroll").show("fade", 100);
				}
			});

			$("#assetList").scroll(function () {
				if($("#assetList").scrollTop() == 0)
				{
					$("#upScroll").hide("fade", 100);
				}
				else if (Math.abs(($("#assetList").scrollTop() + $("#assetList").height()) - $("#assetList")[0].scrollHeight) < 30)
				{
					$("#downScroll").hide("fade", 100);
				}
				else
				{
					$("#upScroll").show("fade", 100);
					$("#downScroll").show("fade", 100);
				}
			});

			$("#assetList").mouseleave(function () {
				
				$("#upScroll").hide("fade", 100);
				$("#downScroll").hide("fade", 100);

			});

			//////////////////////
			// search scrolling	//
			//////////////////////

			$("#searchResults").mouseenter(function () {
				assetListHeight();


				// if the div is scrolled all the way to the top, just show the down arrow
				if($("#searchResults").scrollTop() == 0)
				{
					$("#downScroll").show("fade", 100);
				}
				// if the div is scrolled all the way to the bottom, just show the up arrow 
				else if (Math.abs(($("#searchResults").scrollTop() + $("#searchResults").height()) - $("#searchResults")[0].scrollHeight) < 30)
				{
					$("#upScroll").show("fade",100);
				}
				// if neither is true, show both arrows
				else
				{
					$("#upScroll").show("fade",100);
					$("#downScroll").show("fade", 100);
				}
			});

			// Monitor scroll position when user is actively scrolling, eg. hide down arrow when the user scrolls all the way to the bottom
			$("#searchResults").scroll(function () {
				if($("#searchResults").scrollTop() == 0)
				{
					$("#upScroll").hide("fade", 100);
				}
				else if (Math.abs(($("#searchResults").scrollTop() + $("#searchResults").height()) - $("#searchResults")[0].scrollHeight) < 30)
				{
					$("#downScroll").hide("fade", 100);
				}
				else
				{
					$("#upScroll").show("fade", 100);
					$("#downScroll").show("fade", 100);
				}
			});

			// hide everything when the user's cursor leaves the area
			$("#searchResults").mouseleave(function () {
				
				$("#upScroll").hide("fade", 100);
				$("#downScroll").hide("fade", 100);
			});
		// }

		// the following enables the asset list to be scrolled without seeing a scrollbar
		// the whole process uses some css smoke and mirrors 
		// The container, #activeAssetContainer, is set to a fixed width and height 
		// the inner element, #assetList, is larger than it's container
		// the container is set to be smaller than the inner element, with an overflow property set to 
		// hidden. Because the inner element has a wider width than its container, the scrollbar will be hidden
		// to the right, where the overflow is hidden.
		// Good example: http://jsfiddle.net/qcv5Q/1/
		assetListHeight = function ()
		{
			var top = $("#activeAssets, #searchResults").offset().top + $("#activeAssets, #searchResults").outerHeight();
			var height = $("html").height() - top;
			$("#activeAssetContainer").outerHeight(height);
			$("#assetList, #searchResults").outerHeight(height - $("#assetSearchBox, #searchResults").outerHeight());
			$("#assetList, #searchResults").width($("#activeAssetContainer").width() + 20);
		}

		// The fleets panel is a seperate div from the menu button in the nav bar. This function makes sure it's positioned properly
		positionFleetsPanel = function ()
		{
			if($("html").width() > 767)
			{
				//make sure the fleets panel is positioned correctly
				var rightPosition = $("html").width() - ($("#menu-fleets").offset().left + $("#menu-fleets").outerWidth());

				// adjust for the padding on the fleets menu
				$("#panel-fleets").css("min-width",$("#menu-fleets").width());
				$("#menu-fleets").width($("#panel-fleets").width());
				$("#panel-fleets").css("right", rightPosition);
			}
			else
			{
				$("#panel-fleets").css("width","100%");
				$("#panel-fleets").css("right","0");

			}
		}

		positionZoomControl = function () 
		{
			if($("#sidebar").css("display") == "none" && !$("#nav-bar").hasClass("minimized"))
			{
				$(".ol-zoom").animate({"margin-left": "10px", "margin-top": "50px"}, 200);
			}
			else if($("#nav-bar").hasClass("minimized"))
			{
				$(".ol-zoom").animate({"margin-top": "0", "margin-left": "10px"}, 100);			}
			else
			{
				$(".ol-zoom").animate({"margin-left": $("#sidebar").width() - 30, "margin-top": "50px"}, 0).animate({"margin-left": $("#sidebar").width() + 10},100);
			}
		}

		function afterAssetListToggle()
		{
			positionZoomControl();
		}
	// }

	/////////////////
	//	Get Fleets //
	/////////////////
	//{
		function turnOffOverlays()
		{
			config.overlay.setVisible(false);
		}

		getFleets = function(callback)
		{
			var fleetURL = "http://pwultra5.ci.stpaul.mn.us/cgi-bin/avl/avl_lolli.03.pl?mode=getFleet";

			var fleetListHTML = "<span class='panel-option fleet default allFleets' id='all' data-fleetId='all' data-fleetNameFormatted='All' data-fleetgrouping='%'>All</span>";

			$.ajax({
					url: fleetURL, 
					dataType: "json",
					success: function (data) 
					{
						$.each(data, function (fleetGroupingName) {

							fleetListHTML += "<span class='panel-header collapse'>" + fleetGroupingName + "</span><span class='panel-group'>";

							$.each(data[fleetGroupingName], function (fleetName) {

								var fleet = data[fleetGroupingName][fleetName]["fleetname"];
								var formattedFleetName = fleet.toLowerCase().replace(/ /g, "-");
								//var formattedGroupingName = fleetGroupingName.toLowerCase().replace(/ /g, "-");

								fleetListHTML += "<span class='panel-option fleet' id='" + formattedFleetName + "' data-fleetId='" +	 formattedFleetName + "' data-fleetgrouping='" + fleetGroupingName + "' data-fleetNameFormatted='" + fleet + "'>" + fleet + "</span>";
							})

							fleetListHTML += "</span>";
						});

						$("#panel-fleets").html(fleetListHTML);

					},
					complete: function (data)
					{
						if(callback)	{	callback();	}
					}
			});
		}

		var getFleetLayer = function () {

			var fleetName = config.fleet.fleetNameFormatted;
			var fleetGrouping = config.fleet.grouping;

			if(config.fleet.fleetId != "all")
			{
				config.overlay.getSource().updateParams({
					fleetname: "'" + fleetName + "'",
					grouping: "'" + fleetGrouping + "'"
				});

			}
			else
			{
				config.overlay.getSource().updateParams({
					fleetname: "'undefined'",
					grouping: "'Parks','Public Works'"
				});

			}
		};

		// shows list with animation, distinguished by class, recursive
		// time to show items gradually decreases so that the whole list loads quickly after the first few items are animated
		function showList(object, initialTime) {
			//check if object exists 
			if($(object).length){
				$(object).slideDown(initialTime, function () {
					return showList($(object).next("." + $(object).attr("class")), initialTime * 0.8);
				});
			}
			else
			{
				return;
			}
		}

		getAssets = function ()
		{
			allAssetsList.activeAssets = [];
			$("#assetList").empty();
			$("#assetList").html("<i class='fa fa-refresh'></i>");

			var salt = Math.random();

			var grouping = config.fleet.grouping;
			if(config.fleet.fleetNameFormatted == "All")
			{
				var fleetNameFormatted = "%";
			}
			else
			{
				var fleetNameFormatted = config.fleet.fleetNameFormatted;
			}
			

			if(grouping == null)
			{
				grouping = "";
			}
			if(fleetNameFormatted == null)
			{
				fleetNameFormatted = "";
			}

			var assetURL = "http://pwultra5.ci.stpaul.mn.us/cgi-bin/avl/avl_lolli.03.pl?mode=getAssets&group=" + grouping.capitalize() + "&fleetname=" + fleetNameFormatted.capitalize() + "&ol_salt" + salt;

			$.ajax({
				url: assetURL,
				dataType: "json",
				success: function (data) {

					$.each(data.Assets, function (index)
					{
						var activeAsset = {
							"name": data.Assets[index]["asset_id"].toString(),
							"lastTime": data.Assets[index]["acqtime"].toString(),
							"elapsed": data.Assets[index]["elapsed"].toString()
						}
						allAssetsList.activeAssets.push(activeAsset);
					});
				},
				complete: function () {

					$("#assetList").empty();
					for(var x = 0; x < allAssetsList.activeAssets.length; x++)
					{

	   					var splitByColon = allAssetsList.activeAssets[x].elapsed.split(":");
	   					var latestTime = {
	   						seconds: splitByColon[3],
	   						minutes: splitByColon[2],
	   						hours: splitByColon[1],
	   						days: splitByColon[0]
	   					}
	   		

	   					if(latestTime.hours > 23)
	   					{
	   						days = Math.floor(latestTime.hours / 24);
	   					}

						// conditionally color based on last time the asset moved
						if(latestTime.days == 0 && latestTime.hours == 0 && latestTime.minutes == 0)
						{
							$("#assetList").append("<div class='assetListItem' style='display: none' value='" + allAssetsList.activeAssets[x].name + "'><span class='listItem-name'>" + allAssetsList.activeAssets[x].name + "</span><span class='listItem-hiddenTime'>" + allAssetsList.activeAssets[x].lastTime + "</span><span class='listItem-time time-recent'>" + latestTime.seconds + " s</span></div>");
						}
						else if(latestTime.days == 0 && latestTime.hours == 0 && latestTime.minutes < 5)
						{
							$("#assetList").append("<div class='assetListItem' style='display: none' value='" + allAssetsList.activeAssets[x].name + "'><span class='listItem-name'>" + allAssetsList.activeAssets[x].name + "</span><span class='listItem-hiddenTime'>" + allAssetsList.activeAssets[x].lastTime + "</span><span class='listItem-time time-recent'>" + latestTime.minutes + " m</span></div>");
						}
						else if (latestTime.days == 0 && latestTime.hours < 1)
						{
							$("#assetList").append("<div class='assetListItem' style='display: none' value='" + allAssetsList.activeAssets[x].name + "'><span class='listItem-name'>" + allAssetsList.activeAssets[x].name + "</span><span class='listItem-hiddenTime'>" + allAssetsList.activeAssets[x].lastTime + "</span><span class='listItem-time time-medium'>" + latestTime.minutes + " m</span></div>");
						}
						else if (latestTime.days == 0 && latestTime.hours <= 23)
						{
							$("#assetList").append("<div class='assetListItem' style='display: none' value='" + allAssetsList.activeAssets[x].name + "'><span class='listItem-name'>" + allAssetsList.activeAssets[x].name + "</span><span class='listItem-hiddenTime'>" + allAssetsList.activeAssets[x].lastTime + "</span><span class='listItem-time time-late'>" + latestTime.hours + " h</span></div>");
						}
						else if (latestTime.days > 0)
						{
							$("#assetList").append("<div class='assetListItem' style='display: none' value='" + allAssetsList.activeAssets[x].name + "'><span class='listItem-name'>" + allAssetsList.activeAssets[x].name + "</span><span class='listItem-hiddenTime'>" + allAssetsList.activeAssets[x].lastTime + "</span><span class='listItem-time time-old'>" + latestTime.days + " d</span></div>");
						}

					}

					showList($(".assetListItem")[0], 50);
					assetRefreshToggle = 1;
				}
			});
		}
	//}

	//////////////////////////////
	// 		DOM extensions		//
	//////////////////////////////
	// {
		//toggles, opens, or closes nav menus
		$.fn.toggleNavMenu = function ( action, callback ) {

			if($("nav").hasClass("collapsed"))
			{
				if(action == "toggle")
				{
					// here, essentially what we're doing is assigning the menu that has been clicked to a variable
					// and then adding or removing "menu-open" class depending on whether it is already open or not
					// finding the panel associated with that menu, and opening or closing it
					// and then, because we're in a small screen, we're going to close any other menu and panel that are open 
					// if the user were to click on a different menu 
						var menuBeingOpened = this;

						menuBeingOpened.toggleClass("menu-open");

						var idOfPanel = menuBeingOpened.attr("data-target");

						$("#" + idOfPanel).slideToggle(function () {
							if(idOfPanel == "sidebar" && callback)
							{
								callback();
							}
						});	
						
						if($(menuBeingOpened).hasClass("menu-open"))
						{
							var idOfMenuBeingOpened = "#" + $(menuBeingOpened).attr("id");
							
							$(".menu-open:not(" + idOfMenuBeingOpened + ")").each(function() {
								$(this).removeClass("menu-open");
								var idOfPanelToClose = $(this).attr("data-target");
								$("#" + idOfPanelToClose).slideUp();
							});
						}

				}
			}
			else
			{
				if(action == "open")
				{
					this.addClass("menu-open");

					var idOfPanel = this.attr("data-target");
					
					$("#" + idOfPanel).slideDown(function () {
							if(idOfPanel == "sidebar" && callback)
							{
								callback();
							}
						});;

				}

				if(action == "close")
				{
					this.removeClass("menu-open");

					this.find(".fa").show(function () {
							if(idOfPanel == "sidebar" && callback)
							{
								callback();
							}
						});;
					var idOfPanel = this.attr("data-target");
					$("#" + idOfPanel).hide();
				}

				if(action == "toggle")
				{
					this.toggleClass("menu-open");

					var idOfPanel = this.attr("data-target");
					
					$("#" + idOfPanel).slideToggle(function () {
							if(idOfPanel == "sidebar" && callback)
							{
								callback();
							}
						});;
				}
			}
			return this;
		};

		// flips chevrons! (carets / arrows)
		$.fn.flipChevron = function (action) {

			if(action == "close")
			{
					this.each(function () {

							$(this).removeClass("fa-chevron-up").addClass("fa-chevron-down");

					});
			}
			if(action == "open")
			{
					this.each(function () {

							$(this).removeClass("fa-chevron-down").addClass("fa-chevron-up");

					});
			}
			else
			{
				this.each(function () {

					if($(this).hasClass("fa-chevron-down"))
					{
						$(this).removeClass("fa-chevron-down").addClass("fa-chevron-up");
					}
					else if($(this).hasClass("fa-chevron-up"))
					{
						$(this).removeClass("fa-chevron-up").addClass("fa-chevron-down")
					}

				});
			}

			return this;
		};

		// when a user clicks on a layer in a navigation menu, this turns the associated layers on and off
		// if the layer is turned on, this can also turn off other layers if the chosen layer is not meant to be
		// seen with other layers turned on. For example, baselayers: only one should be visible at a time
		$.fn.toggleLayer = function (offOn) {

			var layerName = $(this).attr("data-layername");

			if($(this).hasClass("basemap"))
			{
				$("basemap").each(function () {
					$(this).removeClass("selected");
				});

				$(this).addClass("selected");

				$.each(config.basemaps, function (layer)
				{
					config.basemaps[layer].setVisible(false);
				});

				config.basemaps[layerName].setVisible(true);
			}
			else 
			{
				if(offOn == "on")
				{

					$(this).addClass("selected");

					// add the layer to config.map.activeOverlays
					config.map.activeOverlays.push(layerName)

					// convert config.map.activeOverlays to the format that Bob uses
					var parameterString = "";
					$.each(config.map.activeOverlays, function (l) {
						parameterString += config.map.activeOverlays[l] + ",";
					});
					parameterString = parameterString.substring(0, parameterString.length - 1);

					// reload the layer
					config.overlay.getSource().getParams().layers = parameterString;

					config.overlay.getSource().dispatchChangeEvent();
				}
				else
				{
					$(this).removeClass("selected");

					// remove the layer name from config.map.activeOverlays
					config.map.activeOverlays.remove(layerName);

					// convert config.map.activeOverlays to the format Bob uses
					var parameterString = "";
					$.each(config.map.activeOverlays, function (l) {
						parameterString += config.map.activeOverlays[l] + ",";
					});
					parameterString = parameterString.substring(0, parameterString.length - 1);

					// reload the layer
					config.overlay.getSource().getParams().layers = parameterString;
				}
			}
		};

		$.fn.toggleFleet = function () {

			$("#menu-fleets").width("auto");

			$(".fleet").removeClass("selected");
			$(this).addClass("selected");

			var fleetName = $(this).attr("data-fleetId");
			var groupingName = $(this).attr("data-fleetGrouping");
			var fleetNameFormatted = $(this).attr("data-fleetNameFormatted");

			$("#currentFleet").text(fleetNameFormatted);
			$("#panel-fleets").slideUp();
			$("#menu-fleets").removeClass("menu-open");

			config.fleet.fleetId = fleetName;
			config.fleet.fleetNameFormatted = fleetNameFormatted;
			config.fleet.grouping = groupingName;

			positionFleetsPanel();
			getFleetLayer();
			getAssets();

			return this;
		};
	// }

	//////////////////////////////////
	// Get State from URL  			//
	//////////////////////////////////
	// {
		// in order to enable linking to certain "views" of the application, 
		// such as tracking certain assets, or analyzing their paths from a certain timeframe
		// we store these variables in the URL with javascript

		// First, on page load, we have to return the state variables from url as an array 
		function getUrlVars()
		{
		    var vars = [], hash;
		    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		    for(var i = 0; i < hashes.length; i++)
		    {
		        hash = hashes[i].split('=');
		        vars.push(hash[0]);
		        vars[hash[0]] = hash[1];
		    }
		    return vars;
		}

		// then, based on the values of those state variables, this script can do things like open 
		// certain panes, load a particular map, or add assets to the tracking list
		getState = function () 
		{

			var stateVariables = getUrlVars();

			if(stateVariables["fleet"])
			{
				getFleets(function() 
				{ 
					var idOfFleet = "#" + stateVariables["fleet"].toLowerCase().replace(/%20/g, "-");;
					$(idOfFleet).toggleFleet();
				});
			}
			else
			{
				// toggle default
				getFleets(function() 
				{ 
					$(".fleet.default").toggleFleet(); 
				});
			}
			if(stateVariables["assets"] && stateVariables["assets"] == "open" && $("nav").hasClass("collapsed") != true)
			{
				$("#menu-assets").toggleNavMenu("open");
			}

			if(stateVariables["view"])
			{
				switch (stateVariables["view"])
				{
					case "default":

					break;

					case "collapsed":
						toggleMinimizeNav();
					break;
				}
			}

			if(stateVariables["tracking"])
			{

				expandSidebarMenu($("#tracking"));
				//individual assets in the url are seperated by '+'
				var trackedVehicles = stateVariables["tracking"].split("+");

				// remove duplicates
				trackedVehicles = $.unique(trackedVehicles);

				//make this the list of tracked vehicles
				config.tracking.trackingList = trackedVehicles.slice(0);

				// add each asset to the sidebar list
				$.each(trackedVehicles, function (index) {
					addAssetToTracking(trackedVehicles[index]);
				});

				updateCollapsedTrackingList();

				if(stateVariables["begin"] && stateVariables["end"])
				{
					expandSidebarMenu($("#analysis"));
					$("#timeBegin").val(parseURLDate(stateVariables["begin"]));
					$("#timeEnd").val(parseURLDate(stateVariables["end"]));
					$(document).trigger("trackingOn");
					$(document).trigger("analysisOn");
				}
				else
				{
					$(document).trigger("trackingOn");
				}

				getTrackingLayer();
			}
			else
			{
				// if we're not tracking, turn on the assigned layers
				if(stateVariables["layers"])
				{
					
					var layers = stateVariables["layers"].split("+");

					$.each(layers, function (i) {
						$("#panel-layers").find("[data-layername='" + layers[i] + "']").toggleLayer("on");
					});

				}
				else
				{
					// bw, trails and points are the default, we'll turn those on	
					$("#panel-layers").find("[data-layername='bw']").toggleLayer("on");
					$("#panel-layers").find("[data-layername='current']").toggleLayer("on");
					$("#panel-layers").find("[data-layername='trail']").toggleLayer("on");
					
				}

			}
			if(stateVariables["lon"] && stateVariables["lat"] && stateVariables["zoom"])
			{
				var lonLat = [parseFloat(stateVariables["lon"]), parseFloat(stateVariables["lat"])];

				map.setView(new ol.View({center: lonLat, zoom: parseInt(stateVariables["zoom"])}));
			}

			// show active assets by default
			$("div[data-target=activeAssets]").show();
		}

		// instead of using the built in URL encoding function on the date/time, this function simplifies the dates specified
		// in the analyze pane into a large number eg. 05/29/2014 4:44 PM == 052920141644 
		createDate = function (dateTime)
		{

			var date = dateTime.substr(0,10);
			date = date.replace(/\//g,"");
				var year = date.substr(4);
				var month = date.substr(0,2);
				var day = date.substr(2,2);

			time = dateTime.substr(11);
			hours = time.substr(0,2);
			minutes = time.substr(3,2);

			var returnDate = {
				year: year,
				month: month,
				day: day,
				hours: hours,
				minutes: minutes
			};

			return returnDate;
		}

		// this is the reverse of createDate(), it parses the number from the URL variable and converts it back
		// into a readable date 
		function parseURLDate(dateTime)
		{
			var date = dateTime.substr(0,8);
				var year = date.substr(0,4);
				var month = date.substr(4,2);
				var day = date.substr(6,2);

			newDate = month + day + year;

			var time = dateTime.substr(8);
				var hours = time.substr(0,2);
				var minutes = time.substr(2);

			newDate = newDate.insertAt(2,"/");
			newDate = newDate.insertAt(5,"/");
			

			return newDate + " " + hours + ":" + minutes;
		}

		function encodeQueryData(data)
		{
		   var ret = [];
		   for (var d in data)
		   {
		   		if(data[d] instanceof Array)
		   		{
		   			ret.push(d + "=" + data[d].join("+"));
		   		}
		   		else
		   		{
		   			ret.push(d + "=" + data[d]);
		   		}
		   }
		   return ret.join("&");
		}
		
		// this function  does the actual creation of a URL with appropriate state-setting variables
		function updateURL()
		{
			var urlObject = {};

			urlObject.view = "default";
			
			// if the assets menu is open, we want to distinguish this in the URL
			// only set to open if the window is sufficiently large (not smartphone sized)
			if($("#menu-assets").hasClass("menu-open") && $("nav").hasClass("collapsed") != true)
			{
				urlObject.assets = "open";
			}

			// if we're tracking items, set the view to tracking and list which items are being tracked
			if($("#tracking").hasClass("sidebar-menu-active") && config.tracking.trackingList.length > 0)
			{

				urlObject.tracking = [];
				
				$.each(config.tracking.trackingList, function(index, value){
					urlObject.tracking.push(value);
				});	
			}
			else //	 otherwise, specify the fleet in the URL. Fleets cannot be specified when items are being tracked
			{
				urlObject.fleet = config.fleet.fleetId;
			}

			//	if we're 'analyzing' some tracked assets, set the view to active and store the date/time range
			if($("#analysis").hasClass("sidebar-menu-active"))
			{
				
				if(validateTimes())
				{
					var beginDate = createDate($("#timeBegin").val());
						var beginFormatted = beginDate['year'] + beginDate['month'] + beginDate['day'] + beginDate['hours'] + beginDate['minutes'];
					var endDate = createDate($("#timeEnd").val());
						var endFormatted = endDate['year'] + endDate['month'] + endDate['day'] + endDate['hours'] + endDate['minutes'];
					
					urlObject.begin = beginFormatted;
					urlObject.end = endFormatted;
				}
			}

			//	if the view is minimized, we're in 'billboard' view
			if($("#nav-bar").hasClass("minimized"))
			{
				urlObject.view = "collapsed";
			}

			//	finally, we specify which layers are selected via the layers panel
			if($(".panel-option.layer.selected").length > 0)
			{
				var layersArray = [];

				$(".panel-option.layer.selected").each(function (index) {
					layersArray.push($(this).attr("data-layerName"));	
				});

				urlObject.layers = layersArray;
			}

        	urlObject.lat = map.getView().getCenter()[1];
        	urlObject.lon = map.getView().getCenter()[0];
        	urlObject.zoom = map.getView().getZoom();

        	var newURL = "?" + encodeQueryData(urlObject);

			window.history.replaceState(window.location.href, "Title", newURL);
		}

	// }

	////////////////////////////////////
	// controls for nav-menus		  //
	////////////////////////////////////
	// {

		// when a user clicks on a menu, we collapse other menus
		$(".nav-menu").click(function (){	
			
			if($(this).hasClass("disabled") == false)
			{
				$(this).toggleNavMenu("toggle", afterAssetListToggle);

				assetListHeight();

				// collapse all other menus that aren't stickied (ie: sidebar doesn't close, fleets/layers menu do close)
				$(".nav-menu:not(.sticky)").not($(this)).each(function () {
					$(this).toggleNavMenu("close");
				});

				updateURL();
			}
		});

		// when the user opens the fleets or layers menu, then clicks outside that area, those menus will close
		$("#map, #map > *").mousedown(function () {
			if($("html").width() < 768)
			{
				$("#nav-menu-container").slideUp();
			}
			else
			{
				$(".nav-menu:not(.sticky)").each(function () {
					$(this).toggleNavMenu("close");
				});

				$(".xdsoft_datetimepicker").hide();
			}
		});

		// when a user clicks on an option in the fleets menu, the menu will set the currently active fleet to the selected option
		// the panel will then close
		$(document).on("click",".panel-option.fleet:not(.selected):not(.disabled)", function () {
			
			$(this).toggleFleet();

			updateURL();	
		});

		$(document).on("click","#panel-layers > .singleSelect > .panel-option:not(.selected):not(.disabled)", function () {
			
			$(this).siblings().removeClass("selected");

			$(this).toggleLayer("on");
			
			updateURL();
		});

		$(document).on("click","#panel-layers > .multiSelect > .panel-option:not(.selected):not(.disabled)", function () {

			$(this).toggleLayer("on");
			
			updateURL();
		});

		$(document).on("click","#panel-layers > .multiSelect > .panel-option.selected", function () {

			$(this).toggleLayer("off");
			
			updateURL();
		});
	// }

	//////////////////////////////////////////
	// 		Asset Sidebar Functions 	    //
	//////////////////////////////////////////
	// 	{

		// collapses content panels within the assets panel
		function collapseSidebarMenu(panel) 
		{
			$(panel).removeClass("sidebar-menu-open");
			var findPanelsWithDataTarget = $(panel).attr("id");
			$("div[data-target=" + findPanelsWithDataTarget + "]").slideUp("fast");
			
		}

		// expands content panels within the assets panel
		function expandSidebarMenu(panel, callback) 
		{
			$(panel).addClass("sidebar-menu-open");
			var findPanelsWithDataTarget = $(panel).attr("id");

			//different animations depending on what's being opened

			//if tracking is being opened and we're adding our first item, we want to show it immediately
			if($("div[data-target=" + findPanelsWithDataTarget + "]").find(".trackingListItem").length == 0 && findPanelsWithDataTarget == "tracking")
			{
				$("div[data-target=" + findPanelsWithDataTarget + "]").show(null, function () {
					assetListHeight();
				});
			}
			// if tracking is being opened and there are already items in it, we'll show its contents slowly then add a callback to show the next item being added
			else if (findPanelsWithDataTarget == "tracking")
			{
				$("div[data-target=" + findPanelsWithDataTarget + "]").slideDown("slow", function () {
					if(callback) { callback() };
					assetListHeight();
				});
			}
			else if(findPanelsWithDataTarget == "analysis" && $("#timeEnd").val() == "")
			{
				$("div[data-target=" + findPanelsWithDataTarget + "]").slideDown("slow", function () {
					if(callback) { callback() };
					assetListHeight();
				});

				var today = new Date()

				if((today.getMonth()+1) < 10)
				{
					var month = "0" + (today.getMonth() + 1);
				}
				else
				{
					var month = today.getMonth() + 1;
				}

				if(today.getDate() < 10)
				{
					var date = "0" + today.getDate();
				}
				else
				{
					var date = today.getDate();
				}

				var year = today.getFullYear()

				if(today.getHours() < 10)
				{
					var hours = "0" + today.getHours();
				}
				else
				{
					var hours = today.getHours();
				}

				if(today.getMinutes() < 10)
				{
					var minutes = "0" + today.getMinutes();
				}
				else
				{
					var minutes = today.getMinutes();
				}

				$("#timeEnd").val(month + "/" + date + "/" + year + " " + hours + ":" + minutes);
			}
			// otherwise, if we're not opening tracking, we'll just slide the panel down
			else
			{
				$("div[data-target=" + findPanelsWithDataTarget + "]").slideDown("slow", function () {
					assetListHeight();
				});
			}
		}

		// this expands or closes sidebar menus with some animation
		$(".sidebar-menu:not(.sticky)").click(function () {
			
			if($(this).attr("id") == "tracking" && config.tracking.trackingList.length == 0)
			{
				if($("#activeAssets").hasClass("sidebar-menu-open") == false)
				{
					expandSidebarMenu($("#activeAssets"));
				}

				$("#assetList").animate({
					backgroundColor:  config.colors.disabled
				}, 50).delay(50).animate({backgroundColor: config.colors.backgroundDark},200);

			}
			else if($(this).attr("id") == "analysis" && config.tracking.trackingList.length == 0 && $(this).hasClass("sidebar-menu-open") == false)
			{
				if($("#activeAssets").hasClass("sidebar-menu-open") == false)
				{
					expandSidebarMenu($("#activeAssets"));
				}

				$("#assetList").animate({
					backgroundColor:  config.colors.disabled
				}, 50).delay(50).animate({backgroundColor: config.colors.backgroundDark},200);
			}
			else
			{
				$(this).toggleClass("sidebar-menu-open");
				
				if($(this).hasClass("sidebar-menu-open"))
				{
					expandSidebarMenu($(this));
				}
				else
				{
					collapseSidebarMenu($(this));
				}	
			}

			updateURL();
		});


		$("#assetSearchBox").on("keyup", function () {

			var searchKey = $("#assetSearchBox").val();
			if(searchKey == "")
			{
				$("#searchResults").empty();
				$("#searchResults").hide();
				$("#assetList").show();
			}
			else
			{
				$("#assetList").hide();
				$("#searchResults").empty();
				$("#searchResults").show();

				var searchKey = $("#assetSearchBox").val();
				
				$("#searchResults").append($("#assetList").children("[value*='" + searchKey + "']").clone());
			}

		});

		$("#collapsed-assetSearchBox").on("keyup", function () {

			var searchKey = $("#collapsed-assetSearchBox").val();

			if(searchKey == "")
			{
				$("#collapsed-searchResults").hide();
				$("#collapsed-searchResults").empty();
				
			}
			else
			{
				$("#collapsed-searchResults").empty();

				var listOfAssets = allAssetsList.activeAssets;

				for(var x = 0; x < listOfAssets.length; x++)
				{
					if (listOfAssets[x].name.beginsWith(searchKey))
					{
						$("#collapsed-searchResults").append("<span class='assetListItem' value='" + listOfAssets[x].name + "'>" + listOfAssets[x].name + "</span>");
					}
				}

				$("#collapsed-searchResults").show();
			}

		});

		$(document).on("mouseup","#collapsed-searchResults > .assetListItem", function () {
			$(this).animate({backgroundColor: "#01c7ff"}, 5);
			$(this).animate({backgroundColor: config.colors.backgroundBase}, 200);
		});
	//	}

	/////////////////////////////
	//	Analysis functions     //
	/////////////////////////////
	// {

		function openDataTable()
		{
			window.open("dataTable.html?assetId=" + config.tracking.trackingList[0] + "&timeBegin=" + config.tracking.timeBegin + "&timeEnd=" + config.tracking.timeEnd, "_blank", "height=600, width=600");
		}

		function validateTimes ()
		{
			if($("#timeBegin").val() != "" && $("#timeEnd").val() != "")
			{
				var timeBegin = createDate($("#timeBegin").val());
				var timeEnd = createDate($("#timeEnd").val());

				var today = new Date();

				// built in javascript function Date() converts our array of date variables to an actual date that is measured by
				// the number of milliseconds from an arbitrary moment in time in the 70's
				var dateBegin = new Date(Number(timeBegin['year']),Number(timeBegin['month']) - 1,Number(timeBegin['day']),Number(timeBegin['hours']),Number(timeBegin['minutes']));
				var dateEnd   = new Date(Number(timeEnd['year']),Number(timeEnd['month']) - 1,Number(timeEnd['day']),Number(timeEnd['hours']),Number(timeEnd['minutes']));

				// milliseconds in an hour == 3600000
				// checks to make sure that the difference between the two numbers is less than an hour but more than zero
				if(dateEnd - dateBegin < 86400000 && dateEnd - dateBegin > 0 && dateBegin < today)
				{
					return true;
				}
				else if(dateBegin >= today)
				{
					return 2;
				}
				else if (dateEnd - dateBegin <= 0)
				{
					return 3;
				}
				else if (dateEnd - dateBegin > 86400000)
				{
					return 4;
				}
			}
		}

		$(document).on("analysisOn", function () {

			config.map.state = "analysis";

			turnOffOverlays();

			if(config.tracking.trackingLayers != null)
			{
				$.each(config.tracking.trackingLayers, function (index) {
					config.tracking.trackingLayers[index].setVisible(false);
				});
			}

			$("#analysis").addClass("sidebar-menu-active");

			getTrackingLayer();
		});

		$(document).on("analysisOff", function () {

			config.map.state = "tracking";

			$("#analysis").removeClass("sidebar-menu-active");

			if(config.tracking.analysisLayer)
			{
				config.tracking.analysisLayer.setVisible(false);
			}

			if(config.tracking.trackingList.length > 0)
			{
				getTrackingLayer();
			}

			$("#dataTable").hide();


			updateURL
		});

		$(document).on("analysisClear", function () {

			$("#analysisError").slideUp();
			$("#timeEnd, #timeBegin").removeClass("error");
			$(".fa-warning").removeClass("fa-warning").addClass("fa-calendar");

			$("#timeBegin").val("");
			$("#timeEnd").val("");
			$(document).trigger("analysisOff");
		});

		// monitors whether the date inputs under the "analysis" pane have been changed. 
		// if both fields, beginning and end, have changed, it enables analysis view
		$("#timeBegin, #timeEnd").on("dp.change change focus", function () {
			
			if(validateTimes() === true)
			{
				$("#analysisError").slideUp();

				$(".fa-warning").removeClass("fa-warning").addClass("fa-calendar");

				$("#timeEnd, #timeBegin").removeClass("error");

				$(document).trigger("analysisOn");

				$("#dataTableButton").removeClass("disabled");
				
				updateURL();
			}
			else if (validateTimes() != true)
			{
				switch (validateTimes())
				{
					case 2:
						$("#analysisError").text("Begin date cannot be in the future").slideDown();
						$("#timeBegin").addClass("error",300);
						break;
					case 3:
						$("#analysisError").text("End time needs to be greater than begin time").slideDown();
						$("#timeEnd").addClass("error",300);
						break;
					case 4:
						$("#analysisError").text("End date needs to be within 24hr of the begin time").slideDown();
						$("#timeEnd").addClass("error",300);
						break;	
				}

				$("#dataTableButton").addClass("disabled");

				$(".fa-calendar").removeClass("fa-calendar").addClass("fa-warning");

				$(document).trigger("analysisOff");

				updateURL();
			}
		});

		// this clears the dates from the analyze section, turning off the feature
		$("#clearAnalysisButton").click(function (event) {
			event.preventDefault();
			$(document).trigger("analysisClear");
		});

		$(document).on("click","#dataTableButton:not(.disabled)", function (){

				openDataTable();
			

		});
	// }

	//////////////////////////
	//	Tracking Functions  //
	//////////////////////////
	// {

		getTrackingLayer = function () 
		{

			var baseAnalysisURL = "https://www.pwgeo.org/datasets/DB/TRANSPORTATION/AVL/0.43/plots_trail_increment_seq.map?map_projection=epsg:3857";

			// the format that the mapserver takes for asset IDS is:   'assetId','assetId','assetId'
			// so we're going to take our tracking list and make it look like that
			var trackedAssets = "";
			$.each(config.tracking.trackingList, function (index) {
				trackedAssets += "'" + config.tracking.trackingList[index] + "',";
			});
			trackedAssets = trackedAssets.slice(0, -1); 

			config.tracking.assetIds = trackedAssets;

			// turn off our overlays
			turnOffOverlays();

			// if we're analyzing, do the following
			if(validateTimes() === true)
			{
				var start = createDate($("#timeBegin").val());
					start = start["year"] + "-" + start["month"] + "-" + start["day"] + " " + start["hours"] + ":" + start["minutes"];
				var end = createDate($("#timeEnd").val());
					end = end["year"] + "-" + end["month"] + "-" + end["day"] + " " + end["hours"] + ":" + end["minutes"];

				config.tracking.timeBegin = start;
				config.tracking.timeEnd = end;

				if(config.tracking.analysisLayer !== null)
				{
					$.each(config.tracking.trackingLayers, function (index) {
						config.tracking.trackingLayers[index].setVisible(false);
					});

					config.tracking.analysisLayer.getSource().getParams().veh_id = trackedAssets;
					config.tracking.analysisLayer.getSource().getParams().time_indx1 = start;
					config.tracking.analysisLayer.getSource().getParams().time_indx2 = end;
					config.tracking.analysisLayer.setVisible(true);
					
				}
				else
				{

					config.tracking.analysisLayer = new ol.layer.Image({
			            	source: new ol.source.ImageWMS({
								params: {
									"layers": "avl_plot", 
										"veh_id": trackedAssets,
										"time_idx1": start,
								        "time_idx2": end,
								        "display": "Analyze",	                
										"transparent": "true",
								        "fleet_name": "SaintPaul",
								        "fleet_passthru": ""
								    },
								url: "https://www.pwgeo.org/datasets/DB/TRANSPORTATION/AVL/0.43/plots_trail_increment_seq.map?map_projection=epsg:3857"
							}),
							visible: false
						});

						map.addLayer(config.tracking.analysisLayer);
						config.tracking.analysisLayer.setVisible(true);

				}
			}
			else //otherwise, we're just tracking and not analyzing
			{
				// if we've already added tracking layers before, we just need to change the asset IDs being used
				// then reload the layer, and set it to visible
				if(config.tracking.trackingLayers !== null)
				{
					$.each(config.tracking.trackingLayers, function (index) {
						config.tracking.trackingLayers[index].getSource().getParams().asset_ids = trackedAssets;
						// salt added on layer redraw
						//config.tracking.trackingLayers[index].redraw();
						config.tracking.trackingLayers[index].setVisible(true);
					});
				}

				// otherwise, if config.tracking.trackingLayers is still undefined, that means we need to 
				// create our tracking layers, add them to the map, and turn their visibility on
				else
				{

					// (we have multiple tracking layers, a points layer and a trails layer)

					config.tracking.trackingLayers = {
			            "Tracking Trails": new ol.layer.Image({
			            	source: new ol.source.ImageWMS({
								params: {
											"layers": "avl_plot", 	                
											"transparent": "true",
									        "fleet_name": "SaintPaul",
									        "fleet_passthru": "",
									    	"asset_ids": trackedAssets,
							        		"display": "Tracking"
						        		},
								url: "https://www.pwgeo.org/datasets/DB/TRANSPORTATION/AVL/0.43/plots_trail_tracking.map?map_projection=epsg:3857"
							}),
							visible: false
						}),
						"Tracking Points": new ol.layer.Image({
			            	source: new ol.source.ImageWMS({
								params: {
											"layers": "avl_plot", 	                
											"transparent": "true",
									        "fleet_name": "SaintPaul",
									        "fleet_passthru": "",
									    	"asset_ids": trackedAssets,
							        		"display": "Tracking"
										},
								url: "https://www.pwgeo.org/datasets/DB/TRANSPORTATION/AVL/0.43/plots_tracking.map?map_projection=epsg:3857"
							}),
							visible: false
						})
					};

					$.each(config.tracking.trackingLayers, function (index) {
						map.addLayer(config.tracking.trackingLayers[index]);
						config.tracking.trackingLayers[index].setVisible(true);
					});
				}
			}

			zoomToTrackedAsset();
		}

		// this adds an asset selected from the assets list to the tracking list
		addAssetToTracking = function (assetId)
		{
			$(document).trigger("trackingOn");

			// add the new tracking item to the tracking list,
			$(".trackingList").append("<span class='trackingListItem trackedAsset' assetId = '" + assetId + "'><i class='fa fa-times'> </i>" + assetId + "<i class='fa fa-external-link'> </i></span>")
			.children(".trackingListItem:last-child")
			.hide();

			// but show using nifty animations
			if($(".trackingList").children(".trackingListItem").length == 1)
			{ // the tracking list is closed and there are no items being tracked
				
				$(".trackingListItem:last-child").show();
				expandSidebarMenu($("#tracking"));
			}
			else if ($(".trackingList").children(".trackingListItem").length > 1 && $("#tracking").hasClass("sidebar-menu-open") == true)
			{	//the tracking list is open and there is more than one item
				
				$(".trackingListItem:last-child").slideDown("fast");
			}
			else if($(".trackingList").children(".trackingListItem").length > 1 && $("#tracking").hasClass("sidebar-menu-open") == false)
			{	// the tracking list is closed and there is more than one item
				
				expandSidebarMenu($("#tracking"), function () {
					$(".trackingListItem:last-child").slideDown("fast");
				});
			}

			updateTrackingList(assetId);

			assetListHeight();
		}

		showActiveLayers = function ()
		{

			if($(".layer.selected").length > 0)
			{
				$(".layer.selected").toggleLayer("on");
			}
			else
			{
				// if there are no layers selected, select this by default on load
				$(".panel-option.layer.default").toggleLayer("on");
			}
		}

		removeFromTracking = function (assetId)
		{

			// turn off visibility
			$.each(config.tracking.trackingLayers, function (index) {
				config.tracking.trackingLayers[index].setVisible(false);
			});

			// we want to remove the tracked item from our variable, trackingList
			// so we find the position of the clicked asset in the array 
			var positionOfAsset = $.inArray(assetId, config.tracking.trackingList);

			//then remove it. It shouldn't equal -1, but we'll check to be safe 
			if(positionOfAsset != -1)
			{
				config.tracking.trackingList.splice(positionOfAsset, 1);
			}

			//animate the removal
			$(".trackedAsset[assetId='" + assetId + "']").slideUp("fast", function(){
				$(this).remove();
				assetListHeight();
			});

			// if we're down to zero on our tracking list, that means we need to show our overlays 
			if(config.tracking.trackingList.length == 0)
			{
				$(document).trigger("analysisOff");
				$(document).trigger("trackingOff");

			}
			// otherwise, refresh our tracking layer with one less tracking item (the one being removed here)
			else
			{
				$(document).trigger("trackingChange");
			}

			updateURL();
		}

		// this updates the tracking list variable to include all tracked assets
		updateTrackingList = function (assetId)
		{
			//add item to tracking list 
			config.tracking.trackingList.push(assetId);

			//make sure the tracking List is Unique
			config.tracking.trackingList = $.unique(config.tracking.trackingList);
		}

		updateCollapsedTrackingList = function ()
		{
			$("#collapsed-trackingList").empty();

			if(config.tracking.trackingList.length > 0)
			{
				$("#collapsed-trackingContainer").show();
			}
			else
			{
				$("#collapsed-trackingContainer").hide();
			}

			for(var x = 0; x < config.tracking.trackingList.length; x++)
			{
				$("#collapsed-trackingList").append("<span class='collapsed-trackingListItem trackedAsset' assetId='" + config.tracking.trackingList[x] + "'>" + config.tracking.trackingList[x] + "</span>");
			}
		}

		zoomToTrackedAsset = function (assetString)
		{
			//debugger;
			var trackedAssets = "";
			$.each(config.tracking.trackingList, function (index) {
				trackedAssets += "'" + config.tracking.trackingList[index] + "',";
			});
			trackedAssets = trackedAssets.slice(0, -1); 

			
			if(config.tracking.trackingList.length > 0)
			{
				// tracking
				if (!$("#analysis").hasClass("sidebar-menu-active"))
				{
					var url = "http://pwultra5.ci.stpaul.mn.us/cgi-bin/avl/avl_lolli.03.pl?mode=getBbox&epsg=3857&asset_id=" + trackedAssets + "&salt=" + Math.random();
				}
				else  // if we're analyzing
				{
					var url = "http://pwultra5.ci.stpaul.mn.us/cgi-bin/avl/avl_lolli.03.pl?mode=getBboxTrails&epsg=3857&asset_id=" + trackedAssets + "&time_idx1=" + config.tracking.timeBegin + "&time_idx2=" + config.tracking.timeEnd + "&salt=" + Math.random();
				}

				// get a JSON that tells us where the assets are in latitude and longitude
				$.getJSON(url, function(data) {

					// if the number of assets being tracked is 1 and we're not analyzing, all we need to do is pan to where that asset is and zoom in 
					if(data.numAssets == 1 && !$("#analysis").hasClass("sidebar-menu-active"))
					{

						var lonlat = new ol.geom.Point([data.coords[0], data.coords[1]]);

						var pan = ol.animation.pan({
							duration: 500,
							source: (map.getView().getCenter())
						});
						map.beforeRender(pan);
						map.getView().setCenter([data.coords[0], data.coords[1]]);

						if(map.getView().getZoom() < (config.map.maxZoom - 2))
						{
							map.getView().setZoom(config.map.maxZoom); 
						}
						
					}
					// otherwise, if we're tracking more than one asset, we need to zoom to the area represented by the bounding box
					// of the currently tracked assets. 
					else
					{

						// create an array that describes our extent/bbox
						var bounds = [data.coords[0], data.coords[1], data.coords[2], data.coords[3]];

						// get the center of those bounds
						var center = ol.extent.getCenter(bounds);

						bounds = ol.extent.buffer(bounds, config.tracking.trackingBufferSize);

						map.getView().fitExtent(bounds, map.getSize());

					}

				});
			}
		}


		$(document).on("trackingOn", function () {

			config.map.state = "tracking";

			turnOffOverlays();

			//disable ability to change fleets
			$("#menu-fleets").addClass("disabled").children("span").css("color","#666666");
			//disable layers
			$("#menu-layers").removeClass("menuItem").addClass("disabled").children("span").css("color","#666666");

			$("#tracking").addClass("sidebar-menu-active");

			$(".trackingList").show();

			$(document).trigger("trackingChange");
		});

		$(document).on("trackingChange", function () {

			getTrackingLayer();

			if(config.tracking.trackingList.length == 1 && validateTimes())
			{
				$("#dataTableButton").removeClass("disabled");
			}
			else
			{
				$("#dataTableButton").addClass("disabled");
			}

		});

		$(document).on("trackingOff", function () {

			config.map.state = "default";

			// close tracking
			$(".trackingList").slideUp(100).empty();

			if(config.tracking.trackingLayers != null)
	     	{
	     	 	$.each(config.tracking.trackingLayers, function (index) {
					config.tracking.trackingLayers[index].setVisible(false);
				});
	     	}

			// add back our other layers based on what's selected in the layers panel
			// if we're not tracking, turn on the assigned layers				
			config.overlay.setVisible(true);

			// reset list
			config.tracking.trackingList = [];
			config.tracking.assetIds = null;

			collapseSidebarMenu($("#tracking"));
			$("#menu-fleets").removeClass("disabled").children("span").css("color","");
			$("#menu-layers").removeClass("disabled").children("span").css("color","");
			$("#tracking").removeClass("sidebar-menu-active");
			$("#analysis").removeClass("sidebar-menu-active");

			if($(".layer.selected").length > 0)
			{
				$(".layer.selected").toggleLayer("on");
			}
			else
			{
				// if there are no layers selected, select this by default on load
				$(".panel-option.layer.default").toggleLayer("on");
			}

			zoomToFullExtent();
		});

		// when a user clicks on an item in the asset list, this function adds that asset to the tracking list
		// and updates the trackingList variable
		$(document).on("click",".assetListItem", function () {
		
			//check for duplicates
			// If there are no duplicates and there arent too many items in the tracking list, add the asset to tracking and update our list
			if($.inArray($(this).attr("value"), config.tracking.trackingList) == -1 && config.tracking.trackingList.length < config.tracking.trackingLimit)
			{
				addAssetToTracking($(this).attr("value"));
				
				if(validateTimes())
				{
					$(document).trigger("analysisOn");
				}
				else
				{
					$(document).trigger("trackingOn");
				}

				updateURL();
			}

			// if the item being chosen is a duplicate, highlight that item in the list
			else if ($.inArray($(this).attr("value"), config.tracking.trackingList) != -1)
			{
				$("[assetid='" + $(this).attr("value") + "']").animate({
					backgroundColor:  config.colors.disabled
				}, 50).delay(50).animate({backgroundColor: config.colors.backgroundDark},200, function () {
					$(this).removeAttr('style');
				});
			}
			// if our tracking list is too long, highlight the list to let the user know they can't add more
			else if ( config.tracking.trackingList.length == config.tracking.trackingLimit)
			{
				$(".trackingList").animate({
					backgroundColor:  config.colors.disabled
				}, 50).delay(50).animate({backgroundColor: config.colors.backgroundDark},200, function () {
					$(this).removeAttr('style');
				});

			}

			assetListHeight();
			updateCollapsedTrackingList();
		});	

		// when a user clicks the "x" button next to an item being tracked, this removes that item from the 
		// tracking list and closes the appropriate windows if it's the last item to be removed
		$(document).on("click",".trackingListItem > i.fa-times", function ()
		{
			removeFromTracking($(this).parent().text().trim());
		});

		$(document).on("click",".collapsed-trackingListItem", function ()
		{
			removeFromTracking($(this).text());

			$(this).remove();

			if($(".collapsed-trackingListItem").length == 0)
			{
				$("#collapsed-trackingContainer").slideUp();
			}
		});

		$(document).on("click",".fa-external-link", function () {

			var assetId = $(this).parent().attr("assetid");
			removeFromTracking(assetId);

			window.open("tracking.html?tracking=" + assetId, "_blank", "height=600, width=600");
		});
	// }

	/////////////////
	//   Legend	   //
	/////////////////
	// {
		$(document).on("click",".legend-collapsed > .fa-chevron-down", function () {
			$("#legend").switchClass("legend-collapsed","legend-selected", 200);
			
			$("#legend").children(".fa").flipChevron();
		});

		$(document).on("click",".legend-selected > .fa-chevron-up", function () {
			$("#legend").switchClass("legend-selected","legend-collapsed", 50);
			$("#legend").children(".fa").flipChevron();
		});
	// }

	///////////////////
	// Mimimize Nav  //
	///////////////////
	// {
		function toggleMinimizeNav ()
		{
			if($("#nav-bar").hasClass("minimized"))
			{
				if($("#menu-assets").hasClass("menu-open"))
				{
					$("#sidebar").show();
				}
				$("#nav-bar").removeClass("minimized", 0, function () {
					positionZoomControl();
				});	
				$("#nav-bar").animate({ marginLeft: 0});
				$("nav").children().show();

				updateURL();
			}
			else
			{
				$("#sidebar").hide();
				$("nav").children("*:not(#nav-bar)").hide(10);
			    $("#nav-bar").animate({ marginLeft: parseInt($("#nav-bar").css('marginLeft'),10) == 0 ? $("#nav-bar").outerWidth() - 50 : 0 });
				$("#nav-bar").addClass("minimized",10).html("<span class='fa fa-chevron-down'> </span>").promise().done(function () {
					updateURL();
					positionZoomControl();
				});	
				
			}
		}

		// 
		$("#nav-minimize-button").click(toggleMinimizeNav);
		$(document).on("click", ".minimized", toggleMinimizeNav);
	// }

	////////////////////
	//	Collapse Nav  //
	////////////////////
	// {
		$("#nav-collapsed-button").click(function () {
			$("#nav-menu-container").slideToggle();
		});

		 toggleCollapsedNav = function()
	     {
		 		$("nav").addClass("collapsed");
				$("#nav-bar").removeClass("minimized").show();
				$("#nav-title").show();	
				$("#nav-collapsed-button").show();
				$("#nav-menu-container").hide();
				$("#sidebar").hide();
				$("#menu-assets").attr("data-target","panel-assets");

				if(config.tracking.trackingList.length > 0)
				{
					$("#collapsed-trackingContainer").show();
				}

				$(".legend-selected").removeClass("legend-selected").addClass("legend-collapsed");
	     }

	    //for now, when the window resizes, we close all menus
	    // also, depending on the size of the screen, we add different classes and show certain elements
		$(window).resize(function () {
			
			$(".menu-open").each(function () {
				$(this).toggleNavMenu("close", afterAssetListToggle);
			});

			if($("html").width() < 768)
			{
				toggleCollapsedNav();
				positionZoomControl();
			}
			else
			{
				$("#menu-assets").attr("data-target","sidebar");

				if($("nav").hasClass("collapsed"))
				{
					$("nav").removeClass("collapsed");

					$("#panel-assets").slideUp();
				}
				
				$("#nav-menu-container").show();
				positionFleetsPanel();
				positionZoomControl();
				assetListHeight();
			}

			redrawOverlays();
			updateURL();
		});

		// replace default icons in open layers zoom controls
		$(".ol-zoom-in").html("<span class='fa fa-chevron-up'> </span>");
		$(".ol-zoom-out").html("<span class='fa fa-chevron-down'> </span>");
	// }

});


///////////////////////////////////////////////////////////////////////////////////
// After all click handlers are created and the window has loaded, set the state //
///////////////////////////////////////////////////////////////////////////////////

$(window).load(function () {
	
	getState();
	updateZoomControl();
	assetListHeight();
	positionZoomControl();
	positionFleetsPanel();
	preventMoving = false;

	// if, on load, the screen width is less than 768px (smartphone), set some states
	if($("html").width() < 768)
	{
		toggleCollapsedNav();
		window.scrollTo(0, 1);
	}
	
});
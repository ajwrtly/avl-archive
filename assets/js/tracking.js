var trackedAsset;

$(document).ready(function () {

	trackedAsset = getUrlVars()["tracking"];

	$("#asset").text(trackedAsset);

	mapView = new ol.View({
		  center: config.map.defaultCenter,
		  zoom: config.map.defaultZoom,
		  maxZoom: config.map.maxZoom,
		  minZoom: config.map.minZoom
	});

	map = new ol.Map({
		controls: ol.control.Zoom(),
		target: 'map',
		view: mapView,
		attributions: []
	});

	// map layers are stored in a seperate file called layers.js
	// on load we'll always add our basemaps
	map.addLayer(config.basemaps.bw);
	config.basemaps.bw.setVisible(true);

	getTrackingLayers();

	setInterval(redrawLayers, 10000);

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

	function redrawLayers()
	{
		var stateVariables = getUrlVars();

		$.each(config.tracking.trackingLayers, function (index){

			config.tracking.trackingLayers[index].getSource().updateParams({
				"_olSalt":  Math.random()
			});
			
		});

		zoomToTrackedAsset(trackedAsset);
	}

	function zoomToTrackedAsset(assetString)
	{
		var url = "http://pwultra5.ci.stpaul.mn.us/cgi-bin/avl/avl_lolli.03.pl?mode=getBbox&epsg=3857&asset_id='" + assetString + "'&salt=" + Math.random();

		// get a JSON that tells us where the assets are in latitude and longitude
		$.getJSON(url, function(data) {

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

		});
	}

	function getTrackingLayers() 
	{

		var baseAnalysisURL = "https://www.pwgeo.org/datasets/DB/TRANSPORTATION/AVL/0.43/plots_trail_increment_seq.map?map_projection=epsg:3857";

		config.tracking.trackingLayers = {
            "Tracking Trails": new ol.layer.Image({
            	source: new ol.source.ImageWMS({
					params: {
								"layers": "avl_plot", 	                
								"transparent": "true",
						        "fleet_name": "SaintPaul",
						        "fleet_passthru": "",
						    	"asset_ids": "'" + trackedAsset + "'",
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
						    	"asset_ids":  "'" + trackedAsset + "'",
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
		

		zoomToTrackedAsset(trackedAsset);
	}

});
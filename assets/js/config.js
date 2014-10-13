var fromProjection = new ol.proj.Projection({code: "EPSG:4326"}); // transform from WGS 1984
var toProjection = new ol.proj.Projection({code: "EPSG:3857"});



var config = {

	"map": 
	{
		//"projection": new ol.proj.Projection({code: "EPSG:3857"}),
		"defaultCenter": new ol.proj.transform([-93.0936,44.9442], "EPSG:4326", "EPSG:3857"),
		//"extent": new ol.geom.MultiPoint([-95,43,-92,46],'XY').transform(fromProjection,toProjection),
		"defaultZoom": 13,
		"maxZoom": 18,
		"minZoom": 12,
		"bounds": [-93.6029,44.5978,-92.7452,45.1118],
		"state": "default",
		"activeOverlays": []
	},

	"fleet": 
	{
		"grouping": null, 
		"fleetId": null, 
		"fleetNameFormatted": null        
	},

	"tracking": 
	{
		"trackingLimit": 3, 
		"trackingList": [], 
		"assetIds": null, 
		"timeBegin": null, 
		"timeEnd": null,
		"trackingBufferSize": 1000,
		"trackingLayers": null,
		"analysisLayer": null
	},

    "basemaps": {
    	"bw": new ol.layer.Tile({
        	extent: new ol.proj.transformExtent([-93.6029,44.5978,-92.7452,45.1118], "EPSG:4326", "EPSG:3857"),
        	source: new ol.source.XYZ({url: "http://maps.sco.wisc.edu/avl/avl-tiles/tiles/{z}/{x}/{y}.png"}),
      		visible: true
        }),
    	"night": new ol.layer.Tile({
        	extent: new ol.proj.transformExtent([-93.6029,44.5978,-92.7452,45.1118], "EPSG:4326", "EPSG:3857"),
        	source: new ol.source.XYZ({url: "http://maps.sco.wisc.edu/avl/avl-tiles/nightview-tiles/{z}/{x}/{y}.png"}),
        	visible: false
        })
    },
    "overlay": new ol.layer.Image({
	            	source: new ol.source.ImageWMS({
						params: {
								"fleetname": "'undefined'", 	
								"grouping": "'undefined'",
								"layers": "current,trail"
						    },
						url: "https://www.pwgeo.org/datasets/DB/TRANSPORTATION/AVL/0.44/avl_points.03.map?map_projection=epsg:3857"
					}),
				visible: true
	}),

	"colors": 
	{
		"backgroundDark": "#222222",
		"backgroundBase": "#333333",
		"backgroundLight": "#444444",
		"disabled": "#555555"
	}


		
	



};
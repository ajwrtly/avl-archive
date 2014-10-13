$(document).ready(function () {
	
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

	var assetInfo = getUrlVars();

	$("#asset").text(assetInfo.assetId);

	function getData()
	{
		var url = "http://pwultra5.ci.stpaul.mn.us/cgi-bin/avl/avl_lolli.03.pl?mode=getTrailData&epsg=3857&time_idx1=" + assetInfo.timeBegin + "&time_idx2=" + assetInfo.timeEnd + "&asset_id=" + assetInfo.assetId;
		
		$.getJSON(url, function (data) {
				console.log(data);
				var tableHeader = "";
				var tableBody = "";

				tableHeader += "<thead><tr>";

				var keyNames = Object.keys(data);
				var firstKeyName = keyNames[0];
				var headerNames = Object.keys(data[firstKeyName]);

				for(i in headerNames)	
				{
					tableHeader += "<th>" + headerNames[i] + "</th>";
				}			
				
				tableHeader += "</tr></thead>";
			
				$.each(data, function (entry) {

					tableBody += "<tr>";

					$.each(data[entry], function(attr) {
						tableBody += "<td>" + data[entry][attr] + "</td>";
					});

					tableBody += "</tr>";

				});

				var toAppend = "<table>" + tableHeader + tableBody + "</table>";

			$("#dataTable").html(toAppend);

		});
	}

	getData();


});
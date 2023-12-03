// Store our API endpoint as queryUrl.
let queryUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

let lacMesgouezCoords = [51.429167, -75.096111];
let mapZoomLevel = 3;
let grades = [10, 30, 50, 70, 100, 200, 300]; //points at which color is going to change
// source of coloring based on depth https://earthguideweb-geology.layeredearth.com/earthguide/lessons/e/e3/e3_2.html
// this coloring looks to have more sence than suggested in the challenge as far as
// lower depth -> closer to the Earth’s surface -> cause more damage
let yellowBorder=70;
let greenBorder=300;
let gradeColors = [];
// create a scale of colors for circleMarkers to use
for (let i of grades){
    if (i<=yellowBorder){
        gradeColors.push(chroma.scale(['red', 'yellow'])(i/yellowBorder).hex());
    }
    else if (i<=greenBorder) {
        gradeColors.push(chroma.scale(['yellow', 'green'])((i-yellowBorder)/(greenBorder-yellowBorder)).hex());
    }
} 
gradeColors.push('darkgreen')

function depthIntoColor(depth){
    // convert depth into one of the colors from gradeColors set, assuming that boundaries of color are set in grades list
    let color=gradeColors[0];
    for (let i=0; i<grades.length; i++){
        if (i != (grades.length-1)){
            if ((depth<=grades[i+1])&&(depth>grades[i])) {
                color=gradeColors[i+1]; 
                return color;
            }
        }
        else if ((i==(grades.length-1))&& (depth>grades[i])){
            color=gradeColors[i+1];
            return color;
        }
    }
    return color;
}

function convertTimestamptoTime(unixTime) {
    // convert unix time into YYYY-MM-DD format
    // Create a new Date object, assuming that out input is in  milliseconds 
    let dateObj = new Date(unixTime);
    // year as 4 digits (YYYY)
    let year = dateObj.getFullYear();
    // month as 2 digits (MM)
    let month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
    // date as 2 digits (DD)
    let day = ("0" + dateObj.getDate()).slice(-2);
    // combine the year, month, and day into one string to create the "YYYY-MM-DD" format
    let output=`${year}-${month}-${day}`;
    return output;
}
 

function createMap(earthquakeMarkers) {
    // Create the tile layer that will be the background of our map.
    let streetmap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    // create alternative layer for better understanding of area geography 
    let geolayer = L.tileLayer('https://wxs.ign.fr/{apikey}/geoportail/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE={style}&TILEMATRIXSET=PM&FORMAT={format}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
        attribution: '<a target="_blank" href="https://www.geoportail.gouv.fr/">Geoportail France</a>',
        apikey: 'choisirgeoportail',
        format: 'image/jpeg',
        style: 'normal'
    });
    
    // create tectonic plates layer
    let boundariesTectonic=L.geoJSON(dataB, {style: {color: "orange", weight: 1}});

    // Create a baseMaps object to hold the streetmap layer.
    let baseMaps={"StreetMap":streetmap,"GeoMap":geolayer};

    // Create an overlayMaps object to hold the earthquakeMarkers and boundariesTectonic layers.
    let overlayMaps={"Earthquake":earthquakeMarkers, "Tectonic Plates Boundaries":boundariesTectonic};
    // Create the map object with options.
    let map = L.map("map", {
        center: lacMesgouezCoords,
        zoom: mapZoomLevel,
        layers:[streetmap,earthquakeMarkers]
      });

    // Create a layer control, and pass it baseMaps and overlayMaps. Add the layer control to the map.
    L.control.layers(baseMaps, overlayMaps, {
      collapsed: false
    }).addTo(map);
    

    // create a legend in the bottom left of a map
    let legend = L.control({position: 'bottomleft'});
    legend.onAdd = function (map) {
    // creatre separate html div section for a legend with classes 'info' and 'legend'
    let div = L.DomUtil.create('div', 'info legend');
    // populate a legend items  with color of block items and description
    labels = ['<center><strong> Earthquake Depth <br> (km)  </strong></center>'];
    let htmlLine='<i style="background:' + gradeColors[0] + '"></i> <' + grades[0] + '<br>';
    div.innerHTML +=labels.push(htmlLine);

    for (let i = 0; i < grades.length; i++) {
        htmlLine='<i style="background:' + gradeColors[i+1] + '"></i> '+
        grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');

        div.innerHTML +=labels.push(htmlLine);
        }
    div.innerHTML = labels.join('<br>');
    return div;
    };
    // add a legend to a map
    legend.addTo(map);

  }

// Perform a GET request to the query URL/
d3.json(queryUrl).then(function (data) {
  // Once we get a response pull the "geometry" property from data
    let features = data.features;
  // Initialize an array [latitude, longitude] to hold earthquakes markers
    let earthquakeMarkers=[];
    let sourceData=data.metadata.title;

    for (let i=0;i<features.length;i++){
        if((features[i].properties)&&(features[i].geometry)){
            // find a size of a marker
            let magSize=features[i].properties.mag;
            let magType=features[i].properties.magType;
            let title=features[i].properties.title;
            //find a color of a marker
            let depth=features[i].geometry.coordinates[2];
            let colorFill=depthIntoColor(depth);
            // gather additional info shown in pop-up
            let timeOccured = convertTimestamptoTime(features[i].properties.time);
            // compose a marker
            earthquakeMarkers.push(
                L.circleMarker(
                    [features[i].geometry.coordinates[1],features[i].geometry.coordinates[0]],
                    {   fill:true,
                        fillOpacity: 1,
                        fillColor: colorFill,
                        color: "black",
                        weight: 0.5,
                        radius: magSize*magSize}).bindPopup(`<strong>${title}</strong><br> <i> Coordinates</i> : <br> - latitude: <strong>${features[i].geometry.coordinates[1]}</strong>, <br> - longitude:<strong>${features[i].geometry.coordinates[0]}</strong>;<br><i> Time</i>  when the event occurred: <strong>${timeOccured}</strong>;<br><i> Depth</i> : <strong>${depth}km</strong>;<br> <i> Magnitude</i> : <strong>${magSize}</strong> with <strong>${magType}</strong> type <br> <i> Source</i> : ${sourceData}.`)
                    );
        }
    }
    // Create a layer group that's made from the earthquake markers array, and pass it to the createMap function.
    createMap(L.layerGroup(earthquakeMarkers));
    
});



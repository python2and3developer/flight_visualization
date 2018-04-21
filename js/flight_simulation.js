
function FlightSimulation(map, onStartFlight, onEndFlight) {
    this._map = map;
}


FlightSimulation.prototype.animateFlights = function(listOfRoutes, fromDate, toDate){
    var route;

    if (this._animFrameId) {
        window.cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
    }

    this._flights = [];
    this._activeFlights = [];

    this._animIndex = 0;

    listOfRoutes = listOfRoutes.filter(
        dateRoutefilter(fromDate, toDate)
    );

    listOfRoutes.sort(function(a, b){
        var timeA = a["DEP_TIME"].getTime();
        var timeB = b["DEP_TIME"].getTime();

        // Compare the 2 dates
        if(timeA < timeB) {
            return -1;
        } else if(timeA > timeB) {
            return 1;
        } else {
            return 0;
        }
    });

    for (var i=0; i < listOfRoutes.length; i++) {
        route = listOfRoutes[i];

        this._flights.push({
            departure: {
                time : route["DEP_TIME"].getTime(),
                airport: route["DEP"]
            },
            arrival: {
                time: route["ARR_TIME"].getTime(),
                airport: route["ARR"]
            }
        });

    }


}

FlightSimulation.prototype.animate = function(startPoint, endPoint) {
    // Convert the points arrays into Lat / Lng objects
    var sP = new google.maps.LatLng(startPoint[0], startPoint[1]);
    var eP = new google.maps.LatLng(endPoint[0], endPoint[1]);

    // Create a polyline for the planes path

    planePath = new google.maps.Polyline({
        path: [sP, eP],
        strokeColor: '#0f0',
        strokeWeight: 0,
        icons: [{
            icon: FlightSimulation.airplaneIcon,
            offset: '0%'
        }],
        map: mapObject,
        geodesic: true
    });

    trailPath = new google.maps.Polyline({
        path: [sP, sP],
        strokeColor: '#2eacd0',
        strokeWeight: 2,
        map: mapObject,
        geodesic: true
    });

    // Start the animation loop
    this._animFrameId = window.requestAnimationFrame(function() {
        tick(sP, eP);
    });
}

/*
    Runs each animation "tick"
*/

FlightSimulation.prototype._tick = function(startPoint, endPoint) {
    this._animIndex += 0.2;

    // Draw trail
    var nextPoint = google.maps.geometry.spherical.interpolate(startPoint, endPoint, animIndex / 100);
    this._trailPath.setPath([startPoint, nextPoint]);

    // Move the plane
    this._planePath.icons[0].offset = Math.min(this._animIndex, 100) + '%';
    this._planePath.setPath(this._planePath.getPath());

    // Ensure the plane is in the center of the screen
    // mapObject.panTo(nextPoint);

    // We've reached the end, clear animFrameId
    if (animIndex >= 100) {
        window.cancelAnimationFrame(this._animFrameId);
        this._animIndex = 0;
        this.removeTrail();
        setTimeout(function() {

        }, 700);
    } else {
        animFrameId = window.requestAnimationFrame(function() {
            this._tick(startPoint, endPoint);
        });
    }
}

// Remove trail
FlightSimulation.prototype.removeTrail = function() {
    if (this._trailPath){
        this._trailPath.setMap(null);
    }
}
 // Remove airplane symbol, trail and reset everything for the next animation
FlightSimulation.prototype.stop = function() {
    this._removeTrail();
    if (this._trailPath){
        this._planePath.setMap(null);
    }
    window.cancelAnimationFrame(this._animFrameId);
    animIndex = 0;
}

// Symbols use an SVG path

FlightSimulation.airplaneIcon = {
    path: 'M22.1,15.1c0,0-1.4-1.3-3-3l0-1.9c0-0.2-0.2-0.4-0.4-0.4l-0.5,0c-0.2,0-0.4,0.2-0.4,0.4l0,0.7c-0.5-0.5-1.1-1.1-1.6-1.6l0-1.5c0-0.2-0.2-0.4-0.4-0.4l-0.4,0c-0.2,0-0.4,0.2-0.4,0.4l0,0.3c-1-0.9-1.8-1.7-2-1.9c-0.3-0.2-0.5-0.3-0.6-0.4l-0.3-3.8c0-0.2-0.3-0.9-1.1-0.9c-0.8,0-1.1,0.8-1.1,0.9L9.7,6.1C9.5,6.2,9.4,6.3,9.2,6.4c-0.3,0.2-1,0.9-2,1.9l0-0.3c0-0.2-0.2-0.4-0.4-0.4l-0.4,0C6.2,7.5,6,7.7,6,7.9l0,1.5c-0.5,0.5-1.1,1-1.6,1.6l0-0.7c0-0.2-0.2-0.4-0.4-0.4l-0.5,0c-0.2,0-0.4,0.2-0.4,0.4l0,1.9c-1.7,1.6-3,3-3,3c0,0.1,0,1.2,0,1.2s0.2,0.4,0.5,0.4s4.6-4.4,7.8-4.7c0.7,0,1.1-0.1,1.4,0l0.3,5.8l-2.5,2.2c0,0-0.2,1.1,0,1.1c0.2,0.1,0.6,0,0.7-0.2c0.1-0.2,0.6-0.2,1.4-0.4c0.2,0,0.4-0.1,0.5-0.2c0.1,0.2,0.2,0.4,0.7,0.4c0.5,0,0.6-0.2,0.7-0.4c0.1,0.1,0.3,0.1,0.5,0.2c0.8,0.2,1.3,0.2,1.4,0.4c0.1,0.2,0.6,0.3,0.7,0.2c0.2-0.1,0-1.1,0-1.1l-2.5-2.2l0.3-5.7c0.3-0.3,0.7-0.1,1.6-0.1c3.3,0.3,7.6,4.7,7.8,4.7c0.3,0,0.5-0.4,0.5-0.4S22,15.3,22.1,15.1z',
    fillColor: '#000',
    fillOpacity: 1.3,
    scale: 1,
    anchor: new google.maps.Point(11, 11),
    strokeWeight: 0,
};


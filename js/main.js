$(document).ready(function() {
    function durationRoute(route) {
        return (route["ARR_TIME"].getTime() - route["DEP_TIME"].getTime()) / 1000
    }

    function distanceRoute(route) {
        var departureAirport = AIRPORTS[route["DEP"]]
        var arrivalAirport = AIRPORTS[route["ARR"]]


        if (!departureAirport) {
            return null
        }

        if (!departureAirport.latitude || !departureAirport.longitude) {
            return null
        }

        if (!arrivalAirport) {
            return null
        }

        if (!arrivalAirport.latitude || !arrivalAirport.longitude) {
            return null
        }

        var latLngA = new google.maps.LatLng(departureAirport.latitude, departureAirport.longitude);
        var latLngB = new google.maps.LatLng(arrivalAirport.latitude, arrivalAirport.longitude);

        return google.maps.geometry.spherical.computeDistanceBetween(latLngA, latLngB);
    }

    function calculateTrafficData(listOfRoutes) {
        var route;
        var trafficData = {
            airports : {}
        }

        var maxArrivalsDepartures = 0;

        for (var i=0; i < listOfRoutes.length; i++) {
            route = listOfRoutes[i];
            if (typeof trafficData.airports[route["DEP"]] === "undefined") {
                if (AIRPORTS[route["DEP"]]) {
                    trafficData.airports[route["DEP"]] = {
                        airport: AIRPORTS[route["DEP"]],
                        arrivalsDepartures: 1
                    }

                    maxArrivalsDepartures = Math.max(maxArrivalsDepartures, 1);
                }
            } else {
                trafficData.airports[route["DEP"]].arrivalsDepartures += 1;
                maxArrivalsDepartures = Math.max(maxArrivalsDepartures, trafficData.airports[route["DEP"]].arrivalsDepartures);
            }

            if (typeof trafficData.airports[route["ARR"]] === "undefined") {
                if (AIRPORTS[route["ARR"]]) {
                    trafficData.airports[route["ARR"]] = {
                        airport: AIRPORTS[route["ARR"]],
                        arrivalsDepartures: 1
                    }
                }

                maxArrivalsDepartures = Math.max(maxArrivalsDepartures, 1);
            } else {
                trafficData.airports[route["ARR"]].arrivalsDepartures += 1;
                maxArrivalsDepartures = Math.max(maxArrivalsDepartures, trafficData.airports[route["ARR"]].arrivalsDepartures);
            }
        }

        trafficData.maxArrivalsDepartures = maxArrivalsDepartures;

        return trafficData
    }

    function AirportTrafficGM(container, data) {
        this.$container = $(container);

        this.data = data;
        this._circleMarkers = []

        this._scale = 130000;

        var mapElement = this.$container.find(".map")[0];

        this.map = new google.maps.Map(mapElement, {
            draggable: true,
            panControl: false,
            streetViewControl: false,
            scrollwheel: true,
            scaleControl: false,
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            zoom: 5,
            center: new google.maps.LatLng(47.674324, 12.515118),
            styles: MAP_STYLES
        });

        this._infoWindow = null;

        this._$dateRange =  this.$container.find(".date-range input");
        this._$dateRange.daterangepicker()

        this.$container.find(".date-range span.calendar-icon").click(function(){
            this._$dateRange.click()
        }.bind(this))

        this._$dateRange.daterangepicker({
            locale: {
                format: 'DD/MMM/YYYY'
            }
        }, function(start, end, label) {
            var startDate = start.toDate();
            var endDate = end.toDate();

            this._update(startDate, endDate)
        }.bind(this))
    }

    AirportTrafficGM.prototype.plotRoutes = function(listOfRoutes) {
        var airport, airportCode, airportCircle, trafficData, item;
        var self = this;

        this.clearMap();
        if (this.infoWindow) {
            this.infoWindow.close()

             this.infoWindow = null;
        }

        if (listOfRoutes.length == 0) {
            return
        }
        var maxAirportTraffic = 0;
        var graphData = []

        trafficData = calculateTrafficData(listOfRoutes);
        var maxArrivalsDepartures = trafficData.maxArrivalsDepartures;


        for (airportCode in trafficData.airports) {
            if (trafficData.airports.hasOwnProperty(airportCode)) {
                airport = trafficData.airports[airportCode].airport;

                graphData.push({
                    name: airport.name,
                    icao: airportCode,
                    totalArrivalsDepartures: trafficData.airports[airportCode].arrivalsDepartures,
                    latitude: airport.latitude,
                    longitude: airport.longitude
                })

            }
        }

        graphData.sort(function(A,B){
            if (A.totalArrivalsDepartures > B.totalArrivalsDepartures) {
                return -1
            } else if (A.totalArrivalsDepartures < B.totalArrivalsDepartures) {
                return 1
            } else {
                return 0
            }
        })

        for (var i=0; i < graphData.length; i++) {
            item = graphData[i];

            airportCircle = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 0,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                zIndex: i,
                clickable: true,
                map: this.map,
                center: new google.maps.LatLng(item.latitude, item.longitude),
                radius: Math.sqrt(item.totalArrivalsDepartures/ maxArrivalsDepartures) * this._scale
            });

            airportCircle.name = item.name;
            airportCircle.icao = item.icao;
            airportCircle.totalArrivalsDepartures = item.totalArrivalsDepartures;

            airportCircle.addListener('click', function(ev) {
                if (self.infoWindow) {
                    self.infoWindow.close()
                }

                self.infoWindow = self._createInfoWindow(this)

                self.infoWindow.open(self.map);
                self.infoWindow.setPosition(this.center);
            });

            this._circleMarkers.push(airportCircle)
        }
    }

    AirportTrafficGM.prototype._createInfoWindow = function(airportCircle) {
        var content = "<div class='infowindowcontent'><h3>" + airportCircle.name + " (" + airportCircle.icao + ")" + "</h3>";
        content += "<p>Total Number of arrivals and departures: "+ airportCircle.totalArrivalsDepartures+"</p></div>";

        var infoWindow = new google.maps.InfoWindow({
            content: content
        });

        return infoWindow
    }

    AirportTrafficGM.prototype.clearMap = function() {
        for (var i = 0; i < this._circleMarkers.length; i++) {
            this._circleMarkers[i].setMap(null);
        }

        this._circleMarkers = []
    }

    AirportTrafficGM.prototype.update = function(startDate, endDate) {
        if (typeof startDate === 'string' || startDate instanceof String) {
            startDate = new Date(startDate)
        }

        if (typeof endDate === 'string' || endDate instanceof String) {
            endDate = new Date(endDate)
        }


        var dateRange = this._$dateRange.data('daterangepicker')


        dateRange.setStartDate(startDate);
        dateRange.setEndDate(endDate);

        this._$dateRange.trigger('change');

        this._update(startDate, endDate)
    }

    AirportTrafficGM.prototype._update = function(startDate, endDate) {
        var listOfRoutes = _.query(this.data, {
            DEP_TIME: {
                $gte: startDate
            },
            ARR_TIME: {
                $lte: endDate
            }
        })

        this.plotRoutes(listOfRoutes)
    }



    function FlightRoutesGM(container, data) {
        this.$container = $(container);

        this.data = data;
        this._trailPolylines = []

        var $controls = this.$container.find("form.controls")

        var $dateRange = $controls.find(".date-range input")
        $dateRange.daterangepicker()

        $controls.find(".date-range span.calendar-icon").click(function(){
            $dateRange.click()
        })

        this.dateRange = $dateRange.data('daterangepicker')

        var $originAirportSelect = $controls.find(".origin-airport select.airport");
        this.originAirportPicker = new AirportPicker($originAirportSelect);


        var $destinationAirportSelect = $controls.find(".destination-airport select.airport");
        this.destinationAirportPicker = new AirportPicker($destinationAirportSelect);

        $controls.find("button.update").click(this._onUpdate.bind(this))

        var mapElement = this.$container.find(".map")[0];

        this.map = new google.maps.Map(mapElement, {
            draggable: true,
            panControl: false,
            streetViewControl: false,
            scrollwheel: true,
            scaleControl: false,
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            zoom: 5,
            center: new google.maps.LatLng(47.674324, 12.515118),
            styles: MAP_STYLES
        });
    }

    FlightRoutesGM.prototype._onUpdate = function() {
        var startDate = this.dateRange.startDate.toDate();
        var endDate = this.dateRange.endDate.toDate();

        var originAirports = this.originAirportPicker.getValue();
        var destinationAirports = this.destinationAirportPicker.getValue();

        this._update(startDate, endDate, originAirports, destinationAirports)
    }

    FlightRoutesGM.prototype._update = function(startDate, endDate, originAirports, destinationAirports) {
        var query = {
            DEP_TIME: {
                $gte: startDate
            },
            ARR_TIME: {
                $lte: endDate
            }
        };

        if (originAirports) {
            query["DEP"] = {
                $in: originAirports
            }
        }

        if (destinationAirports) {
            query["ARR"] = {
                $in: destinationAirports
            }
        }

        var routes = _.query(this.data, query)

        this.clearMap()
        this.plotRoutes(routes);
    }

    FlightRoutesGM.prototype.update = function(startDate, endDate, originAirports, destinationAirports) {
        this.dateRange.setStartDate(startDate);
        this.dateRange.setEndDate(endDate);

        if (originAirports) {
            this.originAirportPicker.setValue(originAirports)
        } else {
            this.originAirportPicker.setValue([])
        }

        if (destinationAirports) {
            this.destinationAirportPicker.setValue(destinationAirports)
        } else {
            this.destinationAirportPicker.setValue([])
        }

        if (typeof startDate === 'string')
            startDate = new Date(startDate);

        if (typeof endDate === 'string')
            endDate = new Date(endDate);

        this._update(startDate, endDate, originAirports, destinationAirports)
    }

    FlightRoutesGM.prototype.plotRoutes = function(listOfRoutes) {
        var route;

        var processedPaths = {}
        var path;

        for (var i =0; i < listOfRoutes.length; i++) {
            route = listOfRoutes[i];

            var departureAirportCode = route["DEP"]
            var arrivalAirportCode = route["ARR"];

            if (departureAirportCode.localeCompare(arrivalAirportCode)){
                path = departureAirportCode+"-"+arrivalAirportCode
            } else {
                path = arrivalAirportCode+"-"+departureAirportCode
            }

            if (processedPaths.hasOwnProperty(path)){
                continue;
            }

            processedPaths[path] = true;

            var departureAirport = AIRPORTS[departureAirportCode];
            var arrivalAirport = AIRPORTS[arrivalAirportCode];

            if (typeof departureAirport === "undefined" || typeof arrivalAirport === "undefined") {
                continue;
            }

            var startPoint = new google.maps.LatLng(departureAirport["latitude"], departureAirport["longitude"]);
            var endPoint = new google.maps.LatLng(arrivalAirport["latitude"], arrivalAirport["longitude"]);

            trailPath = new google.maps.Polyline({
                    path: [startPoint, endPoint],
                    strokeColor: 'black',
                    strokeWeight: 1,
                    map: this.map,
                    geodesic: true
            });

            this._trailPolylines.push(trailPath)
        }
    }

    FlightRoutesGM.prototype.clearMap = function() {
        for (var i = 0; i < this._trailPolylines.length; i++) {
            this._trailPolylines[i].setMap(null);
        }

        this._trailPolylines = []
    }

    var randomColor = (function(){
      var golden_ratio_conjugate = 0.618033988749895;
      var h = Math.random();
      var hslToRgb = function (h, s, l){
          var r, g, b;
          if(s == 0){
              r = g = b = l; // achromatic
          }else{
              function hue2rgb(p, q, t){
                  if(t < 0) t += 1;
                  if(t > 1) t -= 1;
                  if(t < 1/6) return p + (q - p) * 6 * t;
                  if(t < 1/2) return q;
                  if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                  return p;
              }
              var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
              var p = 2 * l - q;
              r = hue2rgb(p, q, h + 1/3);
              g = hue2rgb(p, q, h);
              b = hue2rgb(p, q, h - 1/3);
          }
          return '#'+Math.round(r * 255).toString(16)+Math.round(g * 255).toString(16)+Math.round(b * 255).toString(16);
      };

      return function(){
        h += golden_ratio_conjugate;
        h %= 1;
        return hslToRgb(h, 0.5, 0.60);
      };
    })();

    function AirportTrafficBubbleGraph(container, data) {
        if (typeof container === 'string' || container instanceof String) {
            container = document.querySelector(container);
        }

        this.data = data;

        this._svg = d3.select(container.querySelector("svg"));
        var diameter = this._svg.attr("data-diameter");

        this._svg
            .attr("width", diameter)
            .attr("height", diameter)
            .attr("class", "bubble");

        this._color = d3.scaleOrdinal(d3.schemeCategory20c);

        this._bubble = d3.pack()
            .size([diameter, diameter])
            .padding(1.5);

        var $container = $(container);
        this._$dateRange =  $container.find(".date-range input");
        this._$dateRange.daterangepicker()

        $container.find(".date-range span.calendar-icon").click(function(){
            this._$dateRange.click()
        }.bind(this))

        this._$dateRange.daterangepicker({
            locale: {
                format: 'DD/MMM/YYYY'
            }
        }, function(start, end, label) {
            var startDate = start.toDate();
            var endDate = end.toDate();

            this._update(startDate, endDate)
        }.bind(this))
    }

    AirportTrafficBubbleGraph.prototype.update = function(startDate, endDate) {
        if (typeof startDate === 'string' || startDate instanceof String) {
            startDate = new Date(startDate)
        }

        if (typeof endDate === 'string' || endDate instanceof String) {
            endDate = new Date(endDate)
        }


        var dateRange = this._$dateRange.data('daterangepicker')


        dateRange.setStartDate(startDate);
        dateRange.setEndDate(endDate);

        this._$dateRange.trigger('change');

        this._update(startDate, endDate)
    }

    AirportTrafficBubbleGraph.prototype._update = function(startDate, endDate) {
        var listOfRoutes = _.query(this.data, {
            DEP_TIME: {
                $gte: startDate
            },
            ARR_TIME: {
                $lte: endDate
            }
        })

        this.plotRoutes(listOfRoutes)
    }


    AirportTrafficBubbleGraph.prototype.plotRoutes = function(listOfRoutes) {
        this._svg.selectAll("*").remove();

        if (listOfRoutes.length == 0) {
            return
        }

        var trafficData = calculateTrafficData(listOfRoutes);
        var classes = []


        for (var airportCode in trafficData.airports) {
            if (trafficData.airports.hasOwnProperty(airportCode)) {
                classes.push({
                    name: trafficData.airports[airportCode].airport.name,
                    arrivalsDepartures: trafficData.airports[airportCode].arrivalsDepartures,
                    code: airportCode
                });
            }
        }

        var root = d3.hierarchy({children: classes})
          .sum(function(d) {return d.arrivalsDepartures; })
          .sort(function(a, b) { return b.arrivalsDepartures - a.arrivalsDepartures; });

        this._bubble(root);

        var node = this._svg.selectAll(".node")
          .data(root.children)
          .enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"; });

        node.append("title")
          .text(function(d) {return d.data.name + ". Quantity of flights: " + d.value; });

        node.on('click', function(d,i){
            d3.select(".airport-name").html(d.data.name + ".<br>" + d.value + " flights");
        })

        node.append("circle")
          .attr("r", function(d) { return d.r; })
          .style("fill", randomColor);

        node.append("text")
          .attr("dy", ".3em")
          .style("text-anchor", "middle")
          .text(function(d) { return d.data.code });
    }

    function AirportTimeLine(container, data) {

        if (typeof container === 'string' || container instanceof String) {
            container = document.querySelector(container)
        }

        var options = {
            height: '400px',
            editable: false,
            selectable: false,
            // min: new Date(2012, 0, 1),                // lower limit of visible range
            // max: new Date(2013, 0, 1),                // upper limit of visible range
            zoomMin: 1000 * 60 * 60,
            zoomMax: 1000 * 60 * 60 * 24
          };

        this.timeline = new vis.Timeline(container.querySelector('.timeline'));
        this.timeline.setOptions(options);

        this._airportPicker = new AirportPicker($(container).find('select'), function (selectedAirport) {
            this._update(this._data, selectedAirport)
        }.bind(this));

        this._data = data;
    }

    AirportTimeLine.prototype.update = function(airportCode, fromDate, endDate) {
        this._airportPicker.setValue(airportCode);
        this._update(this._data, airportCode, fromDate, endDate)
    }

    AirportTimeLine.prototype._update = function(listOfRoutes, airportCode, fromDate, endDate) {
        var route;
        var timelineItems = [];

        listOfRoutes = _.where( listOfRoutes, {
            DEP: airportCode
        });

        for (var i=0; i < listOfRoutes.length; i++) {
            route = listOfRoutes[i];

            var timelineItem = {
                id: i,
                content: route["ARR"],
                start: route["DEP_TIME"],
                end: route["ARR_TIME"]
            }

            var minutes = durationRoute(route);
            var humanDuration = humanizeDuration(minutes * 1000)

            if (AIRPORTS[route["ARR"]] && AIRPORTS[route["ARR"]].name) {
                timelineItem["title"] = AIRPORTS[route["ARR"]].name + ". Duration: " + humanDuration
            } else {
                timelineItem["title"] = "Duration: " + humanDuration
            }

            timelineItems.push(timelineItem);
        }

        this.timeline.setItems(timelineItems)
    }

    function arrivalDeparturesDiagramData(listOfRoutes, airportCode, routesDataHandler) {
        var routesByDate = {};
        var data = {
            listOfDates: [],
            dataSet: {
                arrivals: [],
                departures: []
            }
        }
        var dataItem;
        var route;
        var routeDate;
        var listOfTimestamps;
        var timestamp;
        var date;
        var dateString;
        var departureTime;

        listOfRoutes = _.query( listOfRoutes, {
            $or: [
                {
                    DEP: airportCode
                },
                {
                    ARR: airportCode
                }
            ]
        });

        for (var i =0; i <listOfRoutes.length; i++) {
            route = listOfRoutes[i]

            departureTime = route["DEP_TIME"];

            routeDate = new Date(departureTime.getFullYear(), departureTime.getMonth()+1, departureTime.getDate());
            timestamp = routeDate.getTime()

            if (typeof routesByDate[timestamp] === "undefined") {
                routesByDate[timestamp] = []
            }

            routesByDate[timestamp].push(route);
        }

        listOfTimestamps = Object.keys(routesByDate);
        for(var i =0; i < listOfTimestamps.length; i++) {
            listOfTimestamps[i] = parseInt(listOfTimestamps[i])
        }

        listOfTimestamps.sort(function(a, b){return a-b});

        for(var i =0; i < listOfTimestamps.length; i++) {
            timestamp = listOfTimestamps[i];

            date = new Date(timestamp);

            dateString = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();

            dataItem = routesDataHandler(routesByDate[timestamp]);

            data.listOfDates.push(dateString);
            data.dataSet.arrivals.push(dataItem.arrivals)
            data.dataSet.departures.push(dataItem.departures)
        }

        return data
    }

    function arrivalDeparturesDiagram(canvasContainer, title, listOfRoutes, airportCode, units, minimum_y, routesDataHandler) {

        var processedData = arrivalDeparturesDiagramData(listOfRoutes, airportCode, routesDataHandler);

        if (processedData.length === 0) return;

        var chartColors = {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
        };

		var barChartData = {
			labels: processedData.listOfDates,
			datasets: [{
				label: 'Arrivals',
				backgroundColor: Chart.helpers.color(chartColors.red).alpha(0.5).rgbString(),
				borderColor: chartColors.red,
				borderWidth: 1,
				data: processedData.dataSet.arrivals
			}, {
				label: 'Departures',
				backgroundColor: Chart.helpers.color(chartColors.blue).alpha(0.5).rgbString(),
				borderColor: chartColors.blue,
				borderWidth: 1,
				data: processedData.dataSet.departures
			}]
		};

        var maxValue1 = Math.max.apply(null, processedData.dataSet.arrivals);
        var maxValue2 = Math.max.apply(null, processedData.dataSet.departures);

        var maxValue = Math.max(maxValue1, maxValue2)

        var stepSize = Math.round(maxValue / 9);

        var powerOfTen = Math.pow(10, Math.floor(Math.log10(stepSize)))
        if (stepSize >= 5 * powerOfTen) {
            stepSize =  5 * powerOfTen;
        } else {
            stepSize = powerOfTen;
        }

        if (typeof canvasContainer === 'string' || canvasContainer instanceof String) {
            canvasContainer = document.querySelector(canvasContainer)
        }

        var ctx = canvasContainer.getContext('2d');
        return new Chart(ctx, {
				type: 'bar',
				data: barChartData,
				options: {
					responsive: true,
					legend: {
						position: 'top',
					},
					title: {
						display: true,
						text: title
					},
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true,
                                suggestedMin: 0,
                                min: minimum_y,
                                callback: function (value) { if (Number.isInteger(value)) { return value; } },
                                stepSize: stepSize
                            }
                        }]
                    },
                    tooltips: {
                        callbacks: {
                            title: function() {
                                return ""
                            },
                            label: function(tooltipItem, data) {
                                var datasetName = data.datasets[tooltipItem.datasetIndex].label;
                                var text = datasetName + ": "+  tooltipItem.yLabel;

                                if (units) {
                                    text += " " + units
                                }

                                return text
                            }

                        }
                    }
				}
			});
    }


    function FlightQuantityGraph(container, listOfRoutes) {
        if (typeof container === 'string' || container instanceof String) {
            container = document.querySelector(container)
        }

        this._container = container;
        this._listOfRoutes = listOfRoutes;

        this._airportCode = null;

        this.title = "Flight Quantity";
    }

    FlightQuantityGraph.prototype.update = function(airportCode, minimum_y) {
        this._container.innerHTML = "<canvas class='bargraph'></canvas>";

        this._airportCode = airportCode;

        minimum_y = minimum_y || 0;
        this._graph = arrivalDeparturesDiagram(this._container.querySelector("canvas.bargraph"), this.title, this._listOfRoutes, airportCode, "flights", minimum_y, this._routeData.bind(this));
    }

    FlightQuantityGraph.prototype._routeData = function(routesInDate){
        var route;

        var departures = 0;
        var arrivals = 0;

        for (var i=0; i < routesInDate.length; i++) {
            route = routesInDate[i];
            if (route["DEP"] === this._airportCode) {
                departures += 1;
            } else if (route["ARR"] === this._airportCode) {
                arrivals += 1;
            }
        }

        return {
            departures: departures,
            arrivals: arrivals
        }
    }


    function FlightDurationGraph(container, listOfRoutes) {
        if (typeof container === 'string' || container instanceof String) {
            container = document.querySelector(container)
        }

        this._container = container;
        this._listOfRoutes = listOfRoutes;

        this._airportCode = null;

        this.title = "Flight Duration";
    }

    FlightDurationGraph.prototype.update = function(airportCode, minimum_y) {
        this._container.innerHTML = "<canvas class='bargraph'></canvas>";

        this._airportCode = airportCode;
        this._graph = arrivalDeparturesDiagram(this._container.querySelector("canvas.bargraph"), this.title, this._listOfRoutes, airportCode, "minutes", minimum_y, this._routeData.bind(this))
    }

    FlightDurationGraph.prototype._routeData = function(routesInDate){
        var route;
        var duration;

        var depaturesTotalDuration = 0;
        var arrivalsTotalDuration = 0;

        var numberOfRoutes = routesInDate.length;

        for (var i=0; i < numberOfRoutes; i++) {
            route = routesInDate[i];
            duration = durationRoute(route);

            if (route["DEP"] === this._airportCode) {
                depaturesTotalDuration += duration / 60
            } else if (route["ARR"] === this._airportCode) {
                arrivalsTotalDuration += duration / 60
            }
        }

        return {
            departures: Math.round(depaturesTotalDuration / numberOfRoutes),
            arrivals: Math.round(arrivalsTotalDuration / numberOfRoutes)
        }

    }

    function FlightDistanceGraph(container, listOfRoutes) {
        if (typeof container === 'string' || container instanceof String) {
            container = document.querySelector(container)
        }

        this._container = container;
        this._listOfRoutes = listOfRoutes;

        this._airportCode = null;

        this.title = "Flight Distance"
    }

    FlightDistanceGraph.prototype.update = function(airportCode, minimum_y) {
        this._container.innerHTML = "<canvas class='bargraph'></canvas>";

        this._airportCode = airportCode;
        this._graph = arrivalDeparturesDiagram(this._container.querySelector("canvas.bargraph"), this.title, this._listOfRoutes, airportCode, "kilometers", minimum_y, this._routeData.bind(this))
    }


    FlightDistanceGraph.prototype._routeData = function(routesInDate){
        var route;

        var depaturesTotalDistance = 0;
        var arrivalsTotalDistance = 0;

        var numberOfRoutes = routesInDate.length;

        for (var i=0; i < numberOfRoutes; i++) {
            route = routesInDate[i];
            var distance = distanceRoute(route)

            if (distance) {
                if (route["DEP"] === this._airportCode) {
                    depaturesTotalDistance += distance;
                } else if (route["ARR"] === this._airportCode) {
                    arrivalsTotalDistance += distance;
                }
            }
        }

        return {
            departures: Math.round(depaturesTotalDistance / (1000* numberOfRoutes)),
            arrivals: Math.round(arrivalsTotalDistance / (1000*numberOfRoutes))
        }
    }


    var MAP_STYLES = [{
        "featureType": "administrative",
        "stylers": [{
            "visibility": "on"
        }]
    }, {
        "featureType": "poi",
        "stylers": [{
            "visibility": "simplified"
        }]
    }, {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [{
            "visibility": "simplified"
        }]
    }, {
        "featureType": "water",
        "stylers": [{
            "visibility": "simplified"
        }]
    }, {
        "featureType": "transit",
        "stylers": [{
            "visibility": "simplified"
        }]
    }, {
        "featureType": "landscape",
        "stylers": [{
            "visibility": "simplified"
        }]
    }, {
        "featureType": "road.highway",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "road.local",
        "stylers": [{
            "visibility": "on"
        }]
    }, {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{
            "visibility": "on"
        }]
    }, {
        "featureType": "water",
        "stylers": [{
            "color": "#84afa3"
        }, {
            "lightness": 52
        }]
    }, {
        "stylers": [{
            "saturation": -17
        }, {
            "gamma": 0.36
        }]
    }, {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{
            "color": "#3f518c"
        }]
    }]

    function AirportPicker(element, onChange) {
        var airport, airportCode, airportName;

        this.$element = $(element);

        for (var i =0; i < LIST_OF_AIRPORTS_CODES.length; i++) {
            airportCode = LIST_OF_AIRPORTS_CODES[i];

            airport = AIRPORTS[airportCode]
            airportName = airport.name;

            if (airportName !== null) {
                var newOption = new Option(airportName + " ("+airportCode+")", airportCode, false, false);
                this.$element.append(newOption);
            }
        }

        this.$element.chosen({
            placeholder_text_multiple: "Choose one or more airports",
            placeholder_text_single: "Choose an aiport",
            max_shown_results: 15
        })

        this.$element.data('chosen').choice_label = function(item) {
            return item.value;
        };

        if (onChange) {
            this.$element.on("change", function (evt, params) {
                var selectedAirport = params.selected;
                onChange(selectedAirport);
            })
        }
    }

    AirportPicker.prototype.setValue = function(airportCode) {
        this.$element.val(airportCode);
        this.$element.trigger("chosen:updated");
    }

    AirportPicker.prototype.getValue = function () {
        return this.$element.val()
    }

    var START_DATE = "07/24/2017";
    var END_DATE = "07/30/2017";

    var route;

    for (var i=0; i < flightData.length; i++) {
        route = flightData[i];

        route["DEP_TIME"] = new Date(route["DEP_TIME"]);
        route["ARR_TIME"] = new Date(route["ARR_TIME"]);
        route["DATE"] = new Date(route["DATE"]);
        route["ARR_LOCAL_TIME"] = new Date(route["ARR_LOCAL_TIME"]);
        route["DEP_LOCAL_TIME"] = new Date(route["DEP_LOCAL_TIME"]);
    }


    var LIST_OF_AIRPORTS_CODES = [];

    for (var airportCode in AIRPORTS) {
        if (AIRPORTS.hasOwnProperty(airportCode)) {
            LIST_OF_AIRPORTS_CODES.push(airportCode)
        }
    }

    LIST_OF_AIRPORTS_CODES.sort(function(a, b){
        if (AIRPORTS[a].name < AIRPORTS[b].name) return -1;
        if (AIRPORTS[a].name > AIRPORTS[b].name) return 1;
        return 0;
    });

    var airportTrafficGM = new AirportTrafficGM("#airport_traffic", flightData)
    airportTrafficGM.update(START_DATE, END_DATE);

    var airportTrafficBubbleGraph = new AirportTrafficBubbleGraph("#airport_traffic_random_bubbles .panel-body", flightData)
    airportTrafficBubbleGraph.update(START_DATE, END_DATE)

    var flightRoutesGM = new FlightRoutesGM("#flight_routes", flightData);
    flightRoutesGM.update(START_DATE, END_DATE ,["BCN", "MAD"], null)

    var airportTimeline = new AirportTimeLine("#timeline", flightData);
    airportTimeline.update("BCN")

    $('#flights_table table').DataTable( {
        data: flightData,
        responsive: true,
        bDeferRender: true,
        pageLength: 5,
        lengthMenu: [ 5, 10, 25, 50, 75, 100 ],
        columns: [
            { data: 'Id' },
            { data: 'DATE' },
            { data: 'DEP' },
            { data: 'DEP_TIME' },
            { data: 'DEP_LOCAL_TIME' },
            { data: 'ARR' },
            { data: 'ARR_TIME' },
            { data: 'ARR_LOCAL_TIME' },
            { data: 'BaseIataCode' },
            { data: 'LOF_ID' }
        ]
    } );


    function makeDepartureArrivalChartWithControls(containerSelector, chartClass, defaultAirport) {
        var container = document.querySelector(containerSelector);
        var minimumYinputElement = container.querySelector("input[name='minimum_y']")

        var chartContainer = container.querySelector(".bargraph");
        var graph = new chartClass(chartContainer, flightData)

        var select = $(container).find('select');

        var airportPicker = new AirportPicker(select, function (airportCode) {
            var minimum_y = minimumYinputElement.value;
            minimum_y = parseInt(minimum_y);

            if (isNaN(minimum_y)) {
                alert("'Minimum y' should be an integer");
                return
            }

            graph.update(airportCode, minimum_y)
        });

        $(container).find("button.update").click(function(){
            var minimum_y = minimumYinputElement.value;
            minimum_y = parseInt(minimum_y);

            if (isNaN(minimum_y)) {
                alert("'Minimum y' should be an integer");
                return
            }

            var airportCode = airportPicker.getValue()

            graph.update(airportCode, minimum_y)
        });

        graph.update(defaultAirport)
        airportPicker.setValue(defaultAirport)

        return graph
    }

    makeDepartureArrivalChartWithControls("#flight_quantity", FlightQuantityGraph, "BCN");
    makeDepartureArrivalChartWithControls("#flight_duration", FlightDurationGraph, "BCN");
    makeDepartureArrivalChartWithControls("#flight_distance", FlightDistanceGraph, "BCN")

});

"use strict";

var MapInfoWindow = require('./MapInfoWindow');
var Logging = require('../mixins/Logging');

var Map = React.createClass({
  mixins: [Logging],
  // component lifecycle functions
  getInitialState: function() {
    return {
      markerGenTime: this.props.incidentFetchTime,
      heatmapGenTime: this.props.incidentFetchTime
    }
  },
  componentDidMount: function(el) {
    // load new google map
    var mapOptions = {
      center: { lat: 37.5333, lng: -77.4667 },
      zoom: 12
    };
    this.setState({
      map: new google.maps.Map(this.getDOMNode(), mapOptions),
      infoWindow: new google.maps.InfoWindow()
    });
  },
  componentWillReceiveProps: function(nextProps) {
    // here we generate the Google Maps stuff based on the data
    if (this.shouldGenMarkers(nextProps)) {
      this.log("Generating new markers");
      // clear existing markers
      this.setMarkerMap(null);
      // generate new markers
      var markers = nextProps.incidents.map(function(row) {
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(
              row.incident_location.latitude,
              row.incident_location.longitude),
          title: row.offense_code_desc,
          icon: getIcon(row.offense_code + row.offense_code_desc)
        });

        google.maps.event.addListener(marker, 'click', function() {
          this.state.infoWindow.close();
          this.state.infoWindow.setContent(React.renderToStaticMarkup(<MapInfoWindow incident={row}/>));
          this.state.infoWindow.open(this.state.map, marker);
        }.bind(this));

        return marker;

      }.bind(this));

      // add new markers to the state along with the fetch time so we can check if we need to update
      this.setState({ markers: markers, markerGenTime: nextProps.incidentFetchTime });
    } else if (this.shouldGenHeatmap(nextProps)) {
      this.log("Generating new heatmap");
      // clear existing heatmap
      this.setHeatmapMap(null);
      var points = nextProps.heatmapPoints.map(function(row) {
        // TODO: WeightedLocation for more serious incidents?
        return { location: new google.maps.LatLng(
          row.incident_location.latitude,
          row.incident_location.longitude), weight: getWeight(row.offense_code) };
      });
      var heatmapLayer = new google.maps.visualization.HeatmapLayer({
            data: new google.maps.MVCArray(points),
            radius: 30
          });
      this.setState({ heatmapLayer: heatmapLayer, heatmapGenTime: nextProps.incidentFetchTime });
    }
  },
  shouldComponentUpdate: function(nextProps) {
    return this.shouldGenMarkers(nextProps) || this.shouldGenHeatmap(nextProps) ||
      this.props.viewType != nextProps.viewType;
  },
  render: function() {
    if (this.props.viewType == 'markers') {
      this.setMarkerMap(this.state.map);
      this.setHeatmapMap(null);
    } else if (this.props.viewType == 'heatmap') {
      this.setMarkerMap(null);
      this.setHeatmapMap(this.state.map);
    }
    return (
      <div id="map-canvas" className="col-sm-9 col-sm-pull-3 col-xs-12"/>
    );
  },
  // other functions
  setMarkerMap: function(obj) {
    if (this.state && this.state.markers) {
      for (var i in this.state.markers) {
        this.state.markers[i].setMap(obj);
      }
    }
  },
  setHeatmapMap: function(obj) {
    if (this.state && this.state.heatmapLayer) {
      this.state.heatmapLayer.setMap(obj);
    }
  },
  shouldGenMarkers: function(nextProps) {
    return nextProps.viewType == 'markers' &&
      !!nextProps.incidents &&
      nextProps.incidentFetchTime > this.state.markerGenTime;
  },
  shouldGenHeatmap: function(nextProps) {
    return nextProps.viewType == 'heatmap' &&
      !!nextProps.heatmapPoints &&
      nextProps.incidentFetchTime > this.state.heatmapGenTime;
  }
});

var getIcon = function(str) {
  // return an icon object for a given incident type
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 6,
    fillColor: getColorString(str),
    fillOpacity: 0.9,
    strokeColor: getColorString(str, true),
    strokeOpacity: 0.6,
    strokeWeight: 1
  };
}

var getColorString = function(str, stroke) {
  var hash = hashCode(str);

  var code = parseInt(str.substring(0,2));
  var h = 3.1 * code // normalize code (0-99) to hue (0-360 but limited to 310 because 0=360)

  //var h = hashes[1] % 360; // same numeric prefix gets same hue
  var s = Math.abs((hash >> 8) % 50);
  var l = Math.abs((hash >> 4) % 50);

  return 'hsl(' + h + ', ' + (s+50) + '%, ' + (l+(stroke?0:25)) + '%)';
};

var hashCode = function(str) {
  // hash code for strings, used to generate color codes
  // http://erlycoder.com/49/javascript-hash-functions-to-convert-string-into-integer-hash-
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; // hash * 33 + c
  }
  return hash;
};

var getWeight = function(code) {
  switch (parseFloat(code)) {
  // not making any kind of value judgement here
  case 9:   // homicide
  case 100: // kidnapping
  case 11:  // rape
    return 10;
  case 120: // robbery
  case 13:  // assault
  case 36:  // other sex crimes
    return 8;
  case 200: // arson
  case 220: // burglary
  case 520: // weapons
    return 6;
  case 23:  // theft
  case 240: // vehicle theft
  case 290: // vandalism
  case 35:  // drugs
  case 40:  // prostitution
    return 4;
  case 90:  // disorderly
    return 2;
  default:
    return 1;
  }
};

module.exports = Map;

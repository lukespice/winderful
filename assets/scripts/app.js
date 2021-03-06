/* We need to tell jshint which are our global variables */
/* global $:false,
    Rickshaw: false,
    moment: false,
    navigator: false,
    theme: false
*/
(function() {
  'use strict';

  var app = angular.module('winderfulApp',
    [
      'turbine-directives',
      'winderful-filters',
      'ngBootstrap',
      'angular-rickshaw'
    ]);

  app.controller('turbineController', ['$scope', '$http', function($scope, $http) {
    $scope.rotationSpeed = 10;

    this.graph = {};
    this.percentage = 0;
    this.speed = 0;
    $scope.wattage = 0;
    this.displayDate = new Date();
    this.loaded = false;

    this.hoverDeets = {};

    this.iosSafari = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);

    this.usageExamples = [
      { action: 'Powering', consumption: (0.000483 * 26400000) / 100, object: '% of UK homes' },
      { action: 'Or making', consumption: 0.00006, object: 'cups of tea' },
      { action: 'Or making', consumption: 0.000033, object: 'slices of toast' },
      { action: 'Or driving', consumption: 0.00038, object: 'miles in a Tesla Model S' },
      { action: 'Or watching', consumption: 0.000055, object: 'hours of telly' },
      { action: 'Or powering', consumption: 0.0005, object: 'fridge-freezers for a day' }
    ];

    if (typeof (theme) !== 'undefined' &&
        typeof (theme.usageExamples) !== 'undefined') {
      this.usageExamples = theme.usageExamples;
    }

    this.updateStats = function(date, power, percent) {
      // change animation speed
      setTurbineSpeed(power);

      // update variables for stats
      $scope.wattage = power;
      this.displayDate = new Date(date * 1000);
      this.percentage = percent;

      // winterful only
      if (typeof (theme) !== 'undefined' &&
          typeof (theme.onUpdate) !== 'undefined') {
        theme.onUpdate(power);
      }

      // if details is from less than 30 mins ago for wording in stats
      this.isCurrent = (new Date() - this.displayDate) / 60000 < 30;

      // show random "equivalent of" stat
      this.showExample = Math.round(Math.random() * (this.usageExamples.length - 2)) + 1;

      if (this.iosSafari) {
        // IOS not triggering ngclick for some reason on the graph, so temp fix
        $scope.$apply();
      }
    };

    this.setStats = function() {
      this.updateStats(this.hoverDeets.x, this.hoverDeets.y, this.hoverDeets.z);
    };

    var hoverGraph = function(series, x, y, z, a, b) {
      // Rickshaw doesn't have a click event
      // temp store the details of where we hover in case the user clicks here
      this.hoverDeets.x = x;
      this.hoverDeets.y = y;
      this.hoverDeets.z = b.value.z;

      if (this.iosSafari) {
        // IOS not triggering ngclick for some reason on the graph, so temp fix
        this.setStats();
      }

      // return format for hover tooltip on graph
      return y + 'MW';
    };

    var graphSetup = function() {
    };

    var setTurbineSpeed = function(power) {
      var $rContainer = $('#turbine-rotor-container');
      var $rotor = $('#turbine-rotor').eq(0);
      var value = powerToSpeed(power);
      var degPerS = power * 1.9;
      var oldTransform = matrixToDeg($rotor.css('transform'));
      var parentTransform = matrixToDeg($rContainer.css('transform'));

      // set the rotation speed of the wind turbine
      $scope.rotationSpeed = value;

      // unfortunately CSS animation speeds do not update automagically
      // so we need to remove .animated from the $rotor and add it again
      // in order to trigger the speed change
      // we could use keyframeanimation in JS but it didn't give as smooth
      // results as css animation
      $rotor.removeClass('animated').hide();

      // add rotation to the container so that the $rotor is at the same angle
      // as it was when animation stops momenteraly
      var newRotation = oldTransform + parentTransform + degPerS;
      $rContainer.css('transform', 'rotateZ(' + newRotation + 'deg)');

      // must add class on a time out to trigger the change in speed
      setTimeout(function() {
        $rotor.addClass('animated').show();
      }, 0);
    };

    var powerToSpeed = function(power) {
      // if no power, stop the mill
      return power ? (6500 / power) : 3000000;
    };

    var matrixToDeg = function(tr) {
      // grab the matrix CSS and transform into degrees
      var angle = 0;

      if (tr !== 'none') {
        var values = tr.split('(')[1];
        values = values.split(')')[0];
        values = values.split(',');

        var a = values[0];
        var b = values[1];

        var radians = Math.atan2(b, a);

        if (radians < 0) {
          radians += (2 * Math.PI);
        }

        angle = Math.round(radians * (180 / Math.PI));
      }

      return angle;
    };

    this.graph.options = {
      renderer: 'area',
      height: 200
    };

    this.graph.features = {
      hover: {
        formatter: hoverGraph.bind(this),
        xFormatter: function(x) {
          var now = moment().format('X');
          var time = '';

          if ($scope.delta <= 3600 * 8 * 24) {
            // date range < 10 hours : show every 5 mins
            if (now - x > 6 * 24 * 3600) {
              time = moment.unix(x).format('LLL');
            } else {
              time = moment.unix(x).calendar();
            }
          } else if ($scope.delta <= 3600 * 24 * 30) {
            // date range < 1 week : show every hour
            time = moment.unix(x).format('LLL');
          } else if ($scope.delta <= 3600 * 24 * 30 * 12) {
            // date range < 1 month : show daily average
            time = moment.unix(x).format('LL');
          } else {
            // date range < 1 year : show weekly average
            time = 'week ' + moment.unix(x).format('w') + ' of ' + moment.unix(x).format('YYYY');
          }

          return time;
        }
      },
      yAxis: {
      },
      xAxis: {
        timeFixture: new Rickshaw.Fixtures.Time.Local()
      },
      complete: graphSetup.bind(this)
    };

    this.graph.series = [{name: 'Wind', color: '#007232', data: [{x: 0, y: 0}]}];
    this.daterange = { startDate: moment().subtract('days', 7), endDate: moment() };

    $scope.loadInData = function() {
      if (typeof (this.daterange) !== 'undefined') {
        var _this = this;
        var startDate = this.daterange.startDate.unix();
        var endDate = this.daterange.endDate.unix();

        $scope.delta = endDate - startDate;

        $http.get('./json/', { params: { start: startDate, end: endDate }})
          .success(function(data) {
            _this.graph.series = data;
            var lastValue = data[0].data.pop();

            _this.updateStats(lastValue.x, lastValue.y, lastValue.z);

            _this.loaded = true;

            if (typeof (theme) !== 'undefined' &&
                typeof (theme.onStart) !== 'undefined') {
              theme.onStart();
            }
          });
      }

    }.bind(this);

    $scope.$watch(function() { return this.daterange; }.bind(this), function() {
      $scope.loadInData();
    });

  }]);

})();

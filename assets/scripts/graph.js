(function ($, doc) {
  'use strict';

  var $rotor = $('#turbine-rotor').eq(0),
    rotationAngle = 0,
    speed = 0.5,
    graph = new Rickshaw.Graph.Ajax({
      element: doc.getElementById("chart"),
      width: 600,
      height: 500,
      stroke: true,
      renderer: 'bar',
      //offset: 'expand',
      dataURL: './json/',
      onData: function(d) {
        d[0].data[0].y = 80;
        return d;
      },
      onComplete: function(transport) {
        var graph = transport.graph;

        var detail = new Rickshaw.Graph.HoverDetail({ graph: graph,
          yFormatter: function(y) {

            if( y < 15000 ) {
              // demand is never under 20,000 and wind is always under 4,000
              // this is a way to make sure the turbine doesn't rotate at
              // the demand rate
              speed = y/1000;
            }

            return y;
          }});

        var legend = new Rickshaw.Graph.Legend({
          graph: graph,
          element: document.querySelector('#legend')
        });

        // var slider = new Rickshaw.Graph.RangeSlider.Preview({
        //   graph: graph,
        //   element: document.querySelector('#slider')
        // });
      },
      series: [
        {
          name: 'Wind',
          color: '#491D37'
        },
        {
          name: 'Demand',
          color: '#963'
        }
      ]
    }),
    getData = function(url){
      graph.dataURL = url;
	    graph.request();
    },
    animateWindMill = function() {
      rotationAngle += speed;

      if( rotationAngle > 360 ) {
        rotationAngle -= 360;
      }

      var value = 'rotateZ(' + rotationAngle + 'deg)';

      $rotor.css({
          '-webkit-transform': value,
          '-moz-transform': value,
          '-ms-transform': value,
          '-o-transform': value,
          'transform': value
        });

      requestAnimationFrame(animateWindMill);
    };

  animateWindMill();


  // form
  $('#form').submit(function(e) {
    e.preventDefault();

    var getVars = {
      end: $('#end').data('xdsoft_datetimepicker').data('xdsoft_datetime').strToDateTime($('#end').val()).dateFormat('unixtime'),
      start: $('#start').data('xdsoft_datetimepicker').data('xdsoft_datetime').strToDateTime($('#start').val()).dateFormat('unixtime')
    };

    var url = $(this).attr('action') + '?' + $.param(getVars);

    getData(url);
  });

  $('#start').datetimepicker({
    minDate:'2009/05/14',
    formatTime: 'H.i',
    maxDate:'0'
  });


  $('#end').datetimepicker({
    formatTime: 'H.i',
    minDate:'2009/05/14',
    maxDate:'#datetimepicker_start'
  });

}(jQuery, document));
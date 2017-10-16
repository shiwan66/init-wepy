'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (canvasConfig) {
  var chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(231,233,237)'
  };

  var randomScalingFactor = function randomScalingFactor() {
    return (Math.random() > 0.5 ? 1.0 : -1.0) * Math.round(Math.random() * 100);
  };
  var randomScalingFactor = function randomScalingFactor() {
    return Math.round(Math.random() * 100);
  };

  var chartConfig = {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [randomScalingFactor(), randomScalingFactor(), randomScalingFactor(), randomScalingFactor(), randomScalingFactor()],
        backgroundColor: [chartColors.red, chartColors.orange, chartColors.yellow, chartColors.green, chartColors.blue],
        label: 'Dataset 1'
      }],
      labels: ["Red", "Orange", "Yellow", "Green", "Blue"]
    },
    options: {
      responsive: false,
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Chart.js Doughnut Chart'
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  };
  return {
    chartConfig: chartConfig,
    canvasConfig: canvasConfig
  };
};

var _chart = require('./canvas/chart.js');

var _chart2 = _interopRequireDefault(_chart);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdldENvbmZpZy5qcyJdLCJuYW1lcyI6WyJjYW52YXNDb25maWciLCJjaGFydENvbG9ycyIsInJlZCIsIm9yYW5nZSIsInllbGxvdyIsImdyZWVuIiwiYmx1ZSIsInB1cnBsZSIsImdyZXkiLCJyYW5kb21TY2FsaW5nRmFjdG9yIiwiTWF0aCIsInJhbmRvbSIsInJvdW5kIiwiY2hhcnRDb25maWciLCJ0eXBlIiwiZGF0YSIsImRhdGFzZXRzIiwiYmFja2dyb3VuZENvbG9yIiwibGFiZWwiLCJsYWJlbHMiLCJvcHRpb25zIiwicmVzcG9uc2l2ZSIsImxlZ2VuZCIsInBvc2l0aW9uIiwidGl0bGUiLCJkaXNwbGF5IiwidGV4dCIsImFuaW1hdGlvbiIsImFuaW1hdGVTY2FsZSIsImFuaW1hdGVSb3RhdGUiXSwibWFwcGluZ3MiOiI7Ozs7OztrQkFJZSxVQUFVQSxZQUFWLEVBQXdCO0FBQ3JDLE1BQUlDLGNBQWM7QUFDaEJDLFNBQUssbUJBRFc7QUFFaEJDLFlBQVEsbUJBRlE7QUFHaEJDLFlBQVEsbUJBSFE7QUFJaEJDLFdBQU8sbUJBSlM7QUFLaEJDLFVBQU0sbUJBTFU7QUFNaEJDLFlBQVEsb0JBTlE7QUFPaEJDLFVBQU07QUFQVSxHQUFsQjs7QUFVQSxNQUFJQyxzQkFBc0IsU0FBdEJBLG1CQUFzQixHQUFZO0FBQ3BDLFdBQU8sQ0FBQ0MsS0FBS0MsTUFBTCxLQUFnQixHQUFoQixHQUFzQixHQUF0QixHQUE0QixDQUFDLEdBQTlCLElBQXFDRCxLQUFLRSxLQUFMLENBQVdGLEtBQUtDLE1BQUwsS0FBZ0IsR0FBM0IsQ0FBNUM7QUFDRCxHQUZEO0FBR0EsTUFBSUYsc0JBQXNCLFNBQXRCQSxtQkFBc0IsR0FBWTtBQUNwQyxXQUFPQyxLQUFLRSxLQUFMLENBQVdGLEtBQUtDLE1BQUwsS0FBZ0IsR0FBM0IsQ0FBUDtBQUNELEdBRkQ7O0FBSUEsTUFBSUUsY0FBYztBQUNoQkMsVUFBTSxVQURVO0FBRWhCQyxVQUFNO0FBQ0pDLGdCQUFVLENBQUM7QUFDVEQsY0FBTSxDQUNKTixxQkFESSxFQUVKQSxxQkFGSSxFQUdKQSxxQkFISSxFQUlKQSxxQkFKSSxFQUtKQSxxQkFMSSxDQURHO0FBUVRRLHlCQUFpQixDQUNmaEIsWUFBWUMsR0FERyxFQUVmRCxZQUFZRSxNQUZHLEVBR2ZGLFlBQVlHLE1BSEcsRUFJZkgsWUFBWUksS0FKRyxFQUtmSixZQUFZSyxJQUxHLENBUlI7QUFlVFksZUFBTztBQWZFLE9BQUQsQ0FETjtBQWtCSkMsY0FBUSxDQUNOLEtBRE0sRUFFTixRQUZNLEVBR04sUUFITSxFQUlOLE9BSk0sRUFLTixNQUxNO0FBbEJKLEtBRlU7QUE0QmhCQyxhQUFTO0FBQ1BDLGtCQUFZLEtBREw7QUFFUEMsY0FBUTtBQUNOQyxrQkFBVTtBQURKLE9BRkQ7QUFLUEMsYUFBTztBQUNMQyxpQkFBUyxJQURKO0FBRUxDLGNBQU07QUFGRCxPQUxBO0FBU1BDLGlCQUFXO0FBQ1RDLHNCQUFjLElBREw7QUFFVEMsdUJBQWU7QUFGTjtBQVRKO0FBNUJPLEdBQWxCO0FBMkNBLFNBQU87QUFDTGhCLGlCQUFhQSxXQURSO0FBRUxiLGtCQUFjQTtBQUZULEdBQVA7QUFJRCxDOztBQWxFRCIsImZpbGUiOiJnZXRDb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ3JlYXRlZCBieSB4aWFiaW5nd3Ugb24gMjAxNi8xMS8yMS5cclxuICovXHJcbmltcG9ydCBDaGFydCBmcm9tICcuL2NhbnZhcy9jaGFydCdcclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGNhbnZhc0NvbmZpZykge1xyXG4gIHZhciBjaGFydENvbG9ycyA9IHtcclxuICAgIHJlZDogJ3JnYigyNTUsIDk5LCAxMzIpJyxcclxuICAgIG9yYW5nZTogJ3JnYigyNTUsIDE1OSwgNjQpJyxcclxuICAgIHllbGxvdzogJ3JnYigyNTUsIDIwNSwgODYpJyxcclxuICAgIGdyZWVuOiAncmdiKDc1LCAxOTIsIDE5MiknLFxyXG4gICAgYmx1ZTogJ3JnYig1NCwgMTYyLCAyMzUpJyxcclxuICAgIHB1cnBsZTogJ3JnYigxNTMsIDEwMiwgMjU1KScsXHJcbiAgICBncmV5OiAncmdiKDIzMSwyMzMsMjM3KSdcclxuICB9O1xyXG5cclxuICB2YXIgcmFuZG9tU2NhbGluZ0ZhY3RvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiAoTWF0aC5yYW5kb20oKSA+IDAuNSA/IDEuMCA6IC0xLjApICogTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICB9XHJcbiAgdmFyIHJhbmRvbVNjYWxpbmdGYWN0b3IgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICB9O1xyXG5cclxuICB2YXIgY2hhcnRDb25maWcgPSB7XHJcbiAgICB0eXBlOiAnZG91Z2hudXQnLFxyXG4gICAgZGF0YToge1xyXG4gICAgICBkYXRhc2V0czogW3tcclxuICAgICAgICBkYXRhOiBbXHJcbiAgICAgICAgICByYW5kb21TY2FsaW5nRmFjdG9yKCksXHJcbiAgICAgICAgICByYW5kb21TY2FsaW5nRmFjdG9yKCksXHJcbiAgICAgICAgICByYW5kb21TY2FsaW5nRmFjdG9yKCksXHJcbiAgICAgICAgICByYW5kb21TY2FsaW5nRmFjdG9yKCksXHJcbiAgICAgICAgICByYW5kb21TY2FsaW5nRmFjdG9yKCksXHJcbiAgICAgICAgXSxcclxuICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFtcclxuICAgICAgICAgIGNoYXJ0Q29sb3JzLnJlZCxcclxuICAgICAgICAgIGNoYXJ0Q29sb3JzLm9yYW5nZSxcclxuICAgICAgICAgIGNoYXJ0Q29sb3JzLnllbGxvdyxcclxuICAgICAgICAgIGNoYXJ0Q29sb3JzLmdyZWVuLFxyXG4gICAgICAgICAgY2hhcnRDb2xvcnMuYmx1ZSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGxhYmVsOiAnRGF0YXNldCAxJ1xyXG4gICAgICB9XSxcclxuICAgICAgbGFiZWxzOiBbXHJcbiAgICAgICAgXCJSZWRcIixcclxuICAgICAgICBcIk9yYW5nZVwiLFxyXG4gICAgICAgIFwiWWVsbG93XCIsXHJcbiAgICAgICAgXCJHcmVlblwiLFxyXG4gICAgICAgIFwiQmx1ZVwiXHJcbiAgICAgIF1cclxuICAgIH0sXHJcbiAgICBvcHRpb25zOiB7XHJcbiAgICAgIHJlc3BvbnNpdmU6IGZhbHNlLFxyXG4gICAgICBsZWdlbmQ6IHtcclxuICAgICAgICBwb3NpdGlvbjogJ3RvcCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgZGlzcGxheTogdHJ1ZSxcclxuICAgICAgICB0ZXh0OiAnQ2hhcnQuanMgRG91Z2hudXQgQ2hhcnQnXHJcbiAgICAgIH0sXHJcbiAgICAgIGFuaW1hdGlvbjoge1xyXG4gICAgICAgIGFuaW1hdGVTY2FsZTogdHJ1ZSxcclxuICAgICAgICBhbmltYXRlUm90YXRlOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG4gIHJldHVybiB7XHJcbiAgICBjaGFydENvbmZpZzogY2hhcnRDb25maWcsXHJcbiAgICBjYW52YXNDb25maWc6IGNhbnZhc0NvbmZpZ1xyXG4gIH1cclxufSJdfQ==
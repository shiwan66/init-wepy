'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.radar = {
		aspectRatio: 1,
		scale: {
			type: 'radialLinear'
		},
		elements: {
			line: {
				tension: 0 // no bezier in radar
			}
		}
	};

	Chart.controllers.radar = Chart.DatasetController.extend({

		datasetElementType: Chart.elements.Line,

		dataElementType: Chart.elements.Point,

		linkScales: helpers.noop,

		update: function update(reset) {
			var me = this;
			var meta = me.getMeta();
			var line = meta.dataset;
			var points = meta.data;
			var custom = line.custom || {};
			var dataset = me.getDataset();
			var lineElementOptions = me.chart.options.elements.line;
			var scale = me.chart.scale;

			// Compatibility: If the properties are defined with only the old name, use those values
			if (dataset.tension !== undefined && dataset.lineTension === undefined) {
				dataset.lineTension = dataset.tension;
			}

			helpers.extend(meta.dataset, {
				// Utility
				_datasetIndex: me.index,
				// Data
				_children: points,
				_loop: true,
				// Model
				_model: {
					// Appearance
					tension: custom.tension ? custom.tension : helpers.getValueOrDefault(dataset.lineTension, lineElementOptions.tension),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : dataset.backgroundColor || lineElementOptions.backgroundColor,
					borderWidth: custom.borderWidth ? custom.borderWidth : dataset.borderWidth || lineElementOptions.borderWidth,
					borderColor: custom.borderColor ? custom.borderColor : dataset.borderColor || lineElementOptions.borderColor,
					fill: custom.fill ? custom.fill : dataset.fill !== undefined ? dataset.fill : lineElementOptions.fill,
					borderCapStyle: custom.borderCapStyle ? custom.borderCapStyle : dataset.borderCapStyle || lineElementOptions.borderCapStyle,
					borderDash: custom.borderDash ? custom.borderDash : dataset.borderDash || lineElementOptions.borderDash,
					borderDashOffset: custom.borderDashOffset ? custom.borderDashOffset : dataset.borderDashOffset || lineElementOptions.borderDashOffset,
					borderJoinStyle: custom.borderJoinStyle ? custom.borderJoinStyle : dataset.borderJoinStyle || lineElementOptions.borderJoinStyle,

					// Scale
					scaleTop: scale.top,
					scaleBottom: scale.bottom,
					scaleZero: scale.getBasePosition()
				}
			});

			meta.dataset.pivot();

			// Update Points
			helpers.each(points, function (point, index) {
				me.updateElement(point, index, reset);
			}, me);

			// Update bezier control points
			me.updateBezierControlPoints();
		},
		updateElement: function updateElement(point, index, reset) {
			var me = this;
			var custom = point.custom || {};
			var dataset = me.getDataset();
			var scale = me.chart.scale;
			var pointElementOptions = me.chart.options.elements.point;
			var pointPosition = scale.getPointPositionForValue(index, dataset.data[index]);

			helpers.extend(point, {
				// Utility
				_datasetIndex: me.index,
				_index: index,
				_scale: scale,

				// Desired view properties
				_model: {
					x: reset ? scale.xCenter : pointPosition.x, // value not used in dataset scale, but we want a consistent API between scales
					y: reset ? scale.yCenter : pointPosition.y,

					// Appearance
					tension: custom.tension ? custom.tension : helpers.getValueOrDefault(dataset.tension, me.chart.options.elements.line.tension),
					radius: custom.radius ? custom.radius : helpers.getValueAtIndexOrDefault(dataset.pointRadius, index, pointElementOptions.radius),
					backgroundColor: custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, pointElementOptions.backgroundColor),
					borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.pointBorderColor, index, pointElementOptions.borderColor),
					borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.pointBorderWidth, index, pointElementOptions.borderWidth),
					pointStyle: custom.pointStyle ? custom.pointStyle : helpers.getValueAtIndexOrDefault(dataset.pointStyle, index, pointElementOptions.pointStyle),

					// Tooltip
					hitRadius: custom.hitRadius ? custom.hitRadius : helpers.getValueAtIndexOrDefault(dataset.hitRadius, index, pointElementOptions.hitRadius)
				}
			});

			point._model.skip = custom.skip ? custom.skip : isNaN(point._model.x) || isNaN(point._model.y);
		},
		updateBezierControlPoints: function updateBezierControlPoints() {
			var chartArea = this.chart.chartArea;
			var meta = this.getMeta();

			helpers.each(meta.data, function (point, index) {
				var model = point._model;
				var controlPoints = helpers.splineCurve(helpers.previousItem(meta.data, index, true)._model, model, helpers.nextItem(meta.data, index, true)._model, model.tension);

				// Prevent the bezier going outside of the bounds of the graph
				model.controlPointPreviousX = Math.max(Math.min(controlPoints.previous.x, chartArea.right), chartArea.left);
				model.controlPointPreviousY = Math.max(Math.min(controlPoints.previous.y, chartArea.bottom), chartArea.top);

				model.controlPointNextX = Math.max(Math.min(controlPoints.next.x, chartArea.right), chartArea.left);
				model.controlPointNextY = Math.max(Math.min(controlPoints.next.y, chartArea.bottom), chartArea.top);

				// Now pivot the point for animation
				point.pivot();
			});
		},

		draw: function draw(ease) {
			var meta = this.getMeta();
			var easingDecimal = ease || 1;

			// Transition Point Locations
			helpers.each(meta.data, function (point) {
				point.transition(easingDecimal);
			});

			// Transition and Draw the line
			meta.dataset.transition(easingDecimal).draw();

			// Draw the points
			helpers.each(meta.data, function (point) {
				point.draw();
			});
		},

		setHoverStyle: function setHoverStyle(point) {
			// Point
			var dataset = this.chart.data.datasets[point._datasetIndex];
			var custom = point.custom || {};
			var index = point._index;
			var model = point._model;

			model.radius = custom.hoverRadius ? custom.hoverRadius : helpers.getValueAtIndexOrDefault(dataset.pointHoverRadius, index, this.chart.options.elements.point.hoverRadius);
			model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : helpers.getValueAtIndexOrDefault(dataset.pointHoverBackgroundColor, index, helpers.getHoverColor(model.backgroundColor));
			model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : helpers.getValueAtIndexOrDefault(dataset.pointHoverBorderColor, index, helpers.getHoverColor(model.borderColor));
			model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : helpers.getValueAtIndexOrDefault(dataset.pointHoverBorderWidth, index, model.borderWidth);
		},

		removeHoverStyle: function removeHoverStyle(point) {
			var dataset = this.chart.data.datasets[point._datasetIndex];
			var custom = point.custom || {};
			var index = point._index;
			var model = point._model;
			var pointElementOptions = this.chart.options.elements.point;

			model.radius = custom.radius ? custom.radius : helpers.getValueAtIndexOrDefault(dataset.radius, index, pointElementOptions.radius);
			model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.pointBackgroundColor, index, pointElementOptions.backgroundColor);
			model.borderColor = custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.pointBorderColor, index, pointElementOptions.borderColor);
			model.borderWidth = custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.pointBorderWidth, index, pointElementOptions.borderWidth);
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyb2xsZXIucmFkYXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkNoYXJ0IiwiaGVscGVycyIsImRlZmF1bHRzIiwicmFkYXIiLCJhc3BlY3RSYXRpbyIsInNjYWxlIiwidHlwZSIsImVsZW1lbnRzIiwibGluZSIsInRlbnNpb24iLCJjb250cm9sbGVycyIsIkRhdGFzZXRDb250cm9sbGVyIiwiZXh0ZW5kIiwiZGF0YXNldEVsZW1lbnRUeXBlIiwiTGluZSIsImRhdGFFbGVtZW50VHlwZSIsIlBvaW50IiwibGlua1NjYWxlcyIsIm5vb3AiLCJ1cGRhdGUiLCJyZXNldCIsIm1lIiwibWV0YSIsImdldE1ldGEiLCJkYXRhc2V0IiwicG9pbnRzIiwiZGF0YSIsImN1c3RvbSIsImdldERhdGFzZXQiLCJsaW5lRWxlbWVudE9wdGlvbnMiLCJjaGFydCIsIm9wdGlvbnMiLCJ1bmRlZmluZWQiLCJsaW5lVGVuc2lvbiIsIl9kYXRhc2V0SW5kZXgiLCJpbmRleCIsIl9jaGlsZHJlbiIsIl9sb29wIiwiX21vZGVsIiwiZ2V0VmFsdWVPckRlZmF1bHQiLCJiYWNrZ3JvdW5kQ29sb3IiLCJib3JkZXJXaWR0aCIsImJvcmRlckNvbG9yIiwiZmlsbCIsImJvcmRlckNhcFN0eWxlIiwiYm9yZGVyRGFzaCIsImJvcmRlckRhc2hPZmZzZXQiLCJib3JkZXJKb2luU3R5bGUiLCJzY2FsZVRvcCIsInRvcCIsInNjYWxlQm90dG9tIiwiYm90dG9tIiwic2NhbGVaZXJvIiwiZ2V0QmFzZVBvc2l0aW9uIiwicGl2b3QiLCJlYWNoIiwicG9pbnQiLCJ1cGRhdGVFbGVtZW50IiwidXBkYXRlQmV6aWVyQ29udHJvbFBvaW50cyIsInBvaW50RWxlbWVudE9wdGlvbnMiLCJwb2ludFBvc2l0aW9uIiwiZ2V0UG9pbnRQb3NpdGlvbkZvclZhbHVlIiwiX2luZGV4IiwiX3NjYWxlIiwieCIsInhDZW50ZXIiLCJ5IiwieUNlbnRlciIsInJhZGl1cyIsImdldFZhbHVlQXRJbmRleE9yRGVmYXVsdCIsInBvaW50UmFkaXVzIiwicG9pbnRCYWNrZ3JvdW5kQ29sb3IiLCJwb2ludEJvcmRlckNvbG9yIiwicG9pbnRCb3JkZXJXaWR0aCIsInBvaW50U3R5bGUiLCJoaXRSYWRpdXMiLCJza2lwIiwiaXNOYU4iLCJjaGFydEFyZWEiLCJtb2RlbCIsImNvbnRyb2xQb2ludHMiLCJzcGxpbmVDdXJ2ZSIsInByZXZpb3VzSXRlbSIsIm5leHRJdGVtIiwiY29udHJvbFBvaW50UHJldmlvdXNYIiwiTWF0aCIsIm1heCIsIm1pbiIsInByZXZpb3VzIiwicmlnaHQiLCJsZWZ0IiwiY29udHJvbFBvaW50UHJldmlvdXNZIiwiY29udHJvbFBvaW50TmV4dFgiLCJuZXh0IiwiY29udHJvbFBvaW50TmV4dFkiLCJkcmF3IiwiZWFzZSIsImVhc2luZ0RlY2ltYWwiLCJ0cmFuc2l0aW9uIiwic2V0SG92ZXJTdHlsZSIsImRhdGFzZXRzIiwiaG92ZXJSYWRpdXMiLCJwb2ludEhvdmVyUmFkaXVzIiwiaG92ZXJCYWNrZ3JvdW5kQ29sb3IiLCJwb2ludEhvdmVyQmFja2dyb3VuZENvbG9yIiwiZ2V0SG92ZXJDb2xvciIsImhvdmVyQm9yZGVyQ29sb3IiLCJwb2ludEhvdmVyQm9yZGVyQ29sb3IiLCJob3ZlckJvcmRlcldpZHRoIiwicG9pbnRIb3ZlckJvcmRlcldpZHRoIiwicmVtb3ZlSG92ZXJTdHlsZSJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUFBLE9BQU9DLE9BQVAsR0FBaUIsVUFBU0MsS0FBVCxFQUFnQjs7QUFFaEMsS0FBSUMsVUFBVUQsTUFBTUMsT0FBcEI7O0FBRUFELE9BQU1FLFFBQU4sQ0FBZUMsS0FBZixHQUF1QjtBQUN0QkMsZUFBYSxDQURTO0FBRXRCQyxTQUFPO0FBQ05DLFNBQU07QUFEQSxHQUZlO0FBS3RCQyxZQUFVO0FBQ1RDLFNBQU07QUFDTEMsYUFBUyxDQURKLENBQ007QUFETjtBQURHO0FBTFksRUFBdkI7O0FBWUFULE9BQU1VLFdBQU4sQ0FBa0JQLEtBQWxCLEdBQTBCSCxN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QWdDbkUsUUFBUW9FLHdCQUFSLENBQWlDN0MsUUFBUTRDLE1BQXpDLEVBQWlEakMsS0FBakQsRUFBd0R3QixvQkFBb0JTLE1BQTVFLENBQS9DO0FBQ0FXLFNBQU12QyxlQUFOLEdBQXdCYixPQUFPYSxlQUFQLEdBQXlCYixPQUFPYSxlQUFoQyxHQUFrRHZDLFFBQVFvRSx3QkFBUixDQUFpQzdDLFFBQVErQyxvQkFBekMsRUFBK0RwQyxLQUEvRCxFQUFzRXdCLG9CQUFvQm5CLGVBQTFGLENBQTFFO0FBQ0F1QyxTQUFNckMsV0FBTixHQUFvQmYsT0FBT2UsV0FBUCxHQUFxQmYsT0FBT2UsV0FBNUIsR0FBMEN6QyxRQUFRb0Usd0JBQVIsQ0FBaUM3QyxRQUFRZ0QsZ0JBQXpDLEVBQTJEckMsS0FBM0QsRUFBa0V3QixvQkFBb0JqQixXQUF0RixDQUE5RDtBQUNBcUMsU0FBTXRDLFdBQU4sR0FBb0JkLE9BQU9jLFdBQVAsR0FBcUJkLE9BQU9jLFdBQTVCLEdBQTBDeEMsUUFBUW9FLHdCQUFSLENBQWlDN0MsUUFBUWlELGdCQUF6QyxFQUEyRHRDLEtBQTNELEVBQWtFd0Isb0JBQW9CbEIsV0FBdEYsQ0FBOUQ7QUFDQTtBQWhLdUQsRUFBL0IsQ0FBMUI7QUFrS0EsQ0FsTEQiLCJmaWxlIjoiY29udHJvbGxlci5yYWRhci5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2hhcnQpIHtcclxuXHJcblx0dmFyIGhlbHBlcnMgPSBDaGFydC5oZWxwZXJzO1xyXG5cclxuXHRDaGFydC5kZWZhdWx0cy5yYWRhciA9IHtcclxuXHRcdGFzcGVjdFJhdGlvOiAxLFxyXG5cdFx0c2NhbGU6IHtcclxuXHRcdFx0dHlwZTogJ3JhZGlhbExpbmVhcidcclxuXHRcdH0sXHJcblx0XHRlbGVtZW50czoge1xyXG5cdFx0XHRsaW5lOiB7XHJcblx0XHRcdFx0dGVuc2lvbjogMCAvLyBubyBiZXppZXIgaW4gcmFkYXJcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdENoYXJ0LmNvbnRyb2xsZXJzLnJhZGFyID0gQ2hhcnQuRGF0YXNldENvbnRyb2xsZXIuZXh0ZW5kKHtcclxuXHJcblx0XHRkYXRhc2V0RWxlbWVudFR5cGU6IENoYXJ0LmVsZW1lbnRzLkxpbmUsXHJcblxyXG5cdFx0ZGF0YUVsZW1lbnRUeXBlOiBDaGFydC5lbGVtZW50cy5Qb2ludCxcclxuXHJcblx0XHRsaW5rU2NhbGVzOiBoZWxwZXJzLm5vb3AsXHJcblxyXG5cdFx0dXBkYXRlOiBmdW5jdGlvbihyZXNldCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWV0YSA9IG1lLmdldE1ldGEoKTtcclxuXHRcdFx0dmFyIGxpbmUgPSBtZXRhLmRhdGFzZXQ7XHJcblx0XHRcdHZhciBwb2ludHMgPSBtZXRhLmRhdGE7XHJcblx0XHRcdHZhciBjdXN0b20gPSBsaW5lLmN1c3RvbSB8fCB7fTtcclxuXHRcdFx0dmFyIGRhdGFzZXQgPSBtZS5nZXREYXRhc2V0KCk7XHJcblx0XHRcdHZhciBsaW5lRWxlbWVudE9wdGlvbnMgPSBtZS5jaGFydC5vcHRpb25zLmVsZW1lbnRzLmxpbmU7XHJcblx0XHRcdHZhciBzY2FsZSA9IG1lLmNoYXJ0LnNjYWxlO1xyXG5cclxuXHRcdFx0Ly8gQ29tcGF0aWJpbGl0eTogSWYgdGhlIHByb3BlcnRpZXMgYXJlIGRlZmluZWQgd2l0aCBvbmx5IHRoZSBvbGQgbmFtZSwgdXNlIHRob3NlIHZhbHVlc1xyXG5cdFx0XHRpZiAoKGRhdGFzZXQudGVuc2lvbiAhPT0gdW5kZWZpbmVkKSAmJiAoZGF0YXNldC5saW5lVGVuc2lvbiA9PT0gdW5kZWZpbmVkKSkge1xyXG5cdFx0XHRcdGRhdGFzZXQubGluZVRlbnNpb24gPSBkYXRhc2V0LnRlbnNpb247XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGhlbHBlcnMuZXh0ZW5kKG1ldGEuZGF0YXNldCwge1xyXG5cdFx0XHRcdC8vIFV0aWxpdHlcclxuXHRcdFx0XHRfZGF0YXNldEluZGV4OiBtZS5pbmRleCxcclxuXHRcdFx0XHQvLyBEYXRhXHJcblx0XHRcdFx0X2NoaWxkcmVuOiBwb2ludHMsXHJcblx0XHRcdFx0X2xvb3A6IHRydWUsXHJcblx0XHRcdFx0Ly8gTW9kZWxcclxuXHRcdFx0XHRfbW9kZWw6IHtcclxuXHRcdFx0XHRcdC8vIEFwcGVhcmFuY2VcclxuXHRcdFx0XHRcdHRlbnNpb246IGN1c3RvbS50ZW5zaW9uID8gY3VzdG9tLnRlbnNpb24gOiBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KGRhdGFzZXQubGluZVRlbnNpb24sIGxpbmVFbGVtZW50T3B0aW9ucy50ZW5zaW9uKSxcclxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogY3VzdG9tLmJhY2tncm91bmRDb2xvciA/IGN1c3RvbS5iYWNrZ3JvdW5kQ29sb3IgOiAoZGF0YXNldC5iYWNrZ3JvdW5kQ29sb3IgfHwgbGluZUVsZW1lbnRPcHRpb25zLmJhY2tncm91bmRDb2xvciksXHJcblx0XHRcdFx0XHRib3JkZXJXaWR0aDogY3VzdG9tLmJvcmRlcldpZHRoID8gY3VzdG9tLmJvcmRlcldpZHRoIDogKGRhdGFzZXQuYm9yZGVyV2lkdGggfHwgbGluZUVsZW1lbnRPcHRpb25zLmJvcmRlcldpZHRoKSxcclxuXHRcdFx0XHRcdGJvcmRlckNvbG9yOiBjdXN0b20uYm9yZGVyQ29sb3IgPyBjdXN0b20uYm9yZGVyQ29sb3IgOiAoZGF0YXNldC5ib3JkZXJDb2xvciB8fCBsaW5lRWxlbWVudE9wdGlvbnMuYm9yZGVyQ29sb3IpLFxyXG5cdFx0XHRcdFx0ZmlsbDogY3VzdG9tLmZpbGwgPyBjdXN0b20uZmlsbCA6IChkYXRhc2V0LmZpbGwgIT09IHVuZGVmaW5lZCA/IGRhdGFzZXQuZmlsbCA6IGxpbmVFbGVtZW50T3B0aW9ucy5maWxsKSxcclxuXHRcdFx0XHRcdGJvcmRlckNhcFN0eWxlOiBjdXN0b20uYm9yZGVyQ2FwU3R5bGUgPyBjdXN0b20uYm9yZGVyQ2FwU3R5bGUgOiAoZGF0YXNldC5ib3JkZXJDYXBTdHlsZSB8fCBsaW5lRWxlbWVudE9wdGlvbnMuYm9yZGVyQ2FwU3R5bGUpLFxyXG5cdFx0XHRcdFx0Ym9yZGVyRGFzaDogY3VzdG9tLmJvcmRlckRhc2ggPyBjdXN0b20uYm9yZGVyRGFzaCA6IChkYXRhc2V0LmJvcmRlckRhc2ggfHwgbGluZUVsZW1lbnRPcHRpb25zLmJvcmRlckRhc2gpLFxyXG5cdFx0XHRcdFx0Ym9yZGVyRGFzaE9mZnNldDogY3VzdG9tLmJvcmRlckRhc2hPZmZzZXQgPyBjdXN0b20uYm9yZGVyRGFzaE9mZnNldCA6IChkYXRhc2V0LmJvcmRlckRhc2hPZmZzZXQgfHwgbGluZUVsZW1lbnRPcHRpb25zLmJvcmRlckRhc2hPZmZzZXQpLFxyXG5cdFx0XHRcdFx0Ym9yZGVySm9pblN0eWxlOiBjdXN0b20uYm9yZGVySm9pblN0eWxlID8gY3VzdG9tLmJvcmRlckpvaW5TdHlsZSA6IChkYXRhc2V0LmJvcmRlckpvaW5TdHlsZSB8fCBsaW5lRWxlbWVudE9wdGlvbnMuYm9yZGVySm9pblN0eWxlKSxcclxuXHJcblx0XHRcdFx0XHQvLyBTY2FsZVxyXG5cdFx0XHRcdFx0c2NhbGVUb3A6IHNjYWxlLnRvcCxcclxuXHRcdFx0XHRcdHNjYWxlQm90dG9tOiBzY2FsZS5ib3R0b20sXHJcblx0XHRcdFx0XHRzY2FsZVplcm86IHNjYWxlLmdldEJhc2VQb3NpdGlvbigpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG1ldGEuZGF0YXNldC5waXZvdCgpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIFBvaW50c1xyXG5cdFx0XHRoZWxwZXJzLmVhY2gocG9pbnRzLCBmdW5jdGlvbihwb2ludCwgaW5kZXgpIHtcclxuXHRcdFx0XHRtZS51cGRhdGVFbGVtZW50KHBvaW50LCBpbmRleCwgcmVzZXQpO1xyXG5cdFx0XHR9LCBtZSk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgYmV6aWVyIGNvbnRyb2wgcG9pbnRzXHJcblx0XHRcdG1lLnVwZGF0ZUJlemllckNvbnRyb2xQb2ludHMoKTtcclxuXHRcdH0sXHJcblx0XHR1cGRhdGVFbGVtZW50OiBmdW5jdGlvbihwb2ludCwgaW5kZXgsIHJlc2V0KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBjdXN0b20gPSBwb2ludC5jdXN0b20gfHwge307XHJcblx0XHRcdHZhciBkYXRhc2V0ID0gbWUuZ2V0RGF0YXNldCgpO1xyXG5cdFx0XHR2YXIgc2NhbGUgPSBtZS5jaGFydC5zY2FsZTtcclxuXHRcdFx0dmFyIHBvaW50RWxlbWVudE9wdGlvbnMgPSBtZS5jaGFydC5vcHRpb25zLmVsZW1lbnRzLnBvaW50O1xyXG5cdFx0XHR2YXIgcG9pbnRQb3NpdGlvbiA9IHNjYWxlLmdldFBvaW50UG9zaXRpb25Gb3JWYWx1ZShpbmRleCwgZGF0YXNldC5kYXRhW2luZGV4XSk7XHJcblxyXG5cdFx0XHRoZWxwZXJzLmV4dGVuZChwb2ludCwge1xyXG5cdFx0XHRcdC8vIFV0aWxpdHlcclxuXHRcdFx0XHRfZGF0YXNldEluZGV4OiBtZS5pbmRleCxcclxuXHRcdFx0XHRfaW5kZXg6IGluZGV4LFxyXG5cdFx0XHRcdF9zY2FsZTogc2NhbGUsXHJcblxyXG5cdFx0XHRcdC8vIERlc2lyZWQgdmlldyBwcm9wZXJ0aWVzXHJcblx0XHRcdFx0X21vZGVsOiB7XHJcblx0XHRcdFx0XHR4OiByZXNldCA/IHNjYWxlLnhDZW50ZXIgOiBwb2ludFBvc2l0aW9uLngsIC8vIHZhbHVlIG5vdCB1c2VkIGluIGRhdGFzZXQgc2NhbGUsIGJ1dCB3ZSB3YW50IGEgY29uc2lzdGVudCBBUEkgYmV0d2VlbiBzY2FsZXNcclxuXHRcdFx0XHRcdHk6IHJlc2V0ID8gc2NhbGUueUNlbnRlciA6IHBvaW50UG9zaXRpb24ueSxcclxuXHJcblx0XHRcdFx0XHQvLyBBcHBlYXJhbmNlXHJcblx0XHRcdFx0XHR0ZW5zaW9uOiBjdXN0b20udGVuc2lvbiA/IGN1c3RvbS50ZW5zaW9uIDogaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChkYXRhc2V0LnRlbnNpb24sIG1lLmNoYXJ0Lm9wdGlvbnMuZWxlbWVudHMubGluZS50ZW5zaW9uKSxcclxuXHRcdFx0XHRcdHJhZGl1czogY3VzdG9tLnJhZGl1cyA/IGN1c3RvbS5yYWRpdXMgOiBoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdChkYXRhc2V0LnBvaW50UmFkaXVzLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5yYWRpdXMpLFxyXG5cdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBjdXN0b20uYmFja2dyb3VuZENvbG9yID8gY3VzdG9tLmJhY2tncm91bmRDb2xvciA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQucG9pbnRCYWNrZ3JvdW5kQ29sb3IsIGluZGV4LCBwb2ludEVsZW1lbnRPcHRpb25zLmJhY2tncm91bmRDb2xvciksXHJcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogY3VzdG9tLmJvcmRlckNvbG9yID8gY3VzdG9tLmJvcmRlckNvbG9yIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludEJvcmRlckNvbG9yLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5ib3JkZXJDb2xvciksXHJcblx0XHRcdFx0XHRib3JkZXJXaWR0aDogY3VzdG9tLmJvcmRlcldpZHRoID8gY3VzdG9tLmJvcmRlcldpZHRoIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludEJvcmRlcldpZHRoLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5ib3JkZXJXaWR0aCksXHJcblx0XHRcdFx0XHRwb2ludFN0eWxlOiBjdXN0b20ucG9pbnRTdHlsZSA/IGN1c3RvbS5wb2ludFN0eWxlIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludFN0eWxlLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5wb2ludFN0eWxlKSxcclxuXHJcblx0XHRcdFx0XHQvLyBUb29sdGlwXHJcblx0XHRcdFx0XHRoaXRSYWRpdXM6IGN1c3RvbS5oaXRSYWRpdXMgPyBjdXN0b20uaGl0UmFkaXVzIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5oaXRSYWRpdXMsIGluZGV4LCBwb2ludEVsZW1lbnRPcHRpb25zLmhpdFJhZGl1cylcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cG9pbnQuX21vZGVsLnNraXAgPSBjdXN0b20uc2tpcCA/IGN1c3RvbS5za2lwIDogKGlzTmFOKHBvaW50Ll9tb2RlbC54KSB8fCBpc05hTihwb2ludC5fbW9kZWwueSkpO1xyXG5cdFx0fSxcclxuXHRcdHVwZGF0ZUJlemllckNvbnRyb2xQb2ludHM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgY2hhcnRBcmVhID0gdGhpcy5jaGFydC5jaGFydEFyZWE7XHJcblx0XHRcdHZhciBtZXRhID0gdGhpcy5nZXRNZXRhKCk7XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2gobWV0YS5kYXRhLCBmdW5jdGlvbihwb2ludCwgaW5kZXgpIHtcclxuXHRcdFx0XHR2YXIgbW9kZWwgPSBwb2ludC5fbW9kZWw7XHJcblx0XHRcdFx0dmFyIGNvbnRyb2xQb2ludHMgPSBoZWxwZXJzLnNwbGluZUN1cnZlKFxyXG5cdFx0XHRcdFx0aGVscGVycy5wcmV2aW91c0l0ZW0obWV0YS5kYXRhLCBpbmRleCwgdHJ1ZSkuX21vZGVsLFxyXG5cdFx0XHRcdFx0bW9kZWwsXHJcblx0XHRcdFx0XHRoZWxwZXJzLm5leHRJdGVtKG1ldGEuZGF0YSwgaW5kZXgsIHRydWUpLl9tb2RlbCxcclxuXHRcdFx0XHRcdG1vZGVsLnRlbnNpb25cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBQcmV2ZW50IHRoZSBiZXppZXIgZ29pbmcgb3V0c2lkZSBvZiB0aGUgYm91bmRzIG9mIHRoZSBncmFwaFxyXG5cdFx0XHRcdG1vZGVsLmNvbnRyb2xQb2ludFByZXZpb3VzWCA9IE1hdGgubWF4KE1hdGgubWluKGNvbnRyb2xQb2ludHMucHJldmlvdXMueCwgY2hhcnRBcmVhLnJpZ2h0KSwgY2hhcnRBcmVhLmxlZnQpO1xyXG5cdFx0XHRcdG1vZGVsLmNvbnRyb2xQb2ludFByZXZpb3VzWSA9IE1hdGgubWF4KE1hdGgubWluKGNvbnRyb2xQb2ludHMucHJldmlvdXMueSwgY2hhcnRBcmVhLmJvdHRvbSksIGNoYXJ0QXJlYS50b3ApO1xyXG5cclxuXHRcdFx0XHRtb2RlbC5jb250cm9sUG9pbnROZXh0WCA9IE1hdGgubWF4KE1hdGgubWluKGNvbnRyb2xQb2ludHMubmV4dC54LCBjaGFydEFyZWEucmlnaHQpLCBjaGFydEFyZWEubGVmdCk7XHJcblx0XHRcdFx0bW9kZWwuY29udHJvbFBvaW50TmV4dFkgPSBNYXRoLm1heChNYXRoLm1pbihjb250cm9sUG9pbnRzLm5leHQueSwgY2hhcnRBcmVhLmJvdHRvbSksIGNoYXJ0QXJlYS50b3ApO1xyXG5cclxuXHRcdFx0XHQvLyBOb3cgcGl2b3QgdGhlIHBvaW50IGZvciBhbmltYXRpb25cclxuXHRcdFx0XHRwb2ludC5waXZvdCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblxyXG5cdFx0ZHJhdzogZnVuY3Rpb24oZWFzZSkge1xyXG5cdFx0XHR2YXIgbWV0YSA9IHRoaXMuZ2V0TWV0YSgpO1xyXG5cdFx0XHR2YXIgZWFzaW5nRGVjaW1hbCA9IGVhc2UgfHwgMTtcclxuXHJcblx0XHRcdC8vIFRyYW5zaXRpb24gUG9pbnQgTG9jYXRpb25zXHJcblx0XHRcdGhlbHBlcnMuZWFjaChtZXRhLmRhdGEsIGZ1bmN0aW9uKHBvaW50KSB7XHJcblx0XHRcdFx0cG9pbnQudHJhbnNpdGlvbihlYXNpbmdEZWNpbWFsKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBUcmFuc2l0aW9uIGFuZCBEcmF3IHRoZSBsaW5lXHJcblx0XHRcdG1ldGEuZGF0YXNldC50cmFuc2l0aW9uKGVhc2luZ0RlY2ltYWwpLmRyYXcoKTtcclxuXHJcblx0XHRcdC8vIERyYXcgdGhlIHBvaW50c1xyXG5cdFx0XHRoZWxwZXJzLmVhY2gobWV0YS5kYXRhLCBmdW5jdGlvbihwb2ludCkge1xyXG5cdFx0XHRcdHBvaW50LmRyYXcoKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdHNldEhvdmVyU3R5bGU6IGZ1bmN0aW9uKHBvaW50KSB7XHJcblx0XHRcdC8vIFBvaW50XHJcblx0XHRcdHZhciBkYXRhc2V0ID0gdGhpcy5jaGFydC5kYXRhLmRhdGFzZXRzW3BvaW50Ll9kYXRhc2V0SW5kZXhdO1xyXG5cdFx0XHR2YXIgY3VzdG9tID0gcG9pbnQuY3VzdG9tIHx8IHt9O1xyXG5cdFx0XHR2YXIgaW5kZXggPSBwb2ludC5faW5kZXg7XHJcblx0XHRcdHZhciBtb2RlbCA9IHBvaW50Ll9tb2RlbDtcclxuXHJcblx0XHRcdG1vZGVsLnJhZGl1cyA9IGN1c3RvbS5ob3ZlclJhZGl1cyA/IGN1c3RvbS5ob3ZlclJhZGl1cyA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQucG9pbnRIb3ZlclJhZGl1cywgaW5kZXgsIHRoaXMuY2hhcnQub3B0aW9ucy5lbGVtZW50cy5wb2ludC5ob3ZlclJhZGl1cyk7XHJcblx0XHRcdG1vZGVsLmJhY2tncm91bmRDb2xvciA9IGN1c3RvbS5ob3ZlckJhY2tncm91bmRDb2xvciA/IGN1c3RvbS5ob3ZlckJhY2tncm91bmRDb2xvciA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQucG9pbnRIb3ZlckJhY2tncm91bmRDb2xvciwgaW5kZXgsIGhlbHBlcnMuZ2V0SG92ZXJDb2xvcihtb2RlbC5iYWNrZ3JvdW5kQ29sb3IpKTtcclxuXHRcdFx0bW9kZWwuYm9yZGVyQ29sb3IgPSBjdXN0b20uaG92ZXJCb3JkZXJDb2xvciA/IGN1c3RvbS5ob3ZlckJvcmRlckNvbG9yIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludEhvdmVyQm9yZGVyQ29sb3IsIGluZGV4LCBoZWxwZXJzLmdldEhvdmVyQ29sb3IobW9kZWwuYm9yZGVyQ29sb3IpKTtcclxuXHRcdFx0bW9kZWwuYm9yZGVyV2lkdGggPSBjdXN0b20uaG92ZXJCb3JkZXJXaWR0aCA/IGN1c3RvbS5ob3ZlckJvcmRlcldpZHRoIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludEhvdmVyQm9yZGVyV2lkdGgsIGluZGV4LCBtb2RlbC5ib3JkZXJXaWR0aCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdHJlbW92ZUhvdmVyU3R5bGU6IGZ1bmN0aW9uKHBvaW50KSB7XHJcblx0XHRcdHZhciBkYXRhc2V0ID0gdGhpcy5jaGFydC5kYXRhLmRhdGFzZXRzW3BvaW50Ll9kYXRhc2V0SW5kZXhdO1xyXG5cdFx0XHR2YXIgY3VzdG9tID0gcG9pbnQuY3VzdG9tIHx8IHt9O1xyXG5cdFx0XHR2YXIgaW5kZXggPSBwb2ludC5faW5kZXg7XHJcblx0XHRcdHZhciBtb2RlbCA9IHBvaW50Ll9tb2RlbDtcclxuXHRcdFx0dmFyIHBvaW50RWxlbWVudE9wdGlvbnMgPSB0aGlzLmNoYXJ0Lm9wdGlvbnMuZWxlbWVudHMucG9pbnQ7XHJcblxyXG5cdFx0XHRtb2RlbC5yYWRpdXMgPSBjdXN0b20ucmFkaXVzID8gY3VzdG9tLnJhZGl1cyA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQucmFkaXVzLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5yYWRpdXMpO1xyXG5cdFx0XHRtb2RlbC5iYWNrZ3JvdW5kQ29sb3IgPSBjdXN0b20uYmFja2dyb3VuZENvbG9yID8gY3VzdG9tLmJhY2tncm91bmRDb2xvciA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQucG9pbnRCYWNrZ3JvdW5kQ29sb3IsIGluZGV4LCBwb2ludEVsZW1lbnRPcHRpb25zLmJhY2tncm91bmRDb2xvcik7XHJcblx0XHRcdG1vZGVsLmJvcmRlckNvbG9yID0gY3VzdG9tLmJvcmRlckNvbG9yID8gY3VzdG9tLmJvcmRlckNvbG9yIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludEJvcmRlckNvbG9yLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5ib3JkZXJDb2xvcik7XHJcblx0XHRcdG1vZGVsLmJvcmRlcldpZHRoID0gY3VzdG9tLmJvcmRlcldpZHRoID8gY3VzdG9tLmJvcmRlcldpZHRoIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5wb2ludEJvcmRlcldpZHRoLCBpbmRleCwgcG9pbnRFbGVtZW50T3B0aW9ucy5ib3JkZXJXaWR0aCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbiJdfQ==
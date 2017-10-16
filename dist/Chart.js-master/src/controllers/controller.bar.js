'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.bar = {
		hover: {
			mode: 'label'
		},

		scales: {
			xAxes: [{
				type: 'category',

				// Specific to Bar Controller
				categoryPercentage: 0.8,
				barPercentage: 0.9,

				// grid line settings
				gridLines: {
					offsetGridLines: true
				}
			}],
			yAxes: [{
				type: 'linear'
			}]
		}
	};

	Chart.controllers.bar = Chart.DatasetController.extend({

		dataElementType: Chart.elements.Rectangle,

		initialize: function initialize(chart, datasetIndex) {
			Chart.DatasetController.prototype.initialize.call(this, chart, datasetIndex);

			// Use this to indicate that this is a bar dataset.
			this.getMeta().bar = true;
		},

		// Get the number of datasets that display bars. We use this to correctly calculate the bar width
		getBarCount: function getBarCount() {
			var me = this;
			var barCount = 0;
			helpers.each(me.chart.data.datasets, function (dataset, datasetIndex) {
				var meta = me.chart.getDatasetMeta(datasetIndex);
				if (meta.bar && me.chart.isDatasetVisible(datasetIndex)) {
					++barCount;
				}
			}, me);
			return barCount;
		},

		update: function update(reset) {
			var me = this;
			helpers.each(me.getMeta().data, function (rectangle, index) {
				me.updateElement(rectangle, index, reset);
			}, me);
		},

		updateElement: function updateElement(rectangle, index, reset) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var yScale = me.getScaleForId(meta.yAxisID);
			var scaleBase = yScale.getBasePixel();
			var rectangleElementOptions = me.chart.options.elements.rectangle;
			var custom = rectangle.custom || {};
			var dataset = me.getDataset();

			rectangle._xScale = xScale;
			rectangle._yScale = yScale;
			rectangle._datasetIndex = me.index;
			rectangle._index = index;

			var ruler = me.getRuler(index);
			rectangle._model = {
				x: me.calculateBarX(index, me.index, ruler),
				y: reset ? scaleBase : me.calculateBarY(index, me.index),

				// Tooltip
				label: me.chart.data.labels[index],
				datasetLabel: dataset.label,

				// Appearance
				base: reset ? scaleBase : me.calculateBarBase(me.index, index),
				width: me.calculateBarWidth(ruler),
				backgroundColor: custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.backgroundColor, index, rectangleElementOptions.backgroundColor),
				borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
				borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor),
				borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth)
			};

			rectangle.pivot();
		},

		calculateBarBase: function calculateBarBase(datasetIndex, index) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var base = 0;

			if (yScale.options.stacked) {
				var chart = me.chart;
				var datasets = chart.data.datasets;
				var value = Number(datasets[datasetIndex].data[index]);

				for (var i = 0; i < datasetIndex; i++) {
					var currentDs = datasets[i];
					var currentDsMeta = chart.getDatasetMeta(i);
					if (currentDsMeta.bar && currentDsMeta.yAxisID === yScale.id && chart.isDatasetVisible(i)) {
						var currentVal = Number(currentDs.data[index]);
						base += value < 0 ? Math.min(currentVal, 0) : Math.max(currentVal, 0);
					}
				}

				return yScale.getPixelForValue(base);
			}

			return yScale.getBasePixel();
		},

		getRuler: function getRuler(index) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var datasetCount = me.getBarCount();

			var tickWidth;

			if (xScale.options.type === 'category') {
				tickWidth = xScale.getPixelForTick(index + 1) - xScale.getPixelForTick(index);
			} else {
				// Average width
				tickWidth = xScale.width / xScale.ticks.length;
			}
			var categoryWidth = tickWidth * xScale.options.categoryPercentage;
			var categorySpacing = (tickWidth - tickWidth * xScale.options.categoryPercentage) / 2;
			var fullBarWidth = categoryWidth / datasetCount;

			if (xScale.ticks.length !== me.chart.data.labels.length) {
				var perc = xScale.ticks.length / me.chart.data.labels.length;
				fullBarWidth = fullBarWidth * perc;
			}

			var barWidth = fullBarWidth * xScale.options.barPercentage;
			var barSpacing = fullBarWidth - fullBarWidth * xScale.options.barPercentage;

			return {
				datasetCount: datasetCount,
				tickWidth: tickWidth,
				categoryWidth: categoryWidth,
				categorySpacing: categorySpacing,
				fullBarWidth: fullBarWidth,
				barWidth: barWidth,
				barSpacing: barSpacing
			};
		},

		calculateBarWidth: function calculateBarWidth(ruler) {
			var xScale = this.getScaleForId(this.getMeta().xAxisID);
			if (xScale.options.barThickness) {
				return xScale.options.barThickness;
			}
			return xScale.options.stacked ? ruler.categoryWidth : ruler.barWidth;
		},

		// Get bar index from the given dataset index accounting for the fact that not all bars are visible
		getBarIndex: function getBarIndex(datasetIndex) {
			var barIndex = 0;
			var meta, j;

			for (j = 0; j < datasetIndex; ++j) {
				meta = this.chart.getDatasetMeta(j);
				if (meta.bar && this.chart.isDatasetVisible(j)) {
					++barIndex;
				}
			}

			return barIndex;
		},

		calculateBarX: function calculateBarX(index, datasetIndex, ruler) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var barIndex = me.getBarIndex(datasetIndex);
			var leftTick = xScale.getPixelForValue(null, index, datasetIndex, me.chart.isCombo);
			leftTick -= me.chart.isCombo ? ruler.tickWidth / 2 : 0;

			if (xScale.options.stacked) {
				return leftTick + ruler.categoryWidth / 2 + ruler.categorySpacing;
			}

			return leftTick + ruler.barWidth / 2 + ruler.categorySpacing + ruler.barWidth * barIndex + ruler.barSpacing / 2 + ruler.barSpacing * barIndex;
		},

		calculateBarY: function calculateBarY(index, datasetIndex) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var value = Number(me.getDataset().data[index]);

			if (yScale.options.stacked) {

				var sumPos = 0,
				    sumNeg = 0;

				for (var i = 0; i < datasetIndex; i++) {
					var ds = me.chart.data.datasets[i];
					var dsMeta = me.chart.getDatasetMeta(i);
					if (dsMeta.bar && dsMeta.yAxisID === yScale.id && me.chart.isDatasetVisible(i)) {
						var stackedVal = Number(ds.data[index]);
						if (stackedVal < 0) {
							sumNeg += stackedVal || 0;
						} else {
							sumPos += stackedVal || 0;
						}
					}
				}

				if (value < 0) {
					return yScale.getPixelForValue(sumNeg + value);
				}
				return yScale.getPixelForValue(sumPos + value);
			}

			return yScale.getPixelForValue(value);
		},

		draw: function draw(ease) {
			var me = this;
			var easingDecimal = ease || 1;
			var metaData = me.getMeta().data;
			var dataset = me.getDataset();
			var i, len;

			for (i = 0, len = metaData.length; i < len; ++i) {
				var d = dataset.data[i];
				if (d !== null && d !== undefined && !isNaN(d)) {
					metaData[i].transition(easingDecimal).draw();
				}
			}
		},

		setHoverStyle: function setHoverStyle(rectangle) {
			var dataset = this.chart.data.datasets[rectangle._datasetIndex];
			var index = rectangle._index;

			var custom = rectangle.custom || {};
			var model = rectangle._model;
			model.backgroundColor = custom.hoverBackgroundColor ? custom.hoverBackgroundColor : helpers.getValueAtIndexOrDefault(dataset.hoverBackgroundColor, index, helpers.getHoverColor(model.backgroundColor));
			model.borderColor = custom.hoverBorderColor ? custom.hoverBorderColor : helpers.getValueAtIndexOrDefault(dataset.hoverBorderColor, index, helpers.getHoverColor(model.borderColor));
			model.borderWidth = custom.hoverBorderWidth ? custom.hoverBorderWidth : helpers.getValueAtIndexOrDefault(dataset.hoverBorderWidth, index, model.borderWidth);
		},

		removeHoverStyle: function removeHoverStyle(rectangle) {
			var dataset = this.chart.data.datasets[rectangle._datasetIndex];
			var index = rectangle._index;
			var custom = rectangle.custom || {};
			var model = rectangle._model;
			var rectangleElementOptions = this.chart.options.elements.rectangle;

			model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.backgroundColor, index, rectangleElementOptions.backgroundColor);
			model.borderColor = custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor);
			model.borderWidth = custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth);
		}

	});

	// including horizontalBar in the bar file, instead of a file of its own
	// it extends bar (like pie extends doughnut)
	Chart.defaults.horizontalBar = {
		hover: {
			mode: 'label'
		},

		scales: {
			xAxes: [{
				type: 'linear',
				position: 'bottom'
			}],
			yAxes: [{
				position: 'left',
				type: 'category',

				// Specific to Horizontal Bar Controller
				categoryPercentage: 0.8,
				barPercentage: 0.9,

				// grid line settings
				gridLines: {
					offsetGridLines: true
				}
			}]
		},
		elements: {
			rectangle: {
				borderSkipped: 'left'
			}
		},
		tooltips: {
			callbacks: {
				title: function title(tooltipItems, data) {
					// Pick first xLabel for now
					var title = '';

					if (tooltipItems.length > 0) {
						if (tooltipItems[0].yLabel) {
							title = tooltipItems[0].yLabel;
						} else if (data.labels.length > 0 && tooltipItems[0].index < data.labels.length) {
							title = data.labels[tooltipItems[0].index];
						}
					}

					return title;
				},
				label: function label(tooltipItem, data) {
					var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
					return datasetLabel + ': ' + tooltipItem.xLabel;
				}
			}
		}
	};

	Chart.controllers.horizontalBar = Chart.controllers.bar.extend({
		updateElement: function updateElement(rectangle, index, reset) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var yScale = me.getScaleForId(meta.yAxisID);
			var scaleBase = xScale.getBasePixel();
			var custom = rectangle.custom || {};
			var dataset = me.getDataset();
			var rectangleElementOptions = me.chart.options.elements.rectangle;

			rectangle._xScale = xScale;
			rectangle._yScale = yScale;
			rectangle._datasetIndex = me.index;
			rectangle._index = index;

			var ruler = me.getRuler(index);
			rectangle._model = {
				x: reset ? scaleBase : me.calculateBarX(index, me.index),
				y: me.calculateBarY(index, me.index, ruler),

				// Tooltip
				label: me.chart.data.labels[index],
				datasetLabel: dataset.label,

				// Appearance
				base: reset ? scaleBase : me.calculateBarBase(me.index, index),
				height: me.calculateBarHeight(ruler),
				backgroundColor: custom.backgroundColor ? custom.backgroundColor : helpers.getValueAtIndexOrDefault(dataset.backgroundColor, index, rectangleElementOptions.backgroundColor),
				borderSkipped: custom.borderSkipped ? custom.borderSkipped : rectangleElementOptions.borderSkipped,
				borderColor: custom.borderColor ? custom.borderColor : helpers.getValueAtIndexOrDefault(dataset.borderColor, index, rectangleElementOptions.borderColor),
				borderWidth: custom.borderWidth ? custom.borderWidth : helpers.getValueAtIndexOrDefault(dataset.borderWidth, index, rectangleElementOptions.borderWidth)
			};
			rectangle.draw = function () {
				var ctx = this._chart.ctx;
				var vm = this._view;

				var halfHeight = vm.height / 2,
				    topY = vm.y - halfHeight,
				    bottomY = vm.y + halfHeight,
				    right = vm.base - (vm.base - vm.x),
				    halfStroke = vm.borderWidth / 2;

				// Canvas doesn't allow us to stroke inside the width so we can
				// adjust the sizes to fit if we're setting a stroke on the line
				if (vm.borderWidth) {
					topY += halfStroke;
					bottomY -= halfStroke;
					right += halfStroke;
				}

				ctx.beginPath();

				ctx.setFillStyle(vm.backgroundColor);
				ctx.setStrokeStyle(vm.borderColor);
				ctx.setLineWidth(vm.borderWidth);

				// Corner points, from bottom-left to bottom-right clockwise
				// | 1 2 |
				// | 0 3 |
				var corners = [[vm.base, bottomY], [vm.base, topY], [right, topY], [right, bottomY]];

				// Find first (starting) corner with fallback to 'bottom'
				var borders = ['bottom', 'left', 'top', 'right'];
				var startCorner = borders.indexOf(vm.borderSkipped, 0);
				if (startCorner === -1) {
					startCorner = 0;
				}

				function cornerAt(cornerIndex) {
					return corners[(startCorner + cornerIndex) % 4];
				}

				// Draw rectangle from 'startCorner'
				ctx.moveTo.apply(ctx, cornerAt(0));
				for (var i = 1; i < 4; i++) {
					ctx.lineTo.apply(ctx, cornerAt(i));
				}

				ctx.fill();
				if (vm.borderWidth) {
					ctx.stroke();
				}
			};

			rectangle.pivot();
		},

		calculateBarBase: function calculateBarBase(datasetIndex, index) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var base = 0;

			if (xScale.options.stacked) {
				var chart = me.chart;
				var datasets = chart.data.datasets;
				var value = Number(datasets[datasetIndex].data[index]);

				for (var i = 0; i < datasetIndex; i++) {
					var currentDs = datasets[i];
					var currentDsMeta = chart.getDatasetMeta(i);
					if (currentDsMeta.bar && currentDsMeta.xAxisID === xScale.id && chart.isDatasetVisible(i)) {
						var currentVal = Number(currentDs.data[index]);
						base += value < 0 ? Math.min(currentVal, 0) : Math.max(currentVal, 0);
					}
				}

				return xScale.getPixelForValue(base);
			}

			return xScale.getBasePixel();
		},

		getRuler: function getRuler(index) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var datasetCount = me.getBarCount();

			var tickHeight;
			if (yScale.options.type === 'category') {
				tickHeight = yScale.getPixelForTick(index + 1) - yScale.getPixelForTick(index);
			} else {
				// Average width
				tickHeight = yScale.width / yScale.ticks.length;
			}
			var categoryHeight = tickHeight * yScale.options.categoryPercentage;
			var categorySpacing = (tickHeight - tickHeight * yScale.options.categoryPercentage) / 2;
			var fullBarHeight = categoryHeight / datasetCount;

			if (yScale.ticks.length !== me.chart.data.labels.length) {
				var perc = yScale.ticks.length / me.chart.data.labels.length;
				fullBarHeight = fullBarHeight * perc;
			}

			var barHeight = fullBarHeight * yScale.options.barPercentage;
			var barSpacing = fullBarHeight - fullBarHeight * yScale.options.barPercentage;

			return {
				datasetCount: datasetCount,
				tickHeight: tickHeight,
				categoryHeight: categoryHeight,
				categorySpacing: categorySpacing,
				fullBarHeight: fullBarHeight,
				barHeight: barHeight,
				barSpacing: barSpacing
			};
		},

		calculateBarHeight: function calculateBarHeight(ruler) {
			var me = this;
			var yScale = me.getScaleForId(me.getMeta().yAxisID);
			if (yScale.options.barThickness) {
				return yScale.options.barThickness;
			}
			return yScale.options.stacked ? ruler.categoryHeight : ruler.barHeight;
		},

		calculateBarX: function calculateBarX(index, datasetIndex) {
			var me = this;
			var meta = me.getMeta();
			var xScale = me.getScaleForId(meta.xAxisID);
			var value = Number(me.getDataset().data[index]);

			if (xScale.options.stacked) {

				var sumPos = 0,
				    sumNeg = 0;

				for (var i = 0; i < datasetIndex; i++) {
					var ds = me.chart.data.datasets[i];
					var dsMeta = me.chart.getDatasetMeta(i);
					if (dsMeta.bar && dsMeta.xAxisID === xScale.id && me.chart.isDatasetVisible(i)) {
						var stackedVal = Number(ds.data[index]);
						if (stackedVal < 0) {
							sumNeg += stackedVal || 0;
						} else {
							sumPos += stackedVal || 0;
						}
					}
				}

				if (value < 0) {
					return xScale.getPixelForValue(sumNeg + value);
				}
				return xScale.getPixelForValue(sumPos + value);
			}

			return xScale.getPixelForValue(value);
		},

		calculateBarY: function calculateBarY(index, datasetIndex, ruler) {
			var me = this;
			var meta = me.getMeta();
			var yScale = me.getScaleForId(meta.yAxisID);
			var barIndex = me.getBarIndex(datasetIndex);
			var topTick = yScale.getPixelForValue(null, index, datasetIndex, me.chart.isCombo);
			topTick -= me.chart.isCombo ? ruler.tickHeight / 2 : 0;

			if (yScale.options.stacked) {
				return topTick + ruler.categoryHeight / 2 + ruler.categorySpacing;
			}

			return topTick + ruler.barHeight / 2 + ruler.categorySpacing + ruler.barHeight * barIndex + ruler.barSpacing / 2 + ruler.barSpacing * barIndex;
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyb2xsZXIuYmFyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydHMiLCJDaGFydCIsImhlbHBlcnMiLCJkZWZhdWx0cyIsImJhciIsImhvdmVyIiwibW9kZSIsInNjYWxlcyIsInhBeGVzIiwidHlwZSIsImNhdGVnb3J5UGVyY2VudGFnZSIsImJhclBlcmNlbnRhZ2UiLCJncmlkTGluZXMiLCJvZmZzZXRHcmlkTGluZXMiLCJ5QXhlcyIsImNvbnRyb2xsZXJzIiwiRGF0YXNldENvbnRyb2xsZXIiLCJleHRlbmQiLCJkYXRhRWxlbWVudFR5cGUiLCJlbGVtZW50cyIsIlJlY3RhbmdsZSIsImluaXRpYWxpemUiLCJjaGFydCIsImRhdGFzZXRJbmRleCIsInByb3RvdHlwZSIsImNhbGwiLCJnZXRNZXRhIiwiZ2V0QmFyQ291bnQiLCJtZSIsImJhckNvdW50IiwiZWFjaCIsImRhdGEiLCJkYXRhc2V0cyIsImRhdGFzZXQiLCJtZXRhIiwiZ2V0RGF0YXNldE1ldGEiLCJpc0RhdGFzZXRWaXNpYmxlIiwidXBkYXRlIiwicmVzZXQiLCJyZWN0YW5nbGUiLCJpbmRleCIsInVwZGF0ZUVsZW1lbnQiLCJ4U2NhbGUiLCJnZXRTY2FsZUZvcklkIiwieEF4aXNJRCIsInlTY2FsZSIsInlBeGlzSUQiLCJzY2FsZUJhc2UiLCJnZXRCYXNlUGl4ZWwiLCJyZWN0YW5nbGVFbGVtZW50T3B0aW9ucyIsIm9wdGlvbnMiLCJjdXN0b20iLCJnZXREYXRhc2V0IiwiX3hTY2FsZSIsIl95U2NhbGUiLCJfZGF0YXNldEluZGV4IiwiX2luZGV4IiwicnVsZXIiLCJnZXRSdWxlciIsIl9tb2RlbCIsIngiLCJjYWxjdWxhdGVCYXJYIiwieSIsImNhbGN1bGF0ZUJhclkiLCJsYWJlbCIsImxhYmVscyIsImRhdGFzZXRMYWJlbCIsImJhc2UiLCJjYWxjdWxhdGVCYXJCYXNlIiwid2lkdGgiLCJjYWxjdWxhdGVCYXJXaWR0aCIsImJhY2tncm91bmRDb2xvciIsImdldFZhbHVlQXRJbmRleE9yRGVmYXVsdCIsImJvcmRlclNraXBwZWQiLCJib3JkZXJDb2xvciIsImJvcmRlcldpZHRoIiwicGl2b3QiLCJzdGFja2VkIiwidmFsdWUiLCJOdW1iZXIiLCJpIiwiY3VycmVudERzIiwiY3VycmVudERzTWV0YSIsImlkIiwiY3VycmVudFZhbCIsIk1hdGgiLCJtaW4iLCJtYXgiLCJnZXRQaXhlbEZvclZhbHVlIiwiZGF0YXNldENvdW50IiwidGlja1dpZHRoIiwiZ2V0UGl4ZWxGb3JUaWNrIiwidGlja3MiLCJsZW5ndGgiLCJjYXRlZ29yeVdpZHRoIiwiY2F0ZWdvcnlTcGFjaW5nIiwiZnVsbEJhcldpZHRoIiwicGVyYyIsImJhcldpZHRoIiwiYmFyU3BhY2luZyIsImJhclRoaWNrbmVzcyIsImdldEJhckluZGV4IiwiYmFySW5kZXgiLCJqIiwibGVmdFRpY2siLCJpc0NvbWJvIiwic3VtUG9zIiwic3VtTmVnIiwiZHMiLCJkc01ldGEiLCJzdGFja2VkVmFsIiwiZHJhdyIsImVhc2UiLCJlYXNpbmdEZWNpbWFsIiwibWV0YURhdGEiLCJsZW4iLCJkIiwidW5kZWZpbmVkIiwiaXNOYU4iLCJ0cmFuc2l0aW9uIiwic2V0SG92ZXJTdHlsZSIsIm1vZGVsIiwiaG92ZXJCYWNrZ3JvdW5kQ29sb3IiLCJnZXRIb3ZlckNvbG9yIiwiaG92ZXJCb3JkZXJDb2xvciIsImhvdmVyQm9yZGVyV2lkdGgiLCJyZW1vdmVIb3ZlclN0eWxlIiwiaG9yaXpvbnRhbEJhciIsInBvc2l0aW9uIiwidG9vbHRpcHMiLCJjYWxsYmFja3MiLCJ0aXRsZSIsInRvb2x0aXBJdGVtcyIsInlMYWJlbCIsInRvb2x0aXBJdGVtIiwieExhYmVsIiwiaGVpZ2h0IiwiY2FsY3VsYXRlQmFySGVpZ2h0IiwiY3R4IiwiX2NoYXJ0Iiwidm0iLCJfdmlldyIsImhhbGZIZWlnaHQiLCJ0b3BZIiwiYm90dG9tWSIsInJpZ2h0IiwiaGFsZlN0cm9rZSIsImJlZ2luUGF0aCIsInNldEZpbGxTdHlsZSIsInNldFN0cm9rZVN0eWxlIiwic2V0TGluZVdpZHRoIiwiY29ybmVycyIsImJvcmRlcnMiLCJzdGFydENvcm5lciIsImluZGV4T2YiLCJjb3JuZXJBdCIsImNvcm5lckluZGV4IiwibW92ZVRvIiwiYXBwbHkiLCJsaW5lVG8iLCJmaWxsIiwic3Ryb2tlIiwidGlja0hlaWdodCIsImNhdGVnb3J5SGVpZ2h0IiwiZnVsbEJhckhlaWdodCIsImJhckhlaWdodCIsInRvcFRpY2siXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBQSxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLEtBQVQsRUFBZ0I7O0FBRWhDLEtBQUlDLFVBQVVELE1BQU1DLE9BQXBCOztBQUVBRCxPQUFNRSxRQUFOLENBQWVDLEdBQWYsR0FBcUI7QUFDcEJDLFNBQU87QUFDTkMsU0FBTTtBQURBLEdBRGE7O0FBS3BCQyxVQUFRO0FBQ1BDLFVBQU8sQ0FBQztBQUNQQyxVQUFNLFVBREM7O0FBR1A7QUFDQUMsd0JBQW9CLEdBSmI7QUFLUEMsbUJBQWUsR0FMUjs7QUFPUDtBQUNBQyxlQUFXO0FBQ1ZDLHNCQUFpQjtBQURQO0FBUkosSUFBRCxDQURBO0FBYVBDLFVBQU8sQ0FBQztBQUNQTCxVQUFNO0FBREMsSUFBRDtBQWJBO0FBTFksRUFBckI7O0FBd0JBUixPQUFNYyxXQUFOLENBQWtCWCxHQUFsQixHQUF3QkgsTUFBTWUsaUJBQU4sQ0FBd0JDLE1BQXhCLENBQStCOztBQUV0REMsbUJBQWlCakIsTUFBTWtCLFFBQU4sQ0FBZUMsU0FGc0I7O0FBSXREQyxjQUFZLG9CQUFTQyxLQUFULEVBQWdCQyxZQUFoQixFQUE4QjtBQUN6Q3RCLFNBQU1lLGlCQUFOLENBQXdCUSxTQUF4QixDQUFrQ0gsVUFBbEMsQ0FBNkNJLElBQTdDLENBQWtELElBQWxELEVBQXdESCxLQUF4RCxFQUErREMsWUFBL0Q7O0FBRUE7QUFDQSxRQUFLRyxPQUFMLEdBQWV0QixHQUFmLEdBQXFCLElBQXJCO0FBQ0EsR0FUcUQ7O0FBV3REO0FBQ0F1QixlQUFhLHVCQUFXO0FBQ3ZCLE9BQUlDLEtBQUssSUFBVDtBQUNBLE9B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aWxlIjoiY29udHJvbGxlci5iYXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENoYXJ0KSB7XHJcblxyXG5cdHZhciBoZWxwZXJzID0gQ2hhcnQuaGVscGVycztcclxuXHJcblx0Q2hhcnQuZGVmYXVsdHMuYmFyID0ge1xyXG5cdFx0aG92ZXI6IHtcclxuXHRcdFx0bW9kZTogJ2xhYmVsJ1xyXG5cdFx0fSxcclxuXHJcblx0XHRzY2FsZXM6IHtcclxuXHRcdFx0eEF4ZXM6IFt7XHJcblx0XHRcdFx0dHlwZTogJ2NhdGVnb3J5JyxcclxuXHJcblx0XHRcdFx0Ly8gU3BlY2lmaWMgdG8gQmFyIENvbnRyb2xsZXJcclxuXHRcdFx0XHRjYXRlZ29yeVBlcmNlbnRhZ2U6IDAuOCxcclxuXHRcdFx0XHRiYXJQZXJjZW50YWdlOiAwLjksXHJcblxyXG5cdFx0XHRcdC8vIGdyaWQgbGluZSBzZXR0aW5nc1xyXG5cdFx0XHRcdGdyaWRMaW5lczoge1xyXG5cdFx0XHRcdFx0b2Zmc2V0R3JpZExpbmVzOiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XSxcclxuXHRcdFx0eUF4ZXM6IFt7XHJcblx0XHRcdFx0dHlwZTogJ2xpbmVhcidcclxuXHRcdFx0fV1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRDaGFydC5jb250cm9sbGVycy5iYXIgPSBDaGFydC5EYXRhc2V0Q29udHJvbGxlci5leHRlbmQoe1xyXG5cclxuXHRcdGRhdGFFbGVtZW50VHlwZTogQ2hhcnQuZWxlbWVudHMuUmVjdGFuZ2xlLFxyXG5cclxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKGNoYXJ0LCBkYXRhc2V0SW5kZXgpIHtcclxuXHRcdFx0Q2hhcnQuRGF0YXNldENvbnRyb2xsZXIucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBjaGFydCwgZGF0YXNldEluZGV4KTtcclxuXHJcblx0XHRcdC8vIFVzZSB0aGlzIHRvIGluZGljYXRlIHRoYXQgdGhpcyBpcyBhIGJhciBkYXRhc2V0LlxyXG5cdFx0XHR0aGlzLmdldE1ldGEoKS5iYXIgPSB0cnVlO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBHZXQgdGhlIG51bWJlciBvZiBkYXRhc2V0cyB0aGF0IGRpc3BsYXkgYmFycy4gV2UgdXNlIHRoaXMgdG8gY29ycmVjdGx5IGNhbGN1bGF0ZSB0aGUgYmFyIHdpZHRoXHJcblx0XHRnZXRCYXJDb3VudDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBiYXJDb3VudCA9IDA7XHJcblx0XHRcdGhlbHBlcnMuZWFjaChtZS5jaGFydC5kYXRhLmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0LCBkYXRhc2V0SW5kZXgpIHtcclxuXHRcdFx0XHR2YXIgbWV0YSA9IG1lLmNoYXJ0LmdldERhdGFzZXRNZXRhKGRhdGFzZXRJbmRleCk7XHJcblx0XHRcdFx0aWYgKG1ldGEuYmFyICYmIG1lLmNoYXJ0LmlzRGF0YXNldFZpc2libGUoZGF0YXNldEluZGV4KSkge1xyXG5cdFx0XHRcdFx0KytiYXJDb3VudDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIG1lKTtcclxuXHRcdFx0cmV0dXJuIGJhckNvdW50O1xyXG5cdFx0fSxcclxuXHJcblx0XHR1cGRhdGU6IGZ1bmN0aW9uKHJlc2V0KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdGhlbHBlcnMuZWFjaChtZS5nZXRNZXRhKCkuZGF0YSwgZnVuY3Rpb24ocmVjdGFuZ2xlLCBpbmRleCkge1xyXG5cdFx0XHRcdG1lLnVwZGF0ZUVsZW1lbnQocmVjdGFuZ2xlLCBpbmRleCwgcmVzZXQpO1xyXG5cdFx0XHR9LCBtZSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdHVwZGF0ZUVsZW1lbnQ6IGZ1bmN0aW9uKHJlY3RhbmdsZSwgaW5kZXgsIHJlc2V0KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBtZXRhID0gbWUuZ2V0TWV0YSgpO1xyXG5cdFx0XHR2YXIgeFNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnhBeGlzSUQpO1xyXG5cdFx0XHR2YXIgeVNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnlBeGlzSUQpO1xyXG5cdFx0XHR2YXIgc2NhbGVCYXNlID0geVNjYWxlLmdldEJhc2VQaXhlbCgpO1xyXG5cdFx0XHR2YXIgcmVjdGFuZ2xlRWxlbWVudE9wdGlvbnMgPSBtZS5jaGFydC5vcHRpb25zLmVsZW1lbnRzLnJlY3RhbmdsZTtcclxuXHRcdFx0dmFyIGN1c3RvbSA9IHJlY3RhbmdsZS5jdXN0b20gfHwge307XHJcblx0XHRcdHZhciBkYXRhc2V0ID0gbWUuZ2V0RGF0YXNldCgpO1xyXG5cclxuXHRcdFx0cmVjdGFuZ2xlLl94U2NhbGUgPSB4U2NhbGU7XHJcblx0XHRcdHJlY3RhbmdsZS5feVNjYWxlID0geVNjYWxlO1xyXG5cdFx0XHRyZWN0YW5nbGUuX2RhdGFzZXRJbmRleCA9IG1lLmluZGV4O1xyXG5cdFx0XHRyZWN0YW5nbGUuX2luZGV4ID0gaW5kZXg7XHJcblxyXG5cdFx0XHR2YXIgcnVsZXIgPSBtZS5nZXRSdWxlcihpbmRleCk7XHJcblx0XHRcdHJlY3RhbmdsZS5fbW9kZWwgPSB7XHJcblx0XHRcdFx0eDogbWUuY2FsY3VsYXRlQmFyWChpbmRleCwgbWUuaW5kZXgsIHJ1bGVyKSxcclxuXHRcdFx0XHR5OiByZXNldCA/IHNjYWxlQmFzZSA6IG1lLmNhbGN1bGF0ZUJhclkoaW5kZXgsIG1lLmluZGV4KSxcclxuXHJcblx0XHRcdFx0Ly8gVG9vbHRpcFxyXG5cdFx0XHRcdGxhYmVsOiBtZS5jaGFydC5kYXRhLmxhYmVsc1tpbmRleF0sXHJcblx0XHRcdFx0ZGF0YXNldExhYmVsOiBkYXRhc2V0LmxhYmVsLFxyXG5cclxuXHRcdFx0XHQvLyBBcHBlYXJhbmNlXHJcblx0XHRcdFx0YmFzZTogcmVzZXQgPyBzY2FsZUJhc2UgOiBtZS5jYWxjdWxhdGVCYXJCYXNlKG1lLmluZGV4LCBpbmRleCksXHJcblx0XHRcdFx0d2lkdGg6IG1lLmNhbGN1bGF0ZUJhcldpZHRoKHJ1bGVyKSxcclxuXHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IGN1c3RvbS5iYWNrZ3JvdW5kQ29sb3IgPyBjdXN0b20uYmFja2dyb3VuZENvbG9yIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5iYWNrZ3JvdW5kQ29sb3IsIGluZGV4LCByZWN0YW5nbGVFbGVtZW50T3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3IpLFxyXG5cdFx0XHRcdGJvcmRlclNraXBwZWQ6IGN1c3RvbS5ib3JkZXJTa2lwcGVkID8gY3VzdG9tLmJvcmRlclNraXBwZWQgOiByZWN0YW5nbGVFbGVtZW50T3B0aW9ucy5ib3JkZXJTa2lwcGVkLFxyXG5cdFx0XHRcdGJvcmRlckNvbG9yOiBjdXN0b20uYm9yZGVyQ29sb3IgPyBjdXN0b20uYm9yZGVyQ29sb3IgOiBoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdChkYXRhc2V0LmJvcmRlckNvbG9yLCBpbmRleCwgcmVjdGFuZ2xlRWxlbWVudE9wdGlvbnMuYm9yZGVyQ29sb3IpLFxyXG5cdFx0XHRcdGJvcmRlcldpZHRoOiBjdXN0b20uYm9yZGVyV2lkdGggPyBjdXN0b20uYm9yZGVyV2lkdGggOiBoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdChkYXRhc2V0LmJvcmRlcldpZHRoLCBpbmRleCwgcmVjdGFuZ2xlRWxlbWVudE9wdGlvbnMuYm9yZGVyV2lkdGgpXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRyZWN0YW5nbGUucGl2b3QoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Y2FsY3VsYXRlQmFyQmFzZTogZnVuY3Rpb24oZGF0YXNldEluZGV4LCBpbmRleCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWV0YSA9IG1lLmdldE1ldGEoKTtcclxuXHRcdFx0dmFyIHlTY2FsZSA9IG1lLmdldFNjYWxlRm9ySWQobWV0YS55QXhpc0lEKTtcclxuXHRcdFx0dmFyIGJhc2UgPSAwO1xyXG5cclxuXHRcdFx0aWYgKHlTY2FsZS5vcHRpb25zLnN0YWNrZWQpIHtcclxuXHRcdFx0XHR2YXIgY2hhcnQgPSBtZS5jaGFydDtcclxuXHRcdFx0XHR2YXIgZGF0YXNldHMgPSBjaGFydC5kYXRhLmRhdGFzZXRzO1xyXG5cdFx0XHRcdHZhciB2YWx1ZSA9IE51bWJlcihkYXRhc2V0c1tkYXRhc2V0SW5kZXhdLmRhdGFbaW5kZXhdKTtcclxuXHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhc2V0SW5kZXg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGN1cnJlbnREcyA9IGRhdGFzZXRzW2ldO1xyXG5cdFx0XHRcdFx0dmFyIGN1cnJlbnREc01ldGEgPSBjaGFydC5nZXREYXRhc2V0TWV0YShpKTtcclxuXHRcdFx0XHRcdGlmIChjdXJyZW50RHNNZXRhLmJhciAmJiBjdXJyZW50RHNNZXRhLnlBeGlzSUQgPT09IHlTY2FsZS5pZCAmJiBjaGFydC5pc0RhdGFzZXRWaXNpYmxlKGkpKSB7XHJcblx0XHRcdFx0XHRcdHZhciBjdXJyZW50VmFsID0gTnVtYmVyKGN1cnJlbnREcy5kYXRhW2luZGV4XSk7XHJcblx0XHRcdFx0XHRcdGJhc2UgKz0gdmFsdWUgPCAwID8gTWF0aC5taW4oY3VycmVudFZhbCwgMCkgOiBNYXRoLm1heChjdXJyZW50VmFsLCAwKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB5U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZShiYXNlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHlTY2FsZS5nZXRCYXNlUGl4ZWwoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Z2V0UnVsZXI6IGZ1bmN0aW9uKGluZGV4KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBtZXRhID0gbWUuZ2V0TWV0YSgpO1xyXG5cdFx0XHR2YXIgeFNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnhBeGlzSUQpO1xyXG5cdFx0XHR2YXIgZGF0YXNldENvdW50ID0gbWUuZ2V0QmFyQ291bnQoKTtcclxuXHJcblx0XHRcdHZhciB0aWNrV2lkdGg7XHJcblxyXG5cdFx0XHRpZiAoeFNjYWxlLm9wdGlvbnMudHlwZSA9PT0gJ2NhdGVnb3J5Jykge1xyXG5cdFx0XHRcdHRpY2tXaWR0aCA9IHhTY2FsZS5nZXRQaXhlbEZvclRpY2soaW5kZXggKyAxKSAtIHhTY2FsZS5nZXRQaXhlbEZvclRpY2soaW5kZXgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEF2ZXJhZ2Ugd2lkdGhcclxuXHRcdFx0XHR0aWNrV2lkdGggPSB4U2NhbGUud2lkdGggLyB4U2NhbGUudGlja3MubGVuZ3RoO1xyXG5cdFx0XHR9XHJcblx0XHRcdHZhciBjYXRlZ29yeVdpZHRoID0gdGlja1dpZHRoICogeFNjYWxlLm9wdGlvbnMuY2F0ZWdvcnlQZXJjZW50YWdlO1xyXG5cdFx0XHR2YXIgY2F0ZWdvcnlTcGFjaW5nID0gKHRpY2tXaWR0aCAtICh0aWNrV2lkdGggKiB4U2NhbGUub3B0aW9ucy5jYXRlZ29yeVBlcmNlbnRhZ2UpKSAvIDI7XHJcblx0XHRcdHZhciBmdWxsQmFyV2lkdGggPSBjYXRlZ29yeVdpZHRoIC8gZGF0YXNldENvdW50O1xyXG5cclxuXHRcdFx0aWYgKHhTY2FsZS50aWNrcy5sZW5ndGggIT09IG1lLmNoYXJ0LmRhdGEubGFiZWxzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHZhciBwZXJjID0geFNjYWxlLnRpY2tzLmxlbmd0aCAvIG1lLmNoYXJ0LmRhdGEubGFiZWxzLmxlbmd0aDtcclxuXHRcdFx0XHRmdWxsQmFyV2lkdGggPSBmdWxsQmFyV2lkdGggKiBwZXJjO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgYmFyV2lkdGggPSBmdWxsQmFyV2lkdGggKiB4U2NhbGUub3B0aW9ucy5iYXJQZXJjZW50YWdlO1xyXG5cdFx0XHR2YXIgYmFyU3BhY2luZyA9IGZ1bGxCYXJXaWR0aCAtIChmdWxsQmFyV2lkdGggKiB4U2NhbGUub3B0aW9ucy5iYXJQZXJjZW50YWdlKTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0ZGF0YXNldENvdW50OiBkYXRhc2V0Q291bnQsXHJcblx0XHRcdFx0dGlja1dpZHRoOiB0aWNrV2lkdGgsXHJcblx0XHRcdFx0Y2F0ZWdvcnlXaWR0aDogY2F0ZWdvcnlXaWR0aCxcclxuXHRcdFx0XHRjYXRlZ29yeVNwYWNpbmc6IGNhdGVnb3J5U3BhY2luZyxcclxuXHRcdFx0XHRmdWxsQmFyV2lkdGg6IGZ1bGxCYXJXaWR0aCxcclxuXHRcdFx0XHRiYXJXaWR0aDogYmFyV2lkdGgsXHJcblx0XHRcdFx0YmFyU3BhY2luZzogYmFyU3BhY2luZ1xyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHJcblx0XHRjYWxjdWxhdGVCYXJXaWR0aDogZnVuY3Rpb24ocnVsZXIpIHtcclxuXHRcdFx0dmFyIHhTY2FsZSA9IHRoaXMuZ2V0U2NhbGVGb3JJZCh0aGlzLmdldE1ldGEoKS54QXhpc0lEKTtcclxuXHRcdFx0aWYgKHhTY2FsZS5vcHRpb25zLmJhclRoaWNrbmVzcykge1xyXG5cdFx0XHRcdHJldHVybiB4U2NhbGUub3B0aW9ucy5iYXJUaGlja25lc3M7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHhTY2FsZS5vcHRpb25zLnN0YWNrZWQgPyBydWxlci5jYXRlZ29yeVdpZHRoIDogcnVsZXIuYmFyV2lkdGg7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIEdldCBiYXIgaW5kZXggZnJvbSB0aGUgZ2l2ZW4gZGF0YXNldCBpbmRleCBhY2NvdW50aW5nIGZvciB0aGUgZmFjdCB0aGF0IG5vdCBhbGwgYmFycyBhcmUgdmlzaWJsZVxyXG5cdFx0Z2V0QmFySW5kZXg6IGZ1bmN0aW9uKGRhdGFzZXRJbmRleCkge1xyXG5cdFx0XHR2YXIgYmFySW5kZXggPSAwO1xyXG5cdFx0XHR2YXIgbWV0YSwgajtcclxuXHJcblx0XHRcdGZvciAoaiA9IDA7IGogPCBkYXRhc2V0SW5kZXg7ICsraikge1xyXG5cdFx0XHRcdG1ldGEgPSB0aGlzLmNoYXJ0LmdldERhdGFzZXRNZXRhKGopO1xyXG5cdFx0XHRcdGlmIChtZXRhLmJhciAmJiB0aGlzLmNoYXJ0LmlzRGF0YXNldFZpc2libGUoaikpIHtcclxuXHRcdFx0XHRcdCsrYmFySW5kZXg7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gYmFySW5kZXg7XHJcblx0XHR9LFxyXG5cclxuXHRcdGNhbGN1bGF0ZUJhclg6IGZ1bmN0aW9uKGluZGV4LCBkYXRhc2V0SW5kZXgsIHJ1bGVyKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBtZXRhID0gbWUuZ2V0TWV0YSgpO1xyXG5cdFx0XHR2YXIgeFNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnhBeGlzSUQpO1xyXG5cdFx0XHR2YXIgYmFySW5kZXggPSBtZS5nZXRCYXJJbmRleChkYXRhc2V0SW5kZXgpO1xyXG5cdFx0XHR2YXIgbGVmdFRpY2sgPSB4U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZShudWxsLCBpbmRleCwgZGF0YXNldEluZGV4LCBtZS5jaGFydC5pc0NvbWJvKTtcclxuXHRcdFx0bGVmdFRpY2sgLT0gbWUuY2hhcnQuaXNDb21ibyA/IChydWxlci50aWNrV2lkdGggLyAyKSA6IDA7XHJcblxyXG5cdFx0XHRpZiAoeFNjYWxlLm9wdGlvbnMuc3RhY2tlZCkge1xyXG5cdFx0XHRcdHJldHVybiBsZWZ0VGljayArIChydWxlci5jYXRlZ29yeVdpZHRoIC8gMikgKyBydWxlci5jYXRlZ29yeVNwYWNpbmc7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBsZWZ0VGljayArXHJcblx0XHRcdFx0KHJ1bGVyLmJhcldpZHRoIC8gMikgK1xyXG5cdFx0XHRcdHJ1bGVyLmNhdGVnb3J5U3BhY2luZyArXHJcblx0XHRcdFx0KHJ1bGVyLmJhcldpZHRoICogYmFySW5kZXgpICtcclxuXHRcdFx0XHQocnVsZXIuYmFyU3BhY2luZyAvIDIpICtcclxuXHRcdFx0XHQocnVsZXIuYmFyU3BhY2luZyAqIGJhckluZGV4KTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Y2FsY3VsYXRlQmFyWTogZnVuY3Rpb24oaW5kZXgsIGRhdGFzZXRJbmRleCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWV0YSA9IG1lLmdldE1ldGEoKTtcclxuXHRcdFx0dmFyIHlTY2FsZSA9IG1lLmdldFNjYWxlRm9ySWQobWV0YS55QXhpc0lEKTtcclxuXHRcdFx0dmFyIHZhbHVlID0gTnVtYmVyKG1lLmdldERhdGFzZXQoKS5kYXRhW2luZGV4XSk7XHJcblxyXG5cdFx0XHRpZiAoeVNjYWxlLm9wdGlvbnMuc3RhY2tlZCkge1xyXG5cclxuXHRcdFx0XHR2YXIgc3VtUG9zID0gMCxcclxuXHRcdFx0XHRcdHN1bU5lZyA9IDA7XHJcblxyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YXNldEluZGV4OyBpKyspIHtcclxuXHRcdFx0XHRcdHZhciBkcyA9IG1lLmNoYXJ0LmRhdGEuZGF0YXNldHNbaV07XHJcblx0XHRcdFx0XHR2YXIgZHNNZXRhID0gbWUuY2hhcnQuZ2V0RGF0YXNldE1ldGEoaSk7XHJcblx0XHRcdFx0XHRpZiAoZHNNZXRhLmJhciAmJiBkc01ldGEueUF4aXNJRCA9PT0geVNjYWxlLmlkICYmIG1lLmNoYXJ0LmlzRGF0YXNldFZpc2libGUoaSkpIHtcclxuXHRcdFx0XHRcdFx0dmFyIHN0YWNrZWRWYWwgPSBOdW1iZXIoZHMuZGF0YVtpbmRleF0pO1xyXG5cdFx0XHRcdFx0XHRpZiAoc3RhY2tlZFZhbCA8IDApIHtcclxuXHRcdFx0XHRcdFx0XHRzdW1OZWcgKz0gc3RhY2tlZFZhbCB8fCAwO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHN1bVBvcyArPSBzdGFja2VkVmFsIHx8IDA7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh2YWx1ZSA8IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiB5U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZShzdW1OZWcgKyB2YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiB5U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZShzdW1Qb3MgKyB2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB5U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZSh2YWx1ZSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGRyYXc6IGZ1bmN0aW9uKGVhc2UpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIGVhc2luZ0RlY2ltYWwgPSBlYXNlIHx8IDE7XHJcblx0XHRcdHZhciBtZXRhRGF0YSA9IG1lLmdldE1ldGEoKS5kYXRhO1xyXG5cdFx0XHR2YXIgZGF0YXNldCA9IG1lLmdldERhdGFzZXQoKTtcclxuXHRcdFx0dmFyIGksIGxlbjtcclxuXHJcblx0XHRcdGZvciAoaSA9IDAsIGxlbiA9IG1ldGFEYXRhLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcblx0XHRcdFx0dmFyIGQgPSBkYXRhc2V0LmRhdGFbaV07XHJcblx0XHRcdFx0aWYgKGQgIT09IG51bGwgJiYgZCAhPT0gdW5kZWZpbmVkICYmICFpc05hTihkKSkge1xyXG5cdFx0XHRcdFx0bWV0YURhdGFbaV0udHJhbnNpdGlvbihlYXNpbmdEZWNpbWFsKS5kcmF3KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cclxuXHRcdHNldEhvdmVyU3R5bGU6IGZ1bmN0aW9uKHJlY3RhbmdsZSkge1xyXG5cdFx0XHR2YXIgZGF0YXNldCA9IHRoaXMuY2hhcnQuZGF0YS5kYXRhc2V0c1tyZWN0YW5nbGUuX2RhdGFzZXRJbmRleF07XHJcblx0XHRcdHZhciBpbmRleCA9IHJlY3RhbmdsZS5faW5kZXg7XHJcblxyXG5cdFx0XHR2YXIgY3VzdG9tID0gcmVjdGFuZ2xlLmN1c3RvbSB8fCB7fTtcclxuXHRcdFx0dmFyIG1vZGVsID0gcmVjdGFuZ2xlLl9tb2RlbDtcclxuXHRcdFx0bW9kZWwuYmFja2dyb3VuZENvbG9yID0gY3VzdG9tLmhvdmVyQmFja2dyb3VuZENvbG9yID8gY3VzdG9tLmhvdmVyQmFja2dyb3VuZENvbG9yIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5ob3ZlckJhY2tncm91bmRDb2xvciwgaW5kZXgsIGhlbHBlcnMuZ2V0SG92ZXJDb2xvcihtb2RlbC5iYWNrZ3JvdW5kQ29sb3IpKTtcclxuXHRcdFx0bW9kZWwuYm9yZGVyQ29sb3IgPSBjdXN0b20uaG92ZXJCb3JkZXJDb2xvciA/IGN1c3RvbS5ob3ZlckJvcmRlckNvbG9yIDogaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZGF0YXNldC5ob3ZlckJvcmRlckNvbG9yLCBpbmRleCwgaGVscGVycy5nZXRIb3ZlckNvbG9yKG1vZGVsLmJvcmRlckNvbG9yKSk7XHJcblx0XHRcdG1vZGVsLmJvcmRlcldpZHRoID0gY3VzdG9tLmhvdmVyQm9yZGVyV2lkdGggPyBjdXN0b20uaG92ZXJCb3JkZXJXaWR0aCA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQuaG92ZXJCb3JkZXJXaWR0aCwgaW5kZXgsIG1vZGVsLmJvcmRlcldpZHRoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0cmVtb3ZlSG92ZXJTdHlsZTogZnVuY3Rpb24ocmVjdGFuZ2xlKSB7XHJcblx0XHRcdHZhciBkYXRhc2V0ID0gdGhpcy5jaGFydC5kYXRhLmRhdGFzZXRzW3JlY3RhbmdsZS5fZGF0YXNldEluZGV4XTtcclxuXHRcdFx0dmFyIGluZGV4ID0gcmVjdGFuZ2xlLl9pbmRleDtcclxuXHRcdFx0dmFyIGN1c3RvbSA9IHJlY3RhbmdsZS5jdXN0b20gfHwge307XHJcblx0XHRcdHZhciBtb2RlbCA9IHJlY3RhbmdsZS5fbW9kZWw7XHJcblx0XHRcdHZhciByZWN0YW5nbGVFbGVtZW50T3B0aW9ucyA9IHRoaXMuY2hhcnQub3B0aW9ucy5lbGVtZW50cy5yZWN0YW5nbGU7XHJcblxyXG5cdFx0XHRtb2RlbC5iYWNrZ3JvdW5kQ29sb3IgPSBjdXN0b20uYmFja2dyb3VuZENvbG9yID8gY3VzdG9tLmJhY2tncm91bmRDb2xvciA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQuYmFja2dyb3VuZENvbG9yLCBpbmRleCwgcmVjdGFuZ2xlRWxlbWVudE9wdGlvbnMuYmFja2dyb3VuZENvbG9yKTtcclxuXHRcdFx0bW9kZWwuYm9yZGVyQ29sb3IgPSBjdXN0b20uYm9yZGVyQ29sb3IgPyBjdXN0b20uYm9yZGVyQ29sb3IgOiBoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdChkYXRhc2V0LmJvcmRlckNvbG9yLCBpbmRleCwgcmVjdGFuZ2xlRWxlbWVudE9wdGlvbnMuYm9yZGVyQ29sb3IpO1xyXG5cdFx0XHRtb2RlbC5ib3JkZXJXaWR0aCA9IGN1c3RvbS5ib3JkZXJXaWR0aCA/IGN1c3RvbS5ib3JkZXJXaWR0aCA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQuYm9yZGVyV2lkdGgsIGluZGV4LCByZWN0YW5nbGVFbGVtZW50T3B0aW9ucy5ib3JkZXJXaWR0aCk7XHJcblx0XHR9XHJcblxyXG5cdH0pO1xyXG5cclxuXHJcblx0Ly8gaW5jbHVkaW5nIGhvcml6b250YWxCYXIgaW4gdGhlIGJhciBmaWxlLCBpbnN0ZWFkIG9mIGEgZmlsZSBvZiBpdHMgb3duXHJcblx0Ly8gaXQgZXh0ZW5kcyBiYXIgKGxpa2UgcGllIGV4dGVuZHMgZG91Z2hudXQpXHJcblx0Q2hhcnQuZGVmYXVsdHMuaG9yaXpvbnRhbEJhciA9IHtcclxuXHRcdGhvdmVyOiB7XHJcblx0XHRcdG1vZGU6ICdsYWJlbCdcclxuXHRcdH0sXHJcblxyXG5cdFx0c2NhbGVzOiB7XHJcblx0XHRcdHhBeGVzOiBbe1xyXG5cdFx0XHRcdHR5cGU6ICdsaW5lYXInLFxyXG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tJ1xyXG5cdFx0XHR9XSxcclxuXHRcdFx0eUF4ZXM6IFt7XHJcblx0XHRcdFx0cG9zaXRpb246ICdsZWZ0JyxcclxuXHRcdFx0XHR0eXBlOiAnY2F0ZWdvcnknLFxyXG5cclxuXHRcdFx0XHQvLyBTcGVjaWZpYyB0byBIb3Jpem9udGFsIEJhciBDb250cm9sbGVyXHJcblx0XHRcdFx0Y2F0ZWdvcnlQZXJjZW50YWdlOiAwLjgsXHJcblx0XHRcdFx0YmFyUGVyY2VudGFnZTogMC45LFxyXG5cclxuXHRcdFx0XHQvLyBncmlkIGxpbmUgc2V0dGluZ3NcclxuXHRcdFx0XHRncmlkTGluZXM6IHtcclxuXHRcdFx0XHRcdG9mZnNldEdyaWRMaW5lczogdHJ1ZVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fV1cclxuXHRcdH0sXHJcblx0XHRlbGVtZW50czoge1xyXG5cdFx0XHRyZWN0YW5nbGU6IHtcclxuXHRcdFx0XHRib3JkZXJTa2lwcGVkOiAnbGVmdCdcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdHRvb2x0aXBzOiB7XHJcblx0XHRcdGNhbGxiYWNrczoge1xyXG5cdFx0XHRcdHRpdGxlOiBmdW5jdGlvbih0b29sdGlwSXRlbXMsIGRhdGEpIHtcclxuXHRcdFx0XHRcdC8vIFBpY2sgZmlyc3QgeExhYmVsIGZvciBub3dcclxuXHRcdFx0XHRcdHZhciB0aXRsZSA9ICcnO1xyXG5cclxuXHRcdFx0XHRcdGlmICh0b29sdGlwSXRlbXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHRpZiAodG9vbHRpcEl0ZW1zWzBdLnlMYWJlbCkge1xyXG5cdFx0XHRcdFx0XHRcdHRpdGxlID0gdG9vbHRpcEl0ZW1zWzBdLnlMYWJlbDtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChkYXRhLmxhYmVscy5sZW5ndGggPiAwICYmIHRvb2x0aXBJdGVtc1swXS5pbmRleCA8IGRhdGEubGFiZWxzLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0XHRcdHRpdGxlID0gZGF0YS5sYWJlbHNbdG9vbHRpcEl0ZW1zWzBdLmluZGV4XTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHJldHVybiB0aXRsZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxhYmVsOiBmdW5jdGlvbih0b29sdGlwSXRlbSwgZGF0YSkge1xyXG5cdFx0XHRcdFx0dmFyIGRhdGFzZXRMYWJlbCA9IGRhdGEuZGF0YXNldHNbdG9vbHRpcEl0ZW0uZGF0YXNldEluZGV4XS5sYWJlbCB8fCAnJztcclxuXHRcdFx0XHRcdHJldHVybiBkYXRhc2V0TGFiZWwgKyAnOiAnICsgdG9vbHRpcEl0ZW0ueExhYmVsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdENoYXJ0LmNvbnRyb2xsZXJzLmhvcml6b250YWxCYXIgPSBDaGFydC5jb250cm9sbGVycy5iYXIuZXh0ZW5kKHtcclxuXHRcdHVwZGF0ZUVsZW1lbnQ6IGZ1bmN0aW9uKHJlY3RhbmdsZSwgaW5kZXgsIHJlc2V0KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBtZXRhID0gbWUuZ2V0TWV0YSgpO1xyXG5cdFx0XHR2YXIgeFNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnhBeGlzSUQpO1xyXG5cdFx0XHR2YXIgeVNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnlBeGlzSUQpO1xyXG5cdFx0XHR2YXIgc2NhbGVCYXNlID0geFNjYWxlLmdldEJhc2VQaXhlbCgpO1xyXG5cdFx0XHR2YXIgY3VzdG9tID0gcmVjdGFuZ2xlLmN1c3RvbSB8fCB7fTtcclxuXHRcdFx0dmFyIGRhdGFzZXQgPSBtZS5nZXREYXRhc2V0KCk7XHJcblx0XHRcdHZhciByZWN0YW5nbGVFbGVtZW50T3B0aW9ucyA9IG1lLmNoYXJ0Lm9wdGlvbnMuZWxlbWVudHMucmVjdGFuZ2xlO1xyXG5cclxuXHRcdFx0cmVjdGFuZ2xlLl94U2NhbGUgPSB4U2NhbGU7XHJcblx0XHRcdHJlY3RhbmdsZS5feVNjYWxlID0geVNjYWxlO1xyXG5cdFx0XHRyZWN0YW5nbGUuX2RhdGFzZXRJbmRleCA9IG1lLmluZGV4O1xyXG5cdFx0XHRyZWN0YW5nbGUuX2luZGV4ID0gaW5kZXg7XHJcblxyXG5cdFx0XHR2YXIgcnVsZXIgPSBtZS5nZXRSdWxlcihpbmRleCk7XHJcblx0XHRcdHJlY3RhbmdsZS5fbW9kZWwgPSB7XHJcblx0XHRcdFx0eDogcmVzZXQgPyBzY2FsZUJhc2UgOiBtZS5jYWxjdWxhdGVCYXJYKGluZGV4LCBtZS5pbmRleCksXHJcblx0XHRcdFx0eTogbWUuY2FsY3VsYXRlQmFyWShpbmRleCwgbWUuaW5kZXgsIHJ1bGVyKSxcclxuXHJcblx0XHRcdFx0Ly8gVG9vbHRpcFxyXG5cdFx0XHRcdGxhYmVsOiBtZS5jaGFydC5kYXRhLmxhYmVsc1tpbmRleF0sXHJcblx0XHRcdFx0ZGF0YXNldExhYmVsOiBkYXRhc2V0LmxhYmVsLFxyXG5cclxuXHRcdFx0XHQvLyBBcHBlYXJhbmNlXHJcblx0XHRcdFx0YmFzZTogcmVzZXQgPyBzY2FsZUJhc2UgOiBtZS5jYWxjdWxhdGVCYXJCYXNlKG1lLmluZGV4LCBpbmRleCksXHJcblx0XHRcdFx0aGVpZ2h0OiBtZS5jYWxjdWxhdGVCYXJIZWlnaHQocnVsZXIpLFxyXG5cdFx0XHRcdGJhY2tncm91bmRDb2xvcjogY3VzdG9tLmJhY2tncm91bmRDb2xvciA/IGN1c3RvbS5iYWNrZ3JvdW5kQ29sb3IgOiBoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdChkYXRhc2V0LmJhY2tncm91bmRDb2xvciwgaW5kZXgsIHJlY3RhbmdsZUVsZW1lbnRPcHRpb25zLmJhY2tncm91bmRDb2xvciksXHJcblx0XHRcdFx0Ym9yZGVyU2tpcHBlZDogY3VzdG9tLmJvcmRlclNraXBwZWQgPyBjdXN0b20uYm9yZGVyU2tpcHBlZCA6IHJlY3RhbmdsZUVsZW1lbnRPcHRpb25zLmJvcmRlclNraXBwZWQsXHJcblx0XHRcdFx0Ym9yZGVyQ29sb3I6IGN1c3RvbS5ib3JkZXJDb2xvciA/IGN1c3RvbS5ib3JkZXJDb2xvciA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQuYm9yZGVyQ29sb3IsIGluZGV4LCByZWN0YW5nbGVFbGVtZW50T3B0aW9ucy5ib3JkZXJDb2xvciksXHJcblx0XHRcdFx0Ym9yZGVyV2lkdGg6IGN1c3RvbS5ib3JkZXJXaWR0aCA/IGN1c3RvbS5ib3JkZXJXaWR0aCA6IGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGRhdGFzZXQuYm9yZGVyV2lkdGgsIGluZGV4LCByZWN0YW5nbGVFbGVtZW50T3B0aW9ucy5ib3JkZXJXaWR0aClcclxuXHRcdFx0fTtcclxuXHRcdFx0cmVjdGFuZ2xlLmRyYXcgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR2YXIgY3R4ID0gdGhpcy5fY2hhcnQuY3R4O1xyXG5cdFx0XHRcdHZhciB2bSA9IHRoaXMuX3ZpZXc7XHJcblxyXG5cdFx0XHRcdHZhciBoYWxmSGVpZ2h0ID0gdm0uaGVpZ2h0IC8gMixcclxuXHRcdFx0XHRcdHRvcFkgPSB2bS55IC0gaGFsZkhlaWdodCxcclxuXHRcdFx0XHRcdGJvdHRvbVkgPSB2bS55ICsgaGFsZkhlaWdodCxcclxuXHRcdFx0XHRcdHJpZ2h0ID0gdm0uYmFzZSAtICh2bS5iYXNlIC0gdm0ueCksXHJcblx0XHRcdFx0XHRoYWxmU3Ryb2tlID0gdm0uYm9yZGVyV2lkdGggLyAyO1xyXG5cclxuXHRcdFx0XHQvLyBDYW52YXMgZG9lc24ndCBhbGxvdyB1cyB0byBzdHJva2UgaW5zaWRlIHRoZSB3aWR0aCBzbyB3ZSBjYW5cclxuXHRcdFx0XHQvLyBhZGp1c3QgdGhlIHNpemVzIHRvIGZpdCBpZiB3ZSdyZSBzZXR0aW5nIGEgc3Ryb2tlIG9uIHRoZSBsaW5lXHJcblx0XHRcdFx0aWYgKHZtLmJvcmRlcldpZHRoKSB7XHJcblx0XHRcdFx0XHR0b3BZICs9IGhhbGZTdHJva2U7XHJcblx0XHRcdFx0XHRib3R0b21ZIC09IGhhbGZTdHJva2U7XHJcblx0XHRcdFx0XHRyaWdodCArPSBoYWxmU3Ryb2tlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuXHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKHZtLmJhY2tncm91bmRDb2xvcik7XHJcblx0XHRcdFx0Y3R4LnNldFN0cm9rZVN0eWxlKHZtLmJvcmRlckNvbG9yKTtcclxuXHRcdFx0XHRjdHguc2V0TGluZVdpZHRoKHZtLmJvcmRlcldpZHRoKTtcclxuXHJcblx0XHRcdFx0Ly8gQ29ybmVyIHBvaW50cywgZnJvbSBib3R0b20tbGVmdCB0byBib3R0b20tcmlnaHQgY2xvY2t3aXNlXHJcblx0XHRcdFx0Ly8gfCAxIDIgfFxyXG5cdFx0XHRcdC8vIHwgMCAzIHxcclxuXHRcdFx0XHR2YXIgY29ybmVycyA9IFtcclxuXHRcdFx0XHRcdFt2bS5iYXNlLCBib3R0b21ZXSxcclxuXHRcdFx0XHRcdFt2bS5iYXNlLCB0b3BZXSxcclxuXHRcdFx0XHRcdFtyaWdodCwgdG9wWV0sXHJcblx0XHRcdFx0XHRbcmlnaHQsIGJvdHRvbVldXHJcblx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0Ly8gRmluZCBmaXJzdCAoc3RhcnRpbmcpIGNvcm5lciB3aXRoIGZhbGxiYWNrIHRvICdib3R0b20nXHJcblx0XHRcdFx0dmFyIGJvcmRlcnMgPSBbJ2JvdHRvbScsICdsZWZ0JywgJ3RvcCcsICdyaWdodCddO1xyXG5cdFx0XHRcdHZhciBzdGFydENvcm5lciA9IGJvcmRlcnMuaW5kZXhPZih2bS5ib3JkZXJTa2lwcGVkLCAwKTtcclxuXHRcdFx0XHRpZiAoc3RhcnRDb3JuZXIgPT09IC0xKSB7XHJcblx0XHRcdFx0XHRzdGFydENvcm5lciA9IDA7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiBjb3JuZXJBdChjb3JuZXJJbmRleCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNvcm5lcnNbKHN0YXJ0Q29ybmVyICsgY29ybmVySW5kZXgpICUgNF07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmcm9tICdzdGFydENvcm5lcidcclxuXHRcdFx0XHRjdHgubW92ZVRvLmFwcGx5KGN0eCwgY29ybmVyQXQoMCkpO1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAxOyBpIDwgNDsgaSsrKSB7XHJcblx0XHRcdFx0XHRjdHgubGluZVRvLmFwcGx5KGN0eCwgY29ybmVyQXQoaSkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y3R4LmZpbGwoKTtcclxuXHRcdFx0XHRpZiAodm0uYm9yZGVyV2lkdGgpIHtcclxuXHRcdFx0XHRcdGN0eC5zdHJva2UoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRyZWN0YW5nbGUucGl2b3QoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Y2FsY3VsYXRlQmFyQmFzZTogZnVuY3Rpb24oZGF0YXNldEluZGV4LCBpbmRleCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWV0YSA9IG1lLmdldE1ldGEoKTtcclxuXHRcdFx0dmFyIHhTY2FsZSA9IG1lLmdldFNjYWxlRm9ySWQobWV0YS54QXhpc0lEKTtcclxuXHRcdFx0dmFyIGJhc2UgPSAwO1xyXG5cclxuXHRcdFx0aWYgKHhTY2FsZS5vcHRpb25zLnN0YWNrZWQpIHtcclxuXHRcdFx0XHR2YXIgY2hhcnQgPSBtZS5jaGFydDtcclxuXHRcdFx0XHR2YXIgZGF0YXNldHMgPSBjaGFydC5kYXRhLmRhdGFzZXRzO1xyXG5cdFx0XHRcdHZhciB2YWx1ZSA9IE51bWJlcihkYXRhc2V0c1tkYXRhc2V0SW5kZXhdLmRhdGFbaW5kZXhdKTtcclxuXHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhc2V0SW5kZXg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGN1cnJlbnREcyA9IGRhdGFzZXRzW2ldO1xyXG5cdFx0XHRcdFx0dmFyIGN1cnJlbnREc01ldGEgPSBjaGFydC5nZXREYXRhc2V0TWV0YShpKTtcclxuXHRcdFx0XHRcdGlmIChjdXJyZW50RHNNZXRhLmJhciAmJiBjdXJyZW50RHNNZXRhLnhBeGlzSUQgPT09IHhTY2FsZS5pZCAmJiBjaGFydC5pc0RhdGFzZXRWaXNpYmxlKGkpKSB7XHJcblx0XHRcdFx0XHRcdHZhciBjdXJyZW50VmFsID0gTnVtYmVyKGN1cnJlbnREcy5kYXRhW2luZGV4XSk7XHJcblx0XHRcdFx0XHRcdGJhc2UgKz0gdmFsdWUgPCAwID8gTWF0aC5taW4oY3VycmVudFZhbCwgMCkgOiBNYXRoLm1heChjdXJyZW50VmFsLCAwKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB4U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZShiYXNlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHhTY2FsZS5nZXRCYXNlUGl4ZWwoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Z2V0UnVsZXI6IGZ1bmN0aW9uKGluZGV4KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBtZXRhID0gbWUuZ2V0TWV0YSgpO1xyXG5cdFx0XHR2YXIgeVNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZXRhLnlBeGlzSUQpO1xyXG5cdFx0XHR2YXIgZGF0YXNldENvdW50ID0gbWUuZ2V0QmFyQ291bnQoKTtcclxuXHJcblx0XHRcdHZhciB0aWNrSGVpZ2h0O1xyXG5cdFx0XHRpZiAoeVNjYWxlLm9wdGlvbnMudHlwZSA9PT0gJ2NhdGVnb3J5Jykge1xyXG5cdFx0XHRcdHRpY2tIZWlnaHQgPSB5U2NhbGUuZ2V0UGl4ZWxGb3JUaWNrKGluZGV4ICsgMSkgLSB5U2NhbGUuZ2V0UGl4ZWxGb3JUaWNrKGluZGV4KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBBdmVyYWdlIHdpZHRoXHJcblx0XHRcdFx0dGlja0hlaWdodCA9IHlTY2FsZS53aWR0aCAvIHlTY2FsZS50aWNrcy5sZW5ndGg7XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIGNhdGVnb3J5SGVpZ2h0ID0gdGlja0hlaWdodCAqIHlTY2FsZS5vcHRpb25zLmNhdGVnb3J5UGVyY2VudGFnZTtcclxuXHRcdFx0dmFyIGNhdGVnb3J5U3BhY2luZyA9ICh0aWNrSGVpZ2h0IC0gKHRpY2tIZWlnaHQgKiB5U2NhbGUub3B0aW9ucy5jYXRlZ29yeVBlcmNlbnRhZ2UpKSAvIDI7XHJcblx0XHRcdHZhciBmdWxsQmFySGVpZ2h0ID0gY2F0ZWdvcnlIZWlnaHQgLyBkYXRhc2V0Q291bnQ7XHJcblxyXG5cdFx0XHRpZiAoeVNjYWxlLnRpY2tzLmxlbmd0aCAhPT0gbWUuY2hhcnQuZGF0YS5sYWJlbHMubGVuZ3RoKSB7XHJcblx0XHRcdFx0dmFyIHBlcmMgPSB5U2NhbGUudGlja3MubGVuZ3RoIC8gbWUuY2hhcnQuZGF0YS5sYWJlbHMubGVuZ3RoO1xyXG5cdFx0XHRcdGZ1bGxCYXJIZWlnaHQgPSBmdWxsQmFySGVpZ2h0ICogcGVyYztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGJhckhlaWdodCA9IGZ1bGxCYXJIZWlnaHQgKiB5U2NhbGUub3B0aW9ucy5iYXJQZXJjZW50YWdlO1xyXG5cdFx0XHR2YXIgYmFyU3BhY2luZyA9IGZ1bGxCYXJIZWlnaHQgLSAoZnVsbEJhckhlaWdodCAqIHlTY2FsZS5vcHRpb25zLmJhclBlcmNlbnRhZ2UpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRkYXRhc2V0Q291bnQ6IGRhdGFzZXRDb3VudCxcclxuXHRcdFx0XHR0aWNrSGVpZ2h0OiB0aWNrSGVpZ2h0LFxyXG5cdFx0XHRcdGNhdGVnb3J5SGVpZ2h0OiBjYXRlZ29yeUhlaWdodCxcclxuXHRcdFx0XHRjYXRlZ29yeVNwYWNpbmc6IGNhdGVnb3J5U3BhY2luZyxcclxuXHRcdFx0XHRmdWxsQmFySGVpZ2h0OiBmdWxsQmFySGVpZ2h0LFxyXG5cdFx0XHRcdGJhckhlaWdodDogYmFySGVpZ2h0LFxyXG5cdFx0XHRcdGJhclNwYWNpbmc6IGJhclNwYWNpbmdcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Y2FsY3VsYXRlQmFySGVpZ2h0OiBmdW5jdGlvbihydWxlcikge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgeVNjYWxlID0gbWUuZ2V0U2NhbGVGb3JJZChtZS5nZXRNZXRhKCkueUF4aXNJRCk7XHJcblx0XHRcdGlmICh5U2NhbGUub3B0aW9ucy5iYXJUaGlja25lc3MpIHtcclxuXHRcdFx0XHRyZXR1cm4geVNjYWxlLm9wdGlvbnMuYmFyVGhpY2tuZXNzO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB5U2NhbGUub3B0aW9ucy5zdGFja2VkID8gcnVsZXIuY2F0ZWdvcnlIZWlnaHQgOiBydWxlci5iYXJIZWlnaHQ7XHJcblx0XHR9LFxyXG5cclxuXHRcdGNhbGN1bGF0ZUJhclg6IGZ1bmN0aW9uKGluZGV4LCBkYXRhc2V0SW5kZXgpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIG1ldGEgPSBtZS5nZXRNZXRhKCk7XHJcblx0XHRcdHZhciB4U2NhbGUgPSBtZS5nZXRTY2FsZUZvcklkKG1ldGEueEF4aXNJRCk7XHJcblx0XHRcdHZhciB2YWx1ZSA9IE51bWJlcihtZS5nZXREYXRhc2V0KCkuZGF0YVtpbmRleF0pO1xyXG5cclxuXHRcdFx0aWYgKHhTY2FsZS5vcHRpb25zLnN0YWNrZWQpIHtcclxuXHJcblx0XHRcdFx0dmFyIHN1bVBvcyA9IDAsXHJcblx0XHRcdFx0XHRzdW1OZWcgPSAwO1xyXG5cclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGFzZXRJbmRleDsgaSsrKSB7XHJcblx0XHRcdFx0XHR2YXIgZHMgPSBtZS5jaGFydC5kYXRhLmRhdGFzZXRzW2ldO1xyXG5cdFx0XHRcdFx0dmFyIGRzTWV0YSA9IG1lLmNoYXJ0LmdldERhdGFzZXRNZXRhKGkpO1xyXG5cdFx0XHRcdFx0aWYgKGRzTWV0YS5iYXIgJiYgZHNNZXRhLnhBeGlzSUQgPT09IHhTY2FsZS5pZCAmJiBtZS5jaGFydC5pc0RhdGFzZXRWaXNpYmxlKGkpKSB7XHJcblx0XHRcdFx0XHRcdHZhciBzdGFja2VkVmFsID0gTnVtYmVyKGRzLmRhdGFbaW5kZXhdKTtcclxuXHRcdFx0XHRcdFx0aWYgKHN0YWNrZWRWYWwgPCAwKSB7XHJcblx0XHRcdFx0XHRcdFx0c3VtTmVnICs9IHN0YWNrZWRWYWwgfHwgMDtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRzdW1Qb3MgKz0gc3RhY2tlZFZhbCB8fCAwO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodmFsdWUgPCAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4geFNjYWxlLmdldFBpeGVsRm9yVmFsdWUoc3VtTmVnICsgdmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4geFNjYWxlLmdldFBpeGVsRm9yVmFsdWUoc3VtUG9zICsgdmFsdWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4geFNjYWxlLmdldFBpeGVsRm9yVmFsdWUodmFsdWUpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRjYWxjdWxhdGVCYXJZOiBmdW5jdGlvbihpbmRleCwgZGF0YXNldEluZGV4LCBydWxlcikge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWV0YSA9IG1lLmdldE1ldGEoKTtcclxuXHRcdFx0dmFyIHlTY2FsZSA9IG1lLmdldFNjYWxlRm9ySWQobWV0YS55QXhpc0lEKTtcclxuXHRcdFx0dmFyIGJhckluZGV4ID0gbWUuZ2V0QmFySW5kZXgoZGF0YXNldEluZGV4KTtcclxuXHRcdFx0dmFyIHRvcFRpY2sgPSB5U2NhbGUuZ2V0UGl4ZWxGb3JWYWx1ZShudWxsLCBpbmRleCwgZGF0YXNldEluZGV4LCBtZS5jaGFydC5pc0NvbWJvKTtcclxuXHRcdFx0dG9wVGljayAtPSBtZS5jaGFydC5pc0NvbWJvID8gKHJ1bGVyLnRpY2tIZWlnaHQgLyAyKSA6IDA7XHJcblxyXG5cdFx0XHRpZiAoeVNjYWxlLm9wdGlvbnMuc3RhY2tlZCkge1xyXG5cdFx0XHRcdHJldHVybiB0b3BUaWNrICsgKHJ1bGVyLmNhdGVnb3J5SGVpZ2h0IC8gMikgKyBydWxlci5jYXRlZ29yeVNwYWNpbmc7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0b3BUaWNrICtcclxuXHRcdFx0XHQocnVsZXIuYmFySGVpZ2h0IC8gMikgK1xyXG5cdFx0XHRcdHJ1bGVyLmNhdGVnb3J5U3BhY2luZyArXHJcblx0XHRcdFx0KHJ1bGVyLmJhckhlaWdodCAqIGJhckluZGV4KSArXHJcblx0XHRcdFx0KHJ1bGVyLmJhclNwYWNpbmcgLyAyKSArXHJcblx0XHRcdFx0KHJ1bGVyLmJhclNwYWNpbmcgKiBiYXJJbmRleCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbiJdfQ==
'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;
	var globalDefaults = Chart.defaults.global;

	var defaultConfig = {
		display: true,

		// Boolean - Whether to animate scaling the chart from the centre
		animate: true,
		lineArc: false,
		position: 'chartArea',

		angleLines: {
			display: true,
			color: 'rgba(0, 0, 0, 0.1)',
			lineWidth: 1
		},

		// label settings
		ticks: {
			// Boolean - Show a backdrop to the scale label
			showLabelBackdrop: true,

			// String - The colour of the label backdrop
			backdropColor: 'rgba(255,255,255,0.75)',

			// Number - The backdrop padding above & below the label in pixels
			backdropPaddingY: 2,

			// Number - The backdrop padding to the side of the label in pixels
			backdropPaddingX: 2,

			callback: Chart.Ticks.formatters.linear
		},

		pointLabels: {
			// Number - Point label font size in pixels
			fontSize: 10,

			// Function - Used to convert point labels
			callback: function callback(label) {
				return label;
			}
		}
	};

	var LinearRadialScale = Chart.LinearScaleBase.extend({
		getValueCount: function getValueCount() {
			return this.chart.data.labels.length;
		},
		setDimensions: function setDimensions() {
			var me = this;
			var opts = me.options;
			var tickOpts = opts.ticks;
			// Set the unconstrained dimension before label rotation
			me.width = me.maxWidth;
			me.height = me.maxHeight;
			me.xCenter = Math.round(me.width / 2);
			me.yCenter = Math.round(me.height / 2);

			var minSize = helpers.min([me.height, me.width]);
			var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
			me.drawingArea = opts.display ? minSize / 2 - (tickFontSize / 2 + tickOpts.backdropPaddingY) : minSize / 2;
		},
		determineDataLimits: function determineDataLimits() {
			var me = this;
			var chart = me.chart;
			me.min = null;
			me.max = null;

			helpers.each(chart.data.datasets, function (dataset, datasetIndex) {
				if (chart.isDatasetVisible(datasetIndex)) {
					var meta = chart.getDatasetMeta(datasetIndex);

					helpers.each(dataset.data, function (rawValue, index) {
						var value = +me.getRightValue(rawValue);
						if (isNaN(value) || meta.data[index].hidden) {
							return;
						}

						if (me.min === null) {
							me.min = value;
						} else if (value < me.min) {
							me.min = value;
						}

						if (me.max === null) {
							me.max = value;
						} else if (value > me.max) {
							me.max = value;
						}
					});
				}
			});

			// Common base implementation to handle ticks.min, ticks.max, ticks.beginAtZero
			me.handleTickRangeOptions();
		},
		getTickLimit: function getTickLimit() {
			var tickOpts = this.options.ticks;
			var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
			return Math.min(tickOpts.maxTicksLimit ? tickOpts.maxTicksLimit : 11, Math.ceil(this.drawingArea / (1.5 * tickFontSize)));
		},
		convertTicksToLabels: function convertTicksToLabels() {
			var me = this;
			Chart.LinearScaleBase.prototype.convertTicksToLabels.call(me);

			// Point labels
			me.pointLabels = me.chart.data.labels.map(me.options.pointLabels.callback, me);
		},
		getLabelForIndex: function getLabelForIndex(index, datasetIndex) {
			return +this.getRightValue(this.chart.data.datasets[datasetIndex].data[index]);
		},
		fit: function fit() {
			/*
    * Right, this is really confusing and there is a lot of maths going on here
    * The gist of the problem is here: https://gist.github.com/nnnick/696cc9c55f4b0beb8fe9
    *
    * Reaction: https://dl.dropboxusercontent.com/u/34601363/toomuchscience.gif
    *
    * Solution:
    *
    * We assume the radius of the polygon is half the size of the canvas at first
    * at each index we check if the text overlaps.
    *
    * Where it does, we store that angle and that index.
    *
    * After finding the largest index and angle we calculate how much we need to remove
    * from the shape radius to move the point inwards by that x.
    *
    * We average the left and right distances to get the maximum shape radius that can fit in the box
    * along with labels.
    *
    * Once we have that, we can find the centre point for the chart, by taking the x text protrusion
    * on each side, removing that from the size, halving it and adding the left x protrusion width.
    *
    * This will mean we have a shape fitted to the canvas, as large as it can be with the labels
    * and position it in the most space efficient manner
    *
    * https://dl.dropboxusercontent.com/u/34601363/yeahscience.gif
    */

			var pointLabels = this.options.pointLabels;
			var pointLabelFontSize = helpers.getValueOrDefault(pointLabels.fontSize, globalDefaults.defaultFontSize);
			var pointLabeFontStyle = helpers.getValueOrDefault(pointLabels.fontStyle, globalDefaults.defaultFontStyle);
			var pointLabeFontFamily = helpers.getValueOrDefault(pointLabels.fontFamily, globalDefaults.defaultFontFamily);
			var pointLabeFont = helpers.fontString(pointLabelFontSize, pointLabeFontStyle, pointLabeFontFamily);

			// Get maximum radius of the polygon. Either half the height (minus the text width) or half the width.
			// Use this to calculate the offset + change. - Make sure L/R protrusion is at least 0 to stop issues with centre points
			var largestPossibleRadius = helpers.min([this.height / 2 - pointLabelFontSize - 5, this.width / 2]),
			    pointPosition,
			    i,
			    textWidth,
			    halfTextWidth,
			    furthestRight = this.width,
			    furthestRightIndex,
			    furthestRightAngle,
			    furthestLeft = 0,
			    furthestLeftIndex,
			    furthestLeftAngle,
			    xProtrusionLeft,
			    xProtrusionRight,
			    radiusReductionRight,
			    radiusReductionLeft;
			this.ctx.font = pointLabeFont;
			this.ctx.setFontSize(pointLabelFontSize);
			for (i = 0; i < this.getValueCount(); i++) {
				// 5px to space the text slightly out - similar to what we do in the draw function.
				pointPosition = this.getPointPosition(i, largestPossibleRadius);
				textWidth = this.ctx.measureText(this.pointLabels[i] ? this.pointLabels[i] : '').width + 5;

				// Add quarter circle to make degree 0 mean top of circle
				var angleRadians = this.getIndexAngle(i) + Math.PI / 2;
				var angle = angleRadians * 360 / (2 * Math.PI) % 360;

				if (angle === 0 || angle === 180) {
					// At angle 0 and 180, we're at exactly the top/bottom
					// of the radar chart, so text will be aligned centrally, so we'll half it and compare
					// w/left and right text sizes
					halfTextWidth = textWidth / 2;
					if (pointPosition.x + halfTextWidth > furthestRight) {
						furthestRight = pointPosition.x + halfTextWidth;
						furthestRightIndex = i;
					}
					if (pointPosition.x - halfTextWidth < furthestLeft) {
						furthestLeft = pointPosition.x - halfTextWidth;
						furthestLeftIndex = i;
					}
				} else if (angle < 180) {
					// Less than half the values means we'll left align the text
					if (pointPosition.x + textWidth > furthestRight) {
						furthestRight = pointPosition.x + textWidth;
						furthestRightIndex = i;
					}
					// More than half the values means we'll right align the text
				} else if (pointPosition.x - textWidth < furthestLeft) {
					furthestLeft = pointPosition.x - textWidth;
					furthestLeftIndex = i;
				}
			}

			xProtrusionLeft = furthestLeft;
			xProtrusionRight = Math.ceil(furthestRight - this.width);

			furthestRightAngle = this.getIndexAngle(furthestRightIndex);
			furthestLeftAngle = this.getIndexAngle(furthestLeftIndex);

			radiusReductionRight = xProtrusionRight / Math.sin(furthestRightAngle + Math.PI / 2);
			radiusReductionLeft = xProtrusionLeft / Math.sin(furthestLeftAngle + Math.PI / 2);

			// Ensure we actually need to reduce the size of the chart
			radiusReductionRight = helpers.isNumber(radiusReductionRight) ? radiusReductionRight : 0;
			radiusReductionLeft = helpers.isNumber(radiusReductionLeft) ? radiusReductionLeft : 0;

			this.drawingArea = Math.round(largestPossibleRadius - (radiusReductionLeft + radiusReductionRight) / 2);
			this.setCenterPoint(radiusReductionLeft, radiusReductionRight);
		},
		setCenterPoint: function setCenterPoint(leftMovement, rightMovement) {
			var me = this;
			var maxRight = me.width - rightMovement - me.drawingArea,
			    maxLeft = leftMovement + me.drawingArea;

			me.xCenter = Math.round((maxLeft + maxRight) / 2 + me.left);
			// Always vertically in the centre as the text height doesn't change
			me.yCenter = Math.round(me.height / 2 + me.top);
		},

		getIndexAngle: function getIndexAngle(index) {
			var angleMultiplier = Math.PI * 2 / this.getValueCount();
			var startAngle = this.chart.options && this.chart.options.startAngle ? this.chart.options.startAngle : 0;

			var startAngleRadians = startAngle * Math.PI * 2 / 360;

			// Start from the top instead of right, so remove a quarter of the circle
			return index * angleMultiplier - Math.PI / 2 + startAngleRadians;
		},
		getDistanceFromCenterForValue: function getDistanceFromCenterForValue(value) {
			var me = this;

			if (value === null) {
				return 0; // null always in center
			}

			// Take into account half font size + the yPadding of the top value
			var scalingFactor = me.drawingArea / (me.max - me.min);
			if (me.options.reverse) {
				return (me.max - value) * scalingFactor;
			}
			return (value - me.min) * scalingFactor;
		},
		getPointPosition: function getPointPosition(index, distanceFromCenter) {
			var me = this;
			var thisAngle = me.getIndexAngle(index);
			return {
				x: Math.round(Math.cos(thisAngle) * distanceFromCenter) + me.xCenter,
				y: Math.round(Math.sin(thisAngle) * distanceFromCenter) + me.yCenter
			};
		},
		getPointPositionForValue: function getPointPositionForValue(index, value) {
			return this.getPointPosition(index, this.getDistanceFromCenterForValue(value));
		},

		getBasePosition: function getBasePosition() {
			var me = this;
			var min = me.min;
			var max = me.max;

			return me.getPointPositionForValue(0, me.beginAtZero ? 0 : min < 0 && max < 0 ? max : min > 0 && max > 0 ? min : 0);
		},

		draw: function draw() {
			var me = this;
			var opts = me.options;
			var gridLineOpts = opts.gridLines;
			var tickOpts = opts.ticks;
			var angleLineOpts = opts.angleLines;
			var pointLabelOpts = opts.pointLabels;
			var getValueOrDefault = helpers.getValueOrDefault;

			if (opts.display) {
				var ctx = me.ctx;

				// Tick Font
				var tickFontSize = getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
				var tickFontStyle = getValueOrDefault(tickOpts.fontStyle, globalDefaults.defaultFontStyle);
				var tickFontFamily = getValueOrDefault(tickOpts.fontFamily, globalDefaults.defaultFontFamily);
				var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);

				helpers.each(me.ticks, function (label, index) {
					// Don't draw a centre value (if it is minimum)
					if (index > 0 || opts.reverse) {
						var yCenterOffset = me.getDistanceFromCenterForValue(me.ticksAsNumbers[index]);
						var yHeight = me.yCenter - yCenterOffset;

						// Draw circular lines around the scale
						if (gridLineOpts.display && index !== 0) {
							ctx.setStrokeStyle(helpers.getValueAtIndexOrDefault(gridLineOpts.color, index - 1));
							ctx.setLineWidth(helpers.getValueAtIndexOrDefault(gridLineOpts.lineWidth, index - 1));

							if (opts.lineArc) {
								// Draw circular arcs between the points
								ctx.beginPath();
								ctx.arc(me.xCenter, me.yCenter, yCenterOffset, 0, Math.PI * 2);
								ctx.closePath();
								ctx.stroke();
							} else {
								// Draw straight lines connecting each index
								ctx.beginPath();
								for (var i = 0; i < me.getValueCount(); i++) {
									var pointPosition = me.getPointPosition(i, yCenterOffset);
									if (i === 0) {
										ctx.moveTo(pointPosition.x, pointPosition.y);
									} else {
										ctx.lineTo(pointPosition.x, pointPosition.y);
									}
								}
								ctx.closePath();
								ctx.stroke();
							}
						}

						if (tickOpts.display) {
							var tickFontColor = getValueOrDefault(tickOpts.fontColor, globalDefaults.defaultFontColor);
							ctx.font = tickLabelFont;
							ctx.setFontSize(tickFontSize);
							if (tickOpts.showLabelBackdrop) {
								var labelWidth = ctx.measureText(label).width;
								ctx.setFillStyle(tickOpts.backdropColor);
								ctx.fillRect(me.xCenter - labelWidth / 2 - tickOpts.backdropPaddingX, yHeight - tickFontSize / 2 - tickOpts.backdropPaddingY, labelWidth + tickOpts.backdropPaddingX * 2, tickFontSize + tickOpts.backdropPaddingY * 2);
							}

							ctx.textAlign = 'center';
							ctx.textBaseline = 'middle';
							ctx.setFillStyle(tickFontColor);
							ctx.fillText(label, me.xCenter, yHeight);
						}
					}
				});

				if (!opts.lineArc) {
					ctx.setLineWidth(angleLineOpts.lineWidth);
					ctx.setStrokeStyle(angleLineOpts.color);

					var outerDistance = me.getDistanceFromCenterForValue(opts.reverse ? me.min : me.max);

					// Point Label Font
					var pointLabelFontSize = getValueOrDefault(pointLabelOpts.fontSize, globalDefaults.defaultFontSize);
					var pointLabeFontStyle = getValueOrDefault(pointLabelOpts.fontStyle, globalDefaults.defaultFontStyle);
					var pointLabeFontFamily = getValueOrDefault(pointLabelOpts.fontFamily, globalDefaults.defaultFontFamily);
					var pointLabeFont = helpers.fontString(pointLabelFontSize, pointLabeFontStyle, pointLabeFontFamily);

					for (var i = me.getValueCount() - 1; i >= 0; i--) {
						if (angleLineOpts.display) {
							var outerPosition = me.getPointPosition(i, outerDistance);
							ctx.beginPath();
							ctx.moveTo(me.xCenter, me.yCenter);
							ctx.lineTo(outerPosition.x, outerPosition.y);
							ctx.stroke();
							ctx.closePath();
						}
						// Extra 3px out for some label spacing
						var pointLabelPosition = me.getPointPosition(i, outerDistance + 5);

						// Keep this in loop since we may support array properties here
						var pointLabelFontColor = getValueOrDefault(pointLabelOpts.fontColor, globalDefaults.defaultFontColor);
						ctx.font = pointLabeFont;
						ctx.setFontSize(pointLabelFontSize);
						ctx.setFillStyle(pointLabelFontColor);

						var pointLabels = me.pointLabels;

						// Add quarter circle to make degree 0 mean top of circle
						var angleRadians = this.getIndexAngle(i) + Math.PI / 2;
						var angle = angleRadians * 360 / (2 * Math.PI) % 360;

						if (angle === 0 || angle === 180) {
							ctx.textAlign = 'center';
						} else if (angle < 180) {
							ctx.textAlign = 'left';
						} else {
							ctx.textAlign = 'right';
						}

						// Set the correct text baseline based on outer positioning
						if (angle === 90 || angle === 270) {
							ctx.textBaseline = 'middle';
						} else if (angle > 270 || angle < 90) {
							ctx.textBaseline = 'bottom';
						} else {
							ctx.textBaseline = 'top';
						}

						ctx.fillText(pointLabels[i] ? pointLabels[i] : '', pointLabelPosition.x, pointLabelPosition.y);
					}
				}
			}
		}
	});
	Chart.scaleService.registerScaleType('radialLinear', LinearRadialScale, defaultConfig);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjYWxlLnJhZGlhbExpbmVhci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwiQ2hhcnQiLCJoZWxwZXJzIiwiZ2xvYmFsRGVmYXVsdHMiLCJkZWZhdWx0cyIsImdsb2JhbCIsImRlZmF1bHRDb25maWciLCJkaXNwbGF5IiwiYW5pbWF0ZSIsImxpbmVBcmMiLCJwb3NpdGlvbiIsImFuZ2xlTGluZXMiLCJjb2xvciIsImxpbmVXaWR0aCIsInRpY2tzIiwic2hvd0xhYmVsQmFja2Ryb3AiLCJiYWNrZHJvcENvbG9yIiwiYmFja2Ryb3BQYWRkaW5nWSIsImJhY2tkcm9wUGFkZGluZ1giLCJjYWxsYmFjayIsIlRpY2tzIiwiZm9ybWF0dGVycyIsImxpbmVhciIsInBvaW50TGFiZWxzIiwiZm9udFNpemUiLCJsYWJlbCIsIkxpbmVhclJhZGlhbFNjYWxlIiwiTGluZWFyU2NhbGVCYXNlIiwiZXh0ZW5kIiwiZ2V0VmFsdWVDb3VudCIsImNoYXJ0IiwiZGF0YSIsImxhYmVscyIsImxlbmd0aCIsInNldERpbWVuc2lvbnMiLCJtZSIsIm9wdHMiLCJvcHRpb25zIiwidGlja09wdHMiLCJ3aWR0aCIsIm1heFdpZHRoIiwiaGVpZ2h0IiwibWF4SGVpZ2h0IiwieENlbnRlciIsIk1hdGgiLCJyb3VuZCIsInlDZW50ZXIiLCJtaW5TaXplIiwibWluIiwidGlja0ZvbnRTaXplIiwiZ2V0VmFsdWVPckRlZmF1bHQiLCJkZWZhdWx0Rm9udFNpemUiLCJkcmF3aW5nQXJlYSIsImRldGVybWluZURhdGFMaW1pdHMiLCJtYXgiLCJlYWNoIiwiZGF0YXNldHMiLCJkYXRhc2V0IiwiZGF0YXNldEluZGV4IiwiaXNEYXRhc2V0VmlzaWJsZSIsIm1ldGEiLCJnZXREYXRhc2V0TWV0YSIsInJhd1ZhbHVlIiwiaW5kZXgiLCJ2YWx1ZSIsImdldFJpZ2h0VmFsdWUiLCJpc05hTiIsImhpZGRlbiIsImhhbmRsZVRpY2tSYW5nZU9wdGlvbnMiLCJnZXRUaWNrTGltaXQiLCJtYXhUaWNrc0xpbWl0IiwiY2VpbCIsImNvbnZlcnRUaWNrc1RvTGFiZWxzIiwicHJvdG90eXBlIiwiY2FsbCIsIm1hcCIsImdldExhYmVsRm9ySW5kZXgiLCJmaXQiLCJwb2ludExhYmVsRm9udFNpemUiLCJwb2ludExhYmVGb250U3R5bGUiLCJmb250U3R5bGUiLCJkZWZhdWx0Rm9udFN0eWxlIiwicG9pbnRMYWJlRm9udEZhbWlseSIsImZvbnRGYW1pbHkiLCJkZWZhdWx0Rm9udEZhbWlseSIsInBvaW50TGFiZUZvbnQiLCJmb250U3RyaW5nIiwibGFyZ2VzdFBvc3NpYmxlUmFkaXVzIiwicG9pbnRQb3NpdGlvbiIsImkiLCJ0ZXh0V2lkdGgiLCJoYWxmVGV4dFdpZHRoIiwiZnVydGhlc3RSaWdodCIsImZ1cnRoZXN0UmlnaHRJbmRleCIsImZ1cnRoZXN0UmlnaHRBbmdsZSIsImZ1cnRoZXN0TGVmdCIsImZ1cnRoZXN0TGVmdEluZGV4IiwiZnVydGhlc3RMZWZ0QW5nbGUiLCJ4UHJvdHJ1c2lvbkxlZnQiLCJ4UHJvdHJ1c2lvblJpZ2h0IiwicmFkaXVzUmVkdWN0aW9uUmlnaHQiLCJyYWRpdXNSZWR1Y3Rpb25MZWZ0IiwiY3R4IiwiZm9udCIsInNldEZvbnRTaXplIiwiZ2V0UG9pbnRQb3NpdGlvbiIsIm1lYXN1cmVUZXh0IiwiYW5nbGVSYWRpYW5zIiwiZ2V0SW5kZXhBbmdsZSIsIlBJIiwiYW5nbGUiLCJ4Iiwic2luIiwiaXNOdW1iZXIiLCJzZXRDZW50ZXJQb2ludCIsImxlZnRNb3ZlbWVudCIsInJpZ2h0TW92ZW1lbnQiLCJtYXhSaWdodCIsIm1heExlZnQiLCJsZWZ0IiwidG9wIiwiYW5nbGVNdWx0aXBsaWVyIiwic3RhcnRBbmdsZSIsInN0YXJ0QW5nbGVSYWRpYW5zIiwiZ2V0RGlzdGFuY2VGcm9tQ2VudGVyRm9yVmFsdWUiLCJzY2FsaW5nRmFjdG9yIiwicmV2ZXJzZSIsImRpc3RhbmNlRnJvbUNlbnRlciIsInRoaXNBbmdsZSIsImNvcyIsInkiLCJnZXRQb2ludFBvc2l0aW9uRm9yVmFsdWUiLCJnZXRCYXNlUG9zaXRpb24iLCJiZWdpbkF0WmVybyIsImRyYXciLCJncmlkTGluZU9wdHMiLCJncmlkTGluZXMiLCJhbmdsZUxpbmVPcHRzIiwicG9pbnRMYWJlbE9wdHMiLCJ0aWNrRm9udFN0eWxlIiwidGlja0ZvbnRGYW1pbHkiLCJ0aWNrTGFiZWxGb250IiwieUNlbnRlck9mZnNldCIsInRpY2tzQXNOdW1iZXJzIiwieUhlaWdodCIsInNldFN0cm9rZVN0eWxlIiwiZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0Iiwic2V0TGluZVdpZHRoIiwiYmVnaW5QYXRoIiwiYXJjIiwiY2xvc2VQYXRoIiwic3Ryb2tlIiwibW92ZVRvIiwibGluZVRvIiwidGlja0ZvbnRDb2xvciIsImZvbnRDb2xvciIsImRlZmF1bHRGb250Q29sb3IiLCJsYWJlbFdpZHRoIiwic2V0RmlsbFN0eWxlIiwiZmlsbFJlY3QiLCJ0ZXh0QWxpZ24iLCJ0ZXh0QmFzZWxpbmUiLCJmaWxsVGV4dCIsIm91dGVyRGlzdGFuY2UiLCJvdXRlclBvc2l0aW9uIiwicG9pbnRMYWJlbFBvc2l0aW9uIiwicG9pbnRMYWJlbEZvbnRDb2xvciIsInNjYWxlU2VydmljZSIsInJlZ2lzdGVyU2NhbGVUeXBlIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQUEsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxLQUFULEVBQWdCOztBQUVoQyxLQUFJQyxVQUFVRCxNQUFNQyxPQUFwQjtBQUNBLEtBQUlDLGlCQUFpQkYsTUFBTUcsUUFBTixDQUFlQyxNQUFwQzs7QUFFQSxLQUFJQyxnQkFBZ0I7QUFDbkJDLFdBQVMsSUFEVTs7QUFHbkI7QUFDQUMsV0FBUyxJQUpVO0FBS25CQyxXQUFTLEtBTFU7QUFNbkJDLFlBQVUsV0FOUzs7QUFRbkJDLGNBQVk7QUFDWEosWUFBUyxJQURFO0FBRVhLLFVBQU8sb0JBRkk7QUFHWEMsY0FBVztBQUhBLEdBUk87O0FBY25CO0FBQ0FDLFNBQU87QUFDTjtBQUNBQyxzQkFBbUIsSUFGYjs7QUFJTjtBQUNBQyxrQkFBZSx3QkFMVDs7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QWhCO0FBQ0EsT0FGRCxNQUVPLElBQUlsRCxRQUFRLEdBQVosRUFBaUI7QUFDdkJSLFdBQUkwRCxTQUFKLEdBQWdCLE1BQWhCO0FBQ0EsT0FGTSxNQUVBO0FBQ04xRCxXQUFJMEQsU0FBSixHQUFnQixPQUFoQjtBQUNBOztBQUVEO0FBQ0EsVUFBSWxELFVBQVUsRUFBVixJQUFnQkEsVUFBVSxHQUE5QixFQUFtQztBQUNsQ1IsV0FBSTJELFlBQUosR0FBbUIsUUFBbkI7QUFDQSxPQUZELE1BRU8sSUFBSW5ELFFBQVEsR0FBUixJQUFlQSxRQUFRLEVBQTNCLEVBQStCO0FBQ3JDUixXQUFJMkQsWUFBSixHQUFtQixRQUFuQjtBQUNBLE9BRk0sTUFFQTtBQUNOM0QsV0FBSTJELFlBQUosR0FBbUIsS0FBbkI7QUFDQTs7QUFFRDNELFVBQUk0RCxRQUFKLENBQWEzSSxZQUFZa0UsQ0FBWixJQUFpQmxFLFlBQVlrRSxDQUFaLENBQWpCLEdBQWtDLEVBQS9DLEVBQW1ENEUsbUJBQW1CdEQsQ0FBdEUsRUFBeUVzRCxtQkFBbUJuQyxDQUE1RjtBQUNBO0FBQ0Q7QUFDRDtBQUNEO0FBM1dtRCxFQUE3QixDQUF4QjtBQTZXQWpJLE9BQU1zSyxZQUFOLENBQW1CQyxpQkFBbkIsQ0FBcUMsY0FBckMsRUFBcUQ5SSxpQkFBckQsRUFBd0VwQixhQUF4RTtBQUVBLENBOVpEIiwiZmlsZSI6InNjYWxlLnJhZGlhbExpbmVhci5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2hhcnQpIHtcclxuXHJcblx0dmFyIGhlbHBlcnMgPSBDaGFydC5oZWxwZXJzO1xyXG5cdHZhciBnbG9iYWxEZWZhdWx0cyA9IENoYXJ0LmRlZmF1bHRzLmdsb2JhbDtcclxuXHJcblx0dmFyIGRlZmF1bHRDb25maWcgPSB7XHJcblx0XHRkaXNwbGF5OiB0cnVlLFxyXG5cclxuXHRcdC8vIEJvb2xlYW4gLSBXaGV0aGVyIHRvIGFuaW1hdGUgc2NhbGluZyB0aGUgY2hhcnQgZnJvbSB0aGUgY2VudHJlXHJcblx0XHRhbmltYXRlOiB0cnVlLFxyXG5cdFx0bGluZUFyYzogZmFsc2UsXHJcblx0XHRwb3NpdGlvbjogJ2NoYXJ0QXJlYScsXHJcblxyXG5cdFx0YW5nbGVMaW5lczoge1xyXG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxyXG5cdFx0XHRjb2xvcjogJ3JnYmEoMCwgMCwgMCwgMC4xKScsXHJcblx0XHRcdGxpbmVXaWR0aDogMVxyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBsYWJlbCBzZXR0aW5nc1xyXG5cdFx0dGlja3M6IHtcclxuXHRcdFx0Ly8gQm9vbGVhbiAtIFNob3cgYSBiYWNrZHJvcCB0byB0aGUgc2NhbGUgbGFiZWxcclxuXHRcdFx0c2hvd0xhYmVsQmFja2Ryb3A6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBTdHJpbmcgLSBUaGUgY29sb3VyIG9mIHRoZSBsYWJlbCBiYWNrZHJvcFxyXG5cdFx0XHRiYWNrZHJvcENvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwwLjc1KScsXHJcblxyXG5cdFx0XHQvLyBOdW1iZXIgLSBUaGUgYmFja2Ryb3AgcGFkZGluZyBhYm92ZSAmIGJlbG93IHRoZSBsYWJlbCBpbiBwaXhlbHNcclxuXHRcdFx0YmFja2Ryb3BQYWRkaW5nWTogMixcclxuXHJcblx0XHRcdC8vIE51bWJlciAtIFRoZSBiYWNrZHJvcCBwYWRkaW5nIHRvIHRoZSBzaWRlIG9mIHRoZSBsYWJlbCBpbiBwaXhlbHNcclxuXHRcdFx0YmFja2Ryb3BQYWRkaW5nWDogMixcclxuXHJcblx0XHRcdGNhbGxiYWNrOiBDaGFydC5UaWNrcy5mb3JtYXR0ZXJzLmxpbmVhclxyXG5cdFx0fSxcclxuXHJcblx0XHRwb2ludExhYmVsczoge1xyXG5cdFx0XHQvLyBOdW1iZXIgLSBQb2ludCBsYWJlbCBmb250IHNpemUgaW4gcGl4ZWxzXHJcblx0XHRcdGZvbnRTaXplOiAxMCxcclxuXHJcblx0XHRcdC8vIEZ1bmN0aW9uIC0gVXNlZCB0byBjb252ZXJ0IHBvaW50IGxhYmVsc1xyXG5cdFx0XHRjYWxsYmFjazogZnVuY3Rpb24obGFiZWwpIHtcclxuXHRcdFx0XHRyZXR1cm4gbGFiZWw7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR2YXIgTGluZWFyUmFkaWFsU2NhbGUgPSBDaGFydC5MaW5lYXJTY2FsZUJhc2UuZXh0ZW5kKHtcclxuXHRcdGdldFZhbHVlQ291bnQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jaGFydC5kYXRhLmxhYmVscy5sZW5ndGg7XHJcblx0XHR9LFxyXG5cdFx0c2V0RGltZW5zaW9uczogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBvcHRzID0gbWUub3B0aW9ucztcclxuXHRcdFx0dmFyIHRpY2tPcHRzID0gb3B0cy50aWNrcztcclxuXHRcdFx0Ly8gU2V0IHRoZSB1bmNvbnN0cmFpbmVkIGRpbWVuc2lvbiBiZWZvcmUgbGFiZWwgcm90YXRpb25cclxuXHRcdFx0bWUud2lkdGggPSBtZS5tYXhXaWR0aDtcclxuXHRcdFx0bWUuaGVpZ2h0ID0gbWUubWF4SGVpZ2h0O1xyXG5cdFx0XHRtZS54Q2VudGVyID0gTWF0aC5yb3VuZChtZS53aWR0aCAvIDIpO1xyXG5cdFx0XHRtZS55Q2VudGVyID0gTWF0aC5yb3VuZChtZS5oZWlnaHQgLyAyKTtcclxuXHJcblx0XHRcdHZhciBtaW5TaXplID0gaGVscGVycy5taW4oW21lLmhlaWdodCwgbWUud2lkdGhdKTtcclxuXHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQodGlja09wdHMuZm9udFNpemUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdG1lLmRyYXdpbmdBcmVhID0gb3B0cy5kaXNwbGF5ID8gKG1pblNpemUgLyAyKSAtICh0aWNrRm9udFNpemUgLyAyICsgdGlja09wdHMuYmFja2Ryb3BQYWRkaW5nWSkgOiAobWluU2l6ZSAvIDIpO1xyXG5cdFx0fSxcclxuXHRcdGRldGVybWluZURhdGFMaW1pdHM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgY2hhcnQgPSBtZS5jaGFydDtcclxuXHRcdFx0bWUubWluID0gbnVsbDtcclxuXHRcdFx0bWUubWF4ID0gbnVsbDtcclxuXHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2goY2hhcnQuZGF0YS5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCwgZGF0YXNldEluZGV4KSB7XHJcblx0XHRcdFx0aWYgKGNoYXJ0LmlzRGF0YXNldFZpc2libGUoZGF0YXNldEluZGV4KSkge1xyXG5cdFx0XHRcdFx0dmFyIG1ldGEgPSBjaGFydC5nZXREYXRhc2V0TWV0YShkYXRhc2V0SW5kZXgpO1xyXG5cclxuXHRcdFx0XHRcdGhlbHBlcnMuZWFjaChkYXRhc2V0LmRhdGEsIGZ1bmN0aW9uKHJhd1ZhbHVlLCBpbmRleCkge1xyXG5cdFx0XHRcdFx0XHR2YXIgdmFsdWUgPSArbWUuZ2V0UmlnaHRWYWx1ZShyYXdWYWx1ZSk7XHJcblx0XHRcdFx0XHRcdGlmIChpc05hTih2YWx1ZSkgfHwgbWV0YS5kYXRhW2luZGV4XS5oaWRkZW4pIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGlmIChtZS5taW4gPT09IG51bGwpIHtcclxuXHRcdFx0XHRcdFx0XHRtZS5taW4gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICh2YWx1ZSA8IG1lLm1pbikge1xyXG5cdFx0XHRcdFx0XHRcdG1lLm1pbiA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAobWUubWF4ID09PSBudWxsKSB7XHJcblx0XHRcdFx0XHRcdFx0bWUubWF4ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodmFsdWUgPiBtZS5tYXgpIHtcclxuXHRcdFx0XHRcdFx0XHRtZS5tYXggPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENvbW1vbiBiYXNlIGltcGxlbWVudGF0aW9uIHRvIGhhbmRsZSB0aWNrcy5taW4sIHRpY2tzLm1heCwgdGlja3MuYmVnaW5BdFplcm9cclxuXHRcdFx0bWUuaGFuZGxlVGlja1JhbmdlT3B0aW9ucygpO1xyXG5cdFx0fSxcclxuXHRcdGdldFRpY2tMaW1pdDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciB0aWNrT3B0cyA9IHRoaXMub3B0aW9ucy50aWNrcztcclxuXHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQodGlja09wdHMuZm9udFNpemUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdHJldHVybiBNYXRoLm1pbih0aWNrT3B0cy5tYXhUaWNrc0xpbWl0ID8gdGlja09wdHMubWF4VGlja3NMaW1pdCA6IDExLCBNYXRoLmNlaWwodGhpcy5kcmF3aW5nQXJlYSAvICgxLjUgKiB0aWNrRm9udFNpemUpKSk7XHJcblx0XHR9LFxyXG5cdFx0Y29udmVydFRpY2tzVG9MYWJlbHM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRDaGFydC5MaW5lYXJTY2FsZUJhc2UucHJvdG90eXBlLmNvbnZlcnRUaWNrc1RvTGFiZWxzLmNhbGwobWUpO1xyXG5cclxuXHRcdFx0Ly8gUG9pbnQgbGFiZWxzXHJcblx0XHRcdG1lLnBvaW50TGFiZWxzID0gbWUuY2hhcnQuZGF0YS5sYWJlbHMubWFwKG1lLm9wdGlvbnMucG9pbnRMYWJlbHMuY2FsbGJhY2ssIG1lKTtcclxuXHRcdH0sXHJcblx0XHRnZXRMYWJlbEZvckluZGV4OiBmdW5jdGlvbihpbmRleCwgZGF0YXNldEluZGV4KSB7XHJcblx0XHRcdHJldHVybiArdGhpcy5nZXRSaWdodFZhbHVlKHRoaXMuY2hhcnQuZGF0YS5kYXRhc2V0c1tkYXRhc2V0SW5kZXhdLmRhdGFbaW5kZXhdKTtcclxuXHRcdH0sXHJcblx0XHRmaXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQvKlxyXG5cdFx0XHQgKiBSaWdodCwgdGhpcyBpcyByZWFsbHkgY29uZnVzaW5nIGFuZCB0aGVyZSBpcyBhIGxvdCBvZiBtYXRocyBnb2luZyBvbiBoZXJlXHJcblx0XHRcdCAqIFRoZSBnaXN0IG9mIHRoZSBwcm9ibGVtIGlzIGhlcmU6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL25ubmljay82OTZjYzljNTVmNGIwYmViOGZlOVxyXG5cdFx0XHQgKlxyXG5cdFx0XHQgKiBSZWFjdGlvbjogaHR0cHM6Ly9kbC5kcm9wYm94dXNlcmNvbnRlbnQuY29tL3UvMzQ2MDEzNjMvdG9vbXVjaHNjaWVuY2UuZ2lmXHJcblx0XHRcdCAqXHJcblx0XHRcdCAqIFNvbHV0aW9uOlxyXG5cdFx0XHQgKlxyXG5cdFx0XHQgKiBXZSBhc3N1bWUgdGhlIHJhZGl1cyBvZiB0aGUgcG9seWdvbiBpcyBoYWxmIHRoZSBzaXplIG9mIHRoZSBjYW52YXMgYXQgZmlyc3RcclxuXHRcdFx0ICogYXQgZWFjaCBpbmRleCB3ZSBjaGVjayBpZiB0aGUgdGV4dCBvdmVybGFwcy5cclxuXHRcdFx0ICpcclxuXHRcdFx0ICogV2hlcmUgaXQgZG9lcywgd2Ugc3RvcmUgdGhhdCBhbmdsZSBhbmQgdGhhdCBpbmRleC5cclxuXHRcdFx0ICpcclxuXHRcdFx0ICogQWZ0ZXIgZmluZGluZyB0aGUgbGFyZ2VzdCBpbmRleCBhbmQgYW5nbGUgd2UgY2FsY3VsYXRlIGhvdyBtdWNoIHdlIG5lZWQgdG8gcmVtb3ZlXHJcblx0XHRcdCAqIGZyb20gdGhlIHNoYXBlIHJhZGl1cyB0byBtb3ZlIHRoZSBwb2ludCBpbndhcmRzIGJ5IHRoYXQgeC5cclxuXHRcdFx0ICpcclxuXHRcdFx0ICogV2UgYXZlcmFnZSB0aGUgbGVmdCBhbmQgcmlnaHQgZGlzdGFuY2VzIHRvIGdldCB0aGUgbWF4aW11bSBzaGFwZSByYWRpdXMgdGhhdCBjYW4gZml0IGluIHRoZSBib3hcclxuXHRcdFx0ICogYWxvbmcgd2l0aCBsYWJlbHMuXHJcblx0XHRcdCAqXHJcblx0XHRcdCAqIE9uY2Ugd2UgaGF2ZSB0aGF0LCB3ZSBjYW4gZmluZCB0aGUgY2VudHJlIHBvaW50IGZvciB0aGUgY2hhcnQsIGJ5IHRha2luZyB0aGUgeCB0ZXh0IHByb3RydXNpb25cclxuXHRcdFx0ICogb24gZWFjaCBzaWRlLCByZW1vdmluZyB0aGF0IGZyb20gdGhlIHNpemUsIGhhbHZpbmcgaXQgYW5kIGFkZGluZyB0aGUgbGVmdCB4IHByb3RydXNpb24gd2lkdGguXHJcblx0XHRcdCAqXHJcblx0XHRcdCAqIFRoaXMgd2lsbCBtZWFuIHdlIGhhdmUgYSBzaGFwZSBmaXR0ZWQgdG8gdGhlIGNhbnZhcywgYXMgbGFyZ2UgYXMgaXQgY2FuIGJlIHdpdGggdGhlIGxhYmVsc1xyXG5cdFx0XHQgKiBhbmQgcG9zaXRpb24gaXQgaW4gdGhlIG1vc3Qgc3BhY2UgZWZmaWNpZW50IG1hbm5lclxyXG5cdFx0XHQgKlxyXG5cdFx0XHQgKiBodHRwczovL2RsLmRyb3Bib3h1c2VyY29udGVudC5jb20vdS8zNDYwMTM2My95ZWFoc2NpZW5jZS5naWZcclxuXHRcdFx0ICovXHJcblxyXG5cdFx0XHR2YXIgcG9pbnRMYWJlbHMgPSB0aGlzLm9wdGlvbnMucG9pbnRMYWJlbHM7XHJcblx0XHRcdHZhciBwb2ludExhYmVsRm9udFNpemUgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KHBvaW50TGFiZWxzLmZvbnRTaXplLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFNpemUpO1xyXG5cdFx0XHR2YXIgcG9pbnRMYWJlRm9udFN0eWxlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChwb2ludExhYmVscy5mb250U3R5bGUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U3R5bGUpO1xyXG5cdFx0XHR2YXIgcG9pbnRMYWJlRm9udEZhbWlseSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQocG9pbnRMYWJlbHMuZm9udEZhbWlseSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRGYW1pbHkpO1xyXG5cdFx0XHR2YXIgcG9pbnRMYWJlRm9udCA9IGhlbHBlcnMuZm9udFN0cmluZyhwb2ludExhYmVsRm9udFNpemUsIHBvaW50TGFiZUZvbnRTdHlsZSwgcG9pbnRMYWJlRm9udEZhbWlseSk7XHJcblxyXG5cdFx0XHQvLyBHZXQgbWF4aW11bSByYWRpdXMgb2YgdGhlIHBvbHlnb24uIEVpdGhlciBoYWxmIHRoZSBoZWlnaHQgKG1pbnVzIHRoZSB0ZXh0IHdpZHRoKSBvciBoYWxmIHRoZSB3aWR0aC5cclxuXHRcdFx0Ly8gVXNlIHRoaXMgdG8gY2FsY3VsYXRlIHRoZSBvZmZzZXQgKyBjaGFuZ2UuIC0gTWFrZSBzdXJlIEwvUiBwcm90cnVzaW9uIGlzIGF0IGxlYXN0IDAgdG8gc3RvcCBpc3N1ZXMgd2l0aCBjZW50cmUgcG9pbnRzXHJcblx0XHRcdHZhciBsYXJnZXN0UG9zc2libGVSYWRpdXMgPSBoZWxwZXJzLm1pbihbKHRoaXMuaGVpZ2h0IC8gMiAtIHBvaW50TGFiZWxGb250U2l6ZSAtIDUpLCB0aGlzLndpZHRoIC8gMl0pLFxyXG5cdFx0XHRcdHBvaW50UG9zaXRpb24sXHJcblx0XHRcdFx0aSxcclxuXHRcdFx0XHR0ZXh0V2lkdGgsXHJcblx0XHRcdFx0aGFsZlRleHRXaWR0aCxcclxuXHRcdFx0XHRmdXJ0aGVzdFJpZ2h0ID0gdGhpcy53aWR0aCxcclxuXHRcdFx0XHRmdXJ0aGVzdFJpZ2h0SW5kZXgsXHJcblx0XHRcdFx0ZnVydGhlc3RSaWdodEFuZ2xlLFxyXG5cdFx0XHRcdGZ1cnRoZXN0TGVmdCA9IDAsXHJcblx0XHRcdFx0ZnVydGhlc3RMZWZ0SW5kZXgsXHJcblx0XHRcdFx0ZnVydGhlc3RMZWZ0QW5nbGUsXHJcblx0XHRcdFx0eFByb3RydXNpb25MZWZ0LFxyXG5cdFx0XHRcdHhQcm90cnVzaW9uUmlnaHQsXHJcblx0XHRcdFx0cmFkaXVzUmVkdWN0aW9uUmlnaHQsXHJcblx0XHRcdFx0cmFkaXVzUmVkdWN0aW9uTGVmdDtcclxuXHRcdFx0dGhpcy5jdHguZm9udCA9IHBvaW50TGFiZUZvbnQ7XHJcblx0XHRcdHRoaXMuY3R4LnNldEZvbnRTaXplKHBvaW50TGFiZWxGb250U2l6ZSk7XHJcblx0XHRcdGZvciAoaSA9IDA7IGkgPCB0aGlzLmdldFZhbHVlQ291bnQoKTsgaSsrKSB7XHJcblx0XHRcdFx0Ly8gNXB4IHRvIHNwYWNlIHRoZSB0ZXh0IHNsaWdodGx5IG91dCAtIHNpbWlsYXIgdG8gd2hhdCB3ZSBkbyBpbiB0aGUgZHJhdyBmdW5jdGlvbi5cclxuXHRcdFx0XHRwb2ludFBvc2l0aW9uID0gdGhpcy5nZXRQb2ludFBvc2l0aW9uKGksIGxhcmdlc3RQb3NzaWJsZVJhZGl1cyk7XHJcblx0XHRcdFx0dGV4dFdpZHRoID0gdGhpcy5jdHgubWVhc3VyZVRleHQodGhpcy5wb2ludExhYmVsc1tpXSA/IHRoaXMucG9pbnRMYWJlbHNbaV0gOiAnJykud2lkdGggKyA1O1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgcXVhcnRlciBjaXJjbGUgdG8gbWFrZSBkZWdyZWUgMCBtZWFuIHRvcCBvZiBjaXJjbGVcclxuXHRcdFx0XHR2YXIgYW5nbGVSYWRpYW5zID0gdGhpcy5nZXRJbmRleEFuZ2xlKGkpICsgKE1hdGguUEkgLyAyKTtcclxuXHRcdFx0XHR2YXIgYW5nbGUgPSAoYW5nbGVSYWRpYW5zICogMzYwIC8gKDIgKiBNYXRoLlBJKSkgJSAzNjA7XHJcblxyXG5cdFx0XHRcdGlmIChhbmdsZSA9PT0gMCB8fCBhbmdsZSA9PT0gMTgwKSB7XHJcblx0XHRcdFx0XHQvLyBBdCBhbmdsZSAwIGFuZCAxODAsIHdlJ3JlIGF0IGV4YWN0bHkgdGhlIHRvcC9ib3R0b21cclxuXHRcdFx0XHRcdC8vIG9mIHRoZSByYWRhciBjaGFydCwgc28gdGV4dCB3aWxsIGJlIGFsaWduZWQgY2VudHJhbGx5LCBzbyB3ZSdsbCBoYWxmIGl0IGFuZCBjb21wYXJlXHJcblx0XHRcdFx0XHQvLyB3L2xlZnQgYW5kIHJpZ2h0IHRleHQgc2l6ZXNcclxuXHRcdFx0XHRcdGhhbGZUZXh0V2lkdGggPSB0ZXh0V2lkdGggLyAyO1xyXG5cdFx0XHRcdFx0aWYgKHBvaW50UG9zaXRpb24ueCArIGhhbGZUZXh0V2lkdGggPiBmdXJ0aGVzdFJpZ2h0KSB7XHJcblx0XHRcdFx0XHRcdGZ1cnRoZXN0UmlnaHQgPSBwb2ludFBvc2l0aW9uLnggKyBoYWxmVGV4dFdpZHRoO1xyXG5cdFx0XHRcdFx0XHRmdXJ0aGVzdFJpZ2h0SW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHBvaW50UG9zaXRpb24ueCAtIGhhbGZUZXh0V2lkdGggPCBmdXJ0aGVzdExlZnQpIHtcclxuXHRcdFx0XHRcdFx0ZnVydGhlc3RMZWZ0ID0gcG9pbnRQb3NpdGlvbi54IC0gaGFsZlRleHRXaWR0aDtcclxuXHRcdFx0XHRcdFx0ZnVydGhlc3RMZWZ0SW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSBpZiAoYW5nbGUgPCAxODApIHtcclxuXHRcdFx0XHRcdC8vIExlc3MgdGhhbiBoYWxmIHRoZSB2YWx1ZXMgbWVhbnMgd2UnbGwgbGVmdCBhbGlnbiB0aGUgdGV4dFxyXG5cdFx0XHRcdFx0aWYgKHBvaW50UG9zaXRpb24ueCArIHRleHRXaWR0aCA+IGZ1cnRoZXN0UmlnaHQpIHtcclxuXHRcdFx0XHRcdFx0ZnVydGhlc3RSaWdodCA9IHBvaW50UG9zaXRpb24ueCArIHRleHRXaWR0aDtcclxuXHRcdFx0XHRcdFx0ZnVydGhlc3RSaWdodEluZGV4ID0gaTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBNb3JlIHRoYW4gaGFsZiB0aGUgdmFsdWVzIG1lYW5zIHdlJ2xsIHJpZ2h0IGFsaWduIHRoZSB0ZXh0XHJcblx0XHRcdFx0fSBlbHNlIGlmIChwb2ludFBvc2l0aW9uLnggLSB0ZXh0V2lkdGggPCBmdXJ0aGVzdExlZnQpIHtcclxuXHRcdFx0XHRcdGZ1cnRoZXN0TGVmdCA9IHBvaW50UG9zaXRpb24ueCAtIHRleHRXaWR0aDtcclxuXHRcdFx0XHRcdGZ1cnRoZXN0TGVmdEluZGV4ID0gaTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHhQcm90cnVzaW9uTGVmdCA9IGZ1cnRoZXN0TGVmdDtcclxuXHRcdFx0eFByb3RydXNpb25SaWdodCA9IE1hdGguY2VpbChmdXJ0aGVzdFJpZ2h0IC0gdGhpcy53aWR0aCk7XHJcblxyXG5cdFx0XHRmdXJ0aGVzdFJpZ2h0QW5nbGUgPSB0aGlzLmdldEluZGV4QW5nbGUoZnVydGhlc3RSaWdodEluZGV4KTtcclxuXHRcdFx0ZnVydGhlc3RMZWZ0QW5nbGUgPSB0aGlzLmdldEluZGV4QW5nbGUoZnVydGhlc3RMZWZ0SW5kZXgpO1xyXG5cclxuXHRcdFx0cmFkaXVzUmVkdWN0aW9uUmlnaHQgPSB4UHJvdHJ1c2lvblJpZ2h0IC8gTWF0aC5zaW4oZnVydGhlc3RSaWdodEFuZ2xlICsgTWF0aC5QSSAvIDIpO1xyXG5cdFx0XHRyYWRpdXNSZWR1Y3Rpb25MZWZ0ID0geFByb3RydXNpb25MZWZ0IC8gTWF0aC5zaW4oZnVydGhlc3RMZWZ0QW5nbGUgKyBNYXRoLlBJIC8gMik7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgd2UgYWN0dWFsbHkgbmVlZCB0byByZWR1Y2UgdGhlIHNpemUgb2YgdGhlIGNoYXJ0XHJcblx0XHRcdHJhZGl1c1JlZHVjdGlvblJpZ2h0ID0gKGhlbHBlcnMuaXNOdW1iZXIocmFkaXVzUmVkdWN0aW9uUmlnaHQpKSA/IHJhZGl1c1JlZHVjdGlvblJpZ2h0IDogMDtcclxuXHRcdFx0cmFkaXVzUmVkdWN0aW9uTGVmdCA9IChoZWxwZXJzLmlzTnVtYmVyKHJhZGl1c1JlZHVjdGlvbkxlZnQpKSA/IHJhZGl1c1JlZHVjdGlvbkxlZnQgOiAwO1xyXG5cclxuXHRcdFx0dGhpcy5kcmF3aW5nQXJlYSA9IE1hdGgucm91bmQobGFyZ2VzdFBvc3NpYmxlUmFkaXVzIC0gKHJhZGl1c1JlZHVjdGlvbkxlZnQgKyByYWRpdXNSZWR1Y3Rpb25SaWdodCkgLyAyKTtcclxuXHRcdFx0dGhpcy5zZXRDZW50ZXJQb2ludChyYWRpdXNSZWR1Y3Rpb25MZWZ0LCByYWRpdXNSZWR1Y3Rpb25SaWdodCk7XHJcblx0XHR9LFxyXG5cdFx0c2V0Q2VudGVyUG9pbnQ6IGZ1bmN0aW9uKGxlZnRNb3ZlbWVudCwgcmlnaHRNb3ZlbWVudCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWF4UmlnaHQgPSBtZS53aWR0aCAtIHJpZ2h0TW92ZW1lbnQgLSBtZS5kcmF3aW5nQXJlYSxcclxuXHRcdFx0XHRtYXhMZWZ0ID0gbGVmdE1vdmVtZW50ICsgbWUuZHJhd2luZ0FyZWE7XHJcblxyXG5cdFx0XHRtZS54Q2VudGVyID0gTWF0aC5yb3VuZCgoKG1heExlZnQgKyBtYXhSaWdodCkgLyAyKSArIG1lLmxlZnQpO1xyXG5cdFx0XHQvLyBBbHdheXMgdmVydGljYWxseSBpbiB0aGUgY2VudHJlIGFzIHRoZSB0ZXh0IGhlaWdodCBkb2Vzbid0IGNoYW5nZVxyXG5cdFx0XHRtZS55Q2VudGVyID0gTWF0aC5yb3VuZCgobWUuaGVpZ2h0IC8gMikgKyBtZS50b3ApO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRJbmRleEFuZ2xlOiBmdW5jdGlvbihpbmRleCkge1xyXG5cdFx0XHR2YXIgYW5nbGVNdWx0aXBsaWVyID0gKE1hdGguUEkgKiAyKSAvIHRoaXMuZ2V0VmFsdWVDb3VudCgpO1xyXG5cdFx0XHR2YXIgc3RhcnRBbmdsZSA9IHRoaXMuY2hhcnQub3B0aW9ucyAmJiB0aGlzLmNoYXJ0Lm9wdGlvbnMuc3RhcnRBbmdsZSA/XHJcblx0XHRcdFx0dGhpcy5jaGFydC5vcHRpb25zLnN0YXJ0QW5nbGUgOlxyXG5cdFx0XHRcdDA7XHJcblxyXG5cdFx0XHR2YXIgc3RhcnRBbmdsZVJhZGlhbnMgPSBzdGFydEFuZ2xlICogTWF0aC5QSSAqIDIgLyAzNjA7XHJcblxyXG5cdFx0XHQvLyBTdGFydCBmcm9tIHRoZSB0b3AgaW5zdGVhZCBvZiByaWdodCwgc28gcmVtb3ZlIGEgcXVhcnRlciBvZiB0aGUgY2lyY2xlXHJcblx0XHRcdHJldHVybiBpbmRleCAqIGFuZ2xlTXVsdGlwbGllciAtIChNYXRoLlBJIC8gMikgKyBzdGFydEFuZ2xlUmFkaWFucztcclxuXHRcdH0sXHJcblx0XHRnZXREaXN0YW5jZUZyb21DZW50ZXJGb3JWYWx1ZTogZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHJcblx0XHRcdGlmICh2YWx1ZSA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdHJldHVybiAwOyAvLyBudWxsIGFsd2F5cyBpbiBjZW50ZXJcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGFrZSBpbnRvIGFjY291bnQgaGFsZiBmb250IHNpemUgKyB0aGUgeVBhZGRpbmcgb2YgdGhlIHRvcCB2YWx1ZVxyXG5cdFx0XHR2YXIgc2NhbGluZ0ZhY3RvciA9IG1lLmRyYXdpbmdBcmVhIC8gKG1lLm1heCAtIG1lLm1pbik7XHJcblx0XHRcdGlmIChtZS5vcHRpb25zLnJldmVyc2UpIHtcclxuXHRcdFx0XHRyZXR1cm4gKG1lLm1heCAtIHZhbHVlKSAqIHNjYWxpbmdGYWN0b3I7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuICh2YWx1ZSAtIG1lLm1pbikgKiBzY2FsaW5nRmFjdG9yO1xyXG5cdFx0fSxcclxuXHRcdGdldFBvaW50UG9zaXRpb246IGZ1bmN0aW9uKGluZGV4LCBkaXN0YW5jZUZyb21DZW50ZXIpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIHRoaXNBbmdsZSA9IG1lLmdldEluZGV4QW5nbGUoaW5kZXgpO1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHg6IE1hdGgucm91bmQoTWF0aC5jb3ModGhpc0FuZ2xlKSAqIGRpc3RhbmNlRnJvbUNlbnRlcikgKyBtZS54Q2VudGVyLFxyXG5cdFx0XHRcdHk6IE1hdGgucm91bmQoTWF0aC5zaW4odGhpc0FuZ2xlKSAqIGRpc3RhbmNlRnJvbUNlbnRlcikgKyBtZS55Q2VudGVyXHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cdFx0Z2V0UG9pbnRQb3NpdGlvbkZvclZhbHVlOiBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0UG9pbnRQb3NpdGlvbihpbmRleCwgdGhpcy5nZXREaXN0YW5jZUZyb21DZW50ZXJGb3JWYWx1ZSh2YWx1ZSkpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRCYXNlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWluID0gbWUubWluO1xyXG5cdFx0XHR2YXIgbWF4ID0gbWUubWF4O1xyXG5cclxuXHRcdFx0cmV0dXJuIG1lLmdldFBvaW50UG9zaXRpb25Gb3JWYWx1ZSgwLFxyXG5cdFx0XHRcdG1lLmJlZ2luQXRaZXJvPyAwOlxyXG5cdFx0XHRcdG1pbiA8IDAgJiYgbWF4IDwgMD8gbWF4IDpcclxuXHRcdFx0XHRtaW4gPiAwICYmIG1heCA+IDA/IG1pbiA6XHJcblx0XHRcdFx0MCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGRyYXc6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgb3B0cyA9IG1lLm9wdGlvbnM7XHJcblx0XHRcdHZhciBncmlkTGluZU9wdHMgPSBvcHRzLmdyaWRMaW5lcztcclxuXHRcdFx0dmFyIHRpY2tPcHRzID0gb3B0cy50aWNrcztcclxuXHRcdFx0dmFyIGFuZ2xlTGluZU9wdHMgPSBvcHRzLmFuZ2xlTGluZXM7XHJcblx0XHRcdHZhciBwb2ludExhYmVsT3B0cyA9IG9wdHMucG9pbnRMYWJlbHM7XHJcblx0XHRcdHZhciBnZXRWYWx1ZU9yRGVmYXVsdCA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQ7XHJcblxyXG5cdFx0XHRpZiAob3B0cy5kaXNwbGF5KSB7XHJcblx0XHRcdFx0dmFyIGN0eCA9IG1lLmN0eDtcclxuXHJcblx0XHRcdFx0Ly8gVGljayBGb250XHJcblx0XHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGdldFZhbHVlT3JEZWZhdWx0KHRpY2tPcHRzLmZvbnRTaXplLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFNpemUpO1xyXG5cdFx0XHRcdHZhciB0aWNrRm9udFN0eWxlID0gZ2V0VmFsdWVPckRlZmF1bHQodGlja09wdHMuZm9udFN0eWxlLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFN0eWxlKTtcclxuXHRcdFx0XHR2YXIgdGlja0ZvbnRGYW1pbHkgPSBnZXRWYWx1ZU9yRGVmYXVsdCh0aWNrT3B0cy5mb250RmFtaWx5LCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udEZhbWlseSk7XHJcblx0XHRcdFx0dmFyIHRpY2tMYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodGlja0ZvbnRTaXplLCB0aWNrRm9udFN0eWxlLCB0aWNrRm9udEZhbWlseSk7XHJcblxyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaChtZS50aWNrcywgZnVuY3Rpb24obGFiZWwsIGluZGV4KSB7XHJcblx0XHRcdFx0XHQvLyBEb24ndCBkcmF3IGEgY2VudHJlIHZhbHVlIChpZiBpdCBpcyBtaW5pbXVtKVxyXG5cdFx0XHRcdFx0aWYgKGluZGV4ID4gMCB8fCBvcHRzLnJldmVyc2UpIHtcclxuXHRcdFx0XHRcdFx0dmFyIHlDZW50ZXJPZmZzZXQgPSBtZS5nZXREaXN0YW5jZUZyb21DZW50ZXJGb3JWYWx1ZShtZS50aWNrc0FzTnVtYmVyc1tpbmRleF0pO1xyXG5cdFx0XHRcdFx0XHR2YXIgeUhlaWdodCA9IG1lLnlDZW50ZXIgLSB5Q2VudGVyT2Zmc2V0O1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gRHJhdyBjaXJjdWxhciBsaW5lcyBhcm91bmQgdGhlIHNjYWxlXHJcblx0XHRcdFx0XHRcdGlmIChncmlkTGluZU9wdHMuZGlzcGxheSAmJiBpbmRleCAhPT0gMCkge1xyXG5cdFx0XHRcdFx0XHRcdGN0eC5zZXRTdHJva2VTdHlsZShoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdChncmlkTGluZU9wdHMuY29sb3IsIGluZGV4IC0gMSkpO1xyXG5cdFx0XHRcdFx0XHRcdGN0eC5zZXRMaW5lV2lkdGgoaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZ3JpZExpbmVPcHRzLmxpbmVXaWR0aCwgaW5kZXggLSAxKSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmIChvcHRzLmxpbmVBcmMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIERyYXcgY2lyY3VsYXIgYXJjcyBiZXR3ZWVuIHRoZSBwb2ludHNcclxuXHRcdFx0XHRcdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcclxuXHRcdFx0XHRcdFx0XHRcdGN0eC5hcmMobWUueENlbnRlciwgbWUueUNlbnRlciwgeUNlbnRlck9mZnNldCwgMCwgTWF0aC5QSSAqIDIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y3R4LmNsb3NlUGF0aCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y3R4LnN0cm9rZSgpO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBEcmF3IHN0cmFpZ2h0IGxpbmVzIGNvbm5lY3RpbmcgZWFjaCBpbmRleFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtZS5nZXRWYWx1ZUNvdW50KCk7IGkrKykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcG9pbnRQb3NpdGlvbiA9IG1lLmdldFBvaW50UG9zaXRpb24oaSwgeUNlbnRlck9mZnNldCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChpID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y3R4Lm1vdmVUbyhwb2ludFBvc2l0aW9uLngsIHBvaW50UG9zaXRpb24ueSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y3R4LmxpbmVUbyhwb2ludFBvc2l0aW9uLngsIHBvaW50UG9zaXRpb24ueSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdGN0eC5jbG9zZVBhdGgoKTtcclxuXHRcdFx0XHRcdFx0XHRcdGN0eC5zdHJva2UoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGlmICh0aWNrT3B0cy5kaXNwbGF5KSB7XHJcblx0XHRcdFx0XHRcdFx0dmFyIHRpY2tGb250Q29sb3IgPSBnZXRWYWx1ZU9yRGVmYXVsdCh0aWNrT3B0cy5mb250Q29sb3IsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250Q29sb3IpO1xyXG5cdFx0XHRcdFx0XHRcdGN0eC5mb250ID0gdGlja0xhYmVsRm9udDtcclxuXHRcdFx0XHRcdFx0XHRjdHguc2V0Rm9udFNpemUodGlja0ZvbnRTaXplKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAodGlja09wdHMuc2hvd0xhYmVsQmFja2Ryb3ApIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhciBsYWJlbFdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KGxhYmVsKS53aWR0aDtcclxuXHRcdFx0XHRcdFx0XHRcdGN0eC5zZXRGaWxsU3R5bGUodGlja09wdHMuYmFja2Ryb3BDb2xvcik7XHJcblx0XHRcdFx0XHRcdFx0XHRjdHguZmlsbFJlY3QoXHJcblx0XHRcdFx0XHRcdFx0XHRcdG1lLnhDZW50ZXIgLSBsYWJlbFdpZHRoIC8gMiAtIHRpY2tPcHRzLmJhY2tkcm9wUGFkZGluZ1gsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHlIZWlnaHQgLSB0aWNrRm9udFNpemUgLyAyIC0gdGlja09wdHMuYmFja2Ryb3BQYWRkaW5nWSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0bGFiZWxXaWR0aCArIHRpY2tPcHRzLmJhY2tkcm9wUGFkZGluZ1ggKiAyLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aWNrRm9udFNpemUgKyB0aWNrT3B0cy5iYWNrZHJvcFBhZGRpbmdZICogMlxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHRcdFx0XHRcdFx0XHRjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LnNldEZpbGxTdHlsZSh0aWNrRm9udENvbG9yKTtcclxuXHRcdFx0XHRcdFx0XHRjdHguZmlsbFRleHQobGFiZWwsIG1lLnhDZW50ZXIsIHlIZWlnaHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGlmICghb3B0cy5saW5lQXJjKSB7XHJcblx0XHRcdFx0XHRjdHguc2V0TGluZVdpZHRoKGFuZ2xlTGluZU9wdHMubGluZVdpZHRoKTtcclxuXHRcdFx0XHRcdGN0eC5zZXRTdHJva2VTdHlsZShhbmdsZUxpbmVPcHRzLmNvbG9yKTtcclxuXHJcblx0XHRcdFx0XHR2YXIgb3V0ZXJEaXN0YW5jZSA9IG1lLmdldERpc3RhbmNlRnJvbUNlbnRlckZvclZhbHVlKG9wdHMucmV2ZXJzZSA/IG1lLm1pbiA6IG1lLm1heCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUG9pbnQgTGFiZWwgRm9udFxyXG5cdFx0XHRcdFx0dmFyIHBvaW50TGFiZWxGb250U2l6ZSA9IGdldFZhbHVlT3JEZWZhdWx0KHBvaW50TGFiZWxPcHRzLmZvbnRTaXplLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFNpemUpO1xyXG5cdFx0XHRcdFx0dmFyIHBvaW50TGFiZUZvbnRTdHlsZSA9IGdldFZhbHVlT3JEZWZhdWx0KHBvaW50TGFiZWxPcHRzLmZvbnRTdHlsZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTdHlsZSk7XHJcblx0XHRcdFx0XHR2YXIgcG9pbnRMYWJlRm9udEZhbWlseSA9IGdldFZhbHVlT3JEZWZhdWx0KHBvaW50TGFiZWxPcHRzLmZvbnRGYW1pbHksIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250RmFtaWx5KTtcclxuXHRcdFx0XHRcdHZhciBwb2ludExhYmVGb250ID0gaGVscGVycy5mb250U3RyaW5nKHBvaW50TGFiZWxGb250U2l6ZSwgcG9pbnRMYWJlRm9udFN0eWxlLCBwb2ludExhYmVGb250RmFtaWx5KTtcclxuXHJcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gbWUuZ2V0VmFsdWVDb3VudCgpIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0XHRcdFx0aWYgKGFuZ2xlTGluZU9wdHMuZGlzcGxheSkge1xyXG5cdFx0XHRcdFx0XHRcdHZhciBvdXRlclBvc2l0aW9uID0gbWUuZ2V0UG9pbnRQb3NpdGlvbihpLCBvdXRlckRpc3RhbmNlKTtcclxuXHRcdFx0XHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XHJcblx0XHRcdFx0XHRcdFx0Y3R4Lm1vdmVUbyhtZS54Q2VudGVyLCBtZS55Q2VudGVyKTtcclxuXHRcdFx0XHRcdFx0XHRjdHgubGluZVRvKG91dGVyUG9zaXRpb24ueCwgb3V0ZXJQb3NpdGlvbi55KTtcclxuXHRcdFx0XHRcdFx0XHRjdHguc3Ryb2tlKCk7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LmNsb3NlUGF0aCgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIEV4dHJhIDNweCBvdXQgZm9yIHNvbWUgbGFiZWwgc3BhY2luZ1xyXG5cdFx0XHRcdFx0XHR2YXIgcG9pbnRMYWJlbFBvc2l0aW9uID0gbWUuZ2V0UG9pbnRQb3NpdGlvbihpLCBvdXRlckRpc3RhbmNlICsgNSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBLZWVwIHRoaXMgaW4gbG9vcCBzaW5jZSB3ZSBtYXkgc3VwcG9ydCBhcnJheSBwcm9wZXJ0aWVzIGhlcmVcclxuXHRcdFx0XHRcdFx0dmFyIHBvaW50TGFiZWxGb250Q29sb3IgPSBnZXRWYWx1ZU9yRGVmYXVsdChwb2ludExhYmVsT3B0cy5mb250Q29sb3IsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250Q29sb3IpO1xyXG5cdFx0XHRcdFx0XHRjdHguZm9udCA9IHBvaW50TGFiZUZvbnQ7XHJcblx0XHRcdFx0XHRcdGN0eC5zZXRGb250U2l6ZShwb2ludExhYmVsRm9udFNpemUpO1xyXG5cdFx0XHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKHBvaW50TGFiZWxGb250Q29sb3IpO1xyXG5cclxuXHRcdFx0XHRcdFx0dmFyIHBvaW50TGFiZWxzID0gbWUucG9pbnRMYWJlbHM7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgcXVhcnRlciBjaXJjbGUgdG8gbWFrZSBkZWdyZWUgMCBtZWFuIHRvcCBvZiBjaXJjbGVcclxuXHRcdFx0XHRcdFx0dmFyIGFuZ2xlUmFkaWFucyA9IHRoaXMuZ2V0SW5kZXhBbmdsZShpKSArIChNYXRoLlBJIC8gMik7XHJcblx0XHRcdFx0XHRcdHZhciBhbmdsZSA9IChhbmdsZVJhZGlhbnMgKiAzNjAgLyAoMiAqIE1hdGguUEkpKSAlIDM2MDtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChhbmdsZSA9PT0gMCB8fCBhbmdsZSA9PT0gMTgwKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGFuZ2xlIDwgMTgwKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LnRleHRBbGlnbiA9ICdsZWZ0JztcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRjdHgudGV4dEFsaWduID0gJ3JpZ2h0JztcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gU2V0IHRoZSBjb3JyZWN0IHRleHQgYmFzZWxpbmUgYmFzZWQgb24gb3V0ZXIgcG9zaXRpb25pbmdcclxuXHRcdFx0XHRcdFx0aWYgKGFuZ2xlID09PSA5MCB8fCBhbmdsZSA9PT0gMjcwKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGFuZ2xlID4gMjcwIHx8IGFuZ2xlIDwgOTApIHtcclxuXHRcdFx0XHRcdFx0XHRjdHgudGV4dEJhc2VsaW5lID0gJ2JvdHRvbSc7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRjdHguZmlsbFRleHQocG9pbnRMYWJlbHNbaV0gPyBwb2ludExhYmVsc1tpXSA6ICcnLCBwb2ludExhYmVsUG9zaXRpb24ueCwgcG9pbnRMYWJlbFBvc2l0aW9uLnkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cdENoYXJ0LnNjYWxlU2VydmljZS5yZWdpc3RlclNjYWxlVHlwZSgncmFkaWFsTGluZWFyJywgTGluZWFyUmFkaWFsU2NhbGUsIGRlZmF1bHRDb25maWcpO1xyXG5cclxufTtcclxuIl19
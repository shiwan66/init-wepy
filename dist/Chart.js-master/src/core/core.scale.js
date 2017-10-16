'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.scale = {
		display: true,
		position: 'left',

		// grid line settings
		gridLines: {
			display: true,
			color: 'rgba(0, 0, 0, 0.1)',
			lineWidth: 1,
			drawBorder: true,
			drawOnChartArea: true,
			drawTicks: true,
			tickMarkLength: 10,
			zeroLineWidth: 1,
			zeroLineColor: 'rgba(0,0,0,0.25)',
			offsetGridLines: false,
			borderDash: [],
			borderDashOffset: 0.0
		},

		// scale label
		scaleLabel: {
			// actual label
			labelString: '',

			// display property
			display: false
		},

		// label settings
		ticks: {
			beginAtZero: false,
			minRotation: 0,
			maxRotation: 50,
			mirror: false,
			padding: 10,
			reverse: false,
			display: true,
			autoSkip: true,
			autoSkipPadding: 0,
			labelOffset: 0,
			// We pass through arrays to be rendered as multiline labels, we convert Others to strings here.
			callback: Chart.Ticks.formatters.values
		}
	};

	Chart.Scale = Chart.Element.extend({

		// These methods are ordered by lifecycle. Utilities then follow.
		// Any function defined here is inherited by all scale types.
		// Any function can be extended by the scale type

		beforeUpdate: function beforeUpdate() {
			helpers.callCallback(this.options.beforeUpdate, [this]);
		},
		update: function update(maxWidth, maxHeight, margins) {
			var me = this;

			// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
			me.beforeUpdate();

			// Absorb the master measurements
			me.maxWidth = maxWidth;
			me.maxHeight = maxHeight;
			me.margins = helpers.extend({
				left: 0,
				right: 0,
				top: 0,
				bottom: 0
			}, margins);

			// Dimensions
			me.beforeSetDimensions();
			me.setDimensions();
			me.afterSetDimensions();

			// Data min/max
			me.beforeDataLimits();
			me.determineDataLimits();
			me.afterDataLimits();

			// Ticks
			me.beforeBuildTicks();
			me.buildTicks();
			me.afterBuildTicks();

			me.beforeTickToLabelConversion();
			me.convertTicksToLabels();
			me.afterTickToLabelConversion();

			// Tick Rotation
			me.beforeCalculateTickRotation();
			me.calculateTickRotation();
			me.afterCalculateTickRotation();
			// Fit
			me.beforeFit();
			me.fit();
			me.afterFit();
			//
			me.afterUpdate();

			return me.minSize;
		},
		afterUpdate: function afterUpdate() {
			helpers.callCallback(this.options.afterUpdate, [this]);
		},

		//

		beforeSetDimensions: function beforeSetDimensions() {
			helpers.callCallback(this.options.beforeSetDimensions, [this]);
		},
		setDimensions: function setDimensions() {
			var me = this;
			// Set the unconstrained dimension before label rotation
			if (me.isHorizontal()) {
				// Reset position before calculating rotation
				me.width = me.maxWidth;
				me.left = 0;
				me.right = me.width;
			} else {
				me.height = me.maxHeight;

				// Reset position before calculating rotation
				me.top = 0;
				me.bottom = me.height;
			}

			// Reset padding
			me.paddingLeft = 0;
			me.paddingTop = 0;
			me.paddingRight = 0;
			me.paddingBottom = 0;
		},
		afterSetDimensions: function afterSetDimensions() {
			helpers.callCallback(this.options.afterSetDimensions, [this]);
		},

		// Data limits
		beforeDataLimits: function beforeDataLimits() {
			helpers.callCallback(this.options.beforeDataLimits, [this]);
		},
		determineDataLimits: helpers.noop,
		afterDataLimits: function afterDataLimits() {
			helpers.callCallback(this.options.afterDataLimits, [this]);
		},

		//
		beforeBuildTicks: function beforeBuildTicks() {
			helpers.callCallback(this.options.beforeBuildTicks, [this]);
		},
		buildTicks: helpers.noop,
		afterBuildTicks: function afterBuildTicks() {
			helpers.callCallback(this.options.afterBuildTicks, [this]);
		},

		beforeTickToLabelConversion: function beforeTickToLabelConversion() {
			helpers.callCallback(this.options.beforeTickToLabelConversion, [this]);
		},
		convertTicksToLabels: function convertTicksToLabels() {
			var me = this;
			// Convert ticks to strings
			var tickOpts = me.options.ticks;
			me.ticks = me.ticks.map(tickOpts.userCallback || tickOpts.callback);
		},
		afterTickToLabelConversion: function afterTickToLabelConversion() {
			helpers.callCallback(this.options.afterTickToLabelConversion, [this]);
		},

		//

		beforeCalculateTickRotation: function beforeCalculateTickRotation() {
			helpers.callCallback(this.options.beforeCalculateTickRotation, [this]);
		},
		calculateTickRotation: function calculateTickRotation() {
			var me = this;
			var context = me.ctx;
			var globalDefaults = Chart.defaults.global;
			var optionTicks = me.options.ticks;

			// Get the width of each grid by calculating the difference
			// between x offsets between 0 and 1.
			var tickFontSize = helpers.getValueOrDefault(optionTicks.fontSize, globalDefaults.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(optionTicks.fontStyle, globalDefaults.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(optionTicks.fontFamily, globalDefaults.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
			context.font = tickLabelFont;
			context.setFontSize(tickFontSize);
			var firstWidth = context.measureText(me.ticks[0]).width;
			var lastWidth = context.measureText(me.ticks[me.ticks.length - 1]).width;
			var firstRotated;

			me.labelRotation = optionTicks.minRotation || 0;
			me.paddingRight = 0;
			me.paddingLeft = 0;

			if (me.options.display) {
				if (me.isHorizontal()) {
					me.paddingRight = lastWidth / 2 + 3;
					me.paddingLeft = firstWidth / 2 + 3;

					if (!me.longestTextCache) {
						me.longestTextCache = {};
					}
					var originalLabelWidth = helpers.longestText(context, tickLabelFont, me.ticks, me.longestTextCache);
					var labelWidth = originalLabelWidth;
					var cosRotation;
					var sinRotation;

					// Allow 3 pixels x2 padding either side for label readability
					// only the index matters for a dataset scale, but we want a consistent interface between scales
					var tickWidth = me.getPixelForTick(1) - me.getPixelForTick(0) - 6;

					// Max label rotation can be set or default to 90 - also act as a loop counter
					while (labelWidth > tickWidth && me.labelRotation < optionTicks.maxRotation) {
						cosRotation = Math.cos(helpers.toRadians(me.labelRotation));
						sinRotation = Math.sin(helpers.toRadians(me.labelRotation));

						firstRotated = cosRotation * firstWidth;

						// We're right aligning the text now.
						if (firstRotated + tickFontSize / 2 > me.yLabelWidth) {
							me.paddingLeft = firstRotated + tickFontSize / 2;
						}

						me.paddingRight = tickFontSize / 2;

						if (sinRotation * originalLabelWidth > me.maxHeight) {
							// go back one step
							me.labelRotation--;
							break;
						}

						me.labelRotation++;
						labelWidth = cosRotation * originalLabelWidth;
					}
				}
			}

			if (me.margins) {
				me.paddingLeft = Math.max(me.paddingLeft - me.margins.left, 0);
				me.paddingRight = Math.max(me.paddingRight - me.margins.right, 0);
			}
		},
		afterCalculateTickRotation: function afterCalculateTickRotation() {
			helpers.callCallback(this.options.afterCalculateTickRotation, [this]);
		},

		//

		beforeFit: function beforeFit() {
			helpers.callCallback(this.options.beforeFit, [this]);
		},
		fit: function fit() {
			var me = this;
			// Reset
			var minSize = me.minSize = {
				width: 0,
				height: 0
			};

			var opts = me.options;
			var globalDefaults = Chart.defaults.global;
			var tickOpts = opts.ticks;
			var scaleLabelOpts = opts.scaleLabel;
			var gridLineOpts = opts.gridLines;
			var display = opts.display;
			var isHorizontal = me.isHorizontal();

			var tickFontSize = helpers.getValueOrDefault(tickOpts.fontSize, globalDefaults.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(tickOpts.fontStyle, globalDefaults.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(tickOpts.fontFamily, globalDefaults.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);

			var scaleLabelFontSize = helpers.getValueOrDefault(scaleLabelOpts.fontSize, globalDefaults.defaultFontSize);

			var tickMarkLength = opts.gridLines.tickMarkLength;

			// Width
			if (isHorizontal) {
				// subtract the margins to line up with the chartArea if we are a full width scale
				minSize.width = me.isFullWidth() ? me.maxWidth - me.margins.left - me.margins.right : me.maxWidth;
			} else {
				minSize.width = display && gridLineOpts.drawTicks ? tickMarkLength : 0;
			}

			// height
			if (isHorizontal) {
				minSize.height = display && gridLineOpts.drawTicks ? tickMarkLength : 0;
			} else {
				minSize.height = me.maxHeight; // fill all the height
			}

			// Are we showing a title for the scale?
			if (scaleLabelOpts.display && display) {
				if (isHorizontal) {
					minSize.height += scaleLabelFontSize * 1.5;
				} else {
					minSize.width += scaleLabelFontSize * 1.5;
				}
			}

			if (tickOpts.display && display) {
				// Don't bother fitting the ticks if we are not showing them
				if (!me.longestTextCache) {
					me.longestTextCache = {};
				}

				var largestTextWidth = helpers.longestText(me.ctx, tickLabelFont, me.ticks, me.longestTextCache);
				var tallestLabelHeightInLines = helpers.numberOfLabelLines(me.ticks);
				var lineSpace = tickFontSize * 0.5;

				if (isHorizontal) {
					// A horizontal axis is more constrained by the height.
					me.longestLabelWidth = largestTextWidth;

					// TODO - improve this calculation
					var labelHeight = Math.sin(helpers.toRadians(me.labelRotation)) * me.longestLabelWidth + tickFontSize * tallestLabelHeightInLines + lineSpace * tallestLabelHeightInLines;

					minSize.height = Math.min(me.maxHeight, minSize.height + labelHeight);
					me.ctx.font = tickLabelFont;
					me.ctx.setFontSize(tickFontSize);
					var firstLabelWidth = me.ctx.measureTextXscale(me.ticks[0]).width; //todo  measureTextXscale
					var lastLabelWidth = me.ctx.measureTextXscale(me.ticks[me.ticks.length - 1]).width; //todo  measureTextXscale

					// Ensure that our ticks are always inside the canvas. When rotated, ticks are right aligned which means that the right padding is dominated
					// by the font height
					var cosRotation = Math.cos(helpers.toRadians(me.labelRotation));
					var sinRotation = Math.sin(helpers.toRadians(me.labelRotation));
					me.labelRotation = 0; //todo 写死
					me.labelRotation = 0; //todo 写死不旋转
					me.paddingLeft = me.labelRotation !== 0 ? cosRotation * firstLabelWidth + 3 : firstLabelWidth / 2 + 3; // add 3 px to move away from canvas edges
					me.paddingRight = me.labelRotation !== 0 ? sinRotation * (tickFontSize / 2) + 3 : lastLabelWidth / 2 + 3; // when rotated
				} else {
					// A vertical axis is more constrained by the width. Labels are the dominant factor here, so get that length first
					var maxLabelWidth = me.maxWidth - minSize.width;

					// Account for padding
					var mirror = tickOpts.mirror;
					if (!mirror) {
						largestTextWidth += me.options.ticks.padding;
					} else {
						// If mirrored text is on the inside so don't expand
						largestTextWidth = 0;
					}

					if (largestTextWidth < maxLabelWidth) {
						// We don't need all the room
						minSize.width += largestTextWidth;
					} else {
						// Expand to max size
						minSize.width = me.maxWidth;
					}

					me.paddingTop = tickFontSize / 2;
					me.paddingBottom = tickFontSize / 2;
				}
			}

			if (me.margins) {
				me.paddingLeft = Math.max(me.paddingLeft - me.margins.left, 0);
				me.paddingTop = Math.max(me.paddingTop - me.margins.top, 0);
				me.paddingRight = Math.max(me.paddingRight - me.margins.right, 0);
				me.paddingBottom = Math.max(me.paddingBottom - me.margins.bottom, 0);
			}

			me.width = minSize.width;
			me.height = minSize.height;
		},
		afterFit: function afterFit() {
			helpers.callCallback(this.options.afterFit, [this]);
		},

		// Shared Methods
		isHorizontal: function isHorizontal() {
			return this.options.position === 'top' || this.options.position === 'bottom';
		},
		isFullWidth: function isFullWidth() {
			return this.options.fullWidth;
		},

		// Get the correct value. NaN bad inputs, If the value type is object get the x or y based on whether we are horizontal or not
		getRightValue: function getRightValue(rawValue) {
			// Null and undefined values first
			if (rawValue === null || typeof rawValue === 'undefined') {
				return NaN;
			}
			// isNaN(object) returns true, so make sure NaN is checking for a number; Discard Infinite values
			if (typeof rawValue === 'number' && !isFinite(rawValue)) {
				return NaN;
			}
			// If it is in fact an object, dive in one more level
			if ((typeof rawValue === 'undefined' ? 'undefined' : _typeof(rawValue)) === 'object') {
				if (rawValue instanceof Date || rawValue.isValid) {
					return rawValue;
				}
				return this.getRightValue(this.isHorizontal() ? rawValue.x : rawValue.y);
			}

			// Value is good, return it
			return rawValue;
		},

		// Used to get the value to display in the tooltip for the data at the given index
		// function getLabelForIndex(index, datasetIndex)
		getLabelForIndex: helpers.noop,

		// Used to get data value locations.  Value can either be an index or a numerical value
		getPixelForValue: helpers.noop,

		// Used to get the data value from a given pixel. This is the inverse of getPixelForValue
		getValueForPixel: helpers.noop,

		// Used for tick location, should
		getPixelForTick: function getPixelForTick(index, includeOffset) {
			var me = this;
			if (me.isHorizontal()) {
				var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
				var tickWidth = innerWidth / Math.max(me.ticks.length - (me.options.gridLines.offsetGridLines ? 0 : 1), 1);
				var pixel = tickWidth * index + me.paddingLeft;

				if (includeOffset) {
					pixel += tickWidth / 2;
				}

				var finalVal = me.left + Math.round(pixel);
				finalVal += me.isFullWidth() ? me.margins.left : 0;
				return finalVal;
			}
			var innerHeight = me.height - (me.paddingTop + me.paddingBottom);
			return me.top + index * (innerHeight / (me.ticks.length - 1));
		},

		// Utility for getting the pixel location of a percentage of scale
		getPixelForDecimal: function getPixelForDecimal(decimal /* , includeOffset*/) {
			var me = this;
			if (me.isHorizontal()) {
				var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
				var valueOffset = innerWidth * decimal + me.paddingLeft;

				var finalVal = me.left + Math.round(valueOffset);
				finalVal += me.isFullWidth() ? me.margins.left : 0;
				return finalVal;
			}
			return me.top + decimal * me.height;
		},

		getBasePixel: function getBasePixel() {
			var me = this;
			var min = me.min;
			var max = me.max;

			return me.getPixelForValue(me.beginAtZero ? 0 : min < 0 && max < 0 ? max : min > 0 && max > 0 ? min : 0);
		},

		// Actually draw the scale on the canvas
		// @param {rectangle} chartArea : the area of the chart to draw full grid lines on
		draw: function draw(chartArea, box) {
			//todo 传入box用于区分x轴y轴
			var me = this;
			var options = me.options;
			if (!options.display) {
				return;
			}

			var context = me.ctx;
			var globalDefaults = Chart.defaults.global;
			var optionTicks = options.ticks;
			var gridLines = options.gridLines;
			var scaleLabel = options.scaleLabel;

			var isRotated = me.labelRotation !== 0;
			var skipRatio;
			var useAutoskipper = optionTicks.autoSkip;
			var isHorizontal = me.isHorizontal();

			// figure out the maximum number of gridlines to show
			var maxTicks;
			if (optionTicks.maxTicksLimit) {
				maxTicks = optionTicks.maxTicksLimit;
			}

			var tickFontColor = helpers.getValueOrDefault(optionTicks.fontColor, globalDefaults.defaultFontColor);
			var tickFontSize = helpers.getValueOrDefault(optionTicks.fontSize, globalDefaults.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(optionTicks.fontStyle, globalDefaults.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(optionTicks.fontFamily, globalDefaults.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
			var tl = gridLines.tickMarkLength;
			var borderDash = helpers.getValueOrDefault(gridLines.borderDash, globalDefaults.borderDash);
			var borderDashOffset = helpers.getValueOrDefault(gridLines.borderDashOffset, globalDefaults.borderDashOffset);

			var scaleLabelFontColor = helpers.getValueOrDefault(scaleLabel.fontColor, globalDefaults.defaultFontColor);
			var scaleLabelFontSize = helpers.getValueOrDefault(scaleLabel.fontSize, globalDefaults.defaultFontSize);
			var scaleLabelFontStyle = helpers.getValueOrDefault(scaleLabel.fontStyle, globalDefaults.defaultFontStyle);
			var scaleLabelFontFamily = helpers.getValueOrDefault(scaleLabel.fontFamily, globalDefaults.defaultFontFamily);
			var scaleLabelFont = helpers.fontString(scaleLabelFontSize, scaleLabelFontStyle, scaleLabelFontFamily);

			var labelRotationRadians = helpers.toRadians(me.labelRotation);
			var cosRotation = Math.cos(labelRotationRadians);
			var longestRotatedLabel = me.longestLabelWidth * cosRotation;

			// Make sure we draw text in the correct color and font
			context.setFillStyle(tickFontColor);

			var itemsToDraw = [];

			if (isHorizontal) {
				skipRatio = false;

				// Only calculate the skip ratio with the half width of longestRotateLabel if we got an actual rotation
				// See #2584
				if (isRotated) {
					longestRotatedLabel /= 2;
				}

				if ((longestRotatedLabel + optionTicks.autoSkipPadding) * me.ticks.length > me.width - (me.paddingLeft + me.paddingRight)) {
					skipRatio = 1 + Math.floor((longestRotatedLabel + optionTicks.autoSkipPadding) * me.ticks.length / (me.width - (me.paddingLeft + me.paddingRight)));
				}

				// if they defined a max number of optionTicks,
				// increase skipRatio until that number is met
				if (maxTicks && me.ticks.length > maxTicks) {
					while (!skipRatio || me.ticks.length / (skipRatio || 1) > maxTicks) {
						if (!skipRatio) {
							skipRatio = 1;
						}
						skipRatio += 1;
					}
				}

				if (!useAutoskipper) {
					skipRatio = false;
				}
			}

			var xTickStart = options.position === 'right' ? me.left : me.right - tl;
			var xTickEnd = options.position === 'right' ? me.left + tl : me.right;
			var yTickStart = options.position === 'bottom' ? me.top : me.bottom - tl;
			var yTickEnd = options.position === 'bottom' ? me.top + tl : me.bottom;

			helpers.each(me.ticks, function (label, index) {
				// If the callback returned a null or undefined value, do not draw this line
				if (label === undefined || label === null) {
					return;
				}

				var isLastTick = me.ticks.length === index + 1;

				// Since we always show the last tick,we need may need to hide the last shown one before
				var shouldSkip = skipRatio > 1 && index % skipRatio > 0 || index % skipRatio === 0 && index + skipRatio >= me.ticks.length;
				if (shouldSkip && !isLastTick || label === undefined || label === null) {
					return;
				}

				var lineWidth, lineColor;
				if (index === (typeof me.zeroLineIndex !== 'undefined' ? me.zeroLineIndex : 0)) {
					// Draw the first index specially
					lineWidth = gridLines.zeroLineWidth;
					lineColor = gridLines.zeroLineColor;
				} else {
					lineWidth = helpers.getValueAtIndexOrDefault(gridLines.lineWidth, index);
					lineColor = helpers.getValueAtIndexOrDefault(gridLines.color, index);
				}

				// Common properties
				var tx1, ty1, tx2, ty2, x1, y1, x2, y2, labelX, labelY;
				var textAlign = 'middle';
				var textBaseline = 'middle';

				if (isHorizontal) {
					if (!isRotated) {
						textBaseline = options.position === 'top' ? 'bottom' : 'top';
					}

					textAlign = isRotated ? 'right' : 'center';

					var xLineValue = me.getPixelForTick(index) + helpers.aliasPixel(lineWidth); // xvalues for grid lines
					labelX = me.getPixelForTick(index, gridLines.offsetGridLines) + optionTicks.labelOffset; // x values for optionTicks (need to consider offsetLabel option)
					labelY = isRotated ? me.top + 12 : options.position === 'top' ? me.bottom - tl : me.top + tl;

					tx1 = tx2 = x1 = x2 = xLineValue;
					ty1 = yTickStart;
					ty2 = yTickEnd;
					y1 = chartArea.top;
					y2 = chartArea.bottom;
				} else {
					if (options.position === 'left') {
						if (optionTicks.mirror) {
							labelX = me.right + optionTicks.padding;
							textAlign = 'left';
						} else {
							labelX = me.right - optionTicks.padding;
							textAlign = 'right';
						}
						// right side
					} else if (optionTicks.mirror) {
						labelX = me.left - optionTicks.padding;
						textAlign = 'right';
					} else {
						labelX = me.left + optionTicks.padding;
						textAlign = 'left';
					}

					var yLineValue = me.getPixelForTick(index); // xvalues for grid lines
					yLineValue += helpers.aliasPixel(lineWidth);
					labelY = me.getPixelForTick(index, gridLines.offsetGridLines);

					tx1 = xTickStart;
					tx2 = xTickEnd;
					x1 = chartArea.left;
					x2 = chartArea.right;
					ty1 = ty2 = y1 = y2 = yLineValue;
				}

				itemsToDraw.push({
					tx1: tx1,
					ty1: ty1,
					tx2: tx2,
					ty2: ty2,
					x1: x1,
					y1: y1,
					x2: x2,
					y2: y2,
					labelX: labelX,
					labelY: labelY,
					glWidth: lineWidth,
					glColor: lineColor,
					glBorderDash: borderDash,
					glBorderDashOffset: borderDashOffset,
					rotation: -1 * labelRotationRadians,
					label: label,
					textBaseline: textBaseline,
					textAlign: textAlign
				});
			});

			// Draw all of the tick labels, tick marks, and grid lines at the correct places
			helpers.each(itemsToDraw, function (itemToDraw) {
				if (gridLines.display) {
					context.save();
					context.setLineWidth(itemToDraw.glWidth);
					context.setStrokeStyle(itemToDraw.glColor);
					if (context.setLineDash) {
						context.setLineDash(itemToDraw.glBorderDash);
						context.lineDashOffset = itemToDraw.glBorderDashOffset;
					}

					context.beginPath();

					if (gridLines.drawTicks) {
						context.moveTo(itemToDraw.tx1, itemToDraw.ty1);
						context.lineTo(itemToDraw.tx2, itemToDraw.ty2);
					}

					if (gridLines.drawOnChartArea) {
						context.moveTo(itemToDraw.x1, itemToDraw.y1);
						context.lineTo(itemToDraw.x2, itemToDraw.y2);
					}

					context.stroke();
					context.restore();
				}

				if (optionTicks.display) {
					context.save();
					context.translate(itemToDraw.labelX, itemToDraw.labelY);
					context.rotate(itemToDraw.rotation);
					context.font = tickLabelFont;
					context.setFontSize(tickFontSize);
					context.textBaseline = itemToDraw.textBaseline;
					context.textAlign = itemToDraw.textAlign;

					var label = itemToDraw.label;
					if (helpers.isArray(label)) {
						for (var i = 0, y = -(label.length - 1) * tickFontSize * 0.75; i < label.length; ++i) {
							// We just make sure the multiline element is a string here..
							context.fillText('' + label[i], 0, y);
							// apply same lineSpacing as calculated @ L#320
							y += tickFontSize * 1.5;
						}
					} else {
						var lalg = (label + '').replace(/[^\x00-\xff]/g, "**").length;
						if (box.id == 'y-axis-0' || box.id == 'y-axis-1') {
							//数值，表示左侧y轴
							context.fillText(label, -1 * (lalg * 5 + 7), 4.4); //todo 让label向左偏移一点点，会好看点
						} else if (box.id == 'y-axis-2') {
							//右侧y轴
							context.fillText(label, 5, 4.4); //todo
						} else {
							//x轴
							context.fillText(label, -2.9 * lalg, 10); //todo 让label向左偏移一点点，会好看点
						}
					}
					context.restore();
				}
			});

			if (scaleLabel.display) {
				// Draw the scale label
				var scaleLabelX;
				var scaleLabelY;
				var rotation = 0;

				if (isHorizontal) {
					scaleLabelX = me.left + (me.right - me.left) / 2; // midpoint of the width
					scaleLabelY = options.position === 'bottom' ? me.bottom - scaleLabelFontSize / 2 : me.top + scaleLabelFontSize / 2;
				} else {
					var isLeft = options.position === 'left';
					scaleLabelX = isLeft ? me.left + scaleLabelFontSize / 2 : me.right - scaleLabelFontSize / 2;
					scaleLabelY = me.top + (me.bottom - me.top) / 2;
					rotation = isLeft ? -0.5 * Math.PI : 0.5 * Math.PI;
				}

				context.save();
				context.translate(scaleLabelX, scaleLabelY);
				context.rotate(rotation);
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.setFillStyle(scaleLabelFontColor); // render in correct colour
				context.font = scaleLabelFont;
				context.setFontSize(scaleLabelFontSize);
				context.fillText(scaleLabel.labelString, 0, 0);
				context.restore();
			}

			if (gridLines.drawBorder) {
				// Draw the line at the edge of the axis
				var lineWidth = helpers.getValueAtIndexOrDefault(gridLines.lineWidth, 0);
				context.setLineWidth(lineWidth);
				context.setStrokeStyle(helpers.getValueAtIndexOrDefault(gridLines.color, 0));
				var x1 = me.left,
				    x2 = me.right,
				    y1 = me.top,
				    y2 = me.bottom;

				var aliasPixel = helpers.aliasPixel(lineWidth);
				if (isHorizontal) {
					y1 = y2 = options.position === 'top' ? me.bottom : me.top;
					y1 += aliasPixel;
					y2 += aliasPixel;
				} else {
					x1 = x2 = options.position === 'left' ? me.right : me.left;
					x1 += aliasPixel;
					x2 += aliasPixel;
				}

				if (isHorizontal && !gridLines.hideX) {
					context.beginPath();
					context.moveTo(x1, y1);
					context.lineTo(x2, y2);
					context.stroke();
				}
				if (!isHorizontal && !gridLines.hideY) {
					context.beginPath();
					context.moveTo(x1, y1);
					context.lineTo(x2, y2);
					context.stroke();
				}
			}
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuc2NhbGUuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkNoYXJ0IiwiaGVscGVycyIsImRlZmF1bHRzIiwic2NhbGUiLCJkaXNwbGF5IiwicG9zaXRpb24iLCJncmlkTGluZXMiLCJjb2xvciIsImxpbmVXaWR0aCIsImRyYXdCb3JkZXIiLCJkcmF3T25DaGFydEFyZWEiLCJkcmF3VGlja3MiLCJ0aWNrTWFya0xlbmd0aCIsInplcm9MaW5lV2lkdGgiLCJ6ZXJvTGluZUNvbG9yIiwib2Zmc2V0R3JpZExpbmVzIiwiYm9yZGVyRGFzaCIsImJvcmRlckRhc2hPZmZzZXQiLCJzY2FsZUxhYmVsIiwibGFiZWxTdHJpbmciLCJ0aWNrcyIsImJlZ2luQXRaZXJvIiwibWluUm90YXRpb24iLCJtYXhSb3RhdGlvbiIsIm1pcnJvciIsInBhZGRpbmciLCJyZXZlcnNlIiwiYXV0b1NraXAiLCJhdXRvU2tpcFBhZGRpbmciLCJsYWJlbE9mZnNldCIsImNhbGxiYWNrIiwiVGlja3MiLCJmb3JtYXR0ZXJzIiwidmFsdWVzIiwiU2NhbGUiLCJFbGVtZW50IiwiZXh0ZW5kIiwiYmVmb3JlVXBkYXRlIiwiY2FsbENhbGxiYWNrIiwib3B0aW9ucyIsInVwZGF0ZSIsIm1heFdpZHRoIiwibWF4SGVpZ2h0IiwibWFyZ2lucyIsIm1lIiwibGVmdCIsInJpZ2h0IiwidG9wIiwiYm90dG9tIiwiYmVmb3JlU2V0RGltZW5zaW9ucyIsInNldERpbWVuc2lvbnMiLCJhZnRlclNldERpbWVuc2lvbnMiLCJiZWZvcmVEYXRhTGltaXRzIiwiZGV0ZXJtaW5lRGF0YUxpbWl0cyIsImFmdGVyRGF0YUxpbWl0cyIsImJlZm9yZUJ1aWxkVGlja3MiLCJidWlsZFRpY2tzIiwiYWZ0ZXJCdWlsZFRpY2tzIiwiYmVmb3JlVGlja1RvTGFiZWxDb252ZXJzaW9uIiwiY29udmVydFRpY2tzVG9MYWJlbHMiLCJhZnRlclRpY2tUb0xhYmVsQ29udmVyc2lvbiIsImJlZm9yZUNhbGN1bGF0ZVRpY2tSb3RhdGlvbiIsImNhbGN1bGF0ZVRpY2tSb3RhdGlvbiIsImFmdGVyQ2FsY3VsYXRlVGlja1JvdGF0aW9uIiwiYmVmb3JlRml0IiwiZml0IiwiYWZ0ZXJGaXQiLCJhZnRlclVwZGF0ZSIsIm1pblNpemUiLCJpc0hvcml6b250YWwiLCJ3aWR0aCIsImhlaWdodCIsInBhZGRpbmdMZWZ0IiwicGFkZGluZ1RvcCIsInBhZGRpbmdSaWdodCIsInBhZGRpbmdCb3R0b20iLCJub29wIiwidGlja09wdHMiLCJtYXAiLCJ1c2VyQ2FsbGJhY2siLCJjb250ZXh0IiwiY3R4IiwiZ2xvYmFsRGVmYXVsdHMiLCJnbG9iYWwiLCJvcHRpb25UaWNrcyIsInRpY2tGb250U2l6ZSIsImdldFZhbHVlT3JEZWZhdWx0IiwiZm9udFNpemUiLCJkZWZhdWx0Rm9udFNpemUiLCJ0aWNrRm9udFN0eWxlIiwiZm9udFN0eWxlIiwiZGVmYXVsdEZvbnRTdHlsZSIsInRpY2tGb250RmFtaWx5IiwiZm9udEZhbWlseSIsImRlZmF1bHRGb250RmFtaWx5IiwidGlja0xhYmVsRm9udCIsImZvbnRTdHJpbmciLCJmb250Iiwic2V0Rm9udFNpemUiLCJmaXJzdFdpZHRoIiwibWVhc3VyZVRleHQiLCJsYXN0V2lkdGgiLCJsZW5ndGgiLCJmaXJzdFJvdGF0ZWQiLCJsYWJlbFJvdGF0aW9uIiwibG9uZ2VzdFRleHRDYWNoZSIsIm9yaWdpbmFsTGFiZWxXaWR0aCIsImxvbmdlc3RUZXh0IiwibGFiZWxXaWR0aCIsImNvc1JvdGF0aW9uIiwic2luUm90YXRpb24iLCJ0aWNrV2lkdGgiLCJnZXRQaXhlbEZvclRpY2siLCJNYXRoIiwiY29zIiwidG9SYWRpYW5zIiwic2luIiwieUxhYmVsV2lkdGgiLCJtYXgiLCJvcHRzIiwic2NhbGVMYWJlbE9wdHMiLCJncmlkTGluZU9wdHMiLCJzY2FsZUxhYmVsRm9udFNpemUiLCJpc0Z1bGxXaWR0aCIsImxhcmdlc3RUZXh0V2lkdGgiLCJ0YWxsZXN0TGFiZWxIZWlnaHRJbkxpbmVzIiwibnVtYmVyT2ZMYWJlbExpbmVzIiwibGluZVNwYWNlIiwibG9uZ2VzdExhYmVsV2lkdGgiLCJsYWJlbEhlaWdodCIsIm1pbiIsImZpcnN0TGFiZWxXaWR0aCIsIm1lYXN1cmVUZXh0WHNjYWxlIiwibGFzdExhYmVsV2lkdGgiLCJtYXhMYWJlbFdpZHRoIiwiZnVsbFdpZHRoIiwiZ2V0UmlnaHRWYWx1ZSIsInJhd1ZhbHVlIiwiTmFOIiwiaXNGaW5pdGUiLCJEYXRlIiwiaXNWYWxpZCIsIngiLCJ5IiwiZ2V0TGFiZWxGb3JJbmRleCIsImdldFBpeGVsRm9yVmFsdWUiLCJnZXRWYWx1ZUZvclBpeGVsIiwiaW5kZXgiLCJpbmNsdWRlT2Zmc2V0IiwiaW5uZXJXaWR0aCIsInBpeGVsIiwiZmluYWxWYWwiLCJyb3VuZCIsImlubmVySGVpZ2h0IiwiZ2V0UGl4ZWxGb3JEZWNpbWFsIiwiZGVjaW1hbCIsInZhbHVlT2Zmc2V0IiwiZ2V0QmFzZVBpeGVsIiwiZHJhdyIsImNoYXJ0QXJlYSIsImJveCIsImlzUm90YXRlZCIsInNraXBSYXRpbyIsInVzZUF1dG9za2lwcGVyIiwibWF4VGlja3MiLCJtYXhUaWNrc0xpbWl0IiwidGlja0ZvbnRDb2xvciIsImZvbnRDb2xvciIsImRlZmF1bHRGb250Q29sb3IiLCJ0bCIsInNjYWxlTGFiZWxGb250Q29sb3IiLCJzY2FsZUxhYmVsRm9udFN0eWxlIiwic2NhbGVMYWJlbEZvbnRGYW1pbHkiLCJzY2FsZUxhYmVsRm9udCIsImxhYmVsUm90YXRpb25SYWRpYW5zIiwibG9uZ2VzdFJvdGF0ZWRMYWJlbCIsInNldEZpbGxTdHlsZSIsIml0ZW1zVG9EcmF3IiwiZmxvb3IiLCJ4VGlja1N0YXJ0IiwieFRpY2tFbmQiLCJ5VGlja1N0YXJ0IiwieVRpY2tFbmQiLCJlYWNoIiwibGFiZWwiLCJ1bmRlZmluZWQiLCJpc0xhc3RUaWNrIiwic2hvdWxkU2tpcCIsImxpbmVDb2xvciIsInplcm9MaW5lSW5kZXgiLCJnZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQiLCJ0eDEiLCJ0eTEiLCJ0eDIiLCJ0eTIiLCJ4MSIsInkxIiwieDIiLCJ5MiIsImxhYmVsWCIsImxhYmVsWSIsInRleHRBbGlnbiIsInRleHRCYXNlbGluZSIsInhMaW5lVmFsdWUiLCJhbGlhc1BpeGVsIiwieUxpbmVWYWx1ZSIsInB1c2giLCJnbFdpZHRoIiwiZ2xDb2xvciIsImdsQm9yZGVyRGFzaCIsImdsQm9yZGVyRGFzaE9mZnNldCIsInJvdGF0aW9uIiwiaXRlbVRvRHJhdyIsInNhdmUiLCJzZXRMaW5lV2lkdGgiLCJzZXRTdHJva2VTdHlsZSIsInNldExpbmVEYXNoIiwibGluZURhc2hPZmZzZXQiLCJiZWdpblBhdGgiLCJtb3ZlVG8iLCJsaW5lVG8iLCJzdHJva2UiLCJyZXN0b3JlIiwidHJhbnNsYXRlIiwicm90YXRlIiwiaXNBcnJheSIsImkiLCJmaWxsVGV4dCIsImxhbGciLCJyZXBsYWNlIiwiaWQiLCJzY2FsZUxhYmVsWCIsInNjYWxlTGFiZWxZIiwiaXNMZWZ0IiwiUEkiLCJoaWRlWCIsImhpZGVZIl0sIm1hcHBpbmdzIjoiQUFBQTs7OztBQUVBQSxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLEtBQVQsRUFBZ0I7O0FBRWhDLEtBQUlDLFVBQVVELE1BQU1DLE9BQXBCOztBQUVBRCxPQUFNRSxRQUFOLENBQWVDLEtBQWYsR0FBdUI7QUFDdEJDLFdBQVMsSUFEYTtBQUV0QkMsWUFBVSxNQUZZOztBQUl0QjtBQUNBQyxhQUFXO0FBQ1ZGLFlBQVMsSUFEQztBQUVWRyxVQUFPLG9CQUZHO0FBR1ZDLGNBQVcsQ0FIRDtBQUlWQyxlQUFZLElBSkY7QUFLVkMsb0JBQWlCLElBTFA7QUFNVkMsY0FBVyxJQU5EO0FBT1ZDLG1CQUFnQixFQVBOO0FBUVZDLGtCQUFlLENBUkw7QUFTVkMsa0JBQWUsa0JBVEw7QUFVVkMsb0JBQWlCLEtBVlA7QUFXVkMsZUFBWSxFQVhGO0FBWVZDLHFCQUFrQjtBQVpSLEdBTFc7O0FBb0J0QjtBQUNBQyxjQUFZO0FBQ1g7QUFDQUMsZ0JBQWEsRUFGRjs7QUFJWDtBQUNBZixZQUFTO0FBTEUsR0FyQlU7O0FB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LFdBQU1PLFVBQU47QUFDQTs7QUFFRCxRQUFHdkksZ0JBQWMsQ0FBQy9ELFVBQVVxTyxLQUE1QixFQUFrQztBQUNqQzNKLGFBQVEwSSxTQUFSO0FBQ0ExSSxhQUFRMkksTUFBUixDQUFleEIsRUFBZixFQUFtQkMsRUFBbkI7QUFDQXBILGFBQVE0SSxNQUFSLENBQWV2QixFQUFmLEVBQW1CQyxFQUFuQjtBQUNBdEgsYUFBUTZJLE1BQVI7QUFDQTtBQUNELFFBQUcsQ0FBQ3hKLFlBQUQsSUFBZSxDQUFDL0QsVUFBVXNPLEtBQTdCLEVBQW1DO0FBQ2xDNUosYUFBUTBJLFNBQVI7QUFDQTFJLGFBQVEySSxNQUFSLENBQWV4QixFQUFmLEVBQW1CQyxFQUFuQjtBQUNBcEgsYUFBUTRJLE1BQVIsQ0FBZXZCLEVBQWYsRUFBbUJDLEVBQW5CO0FBQ0F0SCxhQUFRNkksTUFBUjtBQUNBO0FBQ0Q7QUFDRDtBQTdzQmlDLEVBQXJCLENBQWQ7QUErc0JBLENBandCRCIsImZpbGUiOiJjb3JlLnNjYWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDaGFydCkge1xyXG5cclxuXHR2YXIgaGVscGVycyA9IENoYXJ0LmhlbHBlcnM7XHJcblxyXG5cdENoYXJ0LmRlZmF1bHRzLnNjYWxlID0ge1xyXG5cdFx0ZGlzcGxheTogdHJ1ZSxcclxuXHRcdHBvc2l0aW9uOiAnbGVmdCcsXHJcblxyXG5cdFx0Ly8gZ3JpZCBsaW5lIHNldHRpbmdzXHJcblx0XHRncmlkTGluZXM6IHtcclxuXHRcdFx0ZGlzcGxheTogdHJ1ZSxcclxuXHRcdFx0Y29sb3I6ICdyZ2JhKDAsIDAsIDAsIDAuMSknLFxyXG5cdFx0XHRsaW5lV2lkdGg6IDEsXHJcblx0XHRcdGRyYXdCb3JkZXI6IHRydWUsXHJcblx0XHRcdGRyYXdPbkNoYXJ0QXJlYTogdHJ1ZSxcclxuXHRcdFx0ZHJhd1RpY2tzOiB0cnVlLFxyXG5cdFx0XHR0aWNrTWFya0xlbmd0aDogMTAsXHJcblx0XHRcdHplcm9MaW5lV2lkdGg6IDEsXHJcblx0XHRcdHplcm9MaW5lQ29sb3I6ICdyZ2JhKDAsMCwwLDAuMjUpJyxcclxuXHRcdFx0b2Zmc2V0R3JpZExpbmVzOiBmYWxzZSxcclxuXHRcdFx0Ym9yZGVyRGFzaDogW10sXHJcblx0XHRcdGJvcmRlckRhc2hPZmZzZXQ6IDAuMFxyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBzY2FsZSBsYWJlbFxyXG5cdFx0c2NhbGVMYWJlbDoge1xyXG5cdFx0XHQvLyBhY3R1YWwgbGFiZWxcclxuXHRcdFx0bGFiZWxTdHJpbmc6ICcnLFxyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSBwcm9wZXJ0eVxyXG5cdFx0XHRkaXNwbGF5OiBmYWxzZVxyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBsYWJlbCBzZXR0aW5nc1xyXG5cdFx0dGlja3M6IHtcclxuXHRcdFx0YmVnaW5BdFplcm86IGZhbHNlLFxyXG5cdFx0XHRtaW5Sb3RhdGlvbjogMCxcclxuXHRcdFx0bWF4Um90YXRpb246IDUwLFxyXG5cdFx0XHRtaXJyb3I6IGZhbHNlLFxyXG5cdFx0XHRwYWRkaW5nOiAxMCxcclxuXHRcdFx0cmV2ZXJzZTogZmFsc2UsXHJcblx0XHRcdGRpc3BsYXk6IHRydWUsXHJcblx0XHRcdGF1dG9Ta2lwOiB0cnVlLFxyXG5cdFx0XHRhdXRvU2tpcFBhZGRpbmc6IDAsXHJcblx0XHRcdGxhYmVsT2Zmc2V0OiAwLFxyXG5cdFx0XHQvLyBXZSBwYXNzIHRocm91Z2ggYXJyYXlzIHRvIGJlIHJlbmRlcmVkIGFzIG11bHRpbGluZSBsYWJlbHMsIHdlIGNvbnZlcnQgT3RoZXJzIHRvIHN0cmluZ3MgaGVyZS5cclxuXHRcdFx0Y2FsbGJhY2s6IENoYXJ0LlRpY2tzLmZvcm1hdHRlcnMudmFsdWVzXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0Q2hhcnQuU2NhbGUgPSBDaGFydC5FbGVtZW50LmV4dGVuZCh7XHJcblxyXG5cdFx0Ly8gVGhlc2UgbWV0aG9kcyBhcmUgb3JkZXJlZCBieSBsaWZlY3ljbGUuIFV0aWxpdGllcyB0aGVuIGZvbGxvdy5cclxuXHRcdC8vIEFueSBmdW5jdGlvbiBkZWZpbmVkIGhlcmUgaXMgaW5oZXJpdGVkIGJ5IGFsbCBzY2FsZSB0eXBlcy5cclxuXHRcdC8vIEFueSBmdW5jdGlvbiBjYW4gYmUgZXh0ZW5kZWQgYnkgdGhlIHNjYWxlIHR5cGVcclxuXHJcblx0XHRiZWZvcmVVcGRhdGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRoZWxwZXJzLmNhbGxDYWxsYmFjayh0aGlzLm9wdGlvbnMuYmVmb3JlVXBkYXRlLCBbdGhpc10pO1xyXG5cdFx0fSxcclxuXHRcdHVwZGF0ZTogZnVuY3Rpb24obWF4V2lkdGgsIG1heEhlaWdodCwgbWFyZ2lucykge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIExpZmVjeWNsZSAtIFByb2JhYmx5IGRvbid0IHdhbnQgdG8gZXZlciBleHRlbmQgb3Igb3ZlcndyaXRlIHRoaXMgZnVuY3Rpb24gOylcclxuXHRcdFx0bWUuYmVmb3JlVXBkYXRlKCk7XHJcblxyXG5cdFx0XHQvLyBBYnNvcmIgdGhlIG1hc3RlciBtZWFzdXJlbWVudHNcclxuXHRcdFx0bWUubWF4V2lkdGggPSBtYXhXaWR0aDtcclxuXHRcdFx0bWUubWF4SGVpZ2h0ID0gbWF4SGVpZ2h0O1xyXG5cdFx0XHRtZS5tYXJnaW5zID0gaGVscGVycy5leHRlbmQoe1xyXG5cdFx0XHRcdGxlZnQ6IDAsXHJcblx0XHRcdFx0cmlnaHQ6IDAsXHJcblx0XHRcdFx0dG9wOiAwLFxyXG5cdFx0XHRcdGJvdHRvbTogMFxyXG5cdFx0XHR9LCBtYXJnaW5zKTtcclxuXHJcblx0XHRcdC8vIERpbWVuc2lvbnNcclxuXHRcdFx0bWUuYmVmb3JlU2V0RGltZW5zaW9ucygpO1xyXG5cdFx0XHRtZS5zZXREaW1lbnNpb25zKCk7XHJcblx0XHRcdG1lLmFmdGVyU2V0RGltZW5zaW9ucygpO1xyXG5cclxuXHRcdFx0Ly8gRGF0YSBtaW4vbWF4XHJcblx0XHRcdG1lLmJlZm9yZURhdGFMaW1pdHMoKTtcclxuXHRcdFx0bWUuZGV0ZXJtaW5lRGF0YUxpbWl0cygpO1xyXG5cdFx0XHRtZS5hZnRlckRhdGFMaW1pdHMoKTtcclxuXHJcblx0XHRcdC8vIFRpY2tzXHJcblx0XHRcdG1lLmJlZm9yZUJ1aWxkVGlja3MoKTtcclxuXHRcdFx0bWUuYnVpbGRUaWNrcygpO1xyXG5cdFx0XHRtZS5hZnRlckJ1aWxkVGlja3MoKTtcclxuXHJcblx0XHRcdG1lLmJlZm9yZVRpY2tUb0xhYmVsQ29udmVyc2lvbigpO1xyXG5cdFx0XHRtZS5jb252ZXJ0VGlja3NUb0xhYmVscygpO1xyXG5cdFx0XHRtZS5hZnRlclRpY2tUb0xhYmVsQ29udmVyc2lvbigpO1xyXG5cclxuXHRcdFx0Ly8gVGljayBSb3RhdGlvblxyXG5cdFx0XHRtZS5iZWZvcmVDYWxjdWxhdGVUaWNrUm90YXRpb24oKTtcclxuXHRcdFx0bWUuY2FsY3VsYXRlVGlja1JvdGF0aW9uKCk7XHJcblx0XHRcdG1lLmFmdGVyQ2FsY3VsYXRlVGlja1JvdGF0aW9uKCk7XHJcblx0XHRcdC8vIEZpdFxyXG5cdFx0XHRtZS5iZWZvcmVGaXQoKTtcclxuXHRcdFx0bWUuZml0KCk7XHJcblx0XHRcdG1lLmFmdGVyRml0KCk7XHJcblx0XHRcdC8vXHJcblx0XHRcdG1lLmFmdGVyVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gbWUubWluU2l6ZTtcclxuXHJcblx0XHR9LFxyXG5cdFx0YWZ0ZXJVcGRhdGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRoZWxwZXJzLmNhbGxDYWxsYmFjayh0aGlzLm9wdGlvbnMuYWZ0ZXJVcGRhdGUsIFt0aGlzXSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vXHJcblxyXG5cdFx0YmVmb3JlU2V0RGltZW5zaW9uczogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGhlbHBlcnMuY2FsbENhbGxiYWNrKHRoaXMub3B0aW9ucy5iZWZvcmVTZXREaW1lbnNpb25zLCBbdGhpc10pO1xyXG5cdFx0fSxcclxuXHRcdHNldERpbWVuc2lvbnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHQvLyBTZXQgdGhlIHVuY29uc3RyYWluZWQgZGltZW5zaW9uIGJlZm9yZSBsYWJlbCByb3RhdGlvblxyXG5cdFx0XHRpZiAobWUuaXNIb3Jpem9udGFsKCkpIHtcclxuXHRcdFx0XHQvLyBSZXNldCBwb3NpdGlvbiBiZWZvcmUgY2FsY3VsYXRpbmcgcm90YXRpb25cclxuXHRcdFx0XHRtZS53aWR0aCA9IG1lLm1heFdpZHRoO1xyXG5cdFx0XHRcdG1lLmxlZnQgPSAwO1xyXG5cdFx0XHRcdG1lLnJpZ2h0ID0gbWUud2lkdGg7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bWUuaGVpZ2h0ID0gbWUubWF4SGVpZ2h0O1xyXG5cclxuXHRcdFx0XHQvLyBSZXNldCBwb3NpdGlvbiBiZWZvcmUgY2FsY3VsYXRpbmcgcm90YXRpb25cclxuXHRcdFx0XHRtZS50b3AgPSAwO1xyXG5cdFx0XHRcdG1lLmJvdHRvbSA9IG1lLmhlaWdodDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVzZXQgcGFkZGluZ1xyXG5cdFx0XHRtZS5wYWRkaW5nTGVmdCA9IDA7XHJcblx0XHRcdG1lLnBhZGRpbmdUb3AgPSAwO1xyXG5cdFx0XHRtZS5wYWRkaW5nUmlnaHQgPSAwO1xyXG5cdFx0XHRtZS5wYWRkaW5nQm90dG9tID0gMDtcclxuXHRcdH0sXHJcblx0XHRhZnRlclNldERpbWVuc2lvbnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRoZWxwZXJzLmNhbGxDYWxsYmFjayh0aGlzLm9wdGlvbnMuYWZ0ZXJTZXREaW1lbnNpb25zLCBbdGhpc10pO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBEYXRhIGxpbWl0c1xyXG5cdFx0YmVmb3JlRGF0YUxpbWl0czogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGhlbHBlcnMuY2FsbENhbGxiYWNrKHRoaXMub3B0aW9ucy5iZWZvcmVEYXRhTGltaXRzLCBbdGhpc10pO1xyXG5cdFx0fSxcclxuXHRcdGRldGVybWluZURhdGFMaW1pdHM6IGhlbHBlcnMubm9vcCxcclxuXHRcdGFmdGVyRGF0YUxpbWl0czogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGhlbHBlcnMuY2FsbENhbGxiYWNrKHRoaXMub3B0aW9ucy5hZnRlckRhdGFMaW1pdHMsIFt0aGlzXSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vXHJcblx0XHRiZWZvcmVCdWlsZFRpY2tzOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aGVscGVycy5jYWxsQ2FsbGJhY2sodGhpcy5vcHRpb25zLmJlZm9yZUJ1aWxkVGlja3MsIFt0aGlzXSk7XHJcblx0XHR9LFxyXG5cdFx0YnVpbGRUaWNrczogaGVscGVycy5ub29wLFxyXG5cdFx0YWZ0ZXJCdWlsZFRpY2tzOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aGVscGVycy5jYWxsQ2FsbGJhY2sodGhpcy5vcHRpb25zLmFmdGVyQnVpbGRUaWNrcywgW3RoaXNdKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0YmVmb3JlVGlja1RvTGFiZWxDb252ZXJzaW9uOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aGVscGVycy5jYWxsQ2FsbGJhY2sodGhpcy5vcHRpb25zLmJlZm9yZVRpY2tUb0xhYmVsQ29udmVyc2lvbiwgW3RoaXNdKTtcclxuXHRcdH0sXHJcblx0XHRjb252ZXJ0VGlja3NUb0xhYmVsczogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdC8vIENvbnZlcnQgdGlja3MgdG8gc3RyaW5nc1xyXG5cdFx0XHR2YXIgdGlja09wdHMgPSBtZS5vcHRpb25zLnRpY2tzO1xyXG5cdFx0XHRtZS50aWNrcyA9IG1lLnRpY2tzLm1hcCh0aWNrT3B0cy51c2VyQ2FsbGJhY2sgfHwgdGlja09wdHMuY2FsbGJhY2spO1xyXG5cdFx0fSxcclxuXHRcdGFmdGVyVGlja1RvTGFiZWxDb252ZXJzaW9uOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aGVscGVycy5jYWxsQ2FsbGJhY2sodGhpcy5vcHRpb25zLmFmdGVyVGlja1RvTGFiZWxDb252ZXJzaW9uLCBbdGhpc10pO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvL1xyXG5cclxuXHRcdGJlZm9yZUNhbGN1bGF0ZVRpY2tSb3RhdGlvbjogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGhlbHBlcnMuY2FsbENhbGxiYWNrKHRoaXMub3B0aW9ucy5iZWZvcmVDYWxjdWxhdGVUaWNrUm90YXRpb24sIFt0aGlzXSk7XHJcblx0XHR9LFxyXG5cdFx0Y2FsY3VsYXRlVGlja1JvdGF0aW9uOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIGNvbnRleHQgPSBtZS5jdHg7XHJcblx0XHRcdHZhciBnbG9iYWxEZWZhdWx0cyA9IENoYXJ0LmRlZmF1bHRzLmdsb2JhbDtcclxuXHRcdFx0dmFyIG9wdGlvblRpY2tzID0gbWUub3B0aW9ucy50aWNrcztcclxuXHJcblx0XHRcdC8vIEdldCB0aGUgd2lkdGggb2YgZWFjaCBncmlkIGJ5IGNhbGN1bGF0aW5nIHRoZSBkaWZmZXJlbmNlXHJcblx0XHRcdC8vIGJldHdlZW4geCBvZmZzZXRzIGJldHdlZW4gMCBhbmQgMS5cclxuXHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQob3B0aW9uVGlja3MuZm9udFNpemUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdHZhciB0aWNrRm9udFN0eWxlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChvcHRpb25UaWNrcy5mb250U3R5bGUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U3R5bGUpO1xyXG5cdFx0XHR2YXIgdGlja0ZvbnRGYW1pbHkgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KG9wdGlvblRpY2tzLmZvbnRGYW1pbHksIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250RmFtaWx5KTtcclxuXHRcdFx0dmFyIHRpY2tMYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodGlja0ZvbnRTaXplLCB0aWNrRm9udFN0eWxlLCB0aWNrRm9udEZhbWlseSk7XHJcblx0XHRcdGNvbnRleHQuZm9udCA9IHRpY2tMYWJlbEZvbnQ7XHJcblx0XHRcdGNvbnRleHQuc2V0Rm9udFNpemUodGlja0ZvbnRTaXplKTtcclxuXHRcdFx0dmFyIGZpcnN0V2lkdGggPSBjb250ZXh0Lm1lYXN1cmVUZXh0KG1lLnRpY2tzWzBdKS53aWR0aDtcclxuXHRcdFx0dmFyIGxhc3RXaWR0aCA9IGNvbnRleHQubWVhc3VyZVRleHQobWUudGlja3NbbWUudGlja3MubGVuZ3RoIC0gMV0pLndpZHRoO1xyXG5cdFx0XHR2YXIgZmlyc3RSb3RhdGVkO1xyXG5cclxuXHRcdFx0bWUubGFiZWxSb3RhdGlvbiA9IG9wdGlvblRpY2tzLm1pblJvdGF0aW9uIHx8IDA7XHJcblx0XHRcdG1lLnBhZGRpbmdSaWdodCA9IDA7XHJcblx0XHRcdG1lLnBhZGRpbmdMZWZ0ID0gMDtcclxuXHJcblx0XHRcdGlmIChtZS5vcHRpb25zLmRpc3BsYXkpIHtcclxuXHRcdFx0XHRpZiAobWUuaXNIb3Jpem9udGFsKCkpIHtcclxuXHRcdFx0XHRcdG1lLnBhZGRpbmdSaWdodCA9IGxhc3RXaWR0aCAvIDIgKyAzO1xyXG5cdFx0XHRcdFx0bWUucGFkZGluZ0xlZnQgPSBmaXJzdFdpZHRoIC8gMiArIDM7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCFtZS5sb25nZXN0VGV4dENhY2hlKSB7XHJcblx0XHRcdFx0XHRcdG1lLmxvbmdlc3RUZXh0Q2FjaGUgPSB7fTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHZhciBvcmlnaW5hbExhYmVsV2lkdGggPSBoZWxwZXJzLmxvbmdlc3RUZXh0KGNvbnRleHQsIHRpY2tMYWJlbEZvbnQsIG1lLnRpY2tzLCBtZS5sb25nZXN0VGV4dENhY2hlKTtcclxuXHRcdFx0XHRcdHZhciBsYWJlbFdpZHRoID0gb3JpZ2luYWxMYWJlbFdpZHRoO1xyXG5cdFx0XHRcdFx0dmFyIGNvc1JvdGF0aW9uO1xyXG5cdFx0XHRcdFx0dmFyIHNpblJvdGF0aW9uO1xyXG5cclxuXHRcdFx0XHRcdC8vIEFsbG93IDMgcGl4ZWxzIHgyIHBhZGRpbmcgZWl0aGVyIHNpZGUgZm9yIGxhYmVsIHJlYWRhYmlsaXR5XHJcblx0XHRcdFx0XHQvLyBvbmx5IHRoZSBpbmRleCBtYXR0ZXJzIGZvciBhIGRhdGFzZXQgc2NhbGUsIGJ1dCB3ZSB3YW50IGEgY29uc2lzdGVudCBpbnRlcmZhY2UgYmV0d2VlbiBzY2FsZXNcclxuXHRcdFx0XHRcdHZhciB0aWNrV2lkdGggPSBtZS5nZXRQaXhlbEZvclRpY2soMSkgLSBtZS5nZXRQaXhlbEZvclRpY2soMCkgLSA2O1xyXG5cclxuXHRcdFx0XHRcdC8vIE1heCBsYWJlbCByb3RhdGlvbiBjYW4gYmUgc2V0IG9yIGRlZmF1bHQgdG8gOTAgLSBhbHNvIGFjdCBhcyBhIGxvb3AgY291bnRlclxyXG5cdFx0XHRcdFx0d2hpbGUgKGxhYmVsV2lkdGggPiB0aWNrV2lkdGggJiYgbWUubGFiZWxSb3RhdGlvbiA8IG9wdGlvblRpY2tzLm1heFJvdGF0aW9uKSB7XHJcblx0XHRcdFx0XHRcdGNvc1JvdGF0aW9uID0gTWF0aC5jb3MoaGVscGVycy50b1JhZGlhbnMobWUubGFiZWxSb3RhdGlvbikpO1xyXG5cdFx0XHRcdFx0XHRzaW5Sb3RhdGlvbiA9IE1hdGguc2luKGhlbHBlcnMudG9SYWRpYW5zKG1lLmxhYmVsUm90YXRpb24pKTtcclxuXHJcblx0XHRcdFx0XHRcdGZpcnN0Um90YXRlZCA9IGNvc1JvdGF0aW9uICogZmlyc3RXaWR0aDtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFdlJ3JlIHJpZ2h0IGFsaWduaW5nIHRoZSB0ZXh0IG5vdy5cclxuXHRcdFx0XHRcdFx0aWYgKGZpcnN0Um90YXRlZCArIHRpY2tGb250U2l6ZSAvIDIgPiBtZS55TGFiZWxXaWR0aCkge1xyXG5cdFx0XHRcdFx0XHRcdG1lLnBhZGRpbmdMZWZ0ID0gZmlyc3RSb3RhdGVkICsgdGlja0ZvbnRTaXplIC8gMjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0bWUucGFkZGluZ1JpZ2h0ID0gdGlja0ZvbnRTaXplIC8gMjtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChzaW5Sb3RhdGlvbiAqIG9yaWdpbmFsTGFiZWxXaWR0aCA+IG1lLm1heEhlaWdodCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdvIGJhY2sgb25lIHN0ZXBcclxuXHRcdFx0XHRcdFx0XHRtZS5sYWJlbFJvdGF0aW9uLS07XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdG1lLmxhYmVsUm90YXRpb24rKztcclxuXHRcdFx0XHRcdFx0bGFiZWxXaWR0aCA9IGNvc1JvdGF0aW9uICogb3JpZ2luYWxMYWJlbFdpZHRoO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKG1lLm1hcmdpbnMpIHtcclxuXHRcdFx0XHRtZS5wYWRkaW5nTGVmdCA9IE1hdGgubWF4KG1lLnBhZGRpbmdMZWZ0IC0gbWUubWFyZ2lucy5sZWZ0LCAwKTtcclxuXHRcdFx0XHRtZS5wYWRkaW5nUmlnaHQgPSBNYXRoLm1heChtZS5wYWRkaW5nUmlnaHQgLSBtZS5tYXJnaW5zLnJpZ2h0LCAwKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGFmdGVyQ2FsY3VsYXRlVGlja1JvdGF0aW9uOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aGVscGVycy5jYWxsQ2FsbGJhY2sodGhpcy5vcHRpb25zLmFmdGVyQ2FsY3VsYXRlVGlja1JvdGF0aW9uLCBbdGhpc10pO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvL1xyXG5cclxuXHRcdGJlZm9yZUZpdDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGhlbHBlcnMuY2FsbENhbGxiYWNrKHRoaXMub3B0aW9ucy5iZWZvcmVGaXQsIFt0aGlzXSk7XHJcblx0XHR9LFxyXG5cdFx0Zml0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0Ly8gUmVzZXRcclxuXHRcdFx0dmFyIG1pblNpemUgPSBtZS5taW5TaXplID0ge1xyXG5cdFx0XHRcdHdpZHRoOiAwLFxyXG5cdFx0XHRcdGhlaWdodDogMFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIG9wdHMgPSBtZS5vcHRpb25zO1xyXG5cdFx0XHR2YXIgZ2xvYmFsRGVmYXVsdHMgPSBDaGFydC5kZWZhdWx0cy5nbG9iYWw7XHJcblx0XHRcdHZhciB0aWNrT3B0cyA9IG9wdHMudGlja3M7XHJcblx0XHRcdHZhciBzY2FsZUxhYmVsT3B0cyA9IG9wdHMuc2NhbGVMYWJlbDtcclxuXHRcdFx0dmFyIGdyaWRMaW5lT3B0cyA9IG9wdHMuZ3JpZExpbmVzO1xyXG5cdFx0XHR2YXIgZGlzcGxheSA9IG9wdHMuZGlzcGxheTtcclxuXHRcdFx0dmFyIGlzSG9yaXpvbnRhbCA9IG1lLmlzSG9yaXpvbnRhbCgpO1xyXG5cclxuXHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQodGlja09wdHMuZm9udFNpemUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdHZhciB0aWNrRm9udFN0eWxlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdCh0aWNrT3B0cy5mb250U3R5bGUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U3R5bGUpO1xyXG5cdFx0XHR2YXIgdGlja0ZvbnRGYW1pbHkgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KHRpY2tPcHRzLmZvbnRGYW1pbHksIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250RmFtaWx5KTtcclxuXHRcdFx0dmFyIHRpY2tMYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodGlja0ZvbnRTaXplLCB0aWNrRm9udFN0eWxlLCB0aWNrRm9udEZhbWlseSk7XHJcblxyXG5cdFx0XHR2YXIgc2NhbGVMYWJlbEZvbnRTaXplID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChzY2FsZUxhYmVsT3B0cy5mb250U2l6ZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTaXplKTtcclxuXHJcblx0XHRcdHZhciB0aWNrTWFya0xlbmd0aCA9IG9wdHMuZ3JpZExpbmVzLnRpY2tNYXJrTGVuZ3RoO1xyXG5cclxuXHRcdFx0Ly8gV2lkdGhcclxuXHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdC8vIHN1YnRyYWN0IHRoZSBtYXJnaW5zIHRvIGxpbmUgdXAgd2l0aCB0aGUgY2hhcnRBcmVhIGlmIHdlIGFyZSBhIGZ1bGwgd2lkdGggc2NhbGVcclxuXHRcdFx0XHRtaW5TaXplLndpZHRoID0gbWUuaXNGdWxsV2lkdGgoKSA/IG1lLm1heFdpZHRoIC0gbWUubWFyZ2lucy5sZWZ0IC0gbWUubWFyZ2lucy5yaWdodCA6IG1lLm1heFdpZHRoO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG1pblNpemUud2lkdGggPSBkaXNwbGF5ICYmIGdyaWRMaW5lT3B0cy5kcmF3VGlja3MgPyB0aWNrTWFya0xlbmd0aCA6IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGhlaWdodFxyXG5cdFx0XHRpZiAoaXNIb3Jpem9udGFsKSB7XHJcblx0XHRcdFx0bWluU2l6ZS5oZWlnaHQgPSBkaXNwbGF5ICYmIGdyaWRMaW5lT3B0cy5kcmF3VGlja3MgPyB0aWNrTWFya0xlbmd0aCA6IDA7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bWluU2l6ZS5oZWlnaHQgPSBtZS5tYXhIZWlnaHQ7IC8vIGZpbGwgYWxsIHRoZSBoZWlnaHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXJlIHdlIHNob3dpbmcgYSB0aXRsZSBmb3IgdGhlIHNjYWxlP1xyXG5cdFx0XHRpZiAoc2NhbGVMYWJlbE9wdHMuZGlzcGxheSAmJiBkaXNwbGF5KSB7XHJcblx0XHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdFx0bWluU2l6ZS5oZWlnaHQgKz0gKHNjYWxlTGFiZWxGb250U2l6ZSAqIDEuNSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdG1pblNpemUud2lkdGggKz0gKHNjYWxlTGFiZWxGb250U2l6ZSAqIDEuNSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGlja09wdHMuZGlzcGxheSAmJiBkaXNwbGF5KSB7XHJcblx0XHRcdFx0Ly8gRG9uJ3QgYm90aGVyIGZpdHRpbmcgdGhlIHRpY2tzIGlmIHdlIGFyZSBub3Qgc2hvd2luZyB0aGVtXHJcblx0XHRcdFx0aWYgKCFtZS5sb25nZXN0VGV4dENhY2hlKSB7XHJcblx0XHRcdFx0XHRtZS5sb25nZXN0VGV4dENhY2hlID0ge307XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgbGFyZ2VzdFRleHRXaWR0aCA9IGhlbHBlcnMubG9uZ2VzdFRleHQobWUuY3R4LCB0aWNrTGFiZWxGb250LCBtZS50aWNrcywgbWUubG9uZ2VzdFRleHRDYWNoZSk7XHJcblx0XHRcdFx0dmFyIHRhbGxlc3RMYWJlbEhlaWdodEluTGluZXMgPSBoZWxwZXJzLm51bWJlck9mTGFiZWxMaW5lcyhtZS50aWNrcyk7XHJcblx0XHRcdFx0dmFyIGxpbmVTcGFjZSA9IHRpY2tGb250U2l6ZSAqIDAuNTtcclxuXHJcblx0XHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdFx0Ly8gQSBob3Jpem9udGFsIGF4aXMgaXMgbW9yZSBjb25zdHJhaW5lZCBieSB0aGUgaGVpZ2h0LlxyXG5cdFx0XHRcdFx0bWUubG9uZ2VzdExhYmVsV2lkdGggPSBsYXJnZXN0VGV4dFdpZHRoO1xyXG5cclxuXHRcdFx0XHRcdC8vIFRPRE8gLSBpbXByb3ZlIHRoaXMgY2FsY3VsYXRpb25cclxuXHRcdFx0XHRcdHZhciBsYWJlbEhlaWdodCA9IChNYXRoLnNpbihoZWxwZXJzLnRvUmFkaWFucyhtZS5sYWJlbFJvdGF0aW9uKSkgKiBtZS5sb25nZXN0TGFiZWxXaWR0aCkgKyAodGlja0ZvbnRTaXplICogdGFsbGVzdExhYmVsSGVpZ2h0SW5MaW5lcykgKyAobGluZVNwYWNlICogdGFsbGVzdExhYmVsSGVpZ2h0SW5MaW5lcyk7XHJcblxyXG5cdFx0XHRcdFx0bWluU2l6ZS5oZWlnaHQgPSBNYXRoLm1pbihtZS5tYXhIZWlnaHQsIG1pblNpemUuaGVpZ2h0ICsgbGFiZWxIZWlnaHQpO1xyXG5cdFx0XHRcdFx0bWUuY3R4LmZvbnQgPSB0aWNrTGFiZWxGb250O1xyXG5cdFx0XHRcdFx0bWUuY3R4LnNldEZvbnRTaXplKHRpY2tGb250U2l6ZSk7XHJcblx0XHRcdFx0XHR2YXIgZmlyc3RMYWJlbFdpZHRoID0gbWUuY3R4Lm1lYXN1cmVUZXh0WHNjYWxlKG1lLnRpY2tzWzBdKS53aWR0aDsvL3RvZG8gIG1lYXN1cmVUZXh0WHNjYWxlXHJcblx0XHRcdFx0XHR2YXIgbGFzdExhYmVsV2lkdGggPSBtZS5jdHgubWVhc3VyZVRleHRYc2NhbGUobWUudGlja3NbbWUudGlja3MubGVuZ3RoIC0gMV0pLndpZHRoOy8vdG9kbyAgbWVhc3VyZVRleHRYc2NhbGVcclxuXHJcblx0XHRcdFx0XHQvLyBFbnN1cmUgdGhhdCBvdXIgdGlja3MgYXJlIGFsd2F5cyBpbnNpZGUgdGhlIGNhbnZhcy4gV2hlbiByb3RhdGVkLCB0aWNrcyBhcmUgcmlnaHQgYWxpZ25lZCB3aGljaCBtZWFucyB0aGF0IHRoZSByaWdodCBwYWRkaW5nIGlzIGRvbWluYXRlZFxyXG5cdFx0XHRcdFx0Ly8gYnkgdGhlIGZvbnQgaGVpZ2h0XHJcblx0XHRcdFx0XHR2YXIgY29zUm90YXRpb24gPSBNYXRoLmNvcyhoZWxwZXJzLnRvUmFkaWFucyhtZS5sYWJlbFJvdGF0aW9uKSk7XHJcblx0XHRcdFx0XHR2YXIgc2luUm90YXRpb24gPSBNYXRoLnNpbihoZWxwZXJzLnRvUmFkaWFucyhtZS5sYWJlbFJvdGF0aW9uKSk7XHJcblx0XHRcdFx0XHRtZS5sYWJlbFJvdGF0aW9uPTA7Ly90b2RvIOWGmeatu1xyXG5cdFx0XHRcdFx0bWUubGFiZWxSb3RhdGlvbj0wOy8vdG9kbyDlhpnmrbvkuI3ml4vovaxcclxuXHRcdFx0XHRcdG1lLnBhZGRpbmdMZWZ0ID0gbWUubGFiZWxSb3RhdGlvbiAhPT0gMCA/IChjb3NSb3RhdGlvbiAqIGZpcnN0TGFiZWxXaWR0aCkgKyAzIDogZmlyc3RMYWJlbFdpZHRoIC8gMiArIDM7IC8vIGFkZCAzIHB4IHRvIG1vdmUgYXdheSBmcm9tIGNhbnZhcyBlZGdlc1xyXG5cdFx0XHRcdFx0bWUucGFkZGluZ1JpZ2h0ID0gbWUubGFiZWxSb3RhdGlvbiAhPT0gMCA/IChzaW5Sb3RhdGlvbiAqICh0aWNrRm9udFNpemUgLyAyKSkgKyAzIDogbGFzdExhYmVsV2lkdGggLyAyICsgMzsgLy8gd2hlbiByb3RhdGVkXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIEEgdmVydGljYWwgYXhpcyBpcyBtb3JlIGNvbnN0cmFpbmVkIGJ5IHRoZSB3aWR0aC4gTGFiZWxzIGFyZSB0aGUgZG9taW5hbnQgZmFjdG9yIGhlcmUsIHNvIGdldCB0aGF0IGxlbmd0aCBmaXJzdFxyXG5cdFx0XHRcdFx0dmFyIG1heExhYmVsV2lkdGggPSBtZS5tYXhXaWR0aCAtIG1pblNpemUud2lkdGg7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWNjb3VudCBmb3IgcGFkZGluZ1xyXG5cdFx0XHRcdFx0dmFyIG1pcnJvciA9IHRpY2tPcHRzLm1pcnJvcjtcclxuXHRcdFx0XHRcdGlmICghbWlycm9yKSB7XHJcblx0XHRcdFx0XHRcdGxhcmdlc3RUZXh0V2lkdGggKz0gbWUub3B0aW9ucy50aWNrcy5wYWRkaW5nO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gSWYgbWlycm9yZWQgdGV4dCBpcyBvbiB0aGUgaW5zaWRlIHNvIGRvbid0IGV4cGFuZFxyXG5cdFx0XHRcdFx0XHRsYXJnZXN0VGV4dFdpZHRoID0gMDtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAobGFyZ2VzdFRleHRXaWR0aCA8IG1heExhYmVsV2lkdGgpIHtcclxuXHRcdFx0XHRcdFx0Ly8gV2UgZG9uJ3QgbmVlZCBhbGwgdGhlIHJvb21cclxuXHRcdFx0XHRcdFx0bWluU2l6ZS53aWR0aCArPSBsYXJnZXN0VGV4dFdpZHRoO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gRXhwYW5kIHRvIG1heCBzaXplXHJcblx0XHRcdFx0XHRcdG1pblNpemUud2lkdGggPSBtZS5tYXhXaWR0aDtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRtZS5wYWRkaW5nVG9wID0gdGlja0ZvbnRTaXplIC8gMjtcclxuXHRcdFx0XHRcdG1lLnBhZGRpbmdCb3R0b20gPSB0aWNrRm9udFNpemUgLyAyO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKG1lLm1hcmdpbnMpIHtcclxuXHRcdFx0XHRtZS5wYWRkaW5nTGVmdCA9IE1hdGgubWF4KG1lLnBhZGRpbmdMZWZ0IC0gbWUubWFyZ2lucy5sZWZ0LCAwKTtcclxuXHRcdFx0XHRtZS5wYWRkaW5nVG9wID0gTWF0aC5tYXgobWUucGFkZGluZ1RvcCAtIG1lLm1hcmdpbnMudG9wLCAwKTtcclxuXHRcdFx0XHRtZS5wYWRkaW5nUmlnaHQgPSBNYXRoLm1heChtZS5wYWRkaW5nUmlnaHQgLSBtZS5tYXJnaW5zLnJpZ2h0LCAwKTtcclxuXHRcdFx0XHRtZS5wYWRkaW5nQm90dG9tID0gTWF0aC5tYXgobWUucGFkZGluZ0JvdHRvbSAtIG1lLm1hcmdpbnMuYm90dG9tLCAwKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWUud2lkdGggPSBtaW5TaXplLndpZHRoO1xyXG5cdFx0XHRtZS5oZWlnaHQgPSBtaW5TaXplLmhlaWdodDtcclxuXHJcblx0XHR9LFxyXG5cdFx0YWZ0ZXJGaXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRoZWxwZXJzLmNhbGxDYWxsYmFjayh0aGlzLm9wdGlvbnMuYWZ0ZXJGaXQsIFt0aGlzXSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFNoYXJlZCBNZXRob2RzXHJcblx0XHRpc0hvcml6b250YWw6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5vcHRpb25zLnBvc2l0aW9uID09PSAndG9wJyB8fCB0aGlzLm9wdGlvbnMucG9zaXRpb24gPT09ICdib3R0b20nO1xyXG5cdFx0fSxcclxuXHRcdGlzRnVsbFdpZHRoOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuICh0aGlzLm9wdGlvbnMuZnVsbFdpZHRoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBjb3JyZWN0IHZhbHVlLiBOYU4gYmFkIGlucHV0cywgSWYgdGhlIHZhbHVlIHR5cGUgaXMgb2JqZWN0IGdldCB0aGUgeCBvciB5IGJhc2VkIG9uIHdoZXRoZXIgd2UgYXJlIGhvcml6b250YWwgb3Igbm90XHJcblx0XHRnZXRSaWdodFZhbHVlOiBmdW5jdGlvbihyYXdWYWx1ZSkge1xyXG5cdFx0XHQvLyBOdWxsIGFuZCB1bmRlZmluZWQgdmFsdWVzIGZpcnN0XHJcblx0XHRcdGlmIChyYXdWYWx1ZSA9PT0gbnVsbCB8fCB0eXBlb2YocmF3VmFsdWUpID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHJldHVybiBOYU47XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gaXNOYU4ob2JqZWN0KSByZXR1cm5zIHRydWUsIHNvIG1ha2Ugc3VyZSBOYU4gaXMgY2hlY2tpbmcgZm9yIGEgbnVtYmVyOyBEaXNjYXJkIEluZmluaXRlIHZhbHVlc1xyXG5cdFx0XHRpZiAodHlwZW9mKHJhd1ZhbHVlKSA9PT0gJ251bWJlcicgJiYgIWlzRmluaXRlKHJhd1ZhbHVlKSkge1xyXG5cdFx0XHRcdHJldHVybiBOYU47XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gSWYgaXQgaXMgaW4gZmFjdCBhbiBvYmplY3QsIGRpdmUgaW4gb25lIG1vcmUgbGV2ZWxcclxuXHRcdFx0aWYgKHR5cGVvZihyYXdWYWx1ZSkgPT09ICdvYmplY3QnKSB7XHJcblx0XHRcdFx0aWYgKChyYXdWYWx1ZSBpbnN0YW5jZW9mIERhdGUpIHx8IChyYXdWYWx1ZS5pc1ZhbGlkKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJhd1ZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRSaWdodFZhbHVlKHRoaXMuaXNIb3Jpem9udGFsKCkgPyByYXdWYWx1ZS54IDogcmF3VmFsdWUueSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFZhbHVlIGlzIGdvb2QsIHJldHVybiBpdFxyXG5cdFx0XHRyZXR1cm4gcmF3VmFsdWU7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFVzZWQgdG8gZ2V0IHRoZSB2YWx1ZSB0byBkaXNwbGF5IGluIHRoZSB0b29sdGlwIGZvciB0aGUgZGF0YSBhdCB0aGUgZ2l2ZW4gaW5kZXhcclxuXHRcdC8vIGZ1bmN0aW9uIGdldExhYmVsRm9ySW5kZXgoaW5kZXgsIGRhdGFzZXRJbmRleClcclxuXHRcdGdldExhYmVsRm9ySW5kZXg6IGhlbHBlcnMubm9vcCxcclxuXHJcblx0XHQvLyBVc2VkIHRvIGdldCBkYXRhIHZhbHVlIGxvY2F0aW9ucy4gIFZhbHVlIGNhbiBlaXRoZXIgYmUgYW4gaW5kZXggb3IgYSBudW1lcmljYWwgdmFsdWVcclxuXHRcdGdldFBpeGVsRm9yVmFsdWU6IGhlbHBlcnMubm9vcCxcclxuXHJcblx0XHQvLyBVc2VkIHRvIGdldCB0aGUgZGF0YSB2YWx1ZSBmcm9tIGEgZ2l2ZW4gcGl4ZWwuIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgZ2V0UGl4ZWxGb3JWYWx1ZVxyXG5cdFx0Z2V0VmFsdWVGb3JQaXhlbDogaGVscGVycy5ub29wLFxyXG5cclxuXHRcdC8vIFVzZWQgZm9yIHRpY2sgbG9jYXRpb24sIHNob3VsZFxyXG5cdFx0Z2V0UGl4ZWxGb3JUaWNrOiBmdW5jdGlvbihpbmRleCwgaW5jbHVkZU9mZnNldCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRpZiAobWUuaXNIb3Jpem9udGFsKCkpIHtcclxuXHRcdFx0XHR2YXIgaW5uZXJXaWR0aCA9IG1lLndpZHRoIC0gKG1lLnBhZGRpbmdMZWZ0ICsgbWUucGFkZGluZ1JpZ2h0KTtcclxuXHRcdFx0XHR2YXIgdGlja1dpZHRoID0gaW5uZXJXaWR0aCAvIE1hdGgubWF4KChtZS50aWNrcy5sZW5ndGggLSAoKG1lLm9wdGlvbnMuZ3JpZExpbmVzLm9mZnNldEdyaWRMaW5lcykgPyAwIDogMSkpLCAxKTtcclxuXHRcdFx0XHR2YXIgcGl4ZWwgPSAodGlja1dpZHRoICogaW5kZXgpICsgbWUucGFkZGluZ0xlZnQ7XHJcblxyXG5cdFx0XHRcdGlmIChpbmNsdWRlT2Zmc2V0KSB7XHJcblx0XHRcdFx0XHRwaXhlbCArPSB0aWNrV2lkdGggLyAyO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGZpbmFsVmFsID0gbWUubGVmdCArIE1hdGgucm91bmQocGl4ZWwpO1xyXG5cdFx0XHRcdGZpbmFsVmFsICs9IG1lLmlzRnVsbFdpZHRoKCkgPyBtZS5tYXJnaW5zLmxlZnQgOiAwO1xyXG5cdFx0XHRcdHJldHVybiBmaW5hbFZhbDtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgaW5uZXJIZWlnaHQgPSBtZS5oZWlnaHQgLSAobWUucGFkZGluZ1RvcCArIG1lLnBhZGRpbmdCb3R0b20pO1xyXG5cdFx0XHRyZXR1cm4gbWUudG9wICsgKGluZGV4ICogKGlubmVySGVpZ2h0IC8gKG1lLnRpY2tzLmxlbmd0aCAtIDEpKSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFV0aWxpdHkgZm9yIGdldHRpbmcgdGhlIHBpeGVsIGxvY2F0aW9uIG9mIGEgcGVyY2VudGFnZSBvZiBzY2FsZVxyXG5cdFx0Z2V0UGl4ZWxGb3JEZWNpbWFsOiBmdW5jdGlvbihkZWNpbWFsIC8qICwgaW5jbHVkZU9mZnNldCovKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdGlmIChtZS5pc0hvcml6b250YWwoKSkge1xyXG5cdFx0XHRcdHZhciBpbm5lcldpZHRoID0gbWUud2lkdGggLSAobWUucGFkZGluZ0xlZnQgKyBtZS5wYWRkaW5nUmlnaHQpO1xyXG5cdFx0XHRcdHZhciB2YWx1ZU9mZnNldCA9IChpbm5lcldpZHRoICogZGVjaW1hbCkgKyBtZS5wYWRkaW5nTGVmdDtcclxuXHJcblx0XHRcdFx0dmFyIGZpbmFsVmFsID0gbWUubGVmdCArIE1hdGgucm91bmQodmFsdWVPZmZzZXQpO1xyXG5cdFx0XHRcdGZpbmFsVmFsICs9IG1lLmlzRnVsbFdpZHRoKCkgPyBtZS5tYXJnaW5zLmxlZnQgOiAwO1xyXG5cdFx0XHRcdHJldHVybiBmaW5hbFZhbDtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbWUudG9wICsgKGRlY2ltYWwgKiBtZS5oZWlnaHQpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRCYXNlUGl4ZWw6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbWluID0gbWUubWluO1xyXG5cdFx0XHR2YXIgbWF4ID0gbWUubWF4O1xyXG5cclxuXHRcdFx0cmV0dXJuIG1lLmdldFBpeGVsRm9yVmFsdWUoXHJcblx0XHRcdFx0bWUuYmVnaW5BdFplcm8/IDA6XHJcblx0XHRcdFx0bWluIDwgMCAmJiBtYXggPCAwPyBtYXggOlxyXG5cdFx0XHRcdG1pbiA+IDAgJiYgbWF4ID4gMD8gbWluIDpcclxuXHRcdFx0XHQwKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gQWN0dWFsbHkgZHJhdyB0aGUgc2NhbGUgb24gdGhlIGNhbnZhc1xyXG5cdFx0Ly8gQHBhcmFtIHtyZWN0YW5nbGV9IGNoYXJ0QXJlYSA6IHRoZSBhcmVhIG9mIHRoZSBjaGFydCB0byBkcmF3IGZ1bGwgZ3JpZCBsaW5lcyBvblxyXG5cdFx0ZHJhdzogZnVuY3Rpb24oY2hhcnRBcmVhLGJveCkgey8vdG9kbyDkvKDlhaVib3jnlKjkuo7ljLrliIZ46L20eei9tFxyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgb3B0aW9ucyA9IG1lLm9wdGlvbnM7XHJcblx0XHRcdGlmICghb3B0aW9ucy5kaXNwbGF5KSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgY29udGV4dCA9IG1lLmN0eDtcclxuXHRcdFx0dmFyIGdsb2JhbERlZmF1bHRzID0gQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsO1xyXG5cdFx0XHR2YXIgb3B0aW9uVGlja3MgPSBvcHRpb25zLnRpY2tzO1xyXG5cdFx0XHR2YXIgZ3JpZExpbmVzID0gb3B0aW9ucy5ncmlkTGluZXM7XHJcblx0XHRcdHZhciBzY2FsZUxhYmVsID0gb3B0aW9ucy5zY2FsZUxhYmVsO1xyXG5cclxuXHRcdFx0dmFyIGlzUm90YXRlZCA9IG1lLmxhYmVsUm90YXRpb24gIT09IDA7XHJcblx0XHRcdHZhciBza2lwUmF0aW87XHJcblx0XHRcdHZhciB1c2VBdXRvc2tpcHBlciA9IG9wdGlvblRpY2tzLmF1dG9Ta2lwO1xyXG5cdFx0XHR2YXIgaXNIb3Jpem9udGFsID0gbWUuaXNIb3Jpem9udGFsKCk7XHJcblxyXG5cdFx0XHQvLyBmaWd1cmUgb3V0IHRoZSBtYXhpbXVtIG51bWJlciBvZiBncmlkbGluZXMgdG8gc2hvd1xyXG5cdFx0XHR2YXIgbWF4VGlja3M7XHJcblx0XHRcdGlmIChvcHRpb25UaWNrcy5tYXhUaWNrc0xpbWl0KSB7XHJcblx0XHRcdFx0bWF4VGlja3MgPSBvcHRpb25UaWNrcy5tYXhUaWNrc0xpbWl0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgdGlja0ZvbnRDb2xvciA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQob3B0aW9uVGlja3MuZm9udENvbG9yLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udENvbG9yKTtcclxuXHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQob3B0aW9uVGlja3MuZm9udFNpemUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdHZhciB0aWNrRm9udFN0eWxlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChvcHRpb25UaWNrcy5mb250U3R5bGUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U3R5bGUpO1xyXG5cdFx0XHR2YXIgdGlja0ZvbnRGYW1pbHkgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KG9wdGlvblRpY2tzLmZvbnRGYW1pbHksIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250RmFtaWx5KTtcclxuXHRcdFx0dmFyIHRpY2tMYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodGlja0ZvbnRTaXplLCB0aWNrRm9udFN0eWxlLCB0aWNrRm9udEZhbWlseSk7XHJcblx0XHRcdHZhciB0bCA9IGdyaWRMaW5lcy50aWNrTWFya0xlbmd0aDtcclxuXHRcdFx0dmFyIGJvcmRlckRhc2ggPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KGdyaWRMaW5lcy5ib3JkZXJEYXNoLCBnbG9iYWxEZWZhdWx0cy5ib3JkZXJEYXNoKTtcclxuXHRcdFx0dmFyIGJvcmRlckRhc2hPZmZzZXQgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KGdyaWRMaW5lcy5ib3JkZXJEYXNoT2Zmc2V0LCBnbG9iYWxEZWZhdWx0cy5ib3JkZXJEYXNoT2Zmc2V0KTtcclxuXHJcblx0XHRcdHZhciBzY2FsZUxhYmVsRm9udENvbG9yID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChzY2FsZUxhYmVsLmZvbnRDb2xvciwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRDb2xvcik7XHJcblx0XHRcdHZhciBzY2FsZUxhYmVsRm9udFNpemUgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KHNjYWxlTGFiZWwuZm9udFNpemUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdHZhciBzY2FsZUxhYmVsRm9udFN0eWxlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChzY2FsZUxhYmVsLmZvbnRTdHlsZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTdHlsZSk7XHJcblx0XHRcdHZhciBzY2FsZUxhYmVsRm9udEZhbWlseSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQoc2NhbGVMYWJlbC5mb250RmFtaWx5LCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udEZhbWlseSk7XHJcblx0XHRcdHZhciBzY2FsZUxhYmVsRm9udCA9IGhlbHBlcnMuZm9udFN0cmluZyhzY2FsZUxhYmVsRm9udFNpemUsIHNjYWxlTGFiZWxGb250U3R5bGUsIHNjYWxlTGFiZWxGb250RmFtaWx5KTtcclxuXHJcblx0XHRcdHZhciBsYWJlbFJvdGF0aW9uUmFkaWFucyA9IGhlbHBlcnMudG9SYWRpYW5zKG1lLmxhYmVsUm90YXRpb24pO1xyXG5cdFx0XHR2YXIgY29zUm90YXRpb24gPSBNYXRoLmNvcyhsYWJlbFJvdGF0aW9uUmFkaWFucyk7XHJcblx0XHRcdHZhciBsb25nZXN0Um90YXRlZExhYmVsID0gbWUubG9uZ2VzdExhYmVsV2lkdGggKiBjb3NSb3RhdGlvbjtcclxuXHJcblx0XHRcdC8vIE1ha2Ugc3VyZSB3ZSBkcmF3IHRleHQgaW4gdGhlIGNvcnJlY3QgY29sb3IgYW5kIGZvbnRcclxuXHRcdFx0Y29udGV4dC5zZXRGaWxsU3R5bGUodGlja0ZvbnRDb2xvcik7XHJcblxyXG5cdFx0XHR2YXIgaXRlbXNUb0RyYXcgPSBbXTtcclxuXHJcblx0XHRcdGlmIChpc0hvcml6b250YWwpIHtcclxuXHRcdFx0XHRza2lwUmF0aW8gPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0Ly8gT25seSBjYWxjdWxhdGUgdGhlIHNraXAgcmF0aW8gd2l0aCB0aGUgaGFsZiB3aWR0aCBvZiBsb25nZXN0Um90YXRlTGFiZWwgaWYgd2UgZ290IGFuIGFjdHVhbCByb3RhdGlvblxyXG5cdFx0XHRcdC8vIFNlZSAjMjU4NFxyXG5cdFx0XHRcdGlmIChpc1JvdGF0ZWQpIHtcclxuXHRcdFx0XHRcdGxvbmdlc3RSb3RhdGVkTGFiZWwgLz0gMjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICgobG9uZ2VzdFJvdGF0ZWRMYWJlbCArIG9wdGlvblRpY2tzLmF1dG9Ta2lwUGFkZGluZykgKiBtZS50aWNrcy5sZW5ndGggPiAobWUud2lkdGggLSAobWUucGFkZGluZ0xlZnQgKyBtZS5wYWRkaW5nUmlnaHQpKSkge1xyXG5cdFx0XHRcdFx0c2tpcFJhdGlvID0gMSArIE1hdGguZmxvb3IoKChsb25nZXN0Um90YXRlZExhYmVsICsgb3B0aW9uVGlja3MuYXV0b1NraXBQYWRkaW5nKSAqIG1lLnRpY2tzLmxlbmd0aCkgLyAobWUud2lkdGggLSAobWUucGFkZGluZ0xlZnQgKyBtZS5wYWRkaW5nUmlnaHQpKSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBpZiB0aGV5IGRlZmluZWQgYSBtYXggbnVtYmVyIG9mIG9wdGlvblRpY2tzLFxyXG5cdFx0XHRcdC8vIGluY3JlYXNlIHNraXBSYXRpbyB1bnRpbCB0aGF0IG51bWJlciBpcyBtZXRcclxuXHRcdFx0XHRpZiAobWF4VGlja3MgJiYgbWUudGlja3MubGVuZ3RoID4gbWF4VGlja3MpIHtcclxuXHRcdFx0XHRcdHdoaWxlICghc2tpcFJhdGlvIHx8IG1lLnRpY2tzLmxlbmd0aCAvIChza2lwUmF0aW8gfHwgMSkgPiBtYXhUaWNrcykge1xyXG5cdFx0XHRcdFx0XHRpZiAoIXNraXBSYXRpbykge1xyXG5cdFx0XHRcdFx0XHRcdHNraXBSYXRpbyA9IDE7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0c2tpcFJhdGlvICs9IDE7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoIXVzZUF1dG9za2lwcGVyKSB7XHJcblx0XHRcdFx0XHRza2lwUmF0aW8gPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblxyXG5cdFx0XHR2YXIgeFRpY2tTdGFydCA9IG9wdGlvbnMucG9zaXRpb24gPT09ICdyaWdodCcgPyBtZS5sZWZ0IDogbWUucmlnaHQgLSB0bDtcclxuXHRcdFx0dmFyIHhUaWNrRW5kID0gb3B0aW9ucy5wb3NpdGlvbiA9PT0gJ3JpZ2h0JyA/IG1lLmxlZnQgKyB0bCA6IG1lLnJpZ2h0O1xyXG5cdFx0XHR2YXIgeVRpY2tTdGFydCA9IG9wdGlvbnMucG9zaXRpb24gPT09ICdib3R0b20nID8gbWUudG9wIDogbWUuYm90dG9tIC0gdGw7XHJcblx0XHRcdHZhciB5VGlja0VuZCA9IG9wdGlvbnMucG9zaXRpb24gPT09ICdib3R0b20nID8gbWUudG9wICsgdGwgOiBtZS5ib3R0b207XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2gobWUudGlja3MsIGZ1bmN0aW9uKGxhYmVsLCBpbmRleCkge1xyXG5cdFx0XHRcdC8vIElmIHRoZSBjYWxsYmFjayByZXR1cm5lZCBhIG51bGwgb3IgdW5kZWZpbmVkIHZhbHVlLCBkbyBub3QgZHJhdyB0aGlzIGxpbmVcclxuXHRcdFx0XHRpZiAobGFiZWwgPT09IHVuZGVmaW5lZCB8fCBsYWJlbCA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGlzTGFzdFRpY2sgPSBtZS50aWNrcy5sZW5ndGggPT09IGluZGV4ICsgMTtcclxuXHJcblx0XHRcdFx0Ly8gU2luY2Ugd2UgYWx3YXlzIHNob3cgdGhlIGxhc3QgdGljayx3ZSBuZWVkIG1heSBuZWVkIHRvIGhpZGUgdGhlIGxhc3Qgc2hvd24gb25lIGJlZm9yZVxyXG5cdFx0XHRcdHZhciBzaG91bGRTa2lwID0gKHNraXBSYXRpbyA+IDEgJiYgaW5kZXggJSBza2lwUmF0aW8gPiAwKSB8fCAoaW5kZXggJSBza2lwUmF0aW8gPT09IDAgJiYgaW5kZXggKyBza2lwUmF0aW8gPj0gbWUudGlja3MubGVuZ3RoKTtcclxuXHRcdFx0XHRpZiAoc2hvdWxkU2tpcCAmJiAhaXNMYXN0VGljayB8fCAobGFiZWwgPT09IHVuZGVmaW5lZCB8fCBsYWJlbCA9PT0gbnVsbCkpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBsaW5lV2lkdGgsIGxpbmVDb2xvcjtcclxuXHRcdFx0XHRpZiAoaW5kZXggPT09ICh0eXBlb2YgbWUuemVyb0xpbmVJbmRleCAhPT0gJ3VuZGVmaW5lZCcgPyBtZS56ZXJvTGluZUluZGV4IDogMCkpIHtcclxuXHRcdFx0XHRcdC8vIERyYXcgdGhlIGZpcnN0IGluZGV4IHNwZWNpYWxseVxyXG5cdFx0XHRcdFx0bGluZVdpZHRoID0gZ3JpZExpbmVzLnplcm9MaW5lV2lkdGg7XHJcblx0XHRcdFx0XHRsaW5lQ29sb3IgPSBncmlkTGluZXMuemVyb0xpbmVDb2xvcjtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bGluZVdpZHRoID0gaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZ3JpZExpbmVzLmxpbmVXaWR0aCwgaW5kZXgpO1xyXG5cdFx0XHRcdFx0bGluZUNvbG9yID0gaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZ3JpZExpbmVzLmNvbG9yLCBpbmRleCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDb21tb24gcHJvcGVydGllc1xyXG5cdFx0XHRcdHZhciB0eDEsIHR5MSwgdHgyLCB0eTIsIHgxLCB5MSwgeDIsIHkyLCBsYWJlbFgsIGxhYmVsWTtcclxuXHRcdFx0XHR2YXIgdGV4dEFsaWduID0gJ21pZGRsZSc7XHJcblx0XHRcdFx0dmFyIHRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xyXG5cclxuXHRcdFx0XHRpZiAoaXNIb3Jpem9udGFsKSB7XHJcblx0XHRcdFx0XHRpZiAoIWlzUm90YXRlZCkge1xyXG5cdFx0XHRcdFx0XHR0ZXh0QmFzZWxpbmUgPSBvcHRpb25zLnBvc2l0aW9uID09PSAndG9wJyA/ICdib3R0b20nIDogJ3RvcCc7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dGV4dEFsaWduID0gaXNSb3RhdGVkID8gJ3JpZ2h0JyA6ICdjZW50ZXInO1xyXG5cclxuXHRcdFx0XHRcdHZhciB4TGluZVZhbHVlID0gbWUuZ2V0UGl4ZWxGb3JUaWNrKGluZGV4KSArIGhlbHBlcnMuYWxpYXNQaXhlbChsaW5lV2lkdGgpOyAvLyB4dmFsdWVzIGZvciBncmlkIGxpbmVzXHJcblx0XHRcdFx0XHRsYWJlbFggPSBtZS5nZXRQaXhlbEZvclRpY2soaW5kZXgsIGdyaWRMaW5lcy5vZmZzZXRHcmlkTGluZXMpICsgb3B0aW9uVGlja3MubGFiZWxPZmZzZXQ7IC8vIHggdmFsdWVzIGZvciBvcHRpb25UaWNrcyAobmVlZCB0byBjb25zaWRlciBvZmZzZXRMYWJlbCBvcHRpb24pXHJcblx0XHRcdFx0XHRsYWJlbFkgPSAoaXNSb3RhdGVkKSA/IG1lLnRvcCArIDEyIDogb3B0aW9ucy5wb3NpdGlvbiA9PT0gJ3RvcCcgPyBtZS5ib3R0b20gLSB0bCA6IG1lLnRvcCArIHRsO1xyXG5cclxuXHRcdFx0XHRcdHR4MSA9IHR4MiA9IHgxID0geDIgPSB4TGluZVZhbHVlO1xyXG5cdFx0XHRcdFx0dHkxID0geVRpY2tTdGFydDtcclxuXHRcdFx0XHRcdHR5MiA9IHlUaWNrRW5kO1xyXG5cdFx0XHRcdFx0eTEgPSBjaGFydEFyZWEudG9wO1xyXG5cdFx0XHRcdFx0eTIgPSBjaGFydEFyZWEuYm90dG9tO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5wb3NpdGlvbiA9PT0gJ2xlZnQnKSB7XHJcblx0XHRcdFx0XHRcdGlmIChvcHRpb25UaWNrcy5taXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0XHRsYWJlbFggPSBtZS5yaWdodCArIG9wdGlvblRpY2tzLnBhZGRpbmc7XHJcblx0XHRcdFx0XHRcdFx0dGV4dEFsaWduID0gJ2xlZnQnO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGxhYmVsWCA9IG1lLnJpZ2h0IC0gb3B0aW9uVGlja3MucGFkZGluZztcclxuXHRcdFx0XHRcdFx0XHR0ZXh0QWxpZ24gPSAncmlnaHQnO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQvLyByaWdodCBzaWRlXHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG9wdGlvblRpY2tzLm1pcnJvcikge1xyXG5cdFx0XHRcdFx0XHRsYWJlbFggPSBtZS5sZWZ0IC0gb3B0aW9uVGlja3MucGFkZGluZztcclxuXHRcdFx0XHRcdFx0dGV4dEFsaWduID0gJ3JpZ2h0JztcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGxhYmVsWCA9IG1lLmxlZnQgKyBvcHRpb25UaWNrcy5wYWRkaW5nO1xyXG5cdFx0XHRcdFx0XHR0ZXh0QWxpZ24gPSAnbGVmdCc7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dmFyIHlMaW5lVmFsdWUgPSBtZS5nZXRQaXhlbEZvclRpY2soaW5kZXgpOyAvLyB4dmFsdWVzIGZvciBncmlkIGxpbmVzXHJcblx0XHRcdFx0XHR5TGluZVZhbHVlICs9IGhlbHBlcnMuYWxpYXNQaXhlbChsaW5lV2lkdGgpO1xyXG5cdFx0XHRcdFx0bGFiZWxZID0gbWUuZ2V0UGl4ZWxGb3JUaWNrKGluZGV4LCBncmlkTGluZXMub2Zmc2V0R3JpZExpbmVzKTtcclxuXHJcblx0XHRcdFx0XHR0eDEgPSB4VGlja1N0YXJ0O1xyXG5cdFx0XHRcdFx0dHgyID0geFRpY2tFbmQ7XHJcblx0XHRcdFx0XHR4MSA9IGNoYXJ0QXJlYS5sZWZ0O1xyXG5cdFx0XHRcdFx0eDIgPSBjaGFydEFyZWEucmlnaHQ7XHJcblx0XHRcdFx0XHR0eTEgPSB0eTIgPSB5MSA9IHkyID0geUxpbmVWYWx1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGl0ZW1zVG9EcmF3LnB1c2goe1xyXG5cdFx0XHRcdFx0dHgxOiB0eDEsXHJcblx0XHRcdFx0XHR0eTE6IHR5MSxcclxuXHRcdFx0XHRcdHR4MjogdHgyLFxyXG5cdFx0XHRcdFx0dHkyOiB0eTIsXHJcblx0XHRcdFx0XHR4MTogeDEsXHJcblx0XHRcdFx0XHR5MTogeTEsXHJcblx0XHRcdFx0XHR4MjogeDIsXHJcblx0XHRcdFx0XHR5MjogeTIsXHJcblx0XHRcdFx0XHRsYWJlbFg6IGxhYmVsWCxcclxuXHRcdFx0XHRcdGxhYmVsWTogbGFiZWxZLFxyXG5cdFx0XHRcdFx0Z2xXaWR0aDogbGluZVdpZHRoLFxyXG5cdFx0XHRcdFx0Z2xDb2xvcjogbGluZUNvbG9yLFxyXG5cdFx0XHRcdFx0Z2xCb3JkZXJEYXNoOiBib3JkZXJEYXNoLFxyXG5cdFx0XHRcdFx0Z2xCb3JkZXJEYXNoT2Zmc2V0OiBib3JkZXJEYXNoT2Zmc2V0LFxyXG5cdFx0XHRcdFx0cm90YXRpb246IC0xICogbGFiZWxSb3RhdGlvblJhZGlhbnMsXHJcblx0XHRcdFx0XHRsYWJlbDogbGFiZWwsXHJcblx0XHRcdFx0XHR0ZXh0QmFzZWxpbmU6IHRleHRCYXNlbGluZSxcclxuXHRcdFx0XHRcdHRleHRBbGlnbjogdGV4dEFsaWduXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyBhbGwgb2YgdGhlIHRpY2sgbGFiZWxzLCB0aWNrIG1hcmtzLCBhbmQgZ3JpZCBsaW5lcyBhdCB0aGUgY29ycmVjdCBwbGFjZXNcclxuXHRcdFx0aGVscGVycy5lYWNoKGl0ZW1zVG9EcmF3LCBmdW5jdGlvbihpdGVtVG9EcmF3KSB7XHJcblx0XHRcdFx0aWYgKGdyaWRMaW5lcy5kaXNwbGF5KSB7XHJcblx0XHRcdFx0XHRjb250ZXh0LnNhdmUoKTtcclxuXHRcdFx0XHRcdGNvbnRleHQuc2V0TGluZVdpZHRoKGl0ZW1Ub0RyYXcuZ2xXaWR0aCk7XHJcblx0XHRcdFx0XHRjb250ZXh0LnNldFN0cm9rZVN0eWxlKGl0ZW1Ub0RyYXcuZ2xDb2xvcik7XHJcblx0XHRcdFx0XHRpZiAoY29udGV4dC5zZXRMaW5lRGFzaCkge1xyXG5cdFx0XHRcdFx0XHRjb250ZXh0LnNldExpbmVEYXNoKGl0ZW1Ub0RyYXcuZ2xCb3JkZXJEYXNoKTtcclxuXHRcdFx0XHRcdFx0Y29udGV4dC5saW5lRGFzaE9mZnNldCA9IGl0ZW1Ub0RyYXcuZ2xCb3JkZXJEYXNoT2Zmc2V0O1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGdyaWRMaW5lcy5kcmF3VGlja3MpIHtcclxuXHRcdFx0XHRcdFx0Y29udGV4dC5tb3ZlVG8oaXRlbVRvRHJhdy50eDEsIGl0ZW1Ub0RyYXcudHkxKTtcclxuXHRcdFx0XHRcdFx0Y29udGV4dC5saW5lVG8oaXRlbVRvRHJhdy50eDIsIGl0ZW1Ub0RyYXcudHkyKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAoZ3JpZExpbmVzLmRyYXdPbkNoYXJ0QXJlYSkge1xyXG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmVUbyhpdGVtVG9EcmF3LngxLCBpdGVtVG9EcmF3LnkxKTtcclxuXHRcdFx0XHRcdFx0Y29udGV4dC5saW5lVG8oaXRlbVRvRHJhdy54MiwgaXRlbVRvRHJhdy55Mik7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdFx0XHRcdGNvbnRleHQucmVzdG9yZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKG9wdGlvblRpY2tzLmRpc3BsYXkpIHtcclxuXHRcdFx0XHRcdGNvbnRleHQuc2F2ZSgpO1xyXG5cdFx0XHRcdFx0Y29udGV4dC50cmFuc2xhdGUoaXRlbVRvRHJhdy5sYWJlbFgsIGl0ZW1Ub0RyYXcubGFiZWxZKTtcclxuXHRcdFx0XHRcdGNvbnRleHQucm90YXRlKGl0ZW1Ub0RyYXcucm90YXRpb24pO1xyXG5cdFx0XHRcdFx0Y29udGV4dC5mb250ID0gdGlja0xhYmVsRm9udDtcclxuXHRcdFx0XHRcdGNvbnRleHQuc2V0Rm9udFNpemUodGlja0ZvbnRTaXplKTtcclxuXHRcdFx0XHRcdGNvbnRleHQudGV4dEJhc2VsaW5lID0gaXRlbVRvRHJhdy50ZXh0QmFzZWxpbmU7XHJcblx0XHRcdFx0XHRjb250ZXh0LnRleHRBbGlnbiA9IGl0ZW1Ub0RyYXcudGV4dEFsaWduO1xyXG5cclxuXHRcdFx0XHRcdHZhciBsYWJlbCA9IGl0ZW1Ub0RyYXcubGFiZWw7XHJcblx0XHRcdFx0XHRpZiAoaGVscGVycy5pc0FycmF5KGxhYmVsKSkge1xyXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMCwgeSA9IC0obGFiZWwubGVuZ3RoIC0gMSkqdGlja0ZvbnRTaXplKjAuNzU7IGkgPCBsYWJlbC5sZW5ndGg7ICsraSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFdlIGp1c3QgbWFrZSBzdXJlIHRoZSBtdWx0aWxpbmUgZWxlbWVudCBpcyBhIHN0cmluZyBoZXJlLi5cclxuXHRcdFx0XHRcdFx0XHRjb250ZXh0LmZpbGxUZXh0KCcnICsgbGFiZWxbaV0sIDAsIHkpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIGFwcGx5IHNhbWUgbGluZVNwYWNpbmcgYXMgY2FsY3VsYXRlZCBAIEwjMzIwXHJcblx0XHRcdFx0XHRcdFx0eSArPSAodGlja0ZvbnRTaXplICogMS41KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dmFyIGxhbGc9KGxhYmVsKycnKS5yZXBsYWNlKC9bXlxceDAwLVxceGZmXS9nLCBcIioqXCIpLmxlbmd0aFxyXG5cdFx0XHRcdFx0XHRpZihib3guaWQ9PSd5LWF4aXMtMCd8fGJveC5pZD09J3ktYXhpcy0xJyl7Ly/mlbDlgLzvvIzooajnpLrlt6bkvqd56L20XHJcblx0XHRcdFx0XHRcdFx0Y29udGV4dC5maWxsVGV4dChsYWJlbCwgLTEqKGxhbGcqNSs3KSwgNC40KTsvL3RvZG8g6K6pbGFiZWzlkJHlt6blgY/np7vkuIDngrnngrnvvIzkvJrlpb3nnIvngrlcclxuXHRcdFx0XHRcdFx0fWVsc2UgaWYoYm94LmlkPT0neS1heGlzLTInKXsvL+WPs+S+p3novbRcclxuXHRcdFx0XHRcdFx0XHRjb250ZXh0LmZpbGxUZXh0KGxhYmVsLCA1LCA0LjQpOy8vdG9kb1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGVsc2V7Ly946L20XHJcblx0XHRcdFx0XHRcdFx0Y29udGV4dC5maWxsVGV4dChsYWJlbCwgLTIuOSpsYWxnLCAxMCk7Ly90b2RvIOiuqWxhYmVs5ZCR5bem5YGP56e75LiA54K554K577yM5Lya5aW955yL54K5XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNvbnRleHQucmVzdG9yZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAoc2NhbGVMYWJlbC5kaXNwbGF5KSB7XHJcblx0XHRcdFx0Ly8gRHJhdyB0aGUgc2NhbGUgbGFiZWxcclxuXHRcdFx0XHR2YXIgc2NhbGVMYWJlbFg7XHJcblx0XHRcdFx0dmFyIHNjYWxlTGFiZWxZO1xyXG5cdFx0XHRcdHZhciByb3RhdGlvbiA9IDA7XHJcblxyXG5cdFx0XHRcdGlmIChpc0hvcml6b250YWwpIHtcclxuXHRcdFx0XHRcdHNjYWxlTGFiZWxYID0gbWUubGVmdCArICgobWUucmlnaHQgLSBtZS5sZWZ0KSAvIDIpOyAvLyBtaWRwb2ludCBvZiB0aGUgd2lkdGhcclxuXHRcdFx0XHRcdHNjYWxlTGFiZWxZID0gb3B0aW9ucy5wb3NpdGlvbiA9PT0gJ2JvdHRvbScgPyBtZS5ib3R0b20gLSAoc2NhbGVMYWJlbEZvbnRTaXplIC8gMikgOiBtZS50b3AgKyAoc2NhbGVMYWJlbEZvbnRTaXplIC8gMik7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHZhciBpc0xlZnQgPSBvcHRpb25zLnBvc2l0aW9uID09PSAnbGVmdCc7XHJcblx0XHRcdFx0XHRzY2FsZUxhYmVsWCA9IGlzTGVmdCA/IG1lLmxlZnQgKyAoc2NhbGVMYWJlbEZvbnRTaXplIC8gMikgOiBtZS5yaWdodCAtIChzY2FsZUxhYmVsRm9udFNpemUgLyAyKTtcclxuXHRcdFx0XHRcdHNjYWxlTGFiZWxZID0gbWUudG9wICsgKChtZS5ib3R0b20gLSBtZS50b3ApIC8gMik7XHJcblx0XHRcdFx0XHRyb3RhdGlvbiA9IGlzTGVmdCA/IC0wLjUgKiBNYXRoLlBJIDogMC41ICogTWF0aC5QSTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnRleHQuc2F2ZSgpO1xyXG5cdFx0XHRcdGNvbnRleHQudHJhbnNsYXRlKHNjYWxlTGFiZWxYLCBzY2FsZUxhYmVsWSk7XHJcblx0XHRcdFx0Y29udGV4dC5yb3RhdGUocm90YXRpb24pO1xyXG5cdFx0XHRcdGNvbnRleHQudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0Y29udGV4dC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJztcclxuXHRcdFx0XHRjb250ZXh0LnNldEZpbGxTdHlsZShzY2FsZUxhYmVsRm9udENvbG9yKTsgLy8gcmVuZGVyIGluIGNvcnJlY3QgY29sb3VyXHJcblx0XHRcdFx0Y29udGV4dC5mb250ID0gc2NhbGVMYWJlbEZvbnQ7XHJcblx0XHRcdFx0Y29udGV4dC5zZXRGb250U2l6ZShzY2FsZUxhYmVsRm9udFNpemUpO1xyXG5cdFx0XHRcdGNvbnRleHQuZmlsbFRleHQoc2NhbGVMYWJlbC5sYWJlbFN0cmluZywgMCwgMCk7XHJcblx0XHRcdFx0Y29udGV4dC5yZXN0b3JlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChncmlkTGluZXMuZHJhd0JvcmRlcikge1xyXG5cdFx0XHRcdC8vIERyYXcgdGhlIGxpbmUgYXQgdGhlIGVkZ2Ugb2YgdGhlIGF4aXNcclxuXHRcdFx0XHR2YXIgbGluZVdpZHRoID0gaGVscGVycy5nZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQoZ3JpZExpbmVzLmxpbmVXaWR0aCwgMCk7XHJcblx0XHRcdFx0Y29udGV4dC5zZXRMaW5lV2lkdGgobGluZVdpZHRoKTtcclxuXHRcdFx0XHRjb250ZXh0LnNldFN0cm9rZVN0eWxlKGhlbHBlcnMuZ2V0VmFsdWVBdEluZGV4T3JEZWZhdWx0KGdyaWRMaW5lcy5jb2xvciwgMCkpO1xyXG5cdFx0XHRcdHZhciB4MSA9IG1lLmxlZnQsXHJcblx0XHRcdFx0XHR4MiA9IG1lLnJpZ2h0LFxyXG5cdFx0XHRcdFx0eTEgPSBtZS50b3AsXHJcblx0XHRcdFx0XHR5MiA9IG1lLmJvdHRvbTtcclxuXHJcblx0XHRcdFx0dmFyIGFsaWFzUGl4ZWwgPSBoZWxwZXJzLmFsaWFzUGl4ZWwobGluZVdpZHRoKTtcclxuXHRcdFx0XHRpZiAoaXNIb3Jpem9udGFsKSB7XHJcblx0XHRcdFx0XHR5MSA9IHkyID0gb3B0aW9ucy5wb3NpdGlvbiA9PT0gJ3RvcCcgPyBtZS5ib3R0b20gOiBtZS50b3A7XHJcblx0XHRcdFx0XHR5MSArPSBhbGlhc1BpeGVsO1xyXG5cdFx0XHRcdFx0eTIgKz0gYWxpYXNQaXhlbDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0eDEgPSB4MiA9IG9wdGlvbnMucG9zaXRpb24gPT09ICdsZWZ0JyA/IG1lLnJpZ2h0IDogbWUubGVmdDtcclxuXHRcdFx0XHRcdHgxICs9IGFsaWFzUGl4ZWw7XHJcblx0XHRcdFx0XHR4MiArPSBhbGlhc1BpeGVsO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYoaXNIb3Jpem9udGFsJiYhZ3JpZExpbmVzLmhpZGVYKXtcclxuXHRcdFx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdFx0XHRjb250ZXh0Lm1vdmVUbyh4MSwgeTEpO1xyXG5cdFx0XHRcdFx0Y29udGV4dC5saW5lVG8oeDIsIHkyKTtcclxuXHRcdFx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmKCFpc0hvcml6b250YWwmJiFncmlkTGluZXMuaGlkZVkpe1xyXG5cdFx0XHRcdFx0Y29udGV4dC5iZWdpblBhdGgoKTtcclxuXHRcdFx0XHRcdGNvbnRleHQubW92ZVRvKHgxLCB5MSk7XHJcblx0XHRcdFx0XHRjb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xyXG5cdFx0XHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9KTtcclxufTtcclxuIl19
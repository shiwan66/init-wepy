'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	/**
 	 * Helper method to merge the opacity into a color
 	 */
	function mergeOpacity(colorString, opacity) {
		var color = helpers.color(colorString);
		return color.alpha(opacity * color.alpha()).rgbaString();
	}

	Chart.defaults.global.tooltips = {
		enabled: true,
		custom: null,
		mode: 'nearest',
		position: 'average',
		intersect: true,
		backgroundColor: 'rgba(0,0,0,0.8)',
		titleFontStyle: 'bold',
		titleSpacing: 2,
		titleMarginBottom: 6,
		titleFontColor: '#ffffff',
		titleAlign: 'left',
		bodySpacing: 2,
		bodyFontColor: '#ffffff',
		bodyAlign: 'left',
		footerFontStyle: 'bold',
		footerSpacing: 2,
		footerMarginTop: 6,
		footerFontColor: '#ffffff',
		footerAlign: 'left',
		yPadding: 6,
		xPadding: 6,
		caretSize: 5,
		cornerRadius: 6,
		multiKeyBackground: '#ffffff',
		displayColors: true,
		callbacks: {
			// Args are: (tooltipItems, data)
			beforeTitle: helpers.noop,
			title: function title(tooltipItems, data) {
				// Pick first xLabel for now
				var title = '';
				var labels = data.labels;
				var labelCount = labels ? labels.length : 0;

				if (tooltipItems.length > 0) {
					var item = tooltipItems[0];

					if (item.xLabel) {
						title = item.xLabel;
					} else if (labelCount > 0 && item.index < labelCount) {
						title = labels[item.index];
					}
				}

				return title;
			},
			afterTitle: helpers.noop,

			// Args are: (tooltipItems, data)
			beforeBody: helpers.noop,

			// Args are: (tooltipItem, data)
			beforeLabel: helpers.noop,
			label: function label(tooltipItem, data) {
				var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
				return datasetLabel + ': ' + tooltipItem.yLabel;
			},
			labelColor: function labelColor(tooltipItem, chartInstance) {
				var meta = chartInstance.getDatasetMeta(tooltipItem.datasetIndex);
				var activeElement = meta.data[tooltipItem.index];
				var view = activeElement._view;
				return {
					borderColor: view.borderColor,
					backgroundColor: view.backgroundColor
				};
			},
			afterLabel: helpers.noop,

			// Args are: (tooltipItems, data)
			afterBody: helpers.noop,

			// Args are: (tooltipItems, data)
			beforeFooter: helpers.noop,
			footer: helpers.noop,
			afterFooter: helpers.noop
		}
	};

	// Helper to push or concat based on if the 2nd parameter is an array or not
	function pushOrConcat(base, toPush) {
		if (toPush) {
			if (helpers.isArray(toPush)) {
				// base = base.concat(toPush);
				Array.prototype.push.apply(base, toPush);
			} else {
				base.push(toPush);
			}
		}

		return base;
	}

	// Private helper to create a tooltip item model
	// @param element : the chart element (point, arc, bar) to create the tooltip item for
	// @return : new tooltip item
	function createTooltipItem(element) {
		var xScale = element._xScale;
		var yScale = element._yScale || element._scale; // handle radar || polarArea charts
		var index = element._index,
		    datasetIndex = element._datasetIndex;

		return {
			xLabel: xScale ? xScale.getLabelForIndex(index, datasetIndex) : '',
			yLabel: yScale ? yScale.getLabelForIndex(index, datasetIndex) : '',
			index: index,
			datasetIndex: datasetIndex,
			x: element._model.x,
			y: element._model.y
		};
	}

	/**
  * Helper to get the reset model for the tooltip
  * @param tooltipOpts {Object} the tooltip options
  */
	function getBaseModel(tooltipOpts) {
		var globalDefaults = Chart.defaults.global;
		var getValueOrDefault = helpers.getValueOrDefault;

		return {
			// Positioning
			xPadding: tooltipOpts.xPadding,
			yPadding: tooltipOpts.yPadding,
			xAlign: tooltipOpts.xAlign,
			yAlign: tooltipOpts.yAlign,

			// Body
			bodyFontColor: tooltipOpts.bodyFontColor,
			_bodyFontFamily: getValueOrDefault(tooltipOpts.bodyFontFamily, globalDefaults.defaultFontFamily),
			_bodyFontStyle: getValueOrDefault(tooltipOpts.bodyFontStyle, globalDefaults.defaultFontStyle),
			_bodyAlign: tooltipOpts.bodyAlign,
			bodyFontSize: getValueOrDefault(tooltipOpts.bodyFontSize, globalDefaults.defaultFontSize),
			bodySpacing: tooltipOpts.bodySpacing,

			// Title
			titleFontColor: tooltipOpts.titleFontColor,
			_titleFontFamily: getValueOrDefault(tooltipOpts.titleFontFamily, globalDefaults.defaultFontFamily),
			_titleFontStyle: getValueOrDefault(tooltipOpts.titleFontStyle, globalDefaults.defaultFontStyle),
			titleFontSize: getValueOrDefault(tooltipOpts.titleFontSize, globalDefaults.defaultFontSize),
			_titleAlign: tooltipOpts.titleAlign,
			titleSpacing: tooltipOpts.titleSpacing,
			titleMarginBottom: tooltipOpts.titleMarginBottom,

			// Footer
			footerFontColor: tooltipOpts.footerFontColor,
			_footerFontFamily: getValueOrDefault(tooltipOpts.footerFontFamily, globalDefaults.defaultFontFamily),
			_footerFontStyle: getValueOrDefault(tooltipOpts.footerFontStyle, globalDefaults.defaultFontStyle),
			footerFontSize: getValueOrDefault(tooltipOpts.footerFontSize, globalDefaults.defaultFontSize),
			_footerAlign: tooltipOpts.footerAlign,
			footerSpacing: tooltipOpts.footerSpacing,
			footerMarginTop: tooltipOpts.footerMarginTop,

			// Appearance
			caretSize: tooltipOpts.caretSize,
			cornerRadius: tooltipOpts.cornerRadius,
			backgroundColor: tooltipOpts.backgroundColor,
			opacity: 0,
			legendColorBackground: tooltipOpts.multiKeyBackground,
			displayColors: tooltipOpts.displayColors
		};
	}

	/**
  * Get the size of the tooltip
  */
	function getTooltipSize(tooltip, model) {
		var ctx = tooltip._chart.ctx;

		var height = model.yPadding * 2; // Tooltip Padding
		var width = 0;

		// Count of all lines in the body
		var body = model.body;
		var combinedBodyLength = body.reduce(function (count, bodyItem) {
			return count + bodyItem.before.length + bodyItem.lines.length + bodyItem.after.length;
		}, 0);
		combinedBodyLength += model.beforeBody.length + model.afterBody.length;

		var titleLineCount = model.title.length;
		var footerLineCount = model.footer.length;
		var titleFontSize = model.titleFontSize,
		    bodyFontSize = model.bodyFontSize,
		    footerFontSize = model.footerFontSize;

		height += titleLineCount * titleFontSize; // Title Lines
		height += titleLineCount ? (titleLineCount - 1) * model.titleSpacing : 0; // Title Line Spacing
		height += titleLineCount ? model.titleMarginBottom : 0; // Title's bottom Margin
		height += combinedBodyLength * bodyFontSize; // Body Lines
		height += combinedBodyLength ? (combinedBodyLength - 1) * model.bodySpacing : 0; // Body Line Spacing
		height += footerLineCount ? model.footerMarginTop : 0; // Footer Margin
		height += footerLineCount * footerFontSize; // Footer Lines
		height += footerLineCount ? (footerLineCount - 1) * model.footerSpacing : 0; // Footer Line Spacing

		// Title width
		var widthPadding = 0;
		var maxLineWidth = function maxLineWidth(line) {
			width = Math.max(width, ctx.measureTextToolTip(line).width + widthPadding);
		};

		ctx.font = helpers.fontString(titleFontSize, model._titleFontStyle, model._titleFontFamily);
		ctx.setFontSize(titleFontSize);
		helpers.each(model.title, maxLineWidth);

		// Body width
		ctx.font = helpers.fontString(bodyFontSize, model._bodyFontStyle, model._bodyFontFamily);
		ctx.setFontSize(bodyFontSize);
		helpers.each(model.beforeBody.concat(model.afterBody), maxLineWidth);

		// Body lines may include some extra width due to the color box
		widthPadding = model.displayColors ? bodyFontSize + 2 : 0;
		helpers.each(body, function (bodyItem) {
			helpers.each(bodyItem.before, maxLineWidth);
			helpers.each(bodyItem.lines, maxLineWidth);
			helpers.each(bodyItem.after, maxLineWidth);
		});

		// Reset back to 0
		widthPadding = 0;

		// Footer width
		ctx.font = helpers.fontString(footerFontSize, model._footerFontStyle, model._footerFontFamily);
		ctx.setFontSize(footerFontSize);
		helpers.each(model.footer, maxLineWidth);

		// Add padding
		width += 2 * model.xPadding;

		return {
			width: width,
			height: height
		};
	}

	/**
  * Helper to get the alignment of a tooltip given the size
  */
	function determineAlignment(tooltip, size) {
		var model = tooltip._model;
		var chart = tooltip._chart;
		var chartArea = tooltip._chartInstance.chartArea;
		var xAlign = 'center';
		var yAlign = 'center';

		if (model.y < size.height) {
			yAlign = 'top';
		} else if (model.y > chart.height - size.height) {
			yAlign = 'bottom';
		}

		var lf, rf; // functions to determine left, right alignment
		var olf, orf; // functions to determine if left/right alignment causes tooltip to go outside chart
		var yf; // function to get the y alignment if the tooltip goes outside of the left or right edges
		var midX = (chartArea.left + chartArea.right) / 2;
		var midY = (chartArea.top + chartArea.bottom) / 2;

		if (yAlign === 'center') {
			lf = function lf(x) {
				return x <= midX;
			};
			rf = function rf(x) {
				return x > midX;
			};
		} else {
			lf = function lf(x) {
				return x <= size.width / 2;
			};
			rf = function rf(x) {
				return x >= chart.width - size.width / 2;
			};
		}

		olf = function olf(x) {
			return x + size.width > chart.width;
		};
		orf = function orf(x) {
			return x - size.width < 0;
		};
		yf = function yf(y) {
			return y <= midY ? 'top' : 'bottom';
		};

		if (lf(model.x)) {
			xAlign = 'left';

			// Is tooltip too wide and goes over the right side of the chart.?
			if (olf(model.x)) {
				xAlign = 'center';
				yAlign = yf(model.y);
			}
		} else if (rf(model.x)) {
			xAlign = 'right';

			// Is tooltip too wide and goes outside left edge of canvas?
			if (orf(model.x)) {
				xAlign = 'center';
				yAlign = yf(model.y);
			}
		}

		var opts = tooltip._options;
		return {
			xAlign: opts.xAlign ? opts.xAlign : xAlign,
			yAlign: opts.yAlign ? opts.yAlign : yAlign
		};
	}

	/**
  * @Helper to get the location a tooltip needs to be placed at given the initial position (via the vm) and the size and alignment
  */
	function getBackgroundPoint(vm, size, alignment) {
		// Background Position
		var x = vm.x;
		var y = vm.y;

		var caretSize = vm.caretSize,
		    caretPadding = vm.caretPadding,
		    cornerRadius = vm.cornerRadius,
		    xAlign = alignment.xAlign,
		    yAlign = alignment.yAlign,
		    paddingAndSize = caretSize + caretPadding,
		    radiusAndPadding = cornerRadius + caretPadding;

		if (xAlign === 'right') {
			x -= size.width;
		} else if (xAlign === 'center') {
			x -= size.width / 2;
		}

		if (yAlign === 'top') {
			y += paddingAndSize;
		} else if (yAlign === 'bottom') {
			y -= size.height + paddingAndSize;
		} else {
			y -= size.height / 2;
		}

		if (yAlign === 'center') {
			if (xAlign === 'left') {
				x += paddingAndSize;
			} else if (xAlign === 'right') {
				x -= paddingAndSize;
			}
		} else if (xAlign === 'left') {
			x -= radiusAndPadding;
		} else if (xAlign === 'right') {
			x += radiusAndPadding;
		}

		return {
			x: x,
			y: y
		};
	}

	Chart.Tooltip = Chart.Element.extend({
		initialize: function initialize() {
			this._model = getBaseModel(this._options);
		},

		// Get the title
		// Args are: (tooltipItem, data)
		getTitle: function getTitle() {
			var me = this;
			var opts = me._options;
			var callbacks = opts.callbacks;

			var beforeTitle = callbacks.beforeTitle.apply(me, arguments),
			    title = callbacks.title.apply(me, arguments),
			    afterTitle = callbacks.afterTitle.apply(me, arguments);

			var lines = [];
			lines = pushOrConcat(lines, beforeTitle);
			lines = pushOrConcat(lines, title);
			lines = pushOrConcat(lines, afterTitle);

			return lines;
		},

		// Args are: (tooltipItem, data)
		getBeforeBody: function getBeforeBody() {
			var lines = this._options.callbacks.beforeBody.apply(this, arguments);
			return helpers.isArray(lines) ? lines : lines !== undefined ? [lines] : [];
		},

		// Args are: (tooltipItem, data)
		getBody: function getBody(tooltipItems, data) {
			var me = this;
			var callbacks = me._options.callbacks;
			var bodyItems = [];

			helpers.each(tooltipItems, function (tooltipItem) {
				var bodyItem = {
					before: [],
					lines: [],
					after: []
				};
				pushOrConcat(bodyItem.before, callbacks.beforeLabel.call(me, tooltipItem, data));
				pushOrConcat(bodyItem.lines, callbacks.label.call(me, tooltipItem, data));
				pushOrConcat(bodyItem.after, callbacks.afterLabel.call(me, tooltipItem, data));

				bodyItems.push(bodyItem);
			});

			return bodyItems;
		},

		// Args are: (tooltipItem, data)
		getAfterBody: function getAfterBody() {
			var lines = this._options.callbacks.afterBody.apply(this, arguments);
			return helpers.isArray(lines) ? lines : lines !== undefined ? [lines] : [];
		},

		// Get the footer and beforeFooter and afterFooter lines
		// Args are: (tooltipItem, data)
		getFooter: function getFooter() {
			var me = this;
			var callbacks = me._options.callbacks;

			var beforeFooter = callbacks.beforeFooter.apply(me, arguments);
			var footer = callbacks.footer.apply(me, arguments);
			var afterFooter = callbacks.afterFooter.apply(me, arguments);

			var lines = [];
			lines = pushOrConcat(lines, beforeFooter);
			lines = pushOrConcat(lines, footer);
			lines = pushOrConcat(lines, afterFooter);

			return lines;
		},

		update: function update(changed) {
			var me = this;
			var opts = me._options;

			// Need to regenerate the model because its faster than using extend and it is necessary due to the optimization in Chart.Element.transition
			// that does _view = _model if ease === 1. This causes the 2nd tooltip update to set properties in both the view and model at the same time
			// which breaks any animations.
			var existingModel = me._model;
			var model = me._model = getBaseModel(opts);
			var active = me._active;

			var data = me._data;
			var chartInstance = me._chartInstance;

			// In the case where active.length === 0 we need to keep these at existing values for good animations
			var alignment = {
				xAlign: existingModel.xAlign,
				yAlign: existingModel.yAlign
			};
			var backgroundPoint = {
				x: existingModel.x,
				y: existingModel.y
			};
			var tooltipSize = {
				width: existingModel.width,
				height: existingModel.height
			};
			var tooltipPosition = {
				x: existingModel.caretX,
				y: existingModel.caretY
			};

			var i, len;

			if (active.length) {
				model.opacity = 1;

				var labelColors = [];
				tooltipPosition = Chart.Tooltip.positioners[opts.position](active, me._eventPosition);

				var tooltipItems = [];
				for (i = 0, len = active.length; i < len; ++i) {
					tooltipItems.push(createTooltipItem(active[i]));
				}

				// If the user provided a filter function, use it to modify the tooltip items
				if (opts.filter) {
					tooltipItems = tooltipItems.filter(function (a) {
						return opts.filter(a, data);
					});
				}

				// If the user provided a sorting function, use it to modify the tooltip items
				if (opts.itemSort) {
					tooltipItems = tooltipItems.sort(function (a, b) {
						return opts.itemSort(a, b, data);
					});
				}

				// Determine colors for boxes
				helpers.each(tooltipItems, function (tooltipItem) {
					labelColors.push(opts.callbacks.labelColor.call(me, tooltipItem, chartInstance));
				});

				// Build the Text Lines
				model.title = me.getTitle(tooltipItems, data);
				model.beforeBody = me.getBeforeBody(tooltipItems, data);
				model.body = me.getBody(tooltipItems, data);
				model.afterBody = me.getAfterBody(tooltipItems, data);
				model.footer = me.getFooter(tooltipItems, data);

				// Initial positioning and colors
				model.x = Math.round(tooltipPosition.x);
				model.y = Math.round(tooltipPosition.y);
				model.caretPadding = helpers.getValueOrDefault(tooltipPosition.padding, 2);
				model.labelColors = labelColors;

				// data points
				model.dataPoints = tooltipItems;

				// We need to determine alignment of the tooltip
				tooltipSize = getTooltipSize(this, model);
				alignment = determineAlignment(this, tooltipSize);
				// Final Size and Position
				backgroundPoint = getBackgroundPoint(model, tooltipSize, alignment);
			} else {
				model.opacity = 0;
			}

			model.xAlign = alignment.xAlign;
			model.yAlign = alignment.yAlign;
			model.x = backgroundPoint.x;
			model.y = backgroundPoint.y;
			model.width = tooltipSize.width;
			model.height = tooltipSize.height;

			// Point where the caret on the tooltip points to
			model.caretX = tooltipPosition.x;
			model.caretY = tooltipPosition.y;

			me._model = model;

			if (changed && opts.custom) {
				opts.custom.call(me, model);
			}

			return me;
		},
		drawCaret: function drawCaret(tooltipPoint, size, opacity) {
			var vm = this._view;
			var ctx = this._chart.ctx;
			var x1, x2, x3;
			var y1, y2, y3;
			var caretSize = vm.caretSize;
			var cornerRadius = vm.cornerRadius;
			var xAlign = vm.xAlign,
			    yAlign = vm.yAlign;
			var ptX = tooltipPoint.x,
			    ptY = tooltipPoint.y;
			var width = size.width,
			    height = size.height;

			if (yAlign === 'center') {
				// Left or right side
				if (xAlign === 'left') {
					x1 = ptX;
					x2 = x1 - caretSize;
					x3 = x1;
				} else {
					x1 = ptX + width;
					x2 = x1 + caretSize;
					x3 = x1;
				}

				y2 = ptY + height / 2;
				y1 = y2 - caretSize;
				y3 = y2 + caretSize;
			} else {
				if (xAlign === 'left') {
					x1 = ptX + cornerRadius;
					x2 = x1 + caretSize;
					x3 = x2 + caretSize;
				} else if (xAlign === 'right') {
					x1 = ptX + width - cornerRadius;
					x2 = x1 - caretSize;
					x3 = x2 - caretSize;
				} else {
					x2 = ptX + width / 2;
					x1 = x2 - caretSize;
					x3 = x2 + caretSize;
				}

				if (yAlign === 'top') {
					y1 = ptY;
					y2 = y1 - caretSize;
					y3 = y1;
				} else {
					y1 = ptY + height;
					y2 = y1 + caretSize;
					y3 = y1;
				}
			}

			ctx.setFillStyle(mergeOpacity(vm.backgroundColor, opacity));
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x3, y3);
			ctx.closePath();
			ctx.fill();
		},
		drawTitle: function drawTitle(pt, vm, ctx, opacity) {
			var title = vm.title;

			if (title.length) {
				ctx.textAlign = vm._titleAlign;
				ctx.textBaseline = 'top';

				var titleFontSize = vm.titleFontSize,
				    titleSpacing = vm.titleSpacing;

				ctx.setFillStyle(mergeOpacity(vm.titleFontColor, opacity));
				ctx.font = helpers.fontString(titleFontSize, vm._titleFontStyle, vm._titleFontFamily);
				ctx.setFontSize(titleFontSize);

				var i, len;
				var offsetY = 8;
				if (!vm.displayColors) {
					offsetY = 13;
				}
				for (i = 0, len = title.length; i < len; ++i) {
					ctx.fillText(title[i], pt.x, pt.y + offsetY); //todo +4 title往下移动一点点
					pt.y += titleFontSize + titleSpacing; // Line Height and spacing

					if (i + 1 === title.length) {
						pt.y += vm.titleMarginBottom - titleSpacing; // If Last, add margin, remove spacing
					}
				}
			}
		},
		drawBody: function drawBody(pt, vm, ctx, opacity) {
			var bodyFontSize = vm.bodyFontSize;
			var bodySpacing = vm.bodySpacing;
			var body = vm.body;

			ctx.textAlign = vm._bodyAlign;
			ctx.textBaseline = 'top';

			var textColor = mergeOpacity(vm.bodyFontColor, opacity);
			ctx.setFillStyle(textColor);
			ctx.font = helpers.fontString(bodyFontSize, vm._bodyFontStyle, vm._bodyFontFamily);
			ctx.setFontSize(bodyFontSize);

			// Before Body
			var xLinePadding = 0;
			var fillLineOfText = function fillLineOfText(line) {
				ctx.fillText(line, pt.x + xLinePadding, pt.y + 10); //todo +10 title往下移动一点点
				pt.y += bodyFontSize + bodySpacing;
			};

			// Before body lines
			helpers.each(vm.beforeBody, fillLineOfText);

			var drawColorBoxes = vm.displayColors;
			xLinePadding = drawColorBoxes ? bodyFontSize + 2 : 0;

			// Draw body lines now
			helpers.each(body, function (bodyItem, i) {
				helpers.each(bodyItem.before, fillLineOfText);

				helpers.each(bodyItem.lines, function (line) {
					// Draw Legend-like boxes if needed
					if (drawColorBoxes) {
						// Fill a white rect so that colours merge nicely if the opacity is < 1
						ctx.setFillStyle(mergeOpacity(vm.legendColorBackground, opacity));
						ctx.fillRect(pt.x, pt.y, bodyFontSize, bodyFontSize);

						// Border
						ctx.setStrokeStyle(mergeOpacity(vm.labelColors[i].borderColor, opacity));
						ctx.strokeRect(pt.x, pt.y, bodyFontSize, bodyFontSize);

						// Inner square
						ctx.setFillStyle(mergeOpacity(vm.labelColors[i].backgroundColor, opacity));
						ctx.fillRect(pt.x + 1, pt.y + 1, bodyFontSize - 2, bodyFontSize - 2);

						ctx.setFillStyle(textColor);
					}

					fillLineOfText(line);
				});

				helpers.each(bodyItem.after, fillLineOfText);
			});

			// Reset back to 0 for after body
			xLinePadding = 0;

			// After body lines
			helpers.each(vm.afterBody, fillLineOfText);
			pt.y -= bodySpacing; // Remove last body spacing
		},
		drawFooter: function drawFooter(pt, vm, ctx, opacity) {
			var footer = vm.footer;

			if (footer.length) {
				pt.y += vm.footerMarginTop;

				ctx.textAlign = vm._footerAlign;
				ctx.textBaseline = 'top';

				ctx.setFillStyle(mergeOpacity(vm.footerFontColor, opacity));
				ctx.font = helpers.fontString(vm.footerFontSize, vm._footerFontStyle, vm._footerFontFamily);
				ctx.setFontSize(vm.footerFontSize);

				helpers.each(footer, function (line) {
					ctx.fillText(line, pt.x, pt.y);
					pt.y += vm.footerFontSize + vm.footerSpacing;
				});
			}
		},
		drawBackground: function drawBackground(pt, vm, ctx, tooltipSize, opacity) {
			ctx.setFillStyle(mergeOpacity(vm.backgroundColor, opacity));
			helpers.drawRoundedRectangle(ctx, pt.x, pt.y, tooltipSize.width, tooltipSize.height, vm.cornerRadius);
			ctx.fill();
		},
		draw: function draw() {
			var ctx = this._chart.ctx;
			var vm = this._view;

			if (vm.opacity === 0) {
				return;
			}

			var tooltipSize = {
				width: vm.width,
				height: vm.height
			};
			var pt = {
				x: vm.x,
				y: vm.y
			};

			// IE11/Edge does not like very small opacities, so snap to 0
			var opacity = Math.abs(vm.opacity < 1e-3) ? 0 : vm.opacity;

			if (this._options.enabled) {
				// Draw Background
				this.drawBackground(pt, vm, ctx, tooltipSize, opacity);

				// Draw Caret
				this.drawCaret(pt, tooltipSize, opacity);

				// Draw Title, Body, and Footer
				pt.x += vm.xPadding;
				pt.y += vm.yPadding;

				// Titles
				this.drawTitle(pt, vm, ctx, opacity);

				// Body
				this.drawBody(pt, vm, ctx, opacity);

				// Footer
				this.drawFooter(pt, vm, ctx, opacity);
			}
		},

		/**
   * Handle an event
   * @private
   * @param e {Event} the event to handle
   * @returns {Boolean} true if the tooltip changed
   */
		handleEvent: function handleEvent(e) {
			var me = this;
			var options = me._options;
			var changed = false;

			me._lastActive = me._lastActive || [];

			// Find Active Elements for tooltips
			if (e.type === 'mouseout') {
				me._active = [];
			} else {
				me._active = me._chartInstance.getElementsAtEventForMode(e, options.mode, options);
			}

			// Remember Last Actives
			changed = !helpers.arrayEquals(me._active, me._lastActive);
			me._lastActive = me._active;

			if (options.enabled || options.custom) {
				me._eventPosition = helpers.getRelativePosition(e, me._chart);

				var model = me._model;
				me.update(true);
				me.pivot();

				// See if our tooltip position changed
				changed |= model.x !== me._model.x || model.y !== me._model.y;
			}

			return changed;
		}
	});

	/**
  * @namespace Chart.Tooltip.positioners
  */
	Chart.Tooltip.positioners = {
		/**
   * Average mode places the tooltip at the average position of the elements shown
   * @function Chart.Tooltip.positioners.average
   * @param elements {ChartElement[]} the elements being displayed in the tooltip
   * @returns {Point} tooltip position
   */
		average: function average(elements) {
			if (!elements.length) {
				return false;
			}

			var i, len;
			var x = 0;
			var y = 0;
			var count = 0;

			for (i = 0, len = elements.length; i < len; ++i) {
				var el = elements[i];
				if (el && el.hasValue()) {
					var pos = el.tooltipPosition();
					x += pos.x;
					y += pos.y;
					++count;
				}
			}

			return {
				x: Math.round(x / count),
				y: Math.round(y / count)
			};
		},

		/**
   * Gets the tooltip position nearest of the item nearest to the event position
   * @function Chart.Tooltip.positioners.nearest
   * @param elements {Chart.Element[]} the tooltip elements
   * @param eventPosition {Point} the position of the event in canvas coordinates
   * @returns {Point} the tooltip position
   */
		nearest: function nearest(elements, eventPosition) {
			var x = eventPosition.x;
			var y = eventPosition.y;

			var nearestElement;
			var minDistance = Number.POSITIVE_INFINITY;
			var i, len;
			for (i = 0, len = elements.length; i < len; ++i) {
				var el = elements[i];
				if (el && el.hasValue()) {
					var center = el.getCenterPoint();
					var d = helpers.distanceBetweenPoints(eventPosition, center);

					if (d < minDistance) {
						minDistance = d;
						nearestElement = el;
					}
				}
			}

			if (nearestElement) {
				var tp = nearestElement.tooltipPosition();
				x = tp.x;
				y = tp.y;
			}

			return {
				x: x,
				y: y
			};
		}
	};
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUudG9vbHRpcC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwiQ2hhcnQiLCJoZWxwZXJzIiwibWVyZ2VPcGFjaXR5IiwiY29sb3JTdHJpbmciLCJvcGFjaXR5IiwiY29sb3IiLCJhbHBoYSIsInJnYmFTdHJpbmciLCJkZWZhdWx0cyIsImdsb2JhbCIsInRvb2x0aXBzIiwiZW5hYmxlZCIsImN1c3RvbSIsIm1vZGUiLCJwb3NpdGlvbiIsImludGVyc2VjdCIsImJhY2tncm91bmRDb2xvciIsInRpdGxlRm9udFN0eWxlIiwidGl0bGVTcGFjaW5nIiwidGl0bGVNYXJnaW5Cb3R0b20iLCJ0aXRsZUZvbnRDb2xvciIsInRpdGxlQWxpZ24iLCJib2R5U3BhY2luZyIsImJvZHlGb250Q29sb3IiLCJib2R5QWxpZ24iLCJmb290ZXJGb250U3R5bGUiLCJmb290ZXJTcGFjaW5nIiwiZm9vdGVyTWFyZ2luVG9wIiwiZm9vdGVyRm9udENvbG9yIiwiZm9vdGVyQWxpZ24iLCJ5UGFkZGluZyIsInhQYWRkaW5nIiwiY2FyZXRTaXplIiwiY29ybmVyUmFkaXVzIiwibXVsdGlLZXlCYWNrZ3JvdW5kIiwiZGlzcGxheUNvbG9ycyIsImNhbGxiYWNrcyIsImJlZm9yZVRpdGxlIiwibm9vcCIsInRpdGxlIiwidG9vbHRpcEl0ZW1zIiwiZGF0YSIsImxhYmVscyIsImxhYmVsQ291bnQiLCJsZW5ndGgiLCJpdGVtIiwieExhYmVsIiwiaW5kZXgiLCJhZnRlclRpdGxlIiwiYmVmb3JlQm9keSIsImJlZm9yZUxhYmVsIiwibGFiZWwiLCJ0b29sdGlwSXRlbSIsImRhdGFzZXRMYWJlbCIsImRhdGFzZXRzIiwiZGF0YXNldEluZGV4IiwieUxhYmVsIiwibGFiZWxDb2xvciIsImNoYXJ0SW5zdGFuY2UiLCJtZXRhIiwiZ2V0RGF0YXNldE1ldGEiLCJhY3RpdmVFbGVtZW50IiwidmlldyIsIl92aWV3IiwiYm9yZGVyQ29sb3IiLCJhZnRlckxhYmVsIiwiYWZ0ZXJCb2R5IiwiYmVmb3JlRm9vdGVyIiwiZm9vdGVyIiwiYWZ0ZXJGb290ZXIiLCJwdXNoT3JDb25jYXQiLCJiYXNlIiwidG9QdXNoIiwiaXNBcnJheSIsIkFycmF5IiwicHJvdG90eXBlIiwicHVzaCIsImFwcGx5IiwiY3JlYXRlVG9vbHRpcEl0ZW0iLCJlbGVtZW50IiwieFNjYWxlIiwiX3hTY2FsZSIsInlTY2FsZSIsIl95U2NhbGUiLCJfc2NhbGUiLCJfaW5kZXgiLCJfZGF0YXNldEluZGV4IiwiZ2V0TGFiZWxGb3JJbmRleCIsIngiLCJfbW9kZWwiLCJ5IiwiZ2V0QmFzZU1vZGVsIiwidG9vbHRpcE9wdHMiLCJnbG9iYWxEZWZhdWx0cyIsImdldFZhbHVlT3JEZWZhdWx0IiwieEFsaWduIiwieUFsaWduIiwiX2JvZHlGb250RmFtaWx5IiwiYm9keUZvbnRGYW1pbHkiLCJkZWZhdWx0Rm9udEZhbWlseSIsIl9ib2R5Rm9udFN0eWxlIiwiYm9keUZvbnRTdHlsZSIsImRlZmF1bHRGb250U3R5bGUiLCJfYm9keUFsaWduIiwiYm9keUZvbnRTaXplIiwiZGVmYXVsdEZvbnRTaXplIiwiX3RpdGxlRm9udEZhbWlseSIsInRpdGxlRm9udEZhbWlseSIsIl90aXRsZUZvbnRTdHlsZSIsInRpdGxlRm9udFNpemUiLCJfdGl0bGVBbGlnbiIsIl9mb290ZXJGb250RmFtaWx5IiwiZm9vdGVyRm9udEZhbWlseSIsIl9mb290ZXJGb250U3R5bGUiLCJmb290ZXJGb250U2l6ZSIsIl9mb290ZXJBbGlnbiIsImxlZ2VuZENvbG9yQmFja2dyb3VuZCIsImdldFRvb2x0aXBTaXplIiwidG9vbHRpcCIsIm1vZGVsIiwiY3R4IiwiX2NoYXJ0IiwiaGVpZ2h0Iiwid2lkdGgiLCJib2R5IiwiY29tYmluZWRCb2R5TGVuZ3RoIiwicmVkdWNlIiwiY291bnQiLCJib2R5SXRlbSIsImJlZm9yZSIsImxpbmVzIiwiYWZ0ZXIiLCJ0aXRsZUxpbmVDb3VudCIsImZvb3RlckxpbmVDb3VudCIsIndpZHRoUGFkZGluZyIsIm1heExpbmVXaWR0aCIsImxpbmUiLCJNYXRoIiwibWF4IiwibWVhc3VyZVRleHRUb29sVGlwIiwiZm9udCIsImZvbnRTdHJpbmciLCJzZXRGb250U2l6ZSIsImVhY2giLCJjb25jYXQiLCJkZXRlcm1pbmVBbGlnbm1lbnQiLCJzaXplIiwiY2hhcnQiLCJjaGFydEFyZWEiLCJfY2hhcnRJbnN0YW5jZSIsImxmIiwicmYiLCJvbGYiLCJvcmYiLCJ5ZiIsIm1pZFgiLCJsZWZ0IiwicmlnaHQiLCJtaWRZIiwidG9wIiwiYm90dG9tIiwib3B0cyIsIl9vcHRpb25zIiwiZ2V0QmFja2dyb3VuZFBvaW50Iiwidm0iLCJhbGlnbm1lbnQiLCJjYXJldFBhZGRpbmciLCJwYWRkaW5nQW5kU2l6ZSIsInJhZGl1c0FuZFBhZGRpbmciLCJUb29sdGlwIiwiRWxlbWVudCIsImV4dGVuZCIsImluaXRpYWxpemUiLCJnZXRUaXRsZSIsIm1lIiwiYXJndW1lbnRzIiwiZ2V0QmVmb3JlQm9keSIsInVuZGVmaW5lZCIsImdldEJvZHkiLCJib2R5SXRlbXMiLCJjYWxsIiwiZ2V0QWZ0ZXJCb2R5IiwiZ2V0Rm9vdGVyIiwidXBkYXRlIiwiY2hhbmdlZCIsImV4aXN0aW5nTW9kZWwiLCJhY3RpdmUiLCJfYWN0aXZlIiwiX2RhdGEiLCJiYWNrZ3JvdW5kUG9pbnQiLCJ0b29sdGlwU2l6ZSIsInRvb2x0aXBQb3NpdGlvbiIsImNhcmV0WCIsImNhcmV0WSIsImkiLCJsZW4iLCJsYWJlbENvbG9ycyIsInBvc2l0aW9uZXJzIiwiX2V2ZW50UG9zaXRpb24iLCJmaWx0ZXIiLCJhIiwiaXRlbVNvcnQiLCJzb3J0IiwiYiIsInJvdW5kIiwicGFkZGluZyIsImRhdGFQb2ludHMiLCJkcmF3Q2FyZXQiLCJ0b29sdGlwUG9pbnQiLCJ4MSIsIngyIiwieDMiLCJ5MSIsInkyIiwieTMiLCJwdFgiLCJwdFkiLCJzZXRGaWxsU3R5bGUiLCJiZWdpblBhdGgiLCJtb3ZlVG8iLCJsaW5lVG8iLCJjbG9zZVBhdGgiLCJmaWxsIiwiZHJhd1RpdGxlIiwicHQiLCJ0ZXh0QWxpZ24iLCJ0ZXh0QmFzZWxpbmUiLCJvZmZzZXRZIiwiZmlsbFRleHQiLCJkcmF3Qm9keSIsInRleHRDb2xvciIsInhMaW5lUGFkZGluZyIsImZpbGxMaW5lT2ZUZXh0IiwiZHJhd0NvbG9yQm94ZXMiLCJmaWxsUmVjdCIsInNldFN0cm9rZVN0eWxlIiwic3Ryb2tlUmVjdCIsImRyYXdGb290ZXIiLCJkcmF3QmFja2dyb3VuZCIsImRyYXdSb3VuZGVkUmVjdGFuZ2xlIiwiZHJhdyIsImFicyIsImhhbmRsZUV2ZW50IiwiZSIsIm9wdGlvbnMiLCJfbGFzdEFjdGl2ZSIsInR5cGUiLCJnZXRFbGVtZW50c0F0RXZlbnRGb3JNb2RlIiwiYXJyYXlFcXVhbHMiLCJnZXRSZWxhdGl2ZVBvc2l0aW9uIiwicGl2b3QiLCJhdmVyYWdlIiwiZWxlbWVudHMiLCJlbCIsImhhc1ZhbHVlIiwicG9zIiwibmVhcmVzdCIsImV2ZW50UG9zaXRpb24iLCJuZWFyZXN0RWxlbWVudCIsIm1pbkRpc3RhbmNlIiwiTnVtYmVyIiwiUE9TSVRJVkVfSU5GSU5JVFkiLCJjZW50ZXIiLCJnZXRDZW50ZXJQb2ludCIsImQiLCJkaXN0YW5jZUJldHdlZW5Qb2ludHMiLCJ0cCJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUFBLE9BQU9DLE9BQVAsR0FBaUIsVUFBU0MsS0FBVCxFQUFnQjs7QUFFaEMsS0FBSUMsVUFBVUQsTUFBTUMsT0FBcEI7O0FBRUE7OztBQUdBLFVBQVNDLFlBQVQsQ0FBc0JDLFdBQXRCLEVBQW1DQyxPQUFuQyxFQUE0QztBQUMzQyxNQUFJQyxRQUFRSixRQUFRSSxLQUFSLENBQWNGLFdBQWQsQ0FBWjtBQUNBLFNBQU9FLE1BQU1DLEtBQU4sQ0FBWUYsVUFBVUMsTUFBTUMsS0FBTixFQUF0QixFQUFxQ0MsVUFBckMsRUFBUDtBQUNBOztBQUVEUCxPQUFNUSxRQUFOLENBQWVDLE1BQWYsQ0FBc0JDLFFBQXRCLEdBQWlDO0FBQ2hDQyxXQUFTLElBRHVCO0FBRWhDQyxVQUFRLElBRndCO0FBR2hDQyxRQUFNLFNBSDBCO0FBSWhD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QUFXcEgsSUFBSXVDLEtBQWYsQ0FERztBQUVOckMsT0FBRytDLEtBQUttRSxLQUFMLENBQVdsSCxJQUFJcUMsS0FBZjtBQUZHLElBQVA7QUFJQSxHQS9CMEI7O0FBaUMzQjs7Ozs7OztBQU9BaUksV0FBUyxpQkFBU0osUUFBVCxFQUFtQkssYUFBbkIsRUFBa0M7QUFDMUMsT0FBSXpLLElBQUl5SyxjQUFjekssQ0FBdEI7QUFDQSxPQUFJRSxJQUFJdUssY0FBY3ZLLENBQXRCOztBQUVBLE9BQUl3SyxjQUFKO0FBQ0EsT0FBSUMsY0FBY0MsT0FBT0MsaUJBQXpCO0FBQ0EsT0FBSW5FLENBQUosRUFBT0MsR0FBUDtBQUNBLFFBQUtELElBQUksQ0FBSixFQUFPQyxNQUFNeUQsU0FBU2hOLE1BQTNCLEVBQW1Dc0osSUFBSUMsR0FBdkMsRUFBNEMsRUFBRUQsQ0FBOUMsRUFBaUQ7QUFDaEQsUUFBSTJELEtBQUtELFNBQVMxRCxDQUFULENBQVQ7QUFDQSxRQUFJMkQsTUFBTUEsR0FBR0MsUUFBSCxFQUFWLEVBQXlCO0FBQ3hCLFNBQUlRLFNBQVNULEdBQUdVLGNBQUgsRUFBYjtBQUNBLFNBQUlDLElBQUl2USxRQUFRd1EscUJBQVIsQ0FBOEJSLGFBQTlCLEVBQTZDSyxNQUE3QyxDQUFSOztBQUVBLFNBQUlFLElBQUlMLFdBQVIsRUFBcUI7QUFDcEJBLG9CQUFjSyxDQUFkO0FBQ0FOLHVCQUFpQkwsRUFBakI7QUFDQTtBQUNEO0FBQ0Q7O0FBRUQsT0FBSUssY0FBSixFQUFvQjtBQUNuQixRQUFJUSxLQUFLUixlQUFlbkUsZUFBZixFQUFUO0FBQ0F2RyxRQUFJa0wsR0FBR2xMLENBQVA7QUFDQUUsUUFBSWdMLEdBQUdoTCxDQUFQO0FBQ0E7O0FBRUQsVUFBTztBQUNORixPQUFHQSxDQURHO0FBRU5FLE9BQUdBO0FBRkcsSUFBUDtBQUlBO0FBdEUwQixFQUE1QjtBQXdFQSxDQXAzQkQiLCJmaWxlIjoiY29yZS50b29sdGlwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDaGFydCkge1xyXG5cclxuXHR2YXIgaGVscGVycyA9IENoYXJ0LmhlbHBlcnM7XHJcblxyXG5cdC8qKlxyXG4gXHQgKiBIZWxwZXIgbWV0aG9kIHRvIG1lcmdlIHRoZSBvcGFjaXR5IGludG8gYSBjb2xvclxyXG4gXHQgKi9cclxuXHRmdW5jdGlvbiBtZXJnZU9wYWNpdHkoY29sb3JTdHJpbmcsIG9wYWNpdHkpIHtcclxuXHRcdHZhciBjb2xvciA9IGhlbHBlcnMuY29sb3IoY29sb3JTdHJpbmcpO1xyXG5cdFx0cmV0dXJuIGNvbG9yLmFscGhhKG9wYWNpdHkgKiBjb2xvci5hbHBoYSgpKS5yZ2JhU3RyaW5nKCk7XHJcblx0fVxyXG5cclxuXHRDaGFydC5kZWZhdWx0cy5nbG9iYWwudG9vbHRpcHMgPSB7XHJcblx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0Y3VzdG9tOiBudWxsLFxyXG5cdFx0bW9kZTogJ25lYXJlc3QnLFxyXG5cdFx0cG9zaXRpb246ICdhdmVyYWdlJyxcclxuXHRcdGludGVyc2VjdDogdHJ1ZSxcclxuXHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMC44KScsXHJcblx0XHR0aXRsZUZvbnRTdHlsZTogJ2JvbGQnLFxyXG5cdFx0dGl0bGVTcGFjaW5nOiAyLFxyXG5cdFx0dGl0bGVNYXJnaW5Cb3R0b206IDYsXHJcblx0XHR0aXRsZUZvbnRDb2xvcjogJyNmZmZmZmYnLFxyXG5cdFx0dGl0bGVBbGlnbjogJ2xlZnQnLFxyXG5cdFx0Ym9keVNwYWNpbmc6IDIsXHJcblx0XHRib2R5Rm9udENvbG9yOiAnI2ZmZmZmZicsXHJcblx0XHRib2R5QWxpZ246ICdsZWZ0JyxcclxuXHRcdGZvb3RlckZvbnRTdHlsZTogJ2JvbGQnLFxyXG5cdFx0Zm9vdGVyU3BhY2luZzogMixcclxuXHRcdGZvb3Rlck1hcmdpblRvcDogNixcclxuXHRcdGZvb3RlckZvbnRDb2xvcjogJyNmZmZmZmYnLFxyXG5cdFx0Zm9vdGVyQWxpZ246ICdsZWZ0JyxcclxuXHRcdHlQYWRkaW5nOiA2LFxyXG5cdFx0eFBhZGRpbmc6IDYsXHJcblx0XHRjYXJldFNpemU6IDUsXHJcblx0XHRjb3JuZXJSYWRpdXM6IDYsXHJcblx0XHRtdWx0aUtleUJhY2tncm91bmQ6ICcjZmZmZmZmJyxcclxuXHRcdGRpc3BsYXlDb2xvcnM6IHRydWUsXHJcblx0XHRjYWxsYmFja3M6IHtcclxuXHRcdFx0Ly8gQXJncyBhcmU6ICh0b29sdGlwSXRlbXMsIGRhdGEpXHJcblx0XHRcdGJlZm9yZVRpdGxlOiBoZWxwZXJzLm5vb3AsXHJcblx0XHRcdHRpdGxlOiBmdW5jdGlvbih0b29sdGlwSXRlbXMsIGRhdGEpIHtcclxuXHRcdFx0XHQvLyBQaWNrIGZpcnN0IHhMYWJlbCBmb3Igbm93XHJcblx0XHRcdFx0dmFyIHRpdGxlID0gJyc7XHJcblx0XHRcdFx0dmFyIGxhYmVscyA9IGRhdGEubGFiZWxzO1xyXG5cdFx0XHRcdHZhciBsYWJlbENvdW50ID0gbGFiZWxzID8gbGFiZWxzLmxlbmd0aCA6IDA7XHJcblxyXG5cdFx0XHRcdGlmICh0b29sdGlwSXRlbXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0dmFyIGl0ZW0gPSB0b29sdGlwSXRlbXNbMF07XHJcblxyXG5cdFx0XHRcdFx0aWYgKGl0ZW0ueExhYmVsKSB7XHJcblx0XHRcdFx0XHRcdHRpdGxlID0gaXRlbS54TGFiZWw7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGxhYmVsQ291bnQgPiAwICYmIGl0ZW0uaW5kZXggPCBsYWJlbENvdW50KSB7XHJcblx0XHRcdFx0XHRcdHRpdGxlID0gbGFiZWxzW2l0ZW0uaW5kZXhdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHRpdGxlO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRhZnRlclRpdGxlOiBoZWxwZXJzLm5vb3AsXHJcblxyXG5cdFx0XHQvLyBBcmdzIGFyZTogKHRvb2x0aXBJdGVtcywgZGF0YSlcclxuXHRcdFx0YmVmb3JlQm9keTogaGVscGVycy5ub29wLFxyXG5cclxuXHRcdFx0Ly8gQXJncyBhcmU6ICh0b29sdGlwSXRlbSwgZGF0YSlcclxuXHRcdFx0YmVmb3JlTGFiZWw6IGhlbHBlcnMubm9vcCxcclxuXHRcdFx0bGFiZWw6IGZ1bmN0aW9uKHRvb2x0aXBJdGVtLCBkYXRhKSB7XHJcblx0XHRcdFx0dmFyIGRhdGFzZXRMYWJlbCA9IGRhdGEuZGF0YXNldHNbdG9vbHRpcEl0ZW0uZGF0YXNldEluZGV4XS5sYWJlbCB8fCAnJztcclxuXHRcdFx0XHRyZXR1cm4gZGF0YXNldExhYmVsICsgJzogJyArIHRvb2x0aXBJdGVtLnlMYWJlbDtcclxuXHRcdFx0fSxcclxuXHRcdFx0bGFiZWxDb2xvcjogZnVuY3Rpb24odG9vbHRpcEl0ZW0sIGNoYXJ0SW5zdGFuY2UpIHtcclxuXHRcdFx0XHR2YXIgbWV0YSA9IGNoYXJ0SW5zdGFuY2UuZ2V0RGF0YXNldE1ldGEodG9vbHRpcEl0ZW0uZGF0YXNldEluZGV4KTtcclxuXHRcdFx0XHR2YXIgYWN0aXZlRWxlbWVudCA9IG1ldGEuZGF0YVt0b29sdGlwSXRlbS5pbmRleF07XHJcblx0XHRcdFx0dmFyIHZpZXcgPSBhY3RpdmVFbGVtZW50Ll92aWV3O1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogdmlldy5ib3JkZXJDb2xvcixcclxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogdmlldy5iYWNrZ3JvdW5kQ29sb3JcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRhZnRlckxhYmVsOiBoZWxwZXJzLm5vb3AsXHJcblxyXG5cdFx0XHQvLyBBcmdzIGFyZTogKHRvb2x0aXBJdGVtcywgZGF0YSlcclxuXHRcdFx0YWZ0ZXJCb2R5OiBoZWxwZXJzLm5vb3AsXHJcblxyXG5cdFx0XHQvLyBBcmdzIGFyZTogKHRvb2x0aXBJdGVtcywgZGF0YSlcclxuXHRcdFx0YmVmb3JlRm9vdGVyOiBoZWxwZXJzLm5vb3AsXHJcblx0XHRcdGZvb3RlcjogaGVscGVycy5ub29wLFxyXG5cdFx0XHRhZnRlckZvb3RlcjogaGVscGVycy5ub29wXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0Ly8gSGVscGVyIHRvIHB1c2ggb3IgY29uY2F0IGJhc2VkIG9uIGlmIHRoZSAybmQgcGFyYW1ldGVyIGlzIGFuIGFycmF5IG9yIG5vdFxyXG5cdGZ1bmN0aW9uIHB1c2hPckNvbmNhdChiYXNlLCB0b1B1c2gpIHtcclxuXHRcdGlmICh0b1B1c2gpIHtcclxuXHRcdFx0aWYgKGhlbHBlcnMuaXNBcnJheSh0b1B1c2gpKSB7XHJcblx0XHRcdFx0Ly8gYmFzZSA9IGJhc2UuY29uY2F0KHRvUHVzaCk7XHJcblx0XHRcdFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYmFzZSwgdG9QdXNoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRiYXNlLnB1c2godG9QdXNoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBiYXNlO1xyXG5cdH1cclxuXHJcblx0Ly8gUHJpdmF0ZSBoZWxwZXIgdG8gY3JlYXRlIGEgdG9vbHRpcCBpdGVtIG1vZGVsXHJcblx0Ly8gQHBhcmFtIGVsZW1lbnQgOiB0aGUgY2hhcnQgZWxlbWVudCAocG9pbnQsIGFyYywgYmFyKSB0byBjcmVhdGUgdGhlIHRvb2x0aXAgaXRlbSBmb3JcclxuXHQvLyBAcmV0dXJuIDogbmV3IHRvb2x0aXAgaXRlbVxyXG5cdGZ1bmN0aW9uIGNyZWF0ZVRvb2x0aXBJdGVtKGVsZW1lbnQpIHtcclxuXHRcdHZhciB4U2NhbGUgPSBlbGVtZW50Ll94U2NhbGU7XHJcblx0XHR2YXIgeVNjYWxlID0gZWxlbWVudC5feVNjYWxlIHx8IGVsZW1lbnQuX3NjYWxlOyAvLyBoYW5kbGUgcmFkYXIgfHwgcG9sYXJBcmVhIGNoYXJ0c1xyXG5cdFx0dmFyIGluZGV4ID0gZWxlbWVudC5faW5kZXgsXHJcblx0XHRcdGRhdGFzZXRJbmRleCA9IGVsZW1lbnQuX2RhdGFzZXRJbmRleDtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR4TGFiZWw6IHhTY2FsZSA/IHhTY2FsZS5nZXRMYWJlbEZvckluZGV4KGluZGV4LCBkYXRhc2V0SW5kZXgpIDogJycsXHJcblx0XHRcdHlMYWJlbDogeVNjYWxlID8geVNjYWxlLmdldExhYmVsRm9ySW5kZXgoaW5kZXgsIGRhdGFzZXRJbmRleCkgOiAnJyxcclxuXHRcdFx0aW5kZXg6IGluZGV4LFxyXG5cdFx0XHRkYXRhc2V0SW5kZXg6IGRhdGFzZXRJbmRleCxcclxuXHRcdFx0eDogZWxlbWVudC5fbW9kZWwueCxcclxuXHRcdFx0eTogZWxlbWVudC5fbW9kZWwueVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlciB0byBnZXQgdGhlIHJlc2V0IG1vZGVsIGZvciB0aGUgdG9vbHRpcFxyXG5cdCAqIEBwYXJhbSB0b29sdGlwT3B0cyB7T2JqZWN0fSB0aGUgdG9vbHRpcCBvcHRpb25zXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gZ2V0QmFzZU1vZGVsKHRvb2x0aXBPcHRzKSB7XHJcblx0XHR2YXIgZ2xvYmFsRGVmYXVsdHMgPSBDaGFydC5kZWZhdWx0cy5nbG9iYWw7XHJcblx0XHR2YXIgZ2V0VmFsdWVPckRlZmF1bHQgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0O1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdC8vIFBvc2l0aW9uaW5nXHJcblx0XHRcdHhQYWRkaW5nOiB0b29sdGlwT3B0cy54UGFkZGluZyxcclxuXHRcdFx0eVBhZGRpbmc6IHRvb2x0aXBPcHRzLnlQYWRkaW5nLFxyXG5cdFx0XHR4QWxpZ246IHRvb2x0aXBPcHRzLnhBbGlnbixcclxuXHRcdFx0eUFsaWduOiB0b29sdGlwT3B0cy55QWxpZ24sXHJcblxyXG5cdFx0XHQvLyBCb2R5XHJcblx0XHRcdGJvZHlGb250Q29sb3I6IHRvb2x0aXBPcHRzLmJvZHlGb250Q29sb3IsXHJcblx0XHRcdF9ib2R5Rm9udEZhbWlseTogZ2V0VmFsdWVPckRlZmF1bHQodG9vbHRpcE9wdHMuYm9keUZvbnRGYW1pbHksIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250RmFtaWx5KSxcclxuXHRcdFx0X2JvZHlGb250U3R5bGU6IGdldFZhbHVlT3JEZWZhdWx0KHRvb2x0aXBPcHRzLmJvZHlGb250U3R5bGUsIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250U3R5bGUpLFxyXG5cdFx0XHRfYm9keUFsaWduOiB0b29sdGlwT3B0cy5ib2R5QWxpZ24sXHJcblx0XHRcdGJvZHlGb250U2l6ZTogZ2V0VmFsdWVPckRlZmF1bHQodG9vbHRpcE9wdHMuYm9keUZvbnRTaXplLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFNpemUpLFxyXG5cdFx0XHRib2R5U3BhY2luZzogdG9vbHRpcE9wdHMuYm9keVNwYWNpbmcsXHJcblxyXG5cdFx0XHQvLyBUaXRsZVxyXG5cdFx0XHR0aXRsZUZvbnRDb2xvcjogdG9vbHRpcE9wdHMudGl0bGVGb250Q29sb3IsXHJcblx0XHRcdF90aXRsZUZvbnRGYW1pbHk6IGdldFZhbHVlT3JEZWZhdWx0KHRvb2x0aXBPcHRzLnRpdGxlRm9udEZhbWlseSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRGYW1pbHkpLFxyXG5cdFx0XHRfdGl0bGVGb250U3R5bGU6IGdldFZhbHVlT3JEZWZhdWx0KHRvb2x0aXBPcHRzLnRpdGxlRm9udFN0eWxlLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFN0eWxlKSxcclxuXHRcdFx0dGl0bGVGb250U2l6ZTogZ2V0VmFsdWVPckRlZmF1bHQodG9vbHRpcE9wdHMudGl0bGVGb250U2l6ZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTaXplKSxcclxuXHRcdFx0X3RpdGxlQWxpZ246IHRvb2x0aXBPcHRzLnRpdGxlQWxpZ24sXHJcblx0XHRcdHRpdGxlU3BhY2luZzogdG9vbHRpcE9wdHMudGl0bGVTcGFjaW5nLFxyXG5cdFx0XHR0aXRsZU1hcmdpbkJvdHRvbTogdG9vbHRpcE9wdHMudGl0bGVNYXJnaW5Cb3R0b20sXHJcblxyXG5cdFx0XHQvLyBGb290ZXJcclxuXHRcdFx0Zm9vdGVyRm9udENvbG9yOiB0b29sdGlwT3B0cy5mb290ZXJGb250Q29sb3IsXHJcblx0XHRcdF9mb290ZXJGb250RmFtaWx5OiBnZXRWYWx1ZU9yRGVmYXVsdCh0b29sdGlwT3B0cy5mb290ZXJGb250RmFtaWx5LCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udEZhbWlseSksXHJcblx0XHRcdF9mb290ZXJGb250U3R5bGU6IGdldFZhbHVlT3JEZWZhdWx0KHRvb2x0aXBPcHRzLmZvb3RlckZvbnRTdHlsZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTdHlsZSksXHJcblx0XHRcdGZvb3RlckZvbnRTaXplOiBnZXRWYWx1ZU9yRGVmYXVsdCh0b29sdGlwT3B0cy5mb290ZXJGb250U2l6ZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTaXplKSxcclxuXHRcdFx0X2Zvb3RlckFsaWduOiB0b29sdGlwT3B0cy5mb290ZXJBbGlnbixcclxuXHRcdFx0Zm9vdGVyU3BhY2luZzogdG9vbHRpcE9wdHMuZm9vdGVyU3BhY2luZyxcclxuXHRcdFx0Zm9vdGVyTWFyZ2luVG9wOiB0b29sdGlwT3B0cy5mb290ZXJNYXJnaW5Ub3AsXHJcblxyXG5cdFx0XHQvLyBBcHBlYXJhbmNlXHJcblx0XHRcdGNhcmV0U2l6ZTogdG9vbHRpcE9wdHMuY2FyZXRTaXplLFxyXG5cdFx0XHRjb3JuZXJSYWRpdXM6IHRvb2x0aXBPcHRzLmNvcm5lclJhZGl1cyxcclxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiB0b29sdGlwT3B0cy5iYWNrZ3JvdW5kQ29sb3IsXHJcblx0XHRcdG9wYWNpdHk6IDAsXHJcblx0XHRcdGxlZ2VuZENvbG9yQmFja2dyb3VuZDogdG9vbHRpcE9wdHMubXVsdGlLZXlCYWNrZ3JvdW5kLFxyXG5cdFx0XHRkaXNwbGF5Q29sb3JzOiB0b29sdGlwT3B0cy5kaXNwbGF5Q29sb3JzXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBzaXplIG9mIHRoZSB0b29sdGlwXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gZ2V0VG9vbHRpcFNpemUodG9vbHRpcCwgbW9kZWwpIHtcclxuXHRcdHZhciBjdHggPSB0b29sdGlwLl9jaGFydC5jdHg7XHJcblxyXG5cdFx0dmFyIGhlaWdodCA9IG1vZGVsLnlQYWRkaW5nICogMjsgLy8gVG9vbHRpcCBQYWRkaW5nXHJcblx0XHR2YXIgd2lkdGggPSAwO1xyXG5cclxuXHRcdC8vIENvdW50IG9mIGFsbCBsaW5lcyBpbiB0aGUgYm9keVxyXG5cdFx0dmFyIGJvZHkgPSBtb2RlbC5ib2R5O1xyXG5cdFx0dmFyIGNvbWJpbmVkQm9keUxlbmd0aCA9IGJvZHkucmVkdWNlKGZ1bmN0aW9uKGNvdW50LCBib2R5SXRlbSkge1xyXG5cdFx0XHRyZXR1cm4gY291bnQgKyBib2R5SXRlbS5iZWZvcmUubGVuZ3RoICsgYm9keUl0ZW0ubGluZXMubGVuZ3RoICsgYm9keUl0ZW0uYWZ0ZXIubGVuZ3RoO1xyXG5cdFx0fSwgMCk7XHJcblx0XHRjb21iaW5lZEJvZHlMZW5ndGggKz0gbW9kZWwuYmVmb3JlQm9keS5sZW5ndGggKyBtb2RlbC5hZnRlckJvZHkubGVuZ3RoO1xyXG5cclxuXHRcdHZhciB0aXRsZUxpbmVDb3VudCA9IG1vZGVsLnRpdGxlLmxlbmd0aDtcclxuXHRcdHZhciBmb290ZXJMaW5lQ291bnQgPSBtb2RlbC5mb290ZXIubGVuZ3RoO1xyXG5cdFx0dmFyIHRpdGxlRm9udFNpemUgPSBtb2RlbC50aXRsZUZvbnRTaXplLFxyXG5cdFx0XHRib2R5Rm9udFNpemUgPSBtb2RlbC5ib2R5Rm9udFNpemUsXHJcblx0XHRcdGZvb3RlckZvbnRTaXplID0gbW9kZWwuZm9vdGVyRm9udFNpemU7XHJcblxyXG5cdFx0aGVpZ2h0ICs9IHRpdGxlTGluZUNvdW50ICogdGl0bGVGb250U2l6ZTsgLy8gVGl0bGUgTGluZXNcclxuXHRcdGhlaWdodCArPSB0aXRsZUxpbmVDb3VudCA/ICh0aXRsZUxpbmVDb3VudCAtIDEpICogbW9kZWwudGl0bGVTcGFjaW5nIDogMDsgLy8gVGl0bGUgTGluZSBTcGFjaW5nXHJcblx0XHRoZWlnaHQgKz0gdGl0bGVMaW5lQ291bnQgPyBtb2RlbC50aXRsZU1hcmdpbkJvdHRvbSA6IDA7IC8vIFRpdGxlJ3MgYm90dG9tIE1hcmdpblxyXG5cdFx0aGVpZ2h0ICs9IGNvbWJpbmVkQm9keUxlbmd0aCAqIGJvZHlGb250U2l6ZTsgLy8gQm9keSBMaW5lc1xyXG5cdFx0aGVpZ2h0ICs9IGNvbWJpbmVkQm9keUxlbmd0aCA/IChjb21iaW5lZEJvZHlMZW5ndGggLSAxKSAqIG1vZGVsLmJvZHlTcGFjaW5nIDogMDsgLy8gQm9keSBMaW5lIFNwYWNpbmdcclxuXHRcdGhlaWdodCArPSBmb290ZXJMaW5lQ291bnQgPyBtb2RlbC5mb290ZXJNYXJnaW5Ub3AgOiAwOyAvLyBGb290ZXIgTWFyZ2luXHJcblx0XHRoZWlnaHQgKz0gZm9vdGVyTGluZUNvdW50ICogKGZvb3RlckZvbnRTaXplKTsgLy8gRm9vdGVyIExpbmVzXHJcblx0XHRoZWlnaHQgKz0gZm9vdGVyTGluZUNvdW50ID8gKGZvb3RlckxpbmVDb3VudCAtIDEpICogbW9kZWwuZm9vdGVyU3BhY2luZyA6IDA7IC8vIEZvb3RlciBMaW5lIFNwYWNpbmdcclxuXHJcblx0XHQvLyBUaXRsZSB3aWR0aFxyXG5cdFx0dmFyIHdpZHRoUGFkZGluZyA9IDA7XHJcblx0XHR2YXIgbWF4TGluZVdpZHRoID0gZnVuY3Rpb24obGluZSkge1xyXG5cdFx0XHR3aWR0aCA9IE1hdGgubWF4KHdpZHRoLCBjdHgubWVhc3VyZVRleHRUb29sVGlwKGxpbmUpLndpZHRoICsgd2lkdGhQYWRkaW5nKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y3R4LmZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodGl0bGVGb250U2l6ZSwgbW9kZWwuX3RpdGxlRm9udFN0eWxlLCBtb2RlbC5fdGl0bGVGb250RmFtaWx5KTtcclxuXHRcdGN0eC5zZXRGb250U2l6ZSh0aXRsZUZvbnRTaXplKTtcclxuXHRcdGhlbHBlcnMuZWFjaChtb2RlbC50aXRsZSwgbWF4TGluZVdpZHRoKTtcclxuXHJcblx0XHQvLyBCb2R5IHdpZHRoXHJcblx0XHRjdHguZm9udCA9IGhlbHBlcnMuZm9udFN0cmluZyhib2R5Rm9udFNpemUsIG1vZGVsLl9ib2R5Rm9udFN0eWxlLCBtb2RlbC5fYm9keUZvbnRGYW1pbHkpO1xyXG5cdFx0Y3R4LnNldEZvbnRTaXplKGJvZHlGb250U2l6ZSk7XHJcblx0XHRoZWxwZXJzLmVhY2gobW9kZWwuYmVmb3JlQm9keS5jb25jYXQobW9kZWwuYWZ0ZXJCb2R5KSwgbWF4TGluZVdpZHRoKTtcclxuXHJcblx0XHQvLyBCb2R5IGxpbmVzIG1heSBpbmNsdWRlIHNvbWUgZXh0cmEgd2lkdGggZHVlIHRvIHRoZSBjb2xvciBib3hcclxuXHRcdHdpZHRoUGFkZGluZyA9IG1vZGVsLmRpc3BsYXlDb2xvcnMgPyAoYm9keUZvbnRTaXplICsgMikgOiAwO1xyXG5cdFx0aGVscGVycy5lYWNoKGJvZHksIGZ1bmN0aW9uKGJvZHlJdGVtKSB7XHJcblx0XHRcdGhlbHBlcnMuZWFjaChib2R5SXRlbS5iZWZvcmUsIG1heExpbmVXaWR0aCk7XHJcblx0XHRcdGhlbHBlcnMuZWFjaChib2R5SXRlbS5saW5lcywgbWF4TGluZVdpZHRoKTtcclxuXHRcdFx0aGVscGVycy5lYWNoKGJvZHlJdGVtLmFmdGVyLCBtYXhMaW5lV2lkdGgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVzZXQgYmFjayB0byAwXHJcblx0XHR3aWR0aFBhZGRpbmcgPSAwO1xyXG5cclxuXHRcdC8vIEZvb3RlciB3aWR0aFxyXG5cdFx0Y3R4LmZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcoZm9vdGVyRm9udFNpemUsIG1vZGVsLl9mb290ZXJGb250U3R5bGUsIG1vZGVsLl9mb290ZXJGb250RmFtaWx5KTtcclxuXHRcdGN0eC5zZXRGb250U2l6ZShmb290ZXJGb250U2l6ZSk7XHJcblx0XHRoZWxwZXJzLmVhY2gobW9kZWwuZm9vdGVyLCBtYXhMaW5lV2lkdGgpO1xyXG5cclxuXHRcdC8vIEFkZCBwYWRkaW5nXHJcblx0XHR3aWR0aCArPSAyICogbW9kZWwueFBhZGRpbmc7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0d2lkdGg6IHdpZHRoLFxyXG5cdFx0XHRoZWlnaHQ6IGhlaWdodFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlciB0byBnZXQgdGhlIGFsaWdubWVudCBvZiBhIHRvb2x0aXAgZ2l2ZW4gdGhlIHNpemVcclxuXHQgKi9cclxuXHRmdW5jdGlvbiBkZXRlcm1pbmVBbGlnbm1lbnQodG9vbHRpcCwgc2l6ZSkge1xyXG5cdFx0dmFyIG1vZGVsID0gdG9vbHRpcC5fbW9kZWw7XHJcblx0XHR2YXIgY2hhcnQgPSB0b29sdGlwLl9jaGFydDtcclxuXHRcdHZhciBjaGFydEFyZWEgPSB0b29sdGlwLl9jaGFydEluc3RhbmNlLmNoYXJ0QXJlYTtcclxuXHRcdHZhciB4QWxpZ24gPSAnY2VudGVyJztcclxuXHRcdHZhciB5QWxpZ24gPSAnY2VudGVyJztcclxuXHJcblx0XHRpZiAobW9kZWwueSA8IHNpemUuaGVpZ2h0KSB7XHJcblx0XHRcdHlBbGlnbiA9ICd0b3AnO1xyXG5cdFx0fSBlbHNlIGlmIChtb2RlbC55ID4gKGNoYXJ0LmhlaWdodCAtIHNpemUuaGVpZ2h0KSkge1xyXG5cdFx0XHR5QWxpZ24gPSAnYm90dG9tJztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbGYsIHJmOyAvLyBmdW5jdGlvbnMgdG8gZGV0ZXJtaW5lIGxlZnQsIHJpZ2h0IGFsaWdubWVudFxyXG5cdFx0dmFyIG9sZiwgb3JmOyAvLyBmdW5jdGlvbnMgdG8gZGV0ZXJtaW5lIGlmIGxlZnQvcmlnaHQgYWxpZ25tZW50IGNhdXNlcyB0b29sdGlwIHRvIGdvIG91dHNpZGUgY2hhcnRcclxuXHRcdHZhciB5ZjsgLy8gZnVuY3Rpb24gdG8gZ2V0IHRoZSB5IGFsaWdubWVudCBpZiB0aGUgdG9vbHRpcCBnb2VzIG91dHNpZGUgb2YgdGhlIGxlZnQgb3IgcmlnaHQgZWRnZXNcclxuXHRcdHZhciBtaWRYID0gKGNoYXJ0QXJlYS5sZWZ0ICsgY2hhcnRBcmVhLnJpZ2h0KSAvIDI7XHJcblx0XHR2YXIgbWlkWSA9IChjaGFydEFyZWEudG9wICsgY2hhcnRBcmVhLmJvdHRvbSkgLyAyO1xyXG5cclxuXHRcdGlmICh5QWxpZ24gPT09ICdjZW50ZXInKSB7XHJcblx0XHRcdGxmID0gZnVuY3Rpb24oeCkge1xyXG5cdFx0XHRcdHJldHVybiB4IDw9IG1pZFg7XHJcblx0XHRcdH07XHJcblx0XHRcdHJmID0gZnVuY3Rpb24oeCkge1xyXG5cdFx0XHRcdHJldHVybiB4ID4gbWlkWDtcclxuXHRcdFx0fTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGxmID0gZnVuY3Rpb24oeCkge1xyXG5cdFx0XHRcdHJldHVybiB4IDw9IChzaXplLndpZHRoIC8gMik7XHJcblx0XHRcdH07XHJcblx0XHRcdHJmID0gZnVuY3Rpb24oeCkge1xyXG5cdFx0XHRcdHJldHVybiB4ID49IChjaGFydC53aWR0aCAtIChzaXplLndpZHRoIC8gMikpO1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdG9sZiA9IGZ1bmN0aW9uKHgpIHtcclxuXHRcdFx0cmV0dXJuIHggKyBzaXplLndpZHRoID4gY2hhcnQud2lkdGg7XHJcblx0XHR9O1xyXG5cdFx0b3JmID0gZnVuY3Rpb24oeCkge1xyXG5cdFx0XHRyZXR1cm4geCAtIHNpemUud2lkdGggPCAwO1xyXG5cdFx0fTtcclxuXHRcdHlmID0gZnVuY3Rpb24oeSkge1xyXG5cdFx0XHRyZXR1cm4geSA8PSBtaWRZID8gJ3RvcCcgOiAnYm90dG9tJztcclxuXHRcdH07XHJcblxyXG5cdFx0aWYgKGxmKG1vZGVsLngpKSB7XHJcblx0XHRcdHhBbGlnbiA9ICdsZWZ0JztcclxuXHJcblx0XHRcdC8vIElzIHRvb2x0aXAgdG9vIHdpZGUgYW5kIGdvZXMgb3ZlciB0aGUgcmlnaHQgc2lkZSBvZiB0aGUgY2hhcnQuP1xyXG5cdFx0XHRpZiAob2xmKG1vZGVsLngpKSB7XHJcblx0XHRcdFx0eEFsaWduID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0eUFsaWduID0geWYobW9kZWwueSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAocmYobW9kZWwueCkpIHtcclxuXHRcdFx0eEFsaWduID0gJ3JpZ2h0JztcclxuXHJcblx0XHRcdC8vIElzIHRvb2x0aXAgdG9vIHdpZGUgYW5kIGdvZXMgb3V0c2lkZSBsZWZ0IGVkZ2Ugb2YgY2FudmFzP1xyXG5cdFx0XHRpZiAob3JmKG1vZGVsLngpKSB7XHJcblx0XHRcdFx0eEFsaWduID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0eUFsaWduID0geWYobW9kZWwueSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR2YXIgb3B0cyA9IHRvb2x0aXAuX29wdGlvbnM7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR4QWxpZ246IG9wdHMueEFsaWduID8gb3B0cy54QWxpZ24gOiB4QWxpZ24sXHJcblx0XHRcdHlBbGlnbjogb3B0cy55QWxpZ24gPyBvcHRzLnlBbGlnbiA6IHlBbGlnblxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEBIZWxwZXIgdG8gZ2V0IHRoZSBsb2NhdGlvbiBhIHRvb2x0aXAgbmVlZHMgdG8gYmUgcGxhY2VkIGF0IGdpdmVuIHRoZSBpbml0aWFsIHBvc2l0aW9uICh2aWEgdGhlIHZtKSBhbmQgdGhlIHNpemUgYW5kIGFsaWdubWVudFxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIGdldEJhY2tncm91bmRQb2ludCh2bSwgc2l6ZSwgYWxpZ25tZW50KSB7XHJcblx0XHQvLyBCYWNrZ3JvdW5kIFBvc2l0aW9uXHJcblx0XHR2YXIgeCA9IHZtLng7XHJcblx0XHR2YXIgeSA9IHZtLnk7XHJcblxyXG5cdFx0dmFyIGNhcmV0U2l6ZSA9IHZtLmNhcmV0U2l6ZSxcclxuXHRcdFx0Y2FyZXRQYWRkaW5nID0gdm0uY2FyZXRQYWRkaW5nLFxyXG5cdFx0XHRjb3JuZXJSYWRpdXMgPSB2bS5jb3JuZXJSYWRpdXMsXHJcblx0XHRcdHhBbGlnbiA9IGFsaWdubWVudC54QWxpZ24sXHJcblx0XHRcdHlBbGlnbiA9IGFsaWdubWVudC55QWxpZ24sXHJcblx0XHRcdHBhZGRpbmdBbmRTaXplID0gY2FyZXRTaXplICsgY2FyZXRQYWRkaW5nLFxyXG5cdFx0XHRyYWRpdXNBbmRQYWRkaW5nID0gY29ybmVyUmFkaXVzICsgY2FyZXRQYWRkaW5nO1xyXG5cclxuXHRcdGlmICh4QWxpZ24gPT09ICdyaWdodCcpIHtcclxuXHRcdFx0eCAtPSBzaXplLndpZHRoO1xyXG5cdFx0fSBlbHNlIGlmICh4QWxpZ24gPT09ICdjZW50ZXInKSB7XHJcblx0XHRcdHggLT0gKHNpemUud2lkdGggLyAyKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoeUFsaWduID09PSAndG9wJykge1xyXG5cdFx0XHR5ICs9IHBhZGRpbmdBbmRTaXplO1xyXG5cdFx0fSBlbHNlIGlmICh5QWxpZ24gPT09ICdib3R0b20nKSB7XHJcblx0XHRcdHkgLT0gc2l6ZS5oZWlnaHQgKyBwYWRkaW5nQW5kU2l6ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHkgLT0gKHNpemUuaGVpZ2h0IC8gMik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHlBbGlnbiA9PT0gJ2NlbnRlcicpIHtcclxuXHRcdFx0aWYgKHhBbGlnbiA9PT0gJ2xlZnQnKSB7XHJcblx0XHRcdFx0eCArPSBwYWRkaW5nQW5kU2l6ZTtcclxuXHRcdFx0fSBlbHNlIGlmICh4QWxpZ24gPT09ICdyaWdodCcpIHtcclxuXHRcdFx0XHR4IC09IHBhZGRpbmdBbmRTaXplO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHhBbGlnbiA9PT0gJ2xlZnQnKSB7XHJcblx0XHRcdHggLT0gcmFkaXVzQW5kUGFkZGluZztcclxuXHRcdH0gZWxzZSBpZiAoeEFsaWduID09PSAncmlnaHQnKSB7XHJcblx0XHRcdHggKz0gcmFkaXVzQW5kUGFkZGluZztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR4OiB4LFxyXG5cdFx0XHR5OiB5XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Q2hhcnQuVG9vbHRpcCA9IENoYXJ0LkVsZW1lbnQuZXh0ZW5kKHtcclxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9tb2RlbCA9IGdldEJhc2VNb2RlbCh0aGlzLl9vcHRpb25zKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gR2V0IHRoZSB0aXRsZVxyXG5cdFx0Ly8gQXJncyBhcmU6ICh0b29sdGlwSXRlbSwgZGF0YSlcclxuXHRcdGdldFRpdGxlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIG9wdHMgPSBtZS5fb3B0aW9ucztcclxuXHRcdFx0dmFyIGNhbGxiYWNrcyA9IG9wdHMuY2FsbGJhY2tzO1xyXG5cclxuXHRcdFx0dmFyIGJlZm9yZVRpdGxlID0gY2FsbGJhY2tzLmJlZm9yZVRpdGxlLmFwcGx5KG1lLCBhcmd1bWVudHMpLFxyXG5cdFx0XHRcdHRpdGxlID0gY2FsbGJhY2tzLnRpdGxlLmFwcGx5KG1lLCBhcmd1bWVudHMpLFxyXG5cdFx0XHRcdGFmdGVyVGl0bGUgPSBjYWxsYmFja3MuYWZ0ZXJUaXRsZS5hcHBseShtZSwgYXJndW1lbnRzKTtcclxuXHJcblx0XHRcdHZhciBsaW5lcyA9IFtdO1xyXG5cdFx0XHRsaW5lcyA9IHB1c2hPckNvbmNhdChsaW5lcywgYmVmb3JlVGl0bGUpO1xyXG5cdFx0XHRsaW5lcyA9IHB1c2hPckNvbmNhdChsaW5lcywgdGl0bGUpO1xyXG5cdFx0XHRsaW5lcyA9IHB1c2hPckNvbmNhdChsaW5lcywgYWZ0ZXJUaXRsZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gbGluZXM7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIEFyZ3MgYXJlOiAodG9vbHRpcEl0ZW0sIGRhdGEpXHJcblx0XHRnZXRCZWZvcmVCb2R5OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIGxpbmVzID0gdGhpcy5fb3B0aW9ucy5jYWxsYmFja3MuYmVmb3JlQm9keS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdFx0XHRyZXR1cm4gaGVscGVycy5pc0FycmF5KGxpbmVzKSA/IGxpbmVzIDogbGluZXMgIT09IHVuZGVmaW5lZCA/IFtsaW5lc10gOiBbXTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gQXJncyBhcmU6ICh0b29sdGlwSXRlbSwgZGF0YSlcclxuXHRcdGdldEJvZHk6IGZ1bmN0aW9uKHRvb2x0aXBJdGVtcywgZGF0YSkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgY2FsbGJhY2tzID0gbWUuX29wdGlvbnMuY2FsbGJhY2tzO1xyXG5cdFx0XHR2YXIgYm9keUl0ZW1zID0gW107XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2godG9vbHRpcEl0ZW1zLCBmdW5jdGlvbih0b29sdGlwSXRlbSkge1xyXG5cdFx0XHRcdHZhciBib2R5SXRlbSA9IHtcclxuXHRcdFx0XHRcdGJlZm9yZTogW10sXHJcblx0XHRcdFx0XHRsaW5lczogW10sXHJcblx0XHRcdFx0XHRhZnRlcjogW11cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHB1c2hPckNvbmNhdChib2R5SXRlbS5iZWZvcmUsIGNhbGxiYWNrcy5iZWZvcmVMYWJlbC5jYWxsKG1lLCB0b29sdGlwSXRlbSwgZGF0YSkpO1xyXG5cdFx0XHRcdHB1c2hPckNvbmNhdChib2R5SXRlbS5saW5lcywgY2FsbGJhY2tzLmxhYmVsLmNhbGwobWUsIHRvb2x0aXBJdGVtLCBkYXRhKSk7XHJcblx0XHRcdFx0cHVzaE9yQ29uY2F0KGJvZHlJdGVtLmFmdGVyLCBjYWxsYmFja3MuYWZ0ZXJMYWJlbC5jYWxsKG1lLCB0b29sdGlwSXRlbSwgZGF0YSkpO1xyXG5cclxuXHRcdFx0XHRib2R5SXRlbXMucHVzaChib2R5SXRlbSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIGJvZHlJdGVtcztcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gQXJncyBhcmU6ICh0b29sdGlwSXRlbSwgZGF0YSlcclxuXHRcdGdldEFmdGVyQm9keTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBsaW5lcyA9IHRoaXMuX29wdGlvbnMuY2FsbGJhY2tzLmFmdGVyQm9keS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdFx0XHRyZXR1cm4gaGVscGVycy5pc0FycmF5KGxpbmVzKSA/IGxpbmVzIDogbGluZXMgIT09IHVuZGVmaW5lZCA/IFtsaW5lc10gOiBbXTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBmb290ZXIgYW5kIGJlZm9yZUZvb3RlciBhbmQgYWZ0ZXJGb290ZXIgbGluZXNcclxuXHRcdC8vIEFyZ3MgYXJlOiAodG9vbHRpcEl0ZW0sIGRhdGEpXHJcblx0XHRnZXRGb290ZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgY2FsbGJhY2tzID0gbWUuX29wdGlvbnMuY2FsbGJhY2tzO1xyXG5cclxuXHRcdFx0dmFyIGJlZm9yZUZvb3RlciA9IGNhbGxiYWNrcy5iZWZvcmVGb290ZXIuYXBwbHkobWUsIGFyZ3VtZW50cyk7XHJcblx0XHRcdHZhciBmb290ZXIgPSBjYWxsYmFja3MuZm9vdGVyLmFwcGx5KG1lLCBhcmd1bWVudHMpO1xyXG5cdFx0XHR2YXIgYWZ0ZXJGb290ZXIgPSBjYWxsYmFja3MuYWZ0ZXJGb290ZXIuYXBwbHkobWUsIGFyZ3VtZW50cyk7XHJcblxyXG5cdFx0XHR2YXIgbGluZXMgPSBbXTtcclxuXHRcdFx0bGluZXMgPSBwdXNoT3JDb25jYXQobGluZXMsIGJlZm9yZUZvb3Rlcik7XHJcblx0XHRcdGxpbmVzID0gcHVzaE9yQ29uY2F0KGxpbmVzLCBmb290ZXIpO1xyXG5cdFx0XHRsaW5lcyA9IHB1c2hPckNvbmNhdChsaW5lcywgYWZ0ZXJGb290ZXIpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGxpbmVzO1xyXG5cdFx0fSxcclxuXHJcblx0XHR1cGRhdGU6IGZ1bmN0aW9uKGNoYW5nZWQpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIG9wdHMgPSBtZS5fb3B0aW9ucztcclxuXHJcblx0XHRcdC8vIE5lZWQgdG8gcmVnZW5lcmF0ZSB0aGUgbW9kZWwgYmVjYXVzZSBpdHMgZmFzdGVyIHRoYW4gdXNpbmcgZXh0ZW5kIGFuZCBpdCBpcyBuZWNlc3NhcnkgZHVlIHRvIHRoZSBvcHRpbWl6YXRpb24gaW4gQ2hhcnQuRWxlbWVudC50cmFuc2l0aW9uXHJcblx0XHRcdC8vIHRoYXQgZG9lcyBfdmlldyA9IF9tb2RlbCBpZiBlYXNlID09PSAxLiBUaGlzIGNhdXNlcyB0aGUgMm5kIHRvb2x0aXAgdXBkYXRlIHRvIHNldCBwcm9wZXJ0aWVzIGluIGJvdGggdGhlIHZpZXcgYW5kIG1vZGVsIGF0IHRoZSBzYW1lIHRpbWVcclxuXHRcdFx0Ly8gd2hpY2ggYnJlYWtzIGFueSBhbmltYXRpb25zLlxyXG5cdFx0XHR2YXIgZXhpc3RpbmdNb2RlbCA9IG1lLl9tb2RlbDtcclxuXHRcdFx0dmFyIG1vZGVsID0gbWUuX21vZGVsID0gZ2V0QmFzZU1vZGVsKG9wdHMpO1xyXG5cdFx0XHR2YXIgYWN0aXZlID0gbWUuX2FjdGl2ZTtcclxuXHJcblx0XHRcdHZhciBkYXRhID0gbWUuX2RhdGE7XHJcblx0XHRcdHZhciBjaGFydEluc3RhbmNlID0gbWUuX2NoYXJ0SW5zdGFuY2U7XHJcblxyXG5cdFx0XHQvLyBJbiB0aGUgY2FzZSB3aGVyZSBhY3RpdmUubGVuZ3RoID09PSAwIHdlIG5lZWQgdG8ga2VlcCB0aGVzZSBhdCBleGlzdGluZyB2YWx1ZXMgZm9yIGdvb2QgYW5pbWF0aW9uc1xyXG5cdFx0XHR2YXIgYWxpZ25tZW50ID0ge1xyXG5cdFx0XHRcdHhBbGlnbjogZXhpc3RpbmdNb2RlbC54QWxpZ24sXHJcblx0XHRcdFx0eUFsaWduOiBleGlzdGluZ01vZGVsLnlBbGlnblxyXG5cdFx0XHR9O1xyXG5cdFx0XHR2YXIgYmFja2dyb3VuZFBvaW50ID0ge1xyXG5cdFx0XHRcdHg6IGV4aXN0aW5nTW9kZWwueCxcclxuXHRcdFx0XHR5OiBleGlzdGluZ01vZGVsLnlcclxuXHRcdFx0fTtcclxuXHRcdFx0dmFyIHRvb2x0aXBTaXplID0ge1xyXG5cdFx0XHRcdHdpZHRoOiBleGlzdGluZ01vZGVsLndpZHRoLFxyXG5cdFx0XHRcdGhlaWdodDogZXhpc3RpbmdNb2RlbC5oZWlnaHRcclxuXHRcdFx0fTtcclxuXHRcdFx0dmFyIHRvb2x0aXBQb3NpdGlvbiA9IHtcclxuXHRcdFx0XHR4OiBleGlzdGluZ01vZGVsLmNhcmV0WCxcclxuXHRcdFx0XHR5OiBleGlzdGluZ01vZGVsLmNhcmV0WVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIGksIGxlbjtcclxuXHJcblx0XHRcdGlmIChhY3RpdmUubGVuZ3RoKSB7XHJcblx0XHRcdFx0bW9kZWwub3BhY2l0eSA9IDE7XHJcblxyXG5cdFx0XHRcdHZhciBsYWJlbENvbG9ycyA9IFtdO1xyXG5cdFx0XHRcdHRvb2x0aXBQb3NpdGlvbiA9IENoYXJ0LlRvb2x0aXAucG9zaXRpb25lcnNbb3B0cy5wb3NpdGlvbl0oYWN0aXZlLCBtZS5fZXZlbnRQb3NpdGlvbik7XHJcblxyXG5cdFx0XHRcdHZhciB0b29sdGlwSXRlbXMgPSBbXTtcclxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsZW4gPSBhY3RpdmUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuXHRcdFx0XHRcdHRvb2x0aXBJdGVtcy5wdXNoKGNyZWF0ZVRvb2x0aXBJdGVtKGFjdGl2ZVtpXSkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBmaWx0ZXIgZnVuY3Rpb24sIHVzZSBpdCB0byBtb2RpZnkgdGhlIHRvb2x0aXAgaXRlbXNcclxuXHRcdFx0XHRpZiAob3B0cy5maWx0ZXIpIHtcclxuXHRcdFx0XHRcdHRvb2x0aXBJdGVtcyA9IHRvb2x0aXBJdGVtcy5maWx0ZXIoZnVuY3Rpb24oYSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gb3B0cy5maWx0ZXIoYSwgZGF0YSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgc29ydGluZyBmdW5jdGlvbiwgdXNlIGl0IHRvIG1vZGlmeSB0aGUgdG9vbHRpcCBpdGVtc1xyXG5cdFx0XHRcdGlmIChvcHRzLml0ZW1Tb3J0KSB7XHJcblx0XHRcdFx0XHR0b29sdGlwSXRlbXMgPSB0b29sdGlwSXRlbXMuc29ydChmdW5jdGlvbihhLCBiKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBvcHRzLml0ZW1Tb3J0KGEsIGIsIGRhdGEpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBEZXRlcm1pbmUgY29sb3JzIGZvciBib3hlc1xyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaCh0b29sdGlwSXRlbXMsIGZ1bmN0aW9uKHRvb2x0aXBJdGVtKSB7XHJcblx0XHRcdFx0XHRsYWJlbENvbG9ycy5wdXNoKG9wdHMuY2FsbGJhY2tzLmxhYmVsQ29sb3IuY2FsbChtZSwgdG9vbHRpcEl0ZW0sIGNoYXJ0SW5zdGFuY2UpKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQnVpbGQgdGhlIFRleHQgTGluZXNcclxuXHRcdFx0XHRtb2RlbC50aXRsZSA9IG1lLmdldFRpdGxlKHRvb2x0aXBJdGVtcywgZGF0YSk7XHJcblx0XHRcdFx0bW9kZWwuYmVmb3JlQm9keSA9IG1lLmdldEJlZm9yZUJvZHkodG9vbHRpcEl0ZW1zLCBkYXRhKTtcclxuXHRcdFx0XHRtb2RlbC5ib2R5ID0gbWUuZ2V0Qm9keSh0b29sdGlwSXRlbXMsIGRhdGEpO1xyXG5cdFx0XHRcdG1vZGVsLmFmdGVyQm9keSA9IG1lLmdldEFmdGVyQm9keSh0b29sdGlwSXRlbXMsIGRhdGEpO1xyXG5cdFx0XHRcdG1vZGVsLmZvb3RlciA9IG1lLmdldEZvb3Rlcih0b29sdGlwSXRlbXMsIGRhdGEpO1xyXG5cclxuXHRcdFx0XHQvLyBJbml0aWFsIHBvc2l0aW9uaW5nIGFuZCBjb2xvcnNcclxuXHRcdFx0XHRtb2RlbC54ID0gTWF0aC5yb3VuZCh0b29sdGlwUG9zaXRpb24ueCk7XHJcblx0XHRcdFx0bW9kZWwueSA9IE1hdGgucm91bmQodG9vbHRpcFBvc2l0aW9uLnkpO1xyXG5cdFx0XHRcdG1vZGVsLmNhcmV0UGFkZGluZyA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQodG9vbHRpcFBvc2l0aW9uLnBhZGRpbmcsIDIpO1xyXG5cdFx0XHRcdG1vZGVsLmxhYmVsQ29sb3JzID0gbGFiZWxDb2xvcnM7XHJcblxyXG5cdFx0XHRcdC8vIGRhdGEgcG9pbnRzXHJcblx0XHRcdFx0bW9kZWwuZGF0YVBvaW50cyA9IHRvb2x0aXBJdGVtcztcclxuXHJcblx0XHRcdFx0Ly8gV2UgbmVlZCB0byBkZXRlcm1pbmUgYWxpZ25tZW50IG9mIHRoZSB0b29sdGlwXHJcblx0XHRcdFx0dG9vbHRpcFNpemUgPSBnZXRUb29sdGlwU2l6ZSh0aGlzLCBtb2RlbCk7XHJcblx0XHRcdFx0YWxpZ25tZW50ID0gZGV0ZXJtaW5lQWxpZ25tZW50KHRoaXMsIHRvb2x0aXBTaXplKTtcclxuXHRcdFx0XHQvLyBGaW5hbCBTaXplIGFuZCBQb3NpdGlvblxyXG5cdFx0XHRcdGJhY2tncm91bmRQb2ludCA9IGdldEJhY2tncm91bmRQb2ludChtb2RlbCwgdG9vbHRpcFNpemUsIGFsaWdubWVudCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bW9kZWwub3BhY2l0eSA9IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdG1vZGVsLnhBbGlnbiA9IGFsaWdubWVudC54QWxpZ247XHJcblx0XHRcdG1vZGVsLnlBbGlnbiA9IGFsaWdubWVudC55QWxpZ247XHJcblx0XHRcdG1vZGVsLnggPSBiYWNrZ3JvdW5kUG9pbnQueDtcclxuXHRcdFx0bW9kZWwueSA9IGJhY2tncm91bmRQb2ludC55O1xyXG5cdFx0XHRtb2RlbC53aWR0aCA9IHRvb2x0aXBTaXplLndpZHRoO1xyXG5cdFx0XHRtb2RlbC5oZWlnaHQgPSB0b29sdGlwU2l6ZS5oZWlnaHQ7XHJcblxyXG5cdFx0XHQvLyBQb2ludCB3aGVyZSB0aGUgY2FyZXQgb24gdGhlIHRvb2x0aXAgcG9pbnRzIHRvXHJcblx0XHRcdG1vZGVsLmNhcmV0WCA9IHRvb2x0aXBQb3NpdGlvbi54O1xyXG5cdFx0XHRtb2RlbC5jYXJldFkgPSB0b29sdGlwUG9zaXRpb24ueTtcclxuXHJcblx0XHRcdG1lLl9tb2RlbCA9IG1vZGVsO1xyXG5cclxuXHRcdFx0aWYgKGNoYW5nZWQgJiYgb3B0cy5jdXN0b20pIHtcclxuXHRcdFx0XHRvcHRzLmN1c3RvbS5jYWxsKG1lLCBtb2RlbCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBtZTtcclxuXHRcdH0sXHJcblx0XHRkcmF3Q2FyZXQ6IGZ1bmN0aW9uKHRvb2x0aXBQb2ludCwgc2l6ZSwgb3BhY2l0eSkge1xyXG5cdFx0XHR2YXIgdm0gPSB0aGlzLl92aWV3O1xyXG5cdFx0XHR2YXIgY3R4ID0gdGhpcy5fY2hhcnQuY3R4O1xyXG5cdFx0XHR2YXIgeDEsIHgyLCB4MztcclxuXHRcdFx0dmFyIHkxLCB5MiwgeTM7XHJcblx0XHRcdHZhciBjYXJldFNpemUgPSB2bS5jYXJldFNpemU7XHJcblx0XHRcdHZhciBjb3JuZXJSYWRpdXMgPSB2bS5jb3JuZXJSYWRpdXM7XHJcblx0XHRcdHZhciB4QWxpZ24gPSB2bS54QWxpZ24sXHJcblx0XHRcdFx0eUFsaWduID0gdm0ueUFsaWduO1xyXG5cdFx0XHR2YXIgcHRYID0gdG9vbHRpcFBvaW50LngsXHJcblx0XHRcdFx0cHRZID0gdG9vbHRpcFBvaW50Lnk7XHJcblx0XHRcdHZhciB3aWR0aCA9IHNpemUud2lkdGgsXHJcblx0XHRcdFx0aGVpZ2h0ID0gc2l6ZS5oZWlnaHQ7XHJcblxyXG5cdFx0XHRpZiAoeUFsaWduID09PSAnY2VudGVyJykge1xyXG5cdFx0XHRcdC8vIExlZnQgb3IgcmlnaHQgc2lkZVxyXG5cdFx0XHRcdGlmICh4QWxpZ24gPT09ICdsZWZ0Jykge1xyXG5cdFx0XHRcdFx0eDEgPSBwdFg7XHJcblx0XHRcdFx0XHR4MiA9IHgxIC0gY2FyZXRTaXplO1xyXG5cdFx0XHRcdFx0eDMgPSB4MTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0eDEgPSBwdFggKyB3aWR0aDtcclxuXHRcdFx0XHRcdHgyID0geDEgKyBjYXJldFNpemU7XHJcblx0XHRcdFx0XHR4MyA9IHgxO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0eTIgPSBwdFkgKyAoaGVpZ2h0IC8gMik7XHJcblx0XHRcdFx0eTEgPSB5MiAtIGNhcmV0U2l6ZTtcclxuXHRcdFx0XHR5MyA9IHkyICsgY2FyZXRTaXplO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICh4QWxpZ24gPT09ICdsZWZ0Jykge1xyXG5cdFx0XHRcdFx0eDEgPSBwdFggKyBjb3JuZXJSYWRpdXM7XHJcblx0XHRcdFx0XHR4MiA9IHgxICsgY2FyZXRTaXplO1xyXG5cdFx0XHRcdFx0eDMgPSB4MiArIGNhcmV0U2l6ZTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHhBbGlnbiA9PT0gJ3JpZ2h0Jykge1xyXG5cdFx0XHRcdFx0eDEgPSBwdFggKyB3aWR0aCAtIGNvcm5lclJhZGl1cztcclxuXHRcdFx0XHRcdHgyID0geDEgLSBjYXJldFNpemU7XHJcblx0XHRcdFx0XHR4MyA9IHgyIC0gY2FyZXRTaXplO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR4MiA9IHB0WCArICh3aWR0aCAvIDIpO1xyXG5cdFx0XHRcdFx0eDEgPSB4MiAtIGNhcmV0U2l6ZTtcclxuXHRcdFx0XHRcdHgzID0geDIgKyBjYXJldFNpemU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoeUFsaWduID09PSAndG9wJykge1xyXG5cdFx0XHRcdFx0eTEgPSBwdFk7XHJcblx0XHRcdFx0XHR5MiA9IHkxIC0gY2FyZXRTaXplO1xyXG5cdFx0XHRcdFx0eTMgPSB5MTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0eTEgPSBwdFkgKyBoZWlnaHQ7XHJcblx0XHRcdFx0XHR5MiA9IHkxICsgY2FyZXRTaXplO1xyXG5cdFx0XHRcdFx0eTMgPSB5MTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGN0eC5zZXRGaWxsU3R5bGUobWVyZ2VPcGFjaXR5KHZtLmJhY2tncm91bmRDb2xvciwgb3BhY2l0eSkpO1xyXG5cdFx0XHRjdHguYmVnaW5QYXRoKCk7XHJcblx0XHRcdGN0eC5tb3ZlVG8oeDEsIHkxKTtcclxuXHRcdFx0Y3R4LmxpbmVUbyh4MiwgeTIpO1xyXG5cdFx0XHRjdHgubGluZVRvKHgzLCB5Myk7XHJcblx0XHRcdGN0eC5jbG9zZVBhdGgoKTtcclxuXHRcdFx0Y3R4LmZpbGwoKTtcclxuXHRcdH0sXHJcblx0XHRkcmF3VGl0bGU6IGZ1bmN0aW9uKHB0LCB2bSwgY3R4LCBvcGFjaXR5KSB7XHJcblx0XHRcdHZhciB0aXRsZSA9IHZtLnRpdGxlO1xyXG5cclxuXHRcdFx0aWYgKHRpdGxlLmxlbmd0aCkge1xyXG5cdFx0XHRcdGN0eC50ZXh0QWxpZ24gPSB2bS5fdGl0bGVBbGlnbjtcclxuXHRcdFx0XHRjdHgudGV4dEJhc2VsaW5lID0gJ3RvcCc7XHJcblxyXG5cdFx0XHRcdHZhciB0aXRsZUZvbnRTaXplID0gdm0udGl0bGVGb250U2l6ZSxcclxuXHRcdFx0XHRcdHRpdGxlU3BhY2luZyA9IHZtLnRpdGxlU3BhY2luZztcclxuXHJcblx0XHRcdFx0Y3R4LnNldEZpbGxTdHlsZShtZXJnZU9wYWNpdHkodm0udGl0bGVGb250Q29sb3IsIG9wYWNpdHkpKTtcclxuXHRcdFx0XHRjdHguZm9udCA9IGhlbHBlcnMuZm9udFN0cmluZyh0aXRsZUZvbnRTaXplLCB2bS5fdGl0bGVGb250U3R5bGUsIHZtLl90aXRsZUZvbnRGYW1pbHkpO1xyXG5cdFx0XHRcdGN0eC5zZXRGb250U2l6ZSh0aXRsZUZvbnRTaXplKTtcclxuXHJcblx0XHRcdFx0dmFyIGksIGxlbjtcclxuXHRcdFx0XHR2YXIgb2Zmc2V0WT04O1xyXG5cdFx0XHRcdGlmKCF2bS5kaXNwbGF5Q29sb3JzKXtcclxuXHRcdFx0XHRcdG9mZnNldFk9MTM7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZvciAoaSA9IDAsIGxlbiA9IHRpdGxlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcblx0XHRcdFx0XHRjdHguZmlsbFRleHQodGl0bGVbaV0sIHB0LngsIHB0Lnkrb2Zmc2V0WSk7Ly90b2RvICs0IHRpdGxl5b6A5LiL56e75Yqo5LiA54K554K5XHJcblx0XHRcdFx0XHRwdC55ICs9IHRpdGxlRm9udFNpemUgKyB0aXRsZVNwYWNpbmc7IC8vIExpbmUgSGVpZ2h0IGFuZCBzcGFjaW5nXHJcblxyXG5cdFx0XHRcdFx0aWYgKGkgKyAxID09PSB0aXRsZS5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0cHQueSArPSB2bS50aXRsZU1hcmdpbkJvdHRvbSAtIHRpdGxlU3BhY2luZzsgLy8gSWYgTGFzdCwgYWRkIG1hcmdpbiwgcmVtb3ZlIHNwYWNpbmdcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRkcmF3Qm9keTogZnVuY3Rpb24ocHQsIHZtLCBjdHgsIG9wYWNpdHkpIHtcclxuXHRcdFx0dmFyIGJvZHlGb250U2l6ZSA9IHZtLmJvZHlGb250U2l6ZTtcclxuXHRcdFx0dmFyIGJvZHlTcGFjaW5nID0gdm0uYm9keVNwYWNpbmc7XHJcblx0XHRcdHZhciBib2R5ID0gdm0uYm9keTtcclxuXHJcblx0XHRcdGN0eC50ZXh0QWxpZ24gPSB2bS5fYm9keUFsaWduO1xyXG5cdFx0XHRjdHgudGV4dEJhc2VsaW5lID0gJ3RvcCc7XHJcblxyXG5cdFx0XHR2YXIgdGV4dENvbG9yID0gbWVyZ2VPcGFjaXR5KHZtLmJvZHlGb250Q29sb3IsIG9wYWNpdHkpO1xyXG5cdFx0XHRjdHguc2V0RmlsbFN0eWxlKHRleHRDb2xvcik7XHJcblx0XHRcdGN0eC5mb250ID0gaGVscGVycy5mb250U3RyaW5nKGJvZHlGb250U2l6ZSwgdm0uX2JvZHlGb250U3R5bGUsIHZtLl9ib2R5Rm9udEZhbWlseSk7XHJcblx0XHRcdGN0eC5zZXRGb250U2l6ZShib2R5Rm9udFNpemUpO1xyXG5cclxuXHRcdFx0Ly8gQmVmb3JlIEJvZHlcclxuXHRcdFx0dmFyIHhMaW5lUGFkZGluZyA9IDA7XHJcblx0XHRcdHZhciBmaWxsTGluZU9mVGV4dCA9IGZ1bmN0aW9uKGxpbmUpIHtcclxuXHRcdFx0XHRjdHguZmlsbFRleHQobGluZSwgcHQueCArIHhMaW5lUGFkZGluZywgcHQueSsxMCk7Ly90b2RvICsxMCB0aXRsZeW+gOS4i+enu+WKqOS4gOeCueeCuVxyXG5cdFx0XHRcdHB0LnkgKz0gYm9keUZvbnRTaXplICsgYm9keVNwYWNpbmc7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBCZWZvcmUgYm9keSBsaW5lc1xyXG5cdFx0XHRoZWxwZXJzLmVhY2godm0uYmVmb3JlQm9keSwgZmlsbExpbmVPZlRleHQpO1xyXG5cclxuXHRcdFx0dmFyIGRyYXdDb2xvckJveGVzID0gdm0uZGlzcGxheUNvbG9ycztcclxuXHRcdFx0eExpbmVQYWRkaW5nID0gZHJhd0NvbG9yQm94ZXMgPyAoYm9keUZvbnRTaXplICsgMikgOiAwO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyBib2R5IGxpbmVzIG5vd1xyXG5cdFx0XHRoZWxwZXJzLmVhY2goYm9keSwgZnVuY3Rpb24oYm9keUl0ZW0sIGkpIHtcclxuXHRcdFx0XHRoZWxwZXJzLmVhY2goYm9keUl0ZW0uYmVmb3JlLCBmaWxsTGluZU9mVGV4dCk7XHJcblxyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaChib2R5SXRlbS5saW5lcywgZnVuY3Rpb24obGluZSkge1xyXG5cdFx0XHRcdFx0Ly8gRHJhdyBMZWdlbmQtbGlrZSBib3hlcyBpZiBuZWVkZWRcclxuXHRcdFx0XHRcdGlmIChkcmF3Q29sb3JCb3hlcykge1xyXG5cdFx0XHRcdFx0XHQvLyBGaWxsIGEgd2hpdGUgcmVjdCBzbyB0aGF0IGNvbG91cnMgbWVyZ2UgbmljZWx5IGlmIHRoZSBvcGFjaXR5IGlzIDwgMVxyXG5cdFx0XHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKG1lcmdlT3BhY2l0eSh2bS5sZWdlbmRDb2xvckJhY2tncm91bmQsIG9wYWNpdHkpKTtcclxuXHRcdFx0XHRcdFx0Y3R4LmZpbGxSZWN0KHB0LngsIHB0LnksIGJvZHlGb250U2l6ZSwgYm9keUZvbnRTaXplKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEJvcmRlclxyXG5cdFx0XHRcdFx0XHRjdHguc2V0U3Ryb2tlU3R5bGUobWVyZ2VPcGFjaXR5KHZtLmxhYmVsQ29sb3JzW2ldLmJvcmRlckNvbG9yLCBvcGFjaXR5KSk7XHJcblx0XHRcdFx0XHRcdGN0eC5zdHJva2VSZWN0KHB0LngsIHB0LnksIGJvZHlGb250U2l6ZSwgYm9keUZvbnRTaXplKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIElubmVyIHNxdWFyZVxyXG5cdFx0XHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKG1lcmdlT3BhY2l0eSh2bS5sYWJlbENvbG9yc1tpXS5iYWNrZ3JvdW5kQ29sb3IsIG9wYWNpdHkpKTtcclxuXHRcdFx0XHRcdFx0Y3R4LmZpbGxSZWN0KHB0LnggKyAxLCBwdC55ICsgMSwgYm9keUZvbnRTaXplIC0gMiwgYm9keUZvbnRTaXplIC0gMik7XHJcblxyXG5cdFx0XHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKHRleHRDb2xvcik7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0ZmlsbExpbmVPZlRleHQobGluZSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaChib2R5SXRlbS5hZnRlciwgZmlsbExpbmVPZlRleHQpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFJlc2V0IGJhY2sgdG8gMCBmb3IgYWZ0ZXIgYm9keVxyXG5cdFx0XHR4TGluZVBhZGRpbmcgPSAwO1xyXG5cclxuXHRcdFx0Ly8gQWZ0ZXIgYm9keSBsaW5lc1xyXG5cdFx0XHRoZWxwZXJzLmVhY2godm0uYWZ0ZXJCb2R5LCBmaWxsTGluZU9mVGV4dCk7XHJcblx0XHRcdHB0LnkgLT0gYm9keVNwYWNpbmc7IC8vIFJlbW92ZSBsYXN0IGJvZHkgc3BhY2luZ1xyXG5cdFx0fSxcclxuXHRcdGRyYXdGb290ZXI6IGZ1bmN0aW9uKHB0LCB2bSwgY3R4LCBvcGFjaXR5KSB7XHJcblx0XHRcdHZhciBmb290ZXIgPSB2bS5mb290ZXI7XHJcblxyXG5cdFx0XHRpZiAoZm9vdGVyLmxlbmd0aCkge1xyXG5cdFx0XHRcdHB0LnkgKz0gdm0uZm9vdGVyTWFyZ2luVG9wO1xyXG5cclxuXHRcdFx0XHRjdHgudGV4dEFsaWduID0gdm0uX2Zvb3RlckFsaWduO1xyXG5cdFx0XHRcdGN0eC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuXHJcblx0XHRcdFx0Y3R4LnNldEZpbGxTdHlsZShtZXJnZU9wYWNpdHkodm0uZm9vdGVyRm9udENvbG9yLCBvcGFjaXR5KSk7XHJcblx0XHRcdFx0Y3R4LmZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodm0uZm9vdGVyRm9udFNpemUsIHZtLl9mb290ZXJGb250U3R5bGUsIHZtLl9mb290ZXJGb250RmFtaWx5KTtcclxuXHRcdFx0XHRjdHguc2V0Rm9udFNpemUodm0uZm9vdGVyRm9udFNpemUpO1xyXG5cclxuXHRcdFx0XHRoZWxwZXJzLmVhY2goZm9vdGVyLCBmdW5jdGlvbihsaW5lKSB7XHJcblx0XHRcdFx0XHRjdHguZmlsbFRleHQobGluZSwgcHQueCwgcHQueSk7XHJcblx0XHRcdFx0XHRwdC55ICs9IHZtLmZvb3RlckZvbnRTaXplICsgdm0uZm9vdGVyU3BhY2luZztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGRyYXdCYWNrZ3JvdW5kOiBmdW5jdGlvbihwdCwgdm0sIGN0eCwgdG9vbHRpcFNpemUsIG9wYWNpdHkpIHtcclxuXHRcdFx0Y3R4LnNldEZpbGxTdHlsZShtZXJnZU9wYWNpdHkodm0uYmFja2dyb3VuZENvbG9yLCBvcGFjaXR5KSk7XHJcblx0XHRcdGhlbHBlcnMuZHJhd1JvdW5kZWRSZWN0YW5nbGUoY3R4LCBwdC54LCBwdC55LCB0b29sdGlwU2l6ZS53aWR0aCwgdG9vbHRpcFNpemUuaGVpZ2h0LCB2bS5jb3JuZXJSYWRpdXMpO1xyXG5cdFx0XHRjdHguZmlsbCgpO1xyXG5cdFx0fSxcclxuXHRcdGRyYXc6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgY3R4ID0gdGhpcy5fY2hhcnQuY3R4O1xyXG5cdFx0XHR2YXIgdm0gPSB0aGlzLl92aWV3O1xyXG5cclxuXHRcdFx0aWYgKHZtLm9wYWNpdHkgPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB0b29sdGlwU2l6ZSA9IHtcclxuXHRcdFx0XHR3aWR0aDogdm0ud2lkdGgsXHJcblx0XHRcdFx0aGVpZ2h0OiB2bS5oZWlnaHRcclxuXHRcdFx0fTtcclxuXHRcdFx0dmFyIHB0ID0ge1xyXG5cdFx0XHRcdHg6IHZtLngsXHJcblx0XHRcdFx0eTogdm0ueVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gSUUxMS9FZGdlIGRvZXMgbm90IGxpa2UgdmVyeSBzbWFsbCBvcGFjaXRpZXMsIHNvIHNuYXAgdG8gMFxyXG5cdFx0XHR2YXIgb3BhY2l0eSA9IE1hdGguYWJzKHZtLm9wYWNpdHkgPCAxZS0zKSA/IDAgOiB2bS5vcGFjaXR5O1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuX29wdGlvbnMuZW5hYmxlZCkge1xyXG5cdFx0XHRcdC8vIERyYXcgQmFja2dyb3VuZFxyXG5cdFx0XHRcdHRoaXMuZHJhd0JhY2tncm91bmQocHQsIHZtLCBjdHgsIHRvb2x0aXBTaXplLCBvcGFjaXR5KTtcclxuXHJcblx0XHRcdFx0Ly8gRHJhdyBDYXJldFxyXG5cdFx0XHRcdHRoaXMuZHJhd0NhcmV0KHB0LCB0b29sdGlwU2l6ZSwgb3BhY2l0eSk7XHJcblxyXG5cdFx0XHRcdC8vIERyYXcgVGl0bGUsIEJvZHksIGFuZCBGb290ZXJcclxuXHRcdFx0XHRwdC54ICs9IHZtLnhQYWRkaW5nO1xyXG5cdFx0XHRcdHB0LnkgKz0gdm0ueVBhZGRpbmc7XHJcblxyXG5cdFx0XHRcdC8vIFRpdGxlc1xyXG5cdFx0XHRcdHRoaXMuZHJhd1RpdGxlKHB0LCB2bSwgY3R4LCBvcGFjaXR5KTtcclxuXHJcblx0XHRcdFx0Ly8gQm9keVxyXG5cdFx0XHRcdHRoaXMuZHJhd0JvZHkocHQsIHZtLCBjdHgsIG9wYWNpdHkpO1xyXG5cclxuXHRcdFx0XHQvLyBGb290ZXJcclxuXHRcdFx0XHR0aGlzLmRyYXdGb290ZXIocHQsIHZtLCBjdHgsIG9wYWNpdHkpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogSGFuZGxlIGFuIGV2ZW50XHJcblx0XHQgKiBAcHJpdmF0ZVxyXG5cdFx0ICogQHBhcmFtIGUge0V2ZW50fSB0aGUgZXZlbnQgdG8gaGFuZGxlXHJcblx0XHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGUgdG9vbHRpcCBjaGFuZ2VkXHJcblx0XHQgKi9cclxuXHRcdGhhbmRsZUV2ZW50OiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBvcHRpb25zID0gbWUuX29wdGlvbnM7XHJcblx0XHRcdHZhciBjaGFuZ2VkID0gZmFsc2U7XHJcblxyXG5cdFx0XHRtZS5fbGFzdEFjdGl2ZSA9IG1lLl9sYXN0QWN0aXZlIHx8IFtdO1xyXG5cclxuXHRcdFx0Ly8gRmluZCBBY3RpdmUgRWxlbWVudHMgZm9yIHRvb2x0aXBzXHJcblx0XHRcdGlmIChlLnR5cGUgPT09ICdtb3VzZW91dCcpIHtcclxuXHRcdFx0XHRtZS5fYWN0aXZlID0gW107XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bWUuX2FjdGl2ZSA9IG1lLl9jaGFydEluc3RhbmNlLmdldEVsZW1lbnRzQXRFdmVudEZvck1vZGUoZSwgb3B0aW9ucy5tb2RlLCBvcHRpb25zKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVtZW1iZXIgTGFzdCBBY3RpdmVzXHJcblx0XHRcdGNoYW5nZWQgPSAhaGVscGVycy5hcnJheUVxdWFscyhtZS5fYWN0aXZlLCBtZS5fbGFzdEFjdGl2ZSk7XHJcblx0XHRcdG1lLl9sYXN0QWN0aXZlID0gbWUuX2FjdGl2ZTtcclxuXHJcblx0XHRcdGlmIChvcHRpb25zLmVuYWJsZWQgfHwgb3B0aW9ucy5jdXN0b20pIHtcclxuXHRcdFx0XHRtZS5fZXZlbnRQb3NpdGlvbiA9IGhlbHBlcnMuZ2V0UmVsYXRpdmVQb3NpdGlvbihlLCBtZS5fY2hhcnQpO1xyXG5cclxuXHRcdFx0XHR2YXIgbW9kZWwgPSBtZS5fbW9kZWw7XHJcblx0XHRcdFx0bWUudXBkYXRlKHRydWUpO1xyXG5cdFx0XHRcdG1lLnBpdm90KCk7XHJcblxyXG5cdFx0XHRcdC8vIFNlZSBpZiBvdXIgdG9vbHRpcCBwb3NpdGlvbiBjaGFuZ2VkXHJcblx0XHRcdFx0Y2hhbmdlZCB8PSAobW9kZWwueCAhPT0gbWUuX21vZGVsLngpIHx8IChtb2RlbC55ICE9PSBtZS5fbW9kZWwueSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBjaGFuZ2VkO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQvKipcclxuXHQgKiBAbmFtZXNwYWNlIENoYXJ0LlRvb2x0aXAucG9zaXRpb25lcnNcclxuXHQgKi9cclxuXHRDaGFydC5Ub29sdGlwLnBvc2l0aW9uZXJzID0ge1xyXG5cdFx0LyoqXHJcblx0XHQgKiBBdmVyYWdlIG1vZGUgcGxhY2VzIHRoZSB0b29sdGlwIGF0IHRoZSBhdmVyYWdlIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50cyBzaG93blxyXG5cdFx0ICogQGZ1bmN0aW9uIENoYXJ0LlRvb2x0aXAucG9zaXRpb25lcnMuYXZlcmFnZVxyXG5cdFx0ICogQHBhcmFtIGVsZW1lbnRzIHtDaGFydEVsZW1lbnRbXX0gdGhlIGVsZW1lbnRzIGJlaW5nIGRpc3BsYXllZCBpbiB0aGUgdG9vbHRpcFxyXG5cdFx0ICogQHJldHVybnMge1BvaW50fSB0b29sdGlwIHBvc2l0aW9uXHJcblx0XHQgKi9cclxuXHRcdGF2ZXJhZ2U6IGZ1bmN0aW9uKGVsZW1lbnRzKSB7XHJcblx0XHRcdGlmICghZWxlbWVudHMubGVuZ3RoKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgaSwgbGVuO1xyXG5cdFx0XHR2YXIgeCA9IDA7XHJcblx0XHRcdHZhciB5ID0gMDtcclxuXHRcdFx0dmFyIGNvdW50ID0gMDtcclxuXHJcblx0XHRcdGZvciAoaSA9IDAsIGxlbiA9IGVsZW1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcblx0XHRcdFx0dmFyIGVsID0gZWxlbWVudHNbaV07XHJcblx0XHRcdFx0aWYgKGVsICYmIGVsLmhhc1ZhbHVlKCkpIHtcclxuXHRcdFx0XHRcdHZhciBwb3MgPSBlbC50b29sdGlwUG9zaXRpb24oKTtcclxuXHRcdFx0XHRcdHggKz0gcG9zLng7XHJcblx0XHRcdFx0XHR5ICs9IHBvcy55O1xyXG5cdFx0XHRcdFx0Kytjb3VudDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0eDogTWF0aC5yb3VuZCh4IC8gY291bnQpLFxyXG5cdFx0XHRcdHk6IE1hdGgucm91bmQoeSAvIGNvdW50KVxyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEdldHMgdGhlIHRvb2x0aXAgcG9zaXRpb24gbmVhcmVzdCBvZiB0aGUgaXRlbSBuZWFyZXN0IHRvIHRoZSBldmVudCBwb3NpdGlvblxyXG5cdFx0ICogQGZ1bmN0aW9uIENoYXJ0LlRvb2x0aXAucG9zaXRpb25lcnMubmVhcmVzdFxyXG5cdFx0ICogQHBhcmFtIGVsZW1lbnRzIHtDaGFydC5FbGVtZW50W119IHRoZSB0b29sdGlwIGVsZW1lbnRzXHJcblx0XHQgKiBAcGFyYW0gZXZlbnRQb3NpdGlvbiB7UG9pbnR9IHRoZSBwb3NpdGlvbiBvZiB0aGUgZXZlbnQgaW4gY2FudmFzIGNvb3JkaW5hdGVzXHJcblx0XHQgKiBAcmV0dXJucyB7UG9pbnR9IHRoZSB0b29sdGlwIHBvc2l0aW9uXHJcblx0XHQgKi9cclxuXHRcdG5lYXJlc3Q6IGZ1bmN0aW9uKGVsZW1lbnRzLCBldmVudFBvc2l0aW9uKSB7XHJcblx0XHRcdHZhciB4ID0gZXZlbnRQb3NpdGlvbi54O1xyXG5cdFx0XHR2YXIgeSA9IGV2ZW50UG9zaXRpb24ueTtcclxuXHJcblx0XHRcdHZhciBuZWFyZXN0RWxlbWVudDtcclxuXHRcdFx0dmFyIG1pbkRpc3RhbmNlID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xyXG5cdFx0XHR2YXIgaSwgbGVuO1xyXG5cdFx0XHRmb3IgKGkgPSAwLCBsZW4gPSBlbGVtZW50cy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG5cdFx0XHRcdHZhciBlbCA9IGVsZW1lbnRzW2ldO1xyXG5cdFx0XHRcdGlmIChlbCAmJiBlbC5oYXNWYWx1ZSgpKSB7XHJcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gZWwuZ2V0Q2VudGVyUG9pbnQoKTtcclxuXHRcdFx0XHRcdHZhciBkID0gaGVscGVycy5kaXN0YW5jZUJldHdlZW5Qb2ludHMoZXZlbnRQb3NpdGlvbiwgY2VudGVyKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoZCA8IG1pbkRpc3RhbmNlKSB7XHJcblx0XHRcdFx0XHRcdG1pbkRpc3RhbmNlID0gZDtcclxuXHRcdFx0XHRcdFx0bmVhcmVzdEVsZW1lbnQgPSBlbDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChuZWFyZXN0RWxlbWVudCkge1xyXG5cdFx0XHRcdHZhciB0cCA9IG5lYXJlc3RFbGVtZW50LnRvb2x0aXBQb3NpdGlvbigpO1xyXG5cdFx0XHRcdHggPSB0cC54O1xyXG5cdFx0XHRcdHkgPSB0cC55O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHg6IHgsXHJcblx0XHRcdFx0eTogeVxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiJdfQ==
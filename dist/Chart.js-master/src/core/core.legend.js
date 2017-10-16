'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;
	var noop = helpers.noop;

	Chart.defaults.global.legend = {

		display: true,
		displayFixed: true,
		position: 'top',
		fullWidth: true, // marks that this box should take the full width of the canvas (pushing down other boxes)
		reverse: false,

		// a callback that will handle
		onClick: function onClick(e, legendItem) {
			var index = legendItem.datasetIndex;
			var ci = this.chart;
			var meta = ci.getDatasetMeta(index);

			// See controller.isDatasetVisible comment
			meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

			// We hid a dataset ... rerender the chart
			ci.update();
		},

		onHover: null,

		labels: {
			boxWidth: 40,
			padding: 10,
			// Generates labels shown in the legend
			// Valid properties to return:
			// text : text to display
			// fillStyle : fill of coloured box
			// strokeStyle: stroke of coloured box
			// hidden : if this legend item refers to a hidden item
			// lineCap : cap style for line
			// lineDash
			// lineDashOffset :
			// lineJoin :
			// lineWidth :
			generateLabels: function generateLabels(chart) {
				var data = chart.data;
				return helpers.isArray(data.datasets) ? data.datasets.map(function (dataset, i) {
					return {
						text: dataset.label,
						fillStyle: !helpers.isArray(dataset.backgroundColor) ? dataset.backgroundColor : dataset.backgroundColor[0],
						hidden: !chart.isDatasetVisible(i),
						lineCap: dataset.borderCapStyle,
						lineDash: dataset.borderDash,
						lineDashOffset: dataset.borderDashOffset,
						lineJoin: dataset.borderJoinStyle,
						lineWidth: dataset.borderWidth,
						strokeStyle: dataset.borderColor,
						pointStyle: dataset.pointStyle,

						// Below is extra data used for toggling the datasets
						datasetIndex: i
					};
				}, this) : [];
			}
		}
	};

	/**
  * Helper function to get the box width based on the usePointStyle option
  * @param labelopts {Object} the label options on the legend
  * @param fontSize {Number} the label font size
  * @return {Number} width of the color box area
  */
	function getBoxWidth(labelOpts, fontSize) {
		return labelOpts.usePointStyle ? fontSize * Math.SQRT2 : labelOpts.boxWidth;
	}

	Chart.Legend = Chart.Element.extend({

		initialize: function initialize(config) {
			helpers.extend(this, config);

			// Contains hit boxes for each dataset (in dataset order)
			this.legendHitBoxes = [];

			// Are we in doughnut mode which has a different data type
			this.doughnutMode = false;
		},

		// These methods are ordered by lifecycle. Utilities then follow.
		// Any function defined here is inherited by all legend types.
		// Any function can be extended by the legend type

		beforeUpdate: noop,
		update: function update(maxWidth, maxHeight, margins) {
			var me = this;

			// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
			me.beforeUpdate();

			// Absorb the master measurements
			me.maxWidth = maxWidth;
			me.maxHeight = maxHeight;
			me.margins = margins;

			// Dimensions
			me.beforeSetDimensions();
			me.setDimensions();
			me.afterSetDimensions();
			// Labels
			me.beforeBuildLabels();
			me.buildLabels();
			me.afterBuildLabels();

			// Fit
			me.beforeFit();
			me.fit();
			me.afterFit();
			//
			me.afterUpdate();

			return me.minSize;
		},
		afterUpdate: noop,

		//

		beforeSetDimensions: noop,
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

			// Reset minSize
			me.minSize = {
				width: 0,
				height: 0
			};
		},
		afterSetDimensions: noop,

		//

		beforeBuildLabels: noop,
		buildLabels: function buildLabels() {
			var me = this;
			me.legendItems = me.options.labels.generateLabels.call(me, me.chart);
			if (me.options.reverse) {
				me.legendItems.reverse();
			}
		},
		afterBuildLabels: noop,

		//

		beforeFit: noop,
		fit: function fit() {
			var me = this;
			var opts = me.options;
			var labelOpts = opts.labels;
			var display = opts.display;

			var ctx = me.ctx;

			var globalDefault = Chart.defaults.global,
			    itemOrDefault = helpers.getValueOrDefault,
			    fontSize = itemOrDefault(labelOpts.fontSize, globalDefault.defaultFontSize),
			    fontStyle = itemOrDefault(labelOpts.fontStyle, globalDefault.defaultFontStyle),
			    fontFamily = itemOrDefault(labelOpts.fontFamily, globalDefault.defaultFontFamily),
			    labelFont = helpers.fontString(fontSize, fontStyle, fontFamily);

			// Reset hit boxes
			var hitboxes = me.legendHitBoxes = [];

			var minSize = me.minSize;
			var isHorizontal = me.isHorizontal();

			if (isHorizontal) {
				minSize.width = me.maxWidth; // fill all the width
				minSize.height = display ? 10 : 0;
			} else {
				minSize.width = display ? 10 : 0;
				minSize.height = me.maxHeight; // fill all the height
			}

			// Increase sizes here
			if (display) {
				ctx.font = labelFont;
				ctx.setFontSize(fontSize);
				if (isHorizontal) {
					// Labels

					// Width of each line of legend boxes. Labels wrap onto multiple lines when there are too many to fit on one
					var lineWidths = me.lineWidths = [0];
					var totalHeight = me.legendItems.length ? fontSize + labelOpts.padding : 0;

					ctx.textAlign = 'left';
					ctx.textBaseline = 'top';

					helpers.each(me.legendItems, function (legendItem, i) {
						var boxWidth = getBoxWidth(labelOpts, fontSize);
						var width = boxWidth + fontSize / 2 + ctx.measureText(legendItem.text).width;

						if (lineWidths[lineWidths.length - 1] + width + labelOpts.padding >= me.width) {
							totalHeight += fontSize + labelOpts.padding;
							lineWidths[lineWidths.length] = me.left;
						}

						// Store the hitbox width and height here. Final position will be updated in `draw`
						hitboxes[i] = {
							left: 0,
							top: 0,
							width: width,
							height: fontSize
						};

						lineWidths[lineWidths.length - 1] += width + labelOpts.padding;
					});

					minSize.height += totalHeight;
				} else {
					var vPadding = labelOpts.padding;
					var columnWidths = me.columnWidths = [];
					var totalWidth = labelOpts.padding;
					var currentColWidth = 0;
					var currentColHeight = 0;
					var itemHeight = fontSize + vPadding;

					helpers.each(me.legendItems, function (legendItem, i) {
						var boxWidth = getBoxWidth(labelOpts, fontSize);
						var itemWidth = boxWidth + fontSize / 2 + ctx.measureText(legendItem.text).width;

						// If too tall, go to new column
						if (currentColHeight + itemHeight > minSize.height) {
							totalWidth += currentColWidth + labelOpts.padding;
							columnWidths.push(currentColWidth); // previous column width

							currentColWidth = 0;
							currentColHeight = 0;
						}

						// Get max width
						currentColWidth = Math.max(currentColWidth, itemWidth);
						currentColHeight += itemHeight;

						// Store the hitbox width and height here. Final position will be updated in `draw`
						hitboxes[i] = {
							left: 0,
							top: 0,
							width: itemWidth,
							height: fontSize
						};
					});

					totalWidth += currentColWidth;
					columnWidths.push(currentColWidth);
					minSize.width += totalWidth;
				}
			}

			me.width = minSize.width;
			me.height = minSize.height;
		},
		afterFit: noop,

		// Shared Methods
		isHorizontal: function isHorizontal() {
			return this.options.position === 'top' || this.options.position === 'bottom';
		},

		// Actually draw the legend on the canvas
		draw: function draw() {
			var me = this;
			var opts = me.options;
			var labelOpts = opts.labels;
			var globalDefault = Chart.defaults.global,
			    lineDefault = globalDefault.elements.line,
			    legendWidth = me.width,
			    lineWidths = me.lineWidths;

			if (opts.display) {
				var ctx = me.ctx,
				    cursor,
				    itemOrDefault = helpers.getValueOrDefault,
				    fontColor = itemOrDefault(labelOpts.fontColor, globalDefault.defaultFontColor),
				    fontSize = itemOrDefault(labelOpts.fontSize, globalDefault.defaultFontSize),
				    fontStyle = itemOrDefault(labelOpts.fontStyle, globalDefault.defaultFontStyle),
				    fontFamily = itemOrDefault(labelOpts.fontFamily, globalDefault.defaultFontFamily),
				    labelFont = helpers.fontString(fontSize, fontStyle, fontFamily);

				// Canvas setup
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.setLineWidth(0.5);
				ctx.setStrokeStyle(fontColor); // for strikethrough effect
				ctx.setFillStyle(fontColor); // render in correct colour
				ctx.font = labelFont;
				ctx.setFontSize(fontSize);

				var boxWidth = getBoxWidth(labelOpts, fontSize),
				    hitboxes = me.legendHitBoxes;

				// current position
				var drawLegendBox = function drawLegendBox(x, y, legendItem) {
					if (isNaN(boxWidth) || boxWidth <= 0) {
						return;
					}
					if (!opts.displayFixed) {
						return;
					}
					// Set the ctx for the box
					ctx.save();

					ctx.setFillStyle(itemOrDefault(legendItem.fillStyle, globalDefault.defaultColor));
					ctx.setLineCap(itemOrDefault(legendItem.lineCap, lineDefault.borderCapStyle));
					ctx.lineDashOffset = itemOrDefault(legendItem.lineDashOffset, lineDefault.borderDashOffset);
					ctx.setLineJoin(itemOrDefault(legendItem.lineJoin, lineDefault.borderJoinStyle));
					ctx.setLineWidth(itemOrDefault(legendItem.lineWidth, lineDefault.borderWidth));
					ctx.setStrokeStyle(itemOrDefault(legendItem.strokeStyle, globalDefault.defaultColor));
					var isLineWidthZero = itemOrDefault(legendItem.lineWidth, lineDefault.borderWidth) === 0;

					if (ctx.setLineDash) {
						// IE 9 and 10 do not support line dash
						ctx.setLineDash(itemOrDefault(legendItem.lineDash, lineDefault.borderDash));
					}

					if (opts.labels && opts.labels.usePointStyle) {
						// Recalculate x and y for drawPoint() because its expecting
						// x and y to be center of figure (instead of top left)
						var radius = fontSize * Math.SQRT2 / 2;
						var offSet = radius / Math.SQRT2;
						var centerX = x + offSet;
						var centerY = y + offSet;

						// Draw pointStyle as legend symbol
						Chart.canvasHelpers.drawPoint(ctx, legendItem.pointStyle, radius, centerX, centerY);
					} else {
						// Draw box as legend symbol
						if (!isLineWidthZero) {
							ctx.strokeRect(x, y, boxWidth, fontSize);
						}
						ctx.fillRect(x, y, boxWidth, fontSize);
					}

					ctx.restore();
				};
				var fillText = function fillText(x, y, legendItem, textWidth) {
					ctx.fillText(legendItem.text, boxWidth + fontSize / 2 + x, y + 10); //todo 使legend向下偏移一点

					if (legendItem.hidden) {
						// Strikethrough the text if hidden
						ctx.beginPath();
						ctx.setLineWidth(2);
						ctx.moveTo(boxWidth + fontSize / 2 + x, y + fontSize / 2);
						ctx.lineTo(boxWidth + fontSize / 2 + x + textWidth, y + fontSize / 2);
						ctx.stroke();
					}
				};

				// Horizontal
				var isHorizontal = me.isHorizontal();
				if (isHorizontal) {
					cursor = {
						x: me.left + (legendWidth - lineWidths[0]) / 2,
						y: me.top + labelOpts.padding,
						line: 0
					};
				} else {
					cursor = {
						x: me.left + labelOpts.padding,
						y: me.top + labelOpts.padding,
						line: 0
					};
				}

				var itemHeight = fontSize + labelOpts.padding;
				helpers.each(me.legendItems, function (legendItem, i) {
					var textWidth = ctx.measureText(legendItem.text).width,
					    width = boxWidth + fontSize / 2 + textWidth,
					    x = cursor.x,
					    y = cursor.y;

					if (isHorizontal) {
						if (x + width >= legendWidth) {
							y = cursor.y += itemHeight;
							cursor.line++;
							x = cursor.x = me.left + (legendWidth - lineWidths[cursor.line]) / 2;
						}
					} else if (y + itemHeight > me.bottom) {
						x = cursor.x = x + me.columnWidths[cursor.line] + labelOpts.padding;
						y = cursor.y = me.top;
						cursor.line++;
					}

					drawLegendBox(x, y, legendItem);

					hitboxes[i].left = x;
					hitboxes[i].top = y;

					// Fill the actual label
					fillText(x, y, legendItem, textWidth);

					if (isHorizontal) {
						cursor.x += width + labelOpts.padding;
					} else {
						cursor.y += itemHeight;
					}
				});
			}
		},

		/**
   * Handle an event
   * @private
   * @param e {Event} the event to handle
   * @return {Boolean} true if a change occured
   */
		handleEvent: function handleEvent(e) {
			var me = this;
			var opts = me.options;
			var type = e.type === 'mouseup' ? 'click' : e.type;
			var changed = false;

			if (type === 'mousemove') {
				if (!opts.onHover) {
					return;
				}
			} else if (type === 'click' || type == 'touchstart') {
				if (!opts.onClick) {
					return;
				}
			} else {
				return;
			}

			var position = helpers.getRelativePosition(e, me.chart.chart),
			    x = position.x,
			    y = position.y;

			if (x >= me.left && x <= me.right && y >= me.top && y <= me.bottom) {
				// See if we are touching one of the dataset boxes
				var lh = me.legendHitBoxes;
				for (var i = 0; i < lh.length; ++i) {
					var hitBox = lh[i];

					if (x >= hitBox.left && x <= hitBox.left + hitBox.width && y >= hitBox.top && y <= hitBox.top + hitBox.height) {
						// Touching an element
						if (type === 'click' || type == 'touchstart') {
							opts.onClick.call(me, e, me.legendItems[i]);
							changed = true;
							break;
						} else if (type === 'mousemove') {
							opts.onHover.call(me, e, me.legendItems[i]);
							changed = true;
							break;
						}
					}
				}
			}

			return changed;
		}
	});

	// Register the legend plugin
	Chart.plugins.register({
		beforeInit: function beforeInit(chartInstance) {
			var opts = chartInstance.options;
			var legendOpts = opts.legend;

			if (legendOpts) {
				chartInstance.legend = new Chart.Legend({
					ctx: chartInstance.chart.ctx,
					options: legendOpts,
					chart: chartInstance
				});

				Chart.layoutService.addBox(chartInstance, chartInstance.legend);
			}
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUubGVnZW5kLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydHMiLCJDaGFydCIsImhlbHBlcnMiLCJub29wIiwiZGVmYXVsdHMiLCJnbG9iYWwiLCJsZWdlbmQiLCJkaXNwbGF5IiwiZGlzcGxheUZpeGVkIiwicG9zaXRpb24iLCJmdWxsV2lkdGgiLCJyZXZlcnNlIiwib25DbGljayIsImUiLCJsZWdlbmRJdGVtIiwiaW5kZXgiLCJkYXRhc2V0SW5kZXgiLCJjaSIsImNoYXJ0IiwibWV0YSIsImdldERhdGFzZXRNZXRhIiwiaGlkZGVuIiwiZGF0YSIsImRhdGFzZXRzIiwidXBkYXRlIiwib25Ib3ZlciIsImxhYmVscyIsImJveFdpZHRoIiwicGFkZGluZyIsImdlbmVyYXRlTGFiZWxzIiwiaXNBcnJheSIsIm1hcCIsImRhdGFzZXQiLCJpIiwidGV4dCIsImxhYmVsIiwiZmlsbFN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiaXNEYXRhc2V0VmlzaWJsZSIsImxpbmVDYXAiLCJib3JkZXJDYXBTdHlsZSIsImxpbmVEYXNoIiwiYm9yZGVyRGFzaCIsImxpbmVEYXNoT2Zmc2V0IiwiYm9yZGVyRGFzaE9mZnNldCIsImxpbmVKb2luIiwiYm9yZGVySm9pblN0eWxlIiwibGluZVdpZHRoIiwiYm9yZGVyV2lkdGgiLCJzdHJva2VTdHlsZSIsImJvcmRlckNvbG9yIiwicG9pbnRTdHlsZSIsImdldEJveFdpZHRoIiwibGFiZWxPcHRzIiwiZm9udFNpemUiLCJ1c2VQb2ludFN0eWxlIiwiTWF0aCIsIlNRUlQyIiwiTGVnZW5kIiwiRWxlbWVudCIsImV4dGVuZCIsImluaXRpYWxpemUiLCJjb25maWciLCJsZWdlbmRIaXRCb3hlcyIsImRvdWdobnV0TW9kZSIsImJlZm9yZVVwZGF0ZSIsIm1heFdpZHRoIiwibWF4SGVpZ2h0IiwibWFyZ2lucyIsIm1lIiwiYmVmb3JlU2V0RGltZW5zaW9ucyIsInNldERpbWVuc2lvbnMiLCJhZnRlclNldERpbWVuc2lvbnMiLCJiZWZvcmVCdWlsZExhYmVscyIsImJ1aWxkTGFiZWxzIiwiYWZ0ZXJCdWlsZExhYmVscyIsImJlZm9yZUZpdCIsImZpdCIsImFmdGVyRml0IiwiYWZ0ZXJVcGRhdGUiLCJtaW5TaXplIiwiaXNIb3Jpem9udGFsIiwid2lkdGgiLCJsZWZ0IiwicmlnaHQiLCJoZWlnaHQiLCJ0b3AiLCJib3R0b20iLCJwYWRkaW5nTGVmdCIsInBhZGRpbmdUb3AiLCJwYWRkaW5nUmlnaHQiLCJwYWRkaW5nQm90dG9tIiwibGVnZW5kSXRlbXMiLCJvcHRpb25zIiwiY2FsbCIsIm9wdHMiLCJjdHgiLCJnbG9iYWxEZWZhdWx0IiwiaXRlbU9yRGVmYXVsdCIsImdldFZhbHVlT3JEZWZhdWx0IiwiZGVmYXVsdEZvbnRTaXplIiwiZm9udFN0eWxlIiwiZGVmYXVsdEZvbnRTdHlsZSIsImZvbnRGYW1pbHkiLCJkZWZhdWx0Rm9udEZhbWlseSIsImxhYmVsRm9udCIsImZvbnRTdHJpbmciLCJoaXRib3hlcyIsImZvbnQiLCJzZXRGb250U2l6ZSIsImxpbmVXaWR0aHMiLCJ0b3RhbEhlaWdodCIsImxlbmd0aCIsInRleHRBbGlnbiIsInRleHRCYXNlbGluZSIsImVhY2giLCJtZWFzdXJlVGV4dCIsInZQYWRkaW5nIiwiY29sdW1uV2lkdGhzIiwidG90YWxXaWR0aCIsImN1cnJlbnRDb2xXaWR0aCIsImN1cnJlbnRDb2xIZWlnaHQiLCJpdGVtSGVpZ2h0IiwiaXRlbVdpZHRoIiwicHVzaCIsIm1heCIsImRyYXciLCJsaW5lRGVmYXVsdCIsImVsZW1lbnRzIiwibGluZSIsImxlZ2VuZFdpZHRoIiwiY3Vyc29yIiwiZm9udENvbG9yIiwiZGVmYXVsdEZvbnRDb2xvciIsInNldExpbmVXaWR0aCIsInNldFN0cm9rZVN0eWxlIiwic2V0RmlsbFN0eWxlIiwiZHJhd0xlZ2VuZEJveCIsIngiLCJ5IiwiaXNOYU4iLCJzYXZlIiwiZGVmYXVsdENvbG9yIiwic2V0TGluZUNhcCIsInNldExpbmVKb2luIiwiaXNMaW5lV2lkdGhaZXJvIiwic2V0TGluZURhc2giLCJyYWRpdXMiLCJvZmZTZXQiLCJjZW50ZXJYIiwiY2VudGVyWSIsImNhbnZhc0hlbHBlcnMiLCJkcmF3UG9pbnQiLCJzdHJva2VSZWN0IiwiZmlsbFJlY3QiLCJyZXN0b3JlIiwiZmlsbFRleHQiLCJ0ZXh0V2lkdGgiLCJiZWdpblBhdGgiLCJtb3ZlVG8iLCJsaW5lVG8iLCJzdHJva2UiLCJoYW5kbGVFdmVudCIsInR5cGUiLCJjaGFuZ2VkIiwiZ2V0UmVsYXRpdmVQb3NpdGlvbiIsImxoIiwiaGl0Qm94IiwicGx1Z2lucyIsInJlZ2lzdGVyIiwiYmVmb3JlSW5pdCIsImNoYXJ0SW5zdGFuY2UiLCJsZWdlbmRPcHRzIiwibGF5b3V0U2VydmljZSIsImFkZEJveCJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUFBLE9BQU9DLE9BQVAsR0FBaUIsVUFBU0MsS0FBVCxFQUFnQjs7QUFFaEMsS0FBSUMsVUFBVUQsTUFBTUMsT0FBcEI7QUFDQSxLQUFJQyxPQUFPRCxRQUFRQyxJQUFuQjs7QUFFQUYsT0FBTUcsUUFBTixDQUFlQyxNQUFmLENBQXNCQyxNQUF0QixHQUErQjs7QUFFOUJDLFdBQVMsSUFGcUI7QUFHOUJDLGdCQUFhLElBSGlCO0FBSTlCQyxZQUFVLEtBSm9CO0FBSzlCQyxhQUFXLElBTG1CLEVBS2I7QUFDakJDLFdBQVMsS0FOcUI7O0FBUTlCO0FBQ0FDLFdBQVMsaUJBQVNDLENBQVQsRUFBWUMsVUFBWixFQUF3QjtBQUNoQyxPQUFJQyxRQUFRRCxXQUFXRSxZQUF2QjtBQUNBLE9BQUlDLEtBQUssS0FBS0MsS0FBZDtBQUNBLE9BQUlDLE9BQU9GLEdBQUdHLGNBQUgsQ0FBa0JMLEtBQWxCLENBQVg7O0FBRUE7QUFDQUksUUFBS0UsTUFBTCxHQUFjRixLQUFLRSxNQUFMLEtBQWdCLElBQWhCLEdBQXNCLENBQUNKLEdBQUdLLElBQUgsQ0FBUUMsUUFBUixDQUFpQlIsS0FBakIsRUFBd0JNLE1BQS9DLEdBQXdELElBQXRFOztBQUVBO0FBQ0FKLE1BQUdPLE1BQUg7QUFDQSxHQW5C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RUFBMEM7QUFDekNwRSxZQUFLbkYsT0FBTCxDQUFha0YsSUFBYixDQUFrQnpCLEVBQWxCLEVBQXNCeEQsQ0FBdEIsRUFBeUJ3RCxHQUFHdUIsV0FBSCxDQUFlM0QsQ0FBZixDQUF6QjtBQUNBbUksaUJBQVUsSUFBVjtBQUNBO0FBQ0EsT0FKRCxNQUlPLElBQUlELFNBQVMsV0FBYixFQUEwQjtBQUNoQ3BFLFlBQUt0RSxPQUFMLENBQWFxRSxJQUFiLENBQWtCekIsRUFBbEIsRUFBc0J4RCxDQUF0QixFQUF5QndELEdBQUd1QixXQUFILENBQWUzRCxDQUFmLENBQXpCO0FBQ0FtSSxpQkFBVSxJQUFWO0FBQ0E7QUFDQTtBQUNEO0FBQ0Q7QUFDRDs7QUFFRCxVQUFPQSxPQUFQO0FBQ0E7QUFuWmtDLEVBQXJCLENBQWY7O0FBc1pBO0FBQ0FuSyxPQUFNdUssT0FBTixDQUFjQyxRQUFkLENBQXVCO0FBQ3RCQyxjQUFZLG9CQUFTQyxhQUFULEVBQXdCO0FBQ25DLE9BQUk1RSxPQUFPNEUsY0FBYzlFLE9BQXpCO0FBQ0EsT0FBSStFLGFBQWE3RSxLQUFLekYsTUFBdEI7O0FBRUEsT0FBSXNLLFVBQUosRUFBZ0I7QUFDZkQsa0JBQWNySyxNQUFkLEdBQXVCLElBQUlMLE1BQU15RCxNQUFWLENBQWlCO0FBQ3ZDc0MsVUFBSzJFLGNBQWN6SixLQUFkLENBQW9COEUsR0FEYztBQUV2Q0gsY0FBUytFLFVBRjhCO0FBR3ZDMUosWUFBT3lKO0FBSGdDLEtBQWpCLENBQXZCOztBQU1BMUssVUFBTTRLLGFBQU4sQ0FBb0JDLE1BQXBCLENBQTJCSCxhQUEzQixFQUEwQ0EsY0FBY3JLLE1BQXhEO0FBQ0E7QUFDRDtBQWRxQixFQUF2QjtBQWdCQSxDQXBmRCIsImZpbGUiOiJjb3JlLmxlZ2VuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2hhcnQpIHtcclxuXHJcblx0dmFyIGhlbHBlcnMgPSBDaGFydC5oZWxwZXJzO1xyXG5cdHZhciBub29wID0gaGVscGVycy5ub29wO1xyXG5cclxuXHRDaGFydC5kZWZhdWx0cy5nbG9iYWwubGVnZW5kID0ge1xyXG5cclxuXHRcdGRpc3BsYXk6IHRydWUsXHJcblx0XHRkaXNwbGF5Rml4ZWQ6dHJ1ZSxcclxuXHRcdHBvc2l0aW9uOiAndG9wJyxcclxuXHRcdGZ1bGxXaWR0aDogdHJ1ZSwgLy8gbWFya3MgdGhhdCB0aGlzIGJveCBzaG91bGQgdGFrZSB0aGUgZnVsbCB3aWR0aCBvZiB0aGUgY2FudmFzIChwdXNoaW5nIGRvd24gb3RoZXIgYm94ZXMpXHJcblx0XHRyZXZlcnNlOiBmYWxzZSxcclxuXHJcblx0XHQvLyBhIGNhbGxiYWNrIHRoYXQgd2lsbCBoYW5kbGVcclxuXHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKGUsIGxlZ2VuZEl0ZW0pIHtcclxuXHRcdFx0dmFyIGluZGV4ID0gbGVnZW5kSXRlbS5kYXRhc2V0SW5kZXg7XHJcblx0XHRcdHZhciBjaSA9IHRoaXMuY2hhcnQ7XHJcblx0XHRcdHZhciBtZXRhID0gY2kuZ2V0RGF0YXNldE1ldGEoaW5kZXgpO1xyXG5cclxuXHRcdFx0Ly8gU2VlIGNvbnRyb2xsZXIuaXNEYXRhc2V0VmlzaWJsZSBjb21tZW50XHJcblx0XHRcdG1ldGEuaGlkZGVuID0gbWV0YS5oaWRkZW4gPT09IG51bGw/ICFjaS5kYXRhLmRhdGFzZXRzW2luZGV4XS5oaWRkZW4gOiBudWxsO1xyXG5cclxuXHRcdFx0Ly8gV2UgaGlkIGEgZGF0YXNldCAuLi4gcmVyZW5kZXIgdGhlIGNoYXJ0XHJcblx0XHRcdGNpLnVwZGF0ZSgpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRvbkhvdmVyOiBudWxsLFxyXG5cclxuXHRcdGxhYmVsczoge1xyXG5cdFx0XHRib3hXaWR0aDogNDAsXHJcblx0XHRcdHBhZGRpbmc6IDEwLFxyXG5cdFx0XHQvLyBHZW5lcmF0ZXMgbGFiZWxzIHNob3duIGluIHRoZSBsZWdlbmRcclxuXHRcdFx0Ly8gVmFsaWQgcHJvcGVydGllcyB0byByZXR1cm46XHJcblx0XHRcdC8vIHRleHQgOiB0ZXh0IHRvIGRpc3BsYXlcclxuXHRcdFx0Ly8gZmlsbFN0eWxlIDogZmlsbCBvZiBjb2xvdXJlZCBib3hcclxuXHRcdFx0Ly8gc3Ryb2tlU3R5bGU6IHN0cm9rZSBvZiBjb2xvdXJlZCBib3hcclxuXHRcdFx0Ly8gaGlkZGVuIDogaWYgdGhpcyBsZWdlbmQgaXRlbSByZWZlcnMgdG8gYSBoaWRkZW4gaXRlbVxyXG5cdFx0XHQvLyBsaW5lQ2FwIDogY2FwIHN0eWxlIGZvciBsaW5lXHJcblx0XHRcdC8vIGxpbmVEYXNoXHJcblx0XHRcdC8vIGxpbmVEYXNoT2Zmc2V0IDpcclxuXHRcdFx0Ly8gbGluZUpvaW4gOlxyXG5cdFx0XHQvLyBsaW5lV2lkdGggOlxyXG5cdFx0XHRnZW5lcmF0ZUxhYmVsczogZnVuY3Rpb24oY2hhcnQpIHtcclxuXHRcdFx0XHR2YXIgZGF0YSA9IGNoYXJ0LmRhdGE7XHJcblx0XHRcdFx0cmV0dXJuIGhlbHBlcnMuaXNBcnJheShkYXRhLmRhdGFzZXRzKSA/IGRhdGEuZGF0YXNldHMubWFwKGZ1bmN0aW9uKGRhdGFzZXQsIGkpIHtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IGRhdGFzZXQubGFiZWwsXHJcblx0XHRcdFx0XHRcdGZpbGxTdHlsZTogKCFoZWxwZXJzLmlzQXJyYXkoZGF0YXNldC5iYWNrZ3JvdW5kQ29sb3IpID8gZGF0YXNldC5iYWNrZ3JvdW5kQ29sb3IgOiBkYXRhc2V0LmJhY2tncm91bmRDb2xvclswXSksXHJcblx0XHRcdFx0XHRcdGhpZGRlbjogIWNoYXJ0LmlzRGF0YXNldFZpc2libGUoaSksXHJcblx0XHRcdFx0XHRcdGxpbmVDYXA6IGRhdGFzZXQuYm9yZGVyQ2FwU3R5bGUsXHJcblx0XHRcdFx0XHRcdGxpbmVEYXNoOiBkYXRhc2V0LmJvcmRlckRhc2gsXHJcblx0XHRcdFx0XHRcdGxpbmVEYXNoT2Zmc2V0OiBkYXRhc2V0LmJvcmRlckRhc2hPZmZzZXQsXHJcblx0XHRcdFx0XHRcdGxpbmVKb2luOiBkYXRhc2V0LmJvcmRlckpvaW5TdHlsZSxcclxuXHRcdFx0XHRcdFx0bGluZVdpZHRoOiBkYXRhc2V0LmJvcmRlcldpZHRoLFxyXG5cdFx0XHRcdFx0XHRzdHJva2VTdHlsZTogZGF0YXNldC5ib3JkZXJDb2xvcixcclxuXHRcdFx0XHRcdFx0cG9pbnRTdHlsZTogZGF0YXNldC5wb2ludFN0eWxlLFxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQmVsb3cgaXMgZXh0cmEgZGF0YSB1c2VkIGZvciB0b2dnbGluZyB0aGUgZGF0YXNldHNcclxuXHRcdFx0XHRcdFx0ZGF0YXNldEluZGV4OiBpXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH0sIHRoaXMpIDogW107XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZ2V0IHRoZSBib3ggd2lkdGggYmFzZWQgb24gdGhlIHVzZVBvaW50U3R5bGUgb3B0aW9uXHJcblx0ICogQHBhcmFtIGxhYmVsb3B0cyB7T2JqZWN0fSB0aGUgbGFiZWwgb3B0aW9ucyBvbiB0aGUgbGVnZW5kXHJcblx0ICogQHBhcmFtIGZvbnRTaXplIHtOdW1iZXJ9IHRoZSBsYWJlbCBmb250IHNpemVcclxuXHQgKiBAcmV0dXJuIHtOdW1iZXJ9IHdpZHRoIG9mIHRoZSBjb2xvciBib3ggYXJlYVxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIGdldEJveFdpZHRoKGxhYmVsT3B0cywgZm9udFNpemUpIHtcclxuXHRcdHJldHVybiBsYWJlbE9wdHMudXNlUG9pbnRTdHlsZSA/XHJcblx0XHRcdGZvbnRTaXplICogTWF0aC5TUVJUMiA6XHJcblx0XHRcdGxhYmVsT3B0cy5ib3hXaWR0aDtcclxuXHR9XHJcblxyXG5cdENoYXJ0LkxlZ2VuZCA9IENoYXJ0LkVsZW1lbnQuZXh0ZW5kKHtcclxuXHJcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbihjb25maWcpIHtcclxuXHRcdFx0aGVscGVycy5leHRlbmQodGhpcywgY29uZmlnKTtcclxuXHJcblx0XHRcdC8vIENvbnRhaW5zIGhpdCBib3hlcyBmb3IgZWFjaCBkYXRhc2V0IChpbiBkYXRhc2V0IG9yZGVyKVxyXG5cdFx0XHR0aGlzLmxlZ2VuZEhpdEJveGVzID0gW107XHJcblxyXG5cdFx0XHQvLyBBcmUgd2UgaW4gZG91Z2hudXQgbW9kZSB3aGljaCBoYXMgYSBkaWZmZXJlbnQgZGF0YSB0eXBlXHJcblx0XHRcdHRoaXMuZG91Z2hudXRNb2RlID0gZmFsc2U7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFRoZXNlIG1ldGhvZHMgYXJlIG9yZGVyZWQgYnkgbGlmZWN5Y2xlLiBVdGlsaXRpZXMgdGhlbiBmb2xsb3cuXHJcblx0XHQvLyBBbnkgZnVuY3Rpb24gZGVmaW5lZCBoZXJlIGlzIGluaGVyaXRlZCBieSBhbGwgbGVnZW5kIHR5cGVzLlxyXG5cdFx0Ly8gQW55IGZ1bmN0aW9uIGNhbiBiZSBleHRlbmRlZCBieSB0aGUgbGVnZW5kIHR5cGVcclxuXHJcblx0XHRiZWZvcmVVcGRhdGU6IG5vb3AsXHJcblx0XHR1cGRhdGU6IGZ1bmN0aW9uKG1heFdpZHRoLCBtYXhIZWlnaHQsIG1hcmdpbnMpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBMaWZlY3ljbGUgLSBQcm9iYWJseSBkb24ndCB3YW50IHRvIGV2ZXIgZXh0ZW5kIG9yIG92ZXJ3cml0ZSB0aGlzIGZ1bmN0aW9uIDspXHJcblx0XHRcdG1lLmJlZm9yZVVwZGF0ZSgpO1xyXG5cclxuXHRcdFx0Ly8gQWJzb3JiIHRoZSBtYXN0ZXIgbWVhc3VyZW1lbnRzXHJcblx0XHRcdG1lLm1heFdpZHRoID0gbWF4V2lkdGg7XHJcblx0XHRcdG1lLm1heEhlaWdodCA9IG1heEhlaWdodDtcclxuXHRcdFx0bWUubWFyZ2lucyA9IG1hcmdpbnM7XHJcblxyXG5cdFx0XHQvLyBEaW1lbnNpb25zXHJcblx0XHRcdG1lLmJlZm9yZVNldERpbWVuc2lvbnMoKTtcclxuXHRcdFx0bWUuc2V0RGltZW5zaW9ucygpO1xyXG5cdFx0XHRtZS5hZnRlclNldERpbWVuc2lvbnMoKTtcclxuXHRcdFx0Ly8gTGFiZWxzXHJcblx0XHRcdG1lLmJlZm9yZUJ1aWxkTGFiZWxzKCk7XHJcblx0XHRcdG1lLmJ1aWxkTGFiZWxzKCk7XHJcblx0XHRcdG1lLmFmdGVyQnVpbGRMYWJlbHMoKTtcclxuXHJcblx0XHRcdC8vIEZpdFxyXG5cdFx0XHRtZS5iZWZvcmVGaXQoKTtcclxuXHRcdFx0bWUuZml0KCk7XHJcblx0XHRcdG1lLmFmdGVyRml0KCk7XHJcblx0XHRcdC8vXHJcblx0XHRcdG1lLmFmdGVyVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gbWUubWluU2l6ZTtcclxuXHRcdH0sXHJcblx0XHRhZnRlclVwZGF0ZTogbm9vcCxcclxuXHJcblx0XHQvL1xyXG5cclxuXHRcdGJlZm9yZVNldERpbWVuc2lvbnM6IG5vb3AsXHJcblx0XHRzZXREaW1lbnNpb25zOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0Ly8gU2V0IHRoZSB1bmNvbnN0cmFpbmVkIGRpbWVuc2lvbiBiZWZvcmUgbGFiZWwgcm90YXRpb25cclxuXHRcdFx0aWYgKG1lLmlzSG9yaXpvbnRhbCgpKSB7XHJcblx0XHRcdFx0Ly8gUmVzZXQgcG9zaXRpb24gYmVmb3JlIGNhbGN1bGF0aW5nIHJvdGF0aW9uXHJcblx0XHRcdFx0bWUud2lkdGggPSBtZS5tYXhXaWR0aDtcclxuXHRcdFx0XHRtZS5sZWZ0ID0gMDtcclxuXHRcdFx0XHRtZS5yaWdodCA9IG1lLndpZHRoO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG1lLmhlaWdodCA9IG1lLm1heEhlaWdodDtcclxuXHJcblx0XHRcdFx0Ly8gUmVzZXQgcG9zaXRpb24gYmVmb3JlIGNhbGN1bGF0aW5nIHJvdGF0aW9uXHJcblx0XHRcdFx0bWUudG9wID0gMDtcclxuXHRcdFx0XHRtZS5ib3R0b20gPSBtZS5oZWlnaHQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlc2V0IHBhZGRpbmdcclxuXHRcdFx0bWUucGFkZGluZ0xlZnQgPSAwO1xyXG5cdFx0XHRtZS5wYWRkaW5nVG9wID0gMDtcclxuXHRcdFx0bWUucGFkZGluZ1JpZ2h0ID0gMDtcclxuXHRcdFx0bWUucGFkZGluZ0JvdHRvbSA9IDA7XHJcblxyXG5cdFx0XHQvLyBSZXNldCBtaW5TaXplXHJcblx0XHRcdG1lLm1pblNpemUgPSB7XHJcblx0XHRcdFx0d2lkdGg6IDAsXHJcblx0XHRcdFx0aGVpZ2h0OiAwXHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cdFx0YWZ0ZXJTZXREaW1lbnNpb25zOiBub29wLFxyXG5cclxuXHRcdC8vXHJcblxyXG5cdFx0YmVmb3JlQnVpbGRMYWJlbHM6IG5vb3AsXHJcblx0XHRidWlsZExhYmVsczogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdG1lLmxlZ2VuZEl0ZW1zID0gbWUub3B0aW9ucy5sYWJlbHMuZ2VuZXJhdGVMYWJlbHMuY2FsbChtZSwgbWUuY2hhcnQpO1xyXG5cdFx0XHRpZiAobWUub3B0aW9ucy5yZXZlcnNlKSB7XHJcblx0XHRcdFx0bWUubGVnZW5kSXRlbXMucmV2ZXJzZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0YWZ0ZXJCdWlsZExhYmVsczogbm9vcCxcclxuXHJcblx0XHQvL1xyXG5cclxuXHRcdGJlZm9yZUZpdDogbm9vcCxcclxuXHRcdGZpdDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBvcHRzID0gbWUub3B0aW9ucztcclxuXHRcdFx0dmFyIGxhYmVsT3B0cyA9IG9wdHMubGFiZWxzO1xyXG5cdFx0XHR2YXIgZGlzcGxheSA9IG9wdHMuZGlzcGxheTtcclxuXHJcblx0XHRcdHZhciBjdHggPSBtZS5jdHg7XHJcblxyXG5cdFx0XHR2YXIgZ2xvYmFsRGVmYXVsdCA9IENoYXJ0LmRlZmF1bHRzLmdsb2JhbCxcclxuXHRcdFx0XHRpdGVtT3JEZWZhdWx0ID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdCxcclxuXHRcdFx0XHRmb250U2l6ZSA9IGl0ZW1PckRlZmF1bHQobGFiZWxPcHRzLmZvbnRTaXplLCBnbG9iYWxEZWZhdWx0LmRlZmF1bHRGb250U2l6ZSksXHJcblx0XHRcdFx0Zm9udFN0eWxlID0gaXRlbU9yRGVmYXVsdChsYWJlbE9wdHMuZm9udFN0eWxlLCBnbG9iYWxEZWZhdWx0LmRlZmF1bHRGb250U3R5bGUpLFxyXG5cdFx0XHRcdGZvbnRGYW1pbHkgPSBpdGVtT3JEZWZhdWx0KGxhYmVsT3B0cy5mb250RmFtaWx5LCBnbG9iYWxEZWZhdWx0LmRlZmF1bHRGb250RmFtaWx5KSxcclxuXHRcdFx0XHRsYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcoZm9udFNpemUsIGZvbnRTdHlsZSwgZm9udEZhbWlseSk7XHJcblxyXG5cdFx0XHQvLyBSZXNldCBoaXQgYm94ZXNcclxuXHRcdFx0dmFyIGhpdGJveGVzID0gbWUubGVnZW5kSGl0Qm94ZXMgPSBbXTtcclxuXHJcblx0XHRcdHZhciBtaW5TaXplID0gbWUubWluU2l6ZTtcclxuXHRcdFx0dmFyIGlzSG9yaXpvbnRhbCA9IG1lLmlzSG9yaXpvbnRhbCgpO1xyXG5cclxuXHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdG1pblNpemUud2lkdGggPSBtZS5tYXhXaWR0aDsgLy8gZmlsbCBhbGwgdGhlIHdpZHRoXHJcblx0XHRcdFx0bWluU2l6ZS5oZWlnaHQgPSBkaXNwbGF5ID8gMTAgOiAwO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG1pblNpemUud2lkdGggPSBkaXNwbGF5ID8gMTAgOiAwO1xyXG5cdFx0XHRcdG1pblNpemUuaGVpZ2h0ID0gbWUubWF4SGVpZ2h0OyAvLyBmaWxsIGFsbCB0aGUgaGVpZ2h0XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEluY3JlYXNlIHNpemVzIGhlcmVcclxuXHRcdFx0aWYgKGRpc3BsYXkpIHtcclxuXHRcdFx0XHRjdHguZm9udCA9IGxhYmVsRm9udDtcclxuXHRcdFx0XHRjdHguc2V0Rm9udFNpemUoZm9udFNpemUpO1xyXG5cdFx0XHRcdGlmIChpc0hvcml6b250YWwpIHtcclxuXHRcdFx0XHRcdC8vIExhYmVsc1xyXG5cclxuXHRcdFx0XHRcdC8vIFdpZHRoIG9mIGVhY2ggbGluZSBvZiBsZWdlbmQgYm94ZXMuIExhYmVscyB3cmFwIG9udG8gbXVsdGlwbGUgbGluZXMgd2hlbiB0aGVyZSBhcmUgdG9vIG1hbnkgdG8gZml0IG9uIG9uZVxyXG5cdFx0XHRcdFx0dmFyIGxpbmVXaWR0aHMgPSBtZS5saW5lV2lkdGhzID0gWzBdO1xyXG5cdFx0XHRcdFx0dmFyIHRvdGFsSGVpZ2h0ID0gbWUubGVnZW5kSXRlbXMubGVuZ3RoID8gZm9udFNpemUgKyAobGFiZWxPcHRzLnBhZGRpbmcpIDogMDtcclxuXHJcblx0XHRcdFx0XHRjdHgudGV4dEFsaWduID0gJ2xlZnQnO1xyXG5cdFx0XHRcdFx0Y3R4LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG5cclxuXHRcdFx0XHRcdGhlbHBlcnMuZWFjaChtZS5sZWdlbmRJdGVtcywgZnVuY3Rpb24obGVnZW5kSXRlbSwgaSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgYm94V2lkdGggPSBnZXRCb3hXaWR0aChsYWJlbE9wdHMsIGZvbnRTaXplKTtcclxuXHRcdFx0XHRcdFx0dmFyIHdpZHRoID0gYm94V2lkdGggKyAoZm9udFNpemUgLyAyKSArIGN0eC5tZWFzdXJlVGV4dChsZWdlbmRJdGVtLnRleHQpLndpZHRoO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKGxpbmVXaWR0aHNbbGluZVdpZHRocy5sZW5ndGggLSAxXSArIHdpZHRoICsgbGFiZWxPcHRzLnBhZGRpbmcgPj0gbWUud2lkdGgpIHtcclxuXHRcdFx0XHRcdFx0XHR0b3RhbEhlaWdodCArPSBmb250U2l6ZSArIChsYWJlbE9wdHMucGFkZGluZyk7XHJcblx0XHRcdFx0XHRcdFx0bGluZVdpZHRoc1tsaW5lV2lkdGhzLmxlbmd0aF0gPSBtZS5sZWZ0O1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBTdG9yZSB0aGUgaGl0Ym94IHdpZHRoIGFuZCBoZWlnaHQgaGVyZS4gRmluYWwgcG9zaXRpb24gd2lsbCBiZSB1cGRhdGVkIGluIGBkcmF3YFxyXG5cdFx0XHRcdFx0XHRoaXRib3hlc1tpXSA9IHtcclxuXHRcdFx0XHRcdFx0XHRsZWZ0OiAwLFxyXG5cdFx0XHRcdFx0XHRcdHRvcDogMCxcclxuXHRcdFx0XHRcdFx0XHR3aWR0aDogd2lkdGgsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBmb250U2l6ZVxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdFx0bGluZVdpZHRoc1tsaW5lV2lkdGhzLmxlbmd0aCAtIDFdICs9IHdpZHRoICsgbGFiZWxPcHRzLnBhZGRpbmc7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRtaW5TaXplLmhlaWdodCArPSB0b3RhbEhlaWdodDtcclxuXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHZhciB2UGFkZGluZyA9IGxhYmVsT3B0cy5wYWRkaW5nO1xyXG5cdFx0XHRcdFx0dmFyIGNvbHVtbldpZHRocyA9IG1lLmNvbHVtbldpZHRocyA9IFtdO1xyXG5cdFx0XHRcdFx0dmFyIHRvdGFsV2lkdGggPSBsYWJlbE9wdHMucGFkZGluZztcclxuXHRcdFx0XHRcdHZhciBjdXJyZW50Q29sV2lkdGggPSAwO1xyXG5cdFx0XHRcdFx0dmFyIGN1cnJlbnRDb2xIZWlnaHQgPSAwO1xyXG5cdFx0XHRcdFx0dmFyIGl0ZW1IZWlnaHQgPSBmb250U2l6ZSArIHZQYWRkaW5nO1xyXG5cclxuXHRcdFx0XHRcdGhlbHBlcnMuZWFjaChtZS5sZWdlbmRJdGVtcywgZnVuY3Rpb24obGVnZW5kSXRlbSwgaSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgYm94V2lkdGggPSBnZXRCb3hXaWR0aChsYWJlbE9wdHMsIGZvbnRTaXplKTtcclxuXHRcdFx0XHRcdFx0dmFyIGl0ZW1XaWR0aCA9IGJveFdpZHRoICsgKGZvbnRTaXplIC8gMikgKyBjdHgubWVhc3VyZVRleHQobGVnZW5kSXRlbS50ZXh0KS53aWR0aDtcclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIHRvbyB0YWxsLCBnbyB0byBuZXcgY29sdW1uXHJcblx0XHRcdFx0XHRcdGlmIChjdXJyZW50Q29sSGVpZ2h0ICsgaXRlbUhlaWdodCA+IG1pblNpemUuaGVpZ2h0KSB7XHJcblx0XHRcdFx0XHRcdFx0dG90YWxXaWR0aCArPSBjdXJyZW50Q29sV2lkdGggKyBsYWJlbE9wdHMucGFkZGluZztcclxuXHRcdFx0XHRcdFx0XHRjb2x1bW5XaWR0aHMucHVzaChjdXJyZW50Q29sV2lkdGgpOyAvLyBwcmV2aW91cyBjb2x1bW4gd2lkdGhcclxuXHJcblx0XHRcdFx0XHRcdFx0Y3VycmVudENvbFdpZHRoID0gMDtcclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50Q29sSGVpZ2h0ID0gMDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gR2V0IG1heCB3aWR0aFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50Q29sV2lkdGggPSBNYXRoLm1heChjdXJyZW50Q29sV2lkdGgsIGl0ZW1XaWR0aCk7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRDb2xIZWlnaHQgKz0gaXRlbUhlaWdodDtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFN0b3JlIHRoZSBoaXRib3ggd2lkdGggYW5kIGhlaWdodCBoZXJlLiBGaW5hbCBwb3NpdGlvbiB3aWxsIGJlIHVwZGF0ZWQgaW4gYGRyYXdgXHJcblx0XHRcdFx0XHRcdGhpdGJveGVzW2ldID0ge1xyXG5cdFx0XHRcdFx0XHRcdGxlZnQ6IDAsXHJcblx0XHRcdFx0XHRcdFx0dG9wOiAwLFxyXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBpdGVtV2lkdGgsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBmb250U2l6ZVxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0dG90YWxXaWR0aCArPSBjdXJyZW50Q29sV2lkdGg7XHJcblx0XHRcdFx0XHRjb2x1bW5XaWR0aHMucHVzaChjdXJyZW50Q29sV2lkdGgpO1xyXG5cdFx0XHRcdFx0bWluU2l6ZS53aWR0aCArPSB0b3RhbFdpZHRoO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWUud2lkdGggPSBtaW5TaXplLndpZHRoO1xyXG5cdFx0XHRtZS5oZWlnaHQgPSBtaW5TaXplLmhlaWdodDtcclxuXHRcdH0sXHJcblx0XHRhZnRlckZpdDogbm9vcCxcclxuXHJcblx0XHQvLyBTaGFyZWQgTWV0aG9kc1xyXG5cdFx0aXNIb3Jpem9udGFsOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMub3B0aW9ucy5wb3NpdGlvbiA9PT0gJ3RvcCcgfHwgdGhpcy5vcHRpb25zLnBvc2l0aW9uID09PSAnYm90dG9tJztcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gQWN0dWFsbHkgZHJhdyB0aGUgbGVnZW5kIG9uIHRoZSBjYW52YXNcclxuXHRcdGRyYXc6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgb3B0cyA9IG1lLm9wdGlvbnM7XHJcblx0XHRcdHZhciBsYWJlbE9wdHMgPSBvcHRzLmxhYmVscztcclxuXHRcdFx0dmFyIGdsb2JhbERlZmF1bHQgPSBDaGFydC5kZWZhdWx0cy5nbG9iYWwsXHJcblx0XHRcdFx0bGluZURlZmF1bHQgPSBnbG9iYWxEZWZhdWx0LmVsZW1lbnRzLmxpbmUsXHJcblx0XHRcdFx0bGVnZW5kV2lkdGggPSBtZS53aWR0aCxcclxuXHRcdFx0XHRsaW5lV2lkdGhzID0gbWUubGluZVdpZHRocztcclxuXHJcblx0XHRcdGlmIChvcHRzLmRpc3BsYXkpIHtcclxuXHRcdFx0XHR2YXIgY3R4ID0gbWUuY3R4LFxyXG5cdFx0XHRcdFx0Y3Vyc29yLFxyXG5cdFx0XHRcdFx0aXRlbU9yRGVmYXVsdCA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQsXHJcblx0XHRcdFx0XHRmb250Q29sb3IgPSBpdGVtT3JEZWZhdWx0KGxhYmVsT3B0cy5mb250Q29sb3IsIGdsb2JhbERlZmF1bHQuZGVmYXVsdEZvbnRDb2xvciksXHJcblx0XHRcdFx0XHRmb250U2l6ZSA9IGl0ZW1PckRlZmF1bHQobGFiZWxPcHRzLmZvbnRTaXplLCBnbG9iYWxEZWZhdWx0LmRlZmF1bHRGb250U2l6ZSksXHJcblx0XHRcdFx0XHRmb250U3R5bGUgPSBpdGVtT3JEZWZhdWx0KGxhYmVsT3B0cy5mb250U3R5bGUsIGdsb2JhbERlZmF1bHQuZGVmYXVsdEZvbnRTdHlsZSksXHJcblx0XHRcdFx0XHRmb250RmFtaWx5ID0gaXRlbU9yRGVmYXVsdChsYWJlbE9wdHMuZm9udEZhbWlseSwgZ2xvYmFsRGVmYXVsdC5kZWZhdWx0Rm9udEZhbWlseSksXHJcblx0XHRcdFx0XHRsYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcoZm9udFNpemUsIGZvbnRTdHlsZSwgZm9udEZhbWlseSk7XHJcblxyXG5cdFx0XHRcdC8vIENhbnZhcyBzZXR1cFxyXG5cdFx0XHRcdGN0eC50ZXh0QWxpZ24gPSAnbGVmdCc7XHJcblx0XHRcdFx0Y3R4LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG5cdFx0XHRcdGN0eC5zZXRMaW5lV2lkdGgoMC41KTtcclxuXHRcdFx0XHRjdHguc2V0U3Ryb2tlU3R5bGUoZm9udENvbG9yKTsgLy8gZm9yIHN0cmlrZXRocm91Z2ggZWZmZWN0XHJcblx0XHRcdFx0Y3R4LnNldEZpbGxTdHlsZShmb250Q29sb3IpOyAvLyByZW5kZXIgaW4gY29ycmVjdCBjb2xvdXJcclxuXHRcdFx0XHRjdHguZm9udCA9IGxhYmVsRm9udDtcclxuXHRcdFx0XHRjdHguc2V0Rm9udFNpemUoZm9udFNpemUpO1xyXG5cclxuXHRcdFx0XHR2YXIgYm94V2lkdGggPSBnZXRCb3hXaWR0aChsYWJlbE9wdHMsIGZvbnRTaXplKSxcclxuXHRcdFx0XHRcdGhpdGJveGVzID0gbWUubGVnZW5kSGl0Qm94ZXM7XHJcblxyXG5cdFx0XHRcdC8vIGN1cnJlbnQgcG9zaXRpb25cclxuXHRcdFx0XHR2YXIgZHJhd0xlZ2VuZEJveCA9IGZ1bmN0aW9uKHgsIHksIGxlZ2VuZEl0ZW0pIHtcclxuXHRcdFx0XHRcdGlmIChpc05hTihib3hXaWR0aCkgfHwgYm94V2lkdGggPD0gMCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZighb3B0cy5kaXNwbGF5Rml4ZWQpe1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQvLyBTZXQgdGhlIGN0eCBmb3IgdGhlIGJveFxyXG5cdFx0XHRcdFx0Y3R4LnNhdmUoKTtcclxuXHJcblx0XHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKGl0ZW1PckRlZmF1bHQobGVnZW5kSXRlbS5maWxsU3R5bGUsIGdsb2JhbERlZmF1bHQuZGVmYXVsdENvbG9yKSk7XHJcblx0XHRcdFx0XHRjdHguc2V0TGluZUNhcChpdGVtT3JEZWZhdWx0KGxlZ2VuZEl0ZW0ubGluZUNhcCwgbGluZURlZmF1bHQuYm9yZGVyQ2FwU3R5bGUpKTtcclxuXHRcdFx0XHRcdGN0eC5saW5lRGFzaE9mZnNldCA9IGl0ZW1PckRlZmF1bHQobGVnZW5kSXRlbS5saW5lRGFzaE9mZnNldCwgbGluZURlZmF1bHQuYm9yZGVyRGFzaE9mZnNldCk7XHJcblx0XHRcdFx0XHRjdHguc2V0TGluZUpvaW4oaXRlbU9yRGVmYXVsdChsZWdlbmRJdGVtLmxpbmVKb2luLCBsaW5lRGVmYXVsdC5ib3JkZXJKb2luU3R5bGUpKTtcclxuXHRcdFx0XHRcdGN0eC5zZXRMaW5lV2lkdGgoaXRlbU9yRGVmYXVsdChsZWdlbmRJdGVtLmxpbmVXaWR0aCwgbGluZURlZmF1bHQuYm9yZGVyV2lkdGgpKTtcclxuXHRcdFx0XHRcdGN0eC5zZXRTdHJva2VTdHlsZShpdGVtT3JEZWZhdWx0KGxlZ2VuZEl0ZW0uc3Ryb2tlU3R5bGUsIGdsb2JhbERlZmF1bHQuZGVmYXVsdENvbG9yKSk7XHJcblx0XHRcdFx0XHR2YXIgaXNMaW5lV2lkdGhaZXJvID0gKGl0ZW1PckRlZmF1bHQobGVnZW5kSXRlbS5saW5lV2lkdGgsIGxpbmVEZWZhdWx0LmJvcmRlcldpZHRoKSA9PT0gMCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGN0eC5zZXRMaW5lRGFzaCkge1xyXG5cdFx0XHRcdFx0XHQvLyBJRSA5IGFuZCAxMCBkbyBub3Qgc3VwcG9ydCBsaW5lIGRhc2hcclxuXHRcdFx0XHRcdFx0Y3R4LnNldExpbmVEYXNoKGl0ZW1PckRlZmF1bHQobGVnZW5kSXRlbS5saW5lRGFzaCwgbGluZURlZmF1bHQuYm9yZGVyRGFzaCkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChvcHRzLmxhYmVscyAmJiBvcHRzLmxhYmVscy51c2VQb2ludFN0eWxlKSB7XHJcblx0XHRcdFx0XHRcdC8vIFJlY2FsY3VsYXRlIHggYW5kIHkgZm9yIGRyYXdQb2ludCgpIGJlY2F1c2UgaXRzIGV4cGVjdGluZ1xyXG5cdFx0XHRcdFx0XHQvLyB4IGFuZCB5IHRvIGJlIGNlbnRlciBvZiBmaWd1cmUgKGluc3RlYWQgb2YgdG9wIGxlZnQpXHJcblx0XHRcdFx0XHRcdHZhciByYWRpdXMgPSBmb250U2l6ZSAqIE1hdGguU1FSVDIgLyAyO1xyXG5cdFx0XHRcdFx0XHR2YXIgb2ZmU2V0ID0gcmFkaXVzIC8gTWF0aC5TUVJUMjtcclxuXHRcdFx0XHRcdFx0dmFyIGNlbnRlclggPSB4ICsgb2ZmU2V0O1xyXG5cdFx0XHRcdFx0XHR2YXIgY2VudGVyWSA9IHkgKyBvZmZTZXQ7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBEcmF3IHBvaW50U3R5bGUgYXMgbGVnZW5kIHN5bWJvbFxyXG5cdFx0XHRcdFx0XHRDaGFydC5jYW52YXNIZWxwZXJzLmRyYXdQb2ludChjdHgsIGxlZ2VuZEl0ZW0ucG9pbnRTdHlsZSwgcmFkaXVzLCBjZW50ZXJYLCBjZW50ZXJZKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIERyYXcgYm94IGFzIGxlZ2VuZCBzeW1ib2xcclxuXHRcdFx0XHRcdFx0aWYgKCFpc0xpbmVXaWR0aFplcm8pIHtcclxuXHRcdFx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh4LCB5LCBib3hXaWR0aCwgZm9udFNpemUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGN0eC5maWxsUmVjdCh4LCB5LCBib3hXaWR0aCwgZm9udFNpemUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGN0eC5yZXN0b3JlKCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR2YXIgZmlsbFRleHQgPSBmdW5jdGlvbih4LCB5LCBsZWdlbmRJdGVtLCB0ZXh0V2lkdGgpIHtcclxuXHRcdFx0XHRcdGN0eC5maWxsVGV4dChsZWdlbmRJdGVtLnRleHQsIGJveFdpZHRoICsgKGZvbnRTaXplIC8gMikgKyB4LCB5KzEwKTsvL3RvZG8g5L2/bGVnZW5k5ZCR5LiL5YGP56e75LiA54K5XHJcblxyXG5cdFx0XHRcdFx0aWYgKGxlZ2VuZEl0ZW0uaGlkZGVuKSB7XHJcblx0XHRcdFx0XHRcdC8vIFN0cmlrZXRocm91Z2ggdGhlIHRleHQgaWYgaGlkZGVuXHJcblx0XHRcdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcclxuXHRcdFx0XHRcdFx0Y3R4LnNldExpbmVXaWR0aCgyKTtcclxuXHRcdFx0XHRcdFx0Y3R4Lm1vdmVUbyhib3hXaWR0aCArIChmb250U2l6ZSAvIDIpICsgeCwgeSArIChmb250U2l6ZSAvIDIpKTtcclxuXHRcdFx0XHRcdFx0Y3R4LmxpbmVUbyhib3hXaWR0aCArIChmb250U2l6ZSAvIDIpICsgeCArIHRleHRXaWR0aCwgeSArIChmb250U2l6ZSAvIDIpKTtcclxuXHRcdFx0XHRcdFx0Y3R4LnN0cm9rZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIEhvcml6b250YWxcclxuXHRcdFx0XHR2YXIgaXNIb3Jpem9udGFsID0gbWUuaXNIb3Jpem9udGFsKCk7XHJcblx0XHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdFx0Y3Vyc29yID0ge1xyXG5cdFx0XHRcdFx0XHR4OiBtZS5sZWZ0ICsgKChsZWdlbmRXaWR0aCAtIGxpbmVXaWR0aHNbMF0pIC8gMiksXHJcblx0XHRcdFx0XHRcdHk6IG1lLnRvcCArIGxhYmVsT3B0cy5wYWRkaW5nLFxyXG5cdFx0XHRcdFx0XHRsaW5lOiAwXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjdXJzb3IgPSB7XHJcblx0XHRcdFx0XHRcdHg6IG1lLmxlZnQgKyBsYWJlbE9wdHMucGFkZGluZyxcclxuXHRcdFx0XHRcdFx0eTogbWUudG9wICsgbGFiZWxPcHRzLnBhZGRpbmcsXHJcblx0XHRcdFx0XHRcdGxpbmU6IDBcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgaXRlbUhlaWdodCA9IGZvbnRTaXplICsgbGFiZWxPcHRzLnBhZGRpbmc7XHJcblx0XHRcdFx0aGVscGVycy5lYWNoKG1lLmxlZ2VuZEl0ZW1zLCBmdW5jdGlvbihsZWdlbmRJdGVtLCBpKSB7XHJcblx0XHRcdFx0XHR2YXIgdGV4dFdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KGxlZ2VuZEl0ZW0udGV4dCkud2lkdGgsXHJcblx0XHRcdFx0XHRcdHdpZHRoID0gYm94V2lkdGggKyAoZm9udFNpemUgLyAyKSArIHRleHRXaWR0aCxcclxuXHRcdFx0XHRcdFx0eCA9IGN1cnNvci54LFxyXG5cdFx0XHRcdFx0XHR5ID0gY3Vyc29yLnk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdFx0XHRpZiAoeCArIHdpZHRoID49IGxlZ2VuZFdpZHRoKSB7XHJcblx0XHRcdFx0XHRcdFx0eSA9IGN1cnNvci55ICs9IGl0ZW1IZWlnaHQ7XHJcblx0XHRcdFx0XHRcdFx0Y3Vyc29yLmxpbmUrKztcclxuXHRcdFx0XHRcdFx0XHR4ID0gY3Vyc29yLnggPSBtZS5sZWZ0ICsgKChsZWdlbmRXaWR0aCAtIGxpbmVXaWR0aHNbY3Vyc29yLmxpbmVdKSAvIDIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHkgKyBpdGVtSGVpZ2h0ID4gbWUuYm90dG9tKSB7XHJcblx0XHRcdFx0XHRcdHggPSBjdXJzb3IueCA9IHggKyBtZS5jb2x1bW5XaWR0aHNbY3Vyc29yLmxpbmVdICsgbGFiZWxPcHRzLnBhZGRpbmc7XHJcblx0XHRcdFx0XHRcdHkgPSBjdXJzb3IueSA9IG1lLnRvcDtcclxuXHRcdFx0XHRcdFx0Y3Vyc29yLmxpbmUrKztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRkcmF3TGVnZW5kQm94KHgsIHksIGxlZ2VuZEl0ZW0pO1xyXG5cclxuXHRcdFx0XHRcdGhpdGJveGVzW2ldLmxlZnQgPSB4O1xyXG5cdFx0XHRcdFx0aGl0Ym94ZXNbaV0udG9wID0geTtcclxuXHJcblx0XHRcdFx0XHQvLyBGaWxsIHRoZSBhY3R1YWwgbGFiZWxcclxuXHRcdFx0XHRcdGZpbGxUZXh0KHgsIHksIGxlZ2VuZEl0ZW0sIHRleHRXaWR0aCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGlzSG9yaXpvbnRhbCkge1xyXG5cdFx0XHRcdFx0XHRjdXJzb3IueCArPSB3aWR0aCArIChsYWJlbE9wdHMucGFkZGluZyk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRjdXJzb3IueSArPSBpdGVtSGVpZ2h0O1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEhhbmRsZSBhbiBldmVudFxyXG5cdFx0ICogQHByaXZhdGVcclxuXHRcdCAqIEBwYXJhbSBlIHtFdmVudH0gdGhlIGV2ZW50IHRvIGhhbmRsZVxyXG5cdFx0ICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSBpZiBhIGNoYW5nZSBvY2N1cmVkXHJcblx0XHQgKi9cclxuXHRcdGhhbmRsZUV2ZW50OiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBvcHRzID0gbWUub3B0aW9ucztcclxuXHRcdFx0dmFyIHR5cGUgPSBlLnR5cGUgPT09ICdtb3VzZXVwJyA/ICdjbGljaycgOiBlLnR5cGU7XHJcblx0XHRcdHZhciBjaGFuZ2VkID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZiAodHlwZSA9PT0gJ21vdXNlbW92ZScpIHtcclxuXHRcdFx0XHRpZiAoIW9wdHMub25Ib3Zlcikge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSAnY2xpY2snfHx0eXBlPT0ndG91Y2hzdGFydCcpIHtcclxuXHRcdFx0XHRpZiAoIW9wdHMub25DbGljaykge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBwb3NpdGlvbiA9IGhlbHBlcnMuZ2V0UmVsYXRpdmVQb3NpdGlvbihlLCBtZS5jaGFydC5jaGFydCksXHJcblx0XHRcdFx0eCA9IHBvc2l0aW9uLngsXHJcblx0XHRcdFx0eSA9IHBvc2l0aW9uLnk7XHJcblxyXG5cdFx0XHRpZiAoeCA+PSBtZS5sZWZ0ICYmIHggPD0gbWUucmlnaHQgJiYgeSA+PSBtZS50b3AgJiYgeSA8PSBtZS5ib3R0b20pIHtcclxuXHRcdFx0XHQvLyBTZWUgaWYgd2UgYXJlIHRvdWNoaW5nIG9uZSBvZiB0aGUgZGF0YXNldCBib3hlc1xyXG5cdFx0XHRcdHZhciBsaCA9IG1lLmxlZ2VuZEhpdEJveGVzO1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGgubGVuZ3RoOyArK2kpIHtcclxuXHRcdFx0XHRcdHZhciBoaXRCb3ggPSBsaFtpXTtcclxuXHJcblx0XHRcdFx0XHRpZiAoeCA+PSBoaXRCb3gubGVmdCAmJiB4IDw9IGhpdEJveC5sZWZ0ICsgaGl0Qm94LndpZHRoICYmIHkgPj0gaGl0Qm94LnRvcCAmJiB5IDw9IGhpdEJveC50b3AgKyBoaXRCb3guaGVpZ2h0KSB7XHJcblx0XHRcdFx0XHRcdC8vIFRvdWNoaW5nIGFuIGVsZW1lbnRcclxuXHRcdFx0XHRcdFx0aWYgKHR5cGUgPT09ICdjbGljayd8fHR5cGU9PSd0b3VjaHN0YXJ0Jykge1xyXG5cdFx0XHRcdFx0XHRcdG9wdHMub25DbGljay5jYWxsKG1lLCBlLCBtZS5sZWdlbmRJdGVtc1tpXSk7XHJcblx0XHRcdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ21vdXNlbW92ZScpIHtcclxuXHRcdFx0XHRcdFx0XHRvcHRzLm9uSG92ZXIuY2FsbChtZSwgZSwgbWUubGVnZW5kSXRlbXNbaV0pO1xyXG5cdFx0XHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gY2hhbmdlZDtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gUmVnaXN0ZXIgdGhlIGxlZ2VuZCBwbHVnaW5cclxuXHRDaGFydC5wbHVnaW5zLnJlZ2lzdGVyKHtcclxuXHRcdGJlZm9yZUluaXQ6IGZ1bmN0aW9uKGNoYXJ0SW5zdGFuY2UpIHtcclxuXHRcdFx0dmFyIG9wdHMgPSBjaGFydEluc3RhbmNlLm9wdGlvbnM7XHJcblx0XHRcdHZhciBsZWdlbmRPcHRzID0gb3B0cy5sZWdlbmQ7XHJcblxyXG5cdFx0XHRpZiAobGVnZW5kT3B0cykge1xyXG5cdFx0XHRcdGNoYXJ0SW5zdGFuY2UubGVnZW5kID0gbmV3IENoYXJ0LkxlZ2VuZCh7XHJcblx0XHRcdFx0XHRjdHg6IGNoYXJ0SW5zdGFuY2UuY2hhcnQuY3R4LFxyXG5cdFx0XHRcdFx0b3B0aW9uczogbGVnZW5kT3B0cyxcclxuXHRcdFx0XHRcdGNoYXJ0OiBjaGFydEluc3RhbmNlXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdENoYXJ0LmxheW91dFNlcnZpY2UuYWRkQm94KGNoYXJ0SW5zdGFuY2UsIGNoYXJ0SW5zdGFuY2UubGVnZW5kKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG59O1xyXG4iXX0=